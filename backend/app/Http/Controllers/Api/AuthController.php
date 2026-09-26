<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Presenters\UserPresenter;
use App\Models\User;
use App\Services\InstitutionService;
use App\Services\OtpService;
use App\Services\ReferralService;
use App\Support\Audit;
use App\Support\Settings;
use App\Support\Totp;
use App\Support\Turnstile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otp,
        private readonly ReferralService $referrals,
    ) {}

    public function register(Request $request): JsonResponse
    {
        abort_unless(Settings::get('registration_open', true), 403, 'Kayıtlar geçici olarak kapalı.');

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:60'],
            'email' => ['required', 'email:rfc,filter', 'max:190', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'referral_code' => ['nullable', 'string', 'max:16'],
            'cefr_level' => ['nullable', 'in:A1,A2,B1,B2,C1,C2'],
            'learning_goal' => ['nullable', 'in:travel,career,exam,school,fun'],
            'daily_goal_xp' => ['nullable', 'integer', 'in:10,20,30,50'],
            'focus_skill' => ['nullable', 'in:reading,listening,speaking,writing'],
            'interests' => ['nullable', 'array', 'max:8'],
            'interests.*' => ['string', 'in:travel,career,movies,music,games,sports,tech,food'],
            'study_time' => ['nullable', 'in:morning,lunch,evening,night'],
            'motivation' => ['nullable', 'in:confidence,job,abroad,exam,kids,hobby'],
            'invite' => ['nullable', 'string', 'max:64'],
            'marketing_opt_in' => ['boolean'],
            'accept_terms' => ['accepted'],
            'captcha' => ['nullable', 'string'],
            'website' => ['prohibited'], // honeypot
            'device' => ['nullable', 'string', 'max:40'],
        ], [
            'email.unique' => 'Bu e-posta ile zaten bir hesap var.',
            'accept_terms.accepted' => 'Kullanım koşullarını kabul etmelisin.',
        ]);

        if (! Turnstile::verify($data['captcha'] ?? null, $request->ip())) {
            throw ValidationException::withMessages(['captcha' => 'Robot doğrulaması başarısız.']);
        }

        $user = User::query()->create([
            'name' => strip_tags($data['name']),
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'cefr_level' => $data['cefr_level'] ?? 'A1',
            'learning_goal' => $data['learning_goal'] ?? null,
            'daily_goal_xp' => $data['daily_goal_xp'] ?? 20,
            'focus_skill' => $data['focus_skill'] ?? null,
            'interests' => array_values(array_unique($data['interests'] ?? [])) ?: null,
            'study_time' => $data['study_time'] ?? null,
            'motivation' => $data['motivation'] ?? null,
            'marketing_opt_in' => $data['marketing_opt_in'] ?? false,
            'onboarded' => isset($data['learning_goal']),
        ]);

        $this->referrals->attach($user, $data['referral_code'] ?? null);
        if (! empty($data['invite'])) {
            app(InstitutionService::class)->acceptToken($user, $data['invite']);
        }
        $this->otp->send($user->email, 'verify_email', $user);
        Audit::log('auth.register', $user);

        return $this->issueToken($user, $data['device'] ?? 'web', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:190'],
            'password' => ['required', 'string', 'max:200'],
            'captcha' => ['nullable', 'string'],
            'device' => ['nullable', 'string', 'max:40'],
        ]);

        if (! Turnstile::verify($data['captcha'] ?? null, $request->ip())) {
            throw ValidationException::withMessages(['captcha' => 'Robot doğrulaması başarısız.']);
        }

        $login = strtolower(trim($data['login']));
        $user = User::query()->where('email', $login)->orWhere('username', $login)->first();
        $generic = ValidationException::withMessages(['login' => 'E-posta/kullanıcı adı veya şifre hatalı.']);

        if (! $user) {
            Hash::make($data['password']); // equalise timing with the real check
            throw $generic;
        }

        if ($user->isLocked()) {
            $minutes = (int) ceil(now()->diffInMinutes($user->locked_until));
            throw ValidationException::withMessages(['login' => "Çok fazla hatalı deneme. Hesabın {$minutes} dakika kilitli. Şifreni sıfırlayarak hemen açabilirsin."]);
        }

        if (! Hash::check($data['password'], $user->password)) {
            $user->failed_logins++;
            if ($user->failed_logins >= config('dilgo.security.max_failed_logins')) {
                $user->locked_until = now()->addMinutes(config('dilgo.security.lock_minutes'));
                $user->failed_logins = 0;
                Audit::log('auth.locked', $user);
            }
            $user->saveQuietly();
            Audit::log('auth.failed', $user);
            throw $generic;
        }

        if ($user->is_banned) {
            throw ValidationException::withMessages(['login' => 'Hesabın askıya alındı. Destek: '.config('dilgo.brand.support_email')]);
        }

        if (Hash::needsRehash($user->password)) {
            $user->password = $data['password'];
        }
        $user->forceFill([
            'failed_logins' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();
        Audit::log('auth.login', $user);

        return $this->issueToken($user, $data['device'] ?? 'web');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => UserPresenter::me($request->user())]);
    }

    public function sendVerification(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if((bool) $user->email_verified_at, 422, 'E-posta zaten doğrulandı.');
        $retry = $this->otp->send($user->email, 'verify_email', $user);

        return response()->json(['ok' => true, 'retry_after' => $retry]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);
        $user = $request->user();

        if (! $user->email_verified_at) {
            $this->otp->verify($user->email, 'verify_email', $data['code']);
            $user->forceFill(['email_verified_at' => now()])->save();
            $this->referrals->onVerified($user);
            Audit::log('auth.verified', $user);
        }

        return response()->json(['user' => UserPresenter::me($user->fresh())]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'captcha' => ['nullable', 'string']]);
        if (! Turnstile::verify($data['captcha'] ?? null, $request->ip())) {
            throw ValidationException::withMessages(['captcha' => 'Robot doğrulaması başarısız.']);
        }

        $user = User::query()->where('email', strtolower($data['email']))->first();
        if ($user && ! $user->is_banned) {
            $this->otp->send($user->email, 'reset_password', $user);
            Audit::log('auth.reset_requested', $user);
        }

        // Same response whether or not the account exists (no user enumeration).
        return response()->json(['ok' => true, 'message' => 'Bu e-posta kayıtlıysa bir sıfırlama kodu gönderdik.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'max:10'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = User::query()->where('email', strtolower($data['email']))->first();
        if (! $user) {
            throw ValidationException::withMessages(['code' => 'Kod hatalı.']);
        }
        $this->otp->verify($user->email, 'reset_password', $data['code']);

        $user->forceFill([
            'password' => $data['password'],
            'failed_logins' => 0,
            'locked_until' => null,
            'email_verified_at' => $user->email_verified_at ?? now(), // owning the inbox proves it
        ])->save();
        $user->tokens()->delete(); // sign out everywhere
        Audit::log('auth.password_reset', $user);

        return $this->issueToken($user, $request->input('device', 'web'));
    }

    /** Step-up for staff: sends an e-mail OTP (skipped in favour of TOTP when enabled). */
    public function adminChallenge(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->isStaff(), 403);

        if ($user->hasTwoFactor()) {
            return response()->json(['method' => 'totp']);
        }
        $retry = config('dilgo.security.admin_email_otp') ? $this->otp->send($user->email, 'admin_login', $user) : 0;

        return response()->json(['method' => config('dilgo.security.admin_email_otp') ? 'email' : 'none', 'retry_after' => $retry]);
    }

    public function adminVerify(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->isStaff(), 403);
        $data = $request->validate(['code' => ['nullable', 'string', 'max:24']]);
        $code = trim((string) ($data['code'] ?? ''));

        if ($user->hasTwoFactor()) {
            $codes = $user->two_factor_recovery_codes ?? [];
            if (in_array(strtoupper($code), $codes, true)) {
                $user->forceFill(['two_factor_recovery_codes' => array_values(array_diff($codes, [strtoupper($code)]))])->save();
                Audit::log('admin.recovery_code_used', $user);
            } elseif (! Totp::verify($user->two_factor_secret, $code)) {
                Audit::log('admin.2fa_failed', $user);
                throw ValidationException::withMessages(['code' => 'Doğrulama kodu hatalı.']);
            }
        } elseif (config('dilgo.security.admin_email_otp')) {
            $this->otp->verify($user->email, 'admin_login', $code);
        }

        $token = $user->createToken('admin-panel', ['user', 'admin'], now()->addHours(12));
        Audit::log('admin.login', $user);

        return response()->json(['token' => $token->plainTextToken, 'expires_at' => now()->addHours(12)->toIso8601String()]);
    }

    private function issueToken(User $user, string $device, int $status = 200): JsonResponse
    {
        $token = $user->createToken(
            substr(strip_tags($device), 0, 40) ?: 'web',
            ['user'],
            now()->addDays(config('dilgo.security.token_ttl_days'))
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'user' => UserPresenter::me($user->fresh()),
        ], $status);
    }
}
