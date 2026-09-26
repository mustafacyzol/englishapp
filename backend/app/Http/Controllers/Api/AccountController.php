<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Presenters\UserPresenter;
use App\Services\OtpService;
use App\Support\Audit;
use App\Support\Totp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:60'],
            'username' => ['sometimes', 'string', 'min:3', 'max:30', 'regex:/^[a-z0-9_.]+$/', Rule::unique('users', 'username')->ignore($user->id)],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:60', 'regex:/^[a-z0-9_-]+$/'],
            'cefr_level' => ['sometimes', 'in:A1,A2,B1,B2,C1,C2'],
            'learning_goal' => ['sometimes', 'nullable', 'in:travel,career,exam,school,fun'],
            'daily_goal_xp' => ['sometimes', 'integer', Rule::in(config('dilgo.gamification.daily_goal_options'))],
            'marketing_opt_in' => ['sometimes', 'boolean'],
            'onboarded' => ['sometimes', 'boolean'],
            'focus_skill' => ['sometimes', 'nullable', 'in:reading,listening,speaking,writing'],
            'interests' => ['sometimes', 'nullable', 'array', 'max:8'],
            'interests.*' => ['string', 'in:travel,career,movies,music,games,sports,tech,food'],
            'study_time' => ['sometimes', 'nullable', 'in:morning,lunch,evening,night'],
            'motivation' => ['sometimes', 'nullable', 'in:confidence,job,abroad,exam,kids,hobby'],
            'preferences' => ['sometimes', 'array'],
            'preferences.tour_done' => ['sometimes', 'boolean'],
            'preferences.email_reminders' => ['sometimes', 'boolean'],
            'preferences.sound' => ['sometimes', 'boolean'],
            'preferences.tts_voice' => ['sometimes', 'nullable', 'string', 'max:80'],
            'preferences.tts_rate' => ['sometimes', 'numeric', 'between:0.5,1.5'],
            'preferences.theme' => ['sometimes', 'in:light,dark,system'],
        ], ['username.regex' => 'Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir.']);

        if (isset($data['preferences'])) {
            // merge and whitelist; never let the client overwrite server-owned keys (frame)
            $allowed = array_intersect_key($data['preferences'], array_flip(['email_reminders', 'sound', 'tts_voice', 'tts_rate', 'theme', 'tour_done']));
            $data['preferences'] = array_merge($user->preferences ?? [], $allowed);
        }
        if (isset($data['name'])) {
            $data['name'] = strip_tags($data['name']);
        }

        $user->fill($data)->save();

        return response()->json(['user' => UserPresenter::me($user->fresh())]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::min(8)->letters()->numbers()],
        ]);
        $user = $request->user();
        $user->forceFill(['password' => $data['password']])->save();
        // keep current session, revoke others
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();
        Audit::log('account.password_changed', $user);

        return response()->json(['ok' => true]);
    }

    public function sessions(Request $request): JsonResponse
    {
        $current = $request->user()->currentAccessToken()->id;

        return response()->json([
            'data' => $request->user()->tokens()->latest('last_used_at')->get(['id', 'name', 'abilities', 'last_used_at', 'created_at', 'expires_at'])
                ->map(fn ($t) => $t->toArray() + ['current' => $t->id === $current]),
        ]);
    }

    public function revokeSession(Request $request, int $id): JsonResponse
    {
        $request->user()->tokens()->whereKey($id)->delete();

        return response()->json(['ok' => true]);
    }

    public function twoFactorSetup(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->isStaff(), 403, 'İki adımlı doğrulama şu an yönetici hesapları için.');
        $secret = Totp::generateSecret();
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null])->save();

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => Totp::uri($secret, $user->email, config('dilgo.brand.name')),
        ]);
    }

    public function twoFactorConfirm(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(['code' => ['required', 'string']]);
        if (! $user->two_factor_secret || ! Totp::verify($user->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => 'Kod hatalı.']);
        }
        $codes = collect(range(1, 8))->map(fn () => strtoupper(Str::random(5).'-'.Str::random(5)))->all();
        $user->forceFill(['two_factor_confirmed_at' => now(), 'two_factor_recovery_codes' => $codes])->save();
        Audit::log('account.2fa_enabled', $user);

        return response()->json(['recovery_codes' => $codes]);
    }

    public function twoFactorDisable(Request $request): JsonResponse
    {
        $request->validate(['current_password' => ['required', 'current_password:sanctum']]);
        $user = $request->user();
        $user->forceFill(['two_factor_secret' => null, 'two_factor_confirmed_at' => null, 'two_factor_recovery_codes' => null])->save();
        Audit::log('account.2fa_disabled', $user);

        return response()->json(['ok' => true]);
    }

    public function requestDeletion(Request $request, OtpService $otp): JsonResponse
    {
        $request->validate(['current_password' => ['required', 'current_password:sanctum']]);
        $otp->send($request->user()->email, 'delete_account', $request->user());

        return response()->json(['ok' => true]);
    }

    /** KVKK/GDPR: anonymise and soft-delete. */
    public function destroy(Request $request, OtpService $otp): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();
        $otp->verify($user->email, 'delete_account', $data['code']);
        Audit::log('account.deleted', $user);

        $user->tokens()->delete();
        $user->forceFill([
            'name' => 'Silinmiş kullanıcı',
            'email' => 'deleted-'.$user->id.'-'.Str::random(6).'@deleted.invalid',
            'username' => 'deleted_'.$user->id,
            'password' => Hash::make(Str::random(40)),
            'avatar' => null,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
        ])->save();
        $user->delete();

        return response()->json(['ok' => true]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'unread' => $user->unreadNotifications()->count(),
            'data' => $user->notifications()->limit(30)->get()->map(fn ($n) => [
                'id' => $n->id, 'data' => $n->data, 'read' => $n->read_at !== null, 'created_at' => $n->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function readNotifications(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }
}
