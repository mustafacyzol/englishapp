<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Presenters\UserPresenter;
use App\Models\Avatar;
use App\Services\OtpService;
use App\Services\SubscriptionService;
use App\Support\Audit;
use App\Support\Exams;
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
            'avatar' => ['sometimes', 'required', Rule::in(array_keys(Avatar::catalog()))],
            'bio' => ['sometimes', 'nullable', 'string', 'max:120'],
            'frame' => ['sometimes', 'nullable', Rule::in(config('dilgo.cosmetics.frames'))],
            'banner' => ['sometimes', 'nullable', Rule::in(config('dilgo.cosmetics.banners'))],
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
            'exam_target' => ['sometimes', 'nullable', Rule::in(Exams::keys())],
            'exam_date' => ['sometimes', 'nullable', 'date', 'after:today', 'before:+3 years'],
            'locale' => ['sometimes', 'in:tr,en'],
            'age_group' => ['sometimes', 'nullable', 'in:kid,teen,adult'],
            'school_stage' => ['sometimes', 'nullable', \Illuminate\Validation\Rule::in(\App\Support\SchoolStage::keys())],
            'grade' => ['sometimes', 'nullable', 'integer', 'between:1,12'],
            'preferences' => ['sometimes', 'array'],
            'preferences.language' => ['sometimes', 'in:tr,en'],
            'preferences.tour_done' => ['sometimes', 'boolean'],
            'preferences.email_reminders' => ['sometimes', 'boolean'],
            'preferences.sound' => ['sometimes', 'boolean'],
            'preferences.tts_voice' => ['sometimes', 'nullable', 'string', 'max:80'],
            'preferences.tts_rate' => ['sometimes', 'numeric', 'between:0.5,1.5'],
            'preferences.theme' => ['sometimes', 'in:light,dark,system'],
            'preferences.exam_mode' => ['sometimes', 'boolean'],
        ], ['username.regex' => 'Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir.']);

        if (! empty($data['avatar']) && (Avatar::catalog()[$data['avatar']]['tier'] ?? '') === 'premium' && ! $user->isPremium()) {
            abort(403, 'Bu avatar Premium üyelere özel.');
        }
        // Frames and banners are worn only once owned; null takes them off.
        $owned = $user->ownedCosmetics();
        foreach (['frame' => 'frames', 'banner' => 'banners'] as $field => $list) {
            if (array_key_exists($field, $data)) {
                abort_if($data[$field] !== null && ! in_array($data[$field], $owned[$list], true), 403, 'Önce mağazadan edinmelisin.');
                $prefs = $user->preferences ?? [];
                $prefs[$field] = $data[$field];
                $user->preferences = $prefs;
                unset($data[$field]);
            }
        }
        if (array_key_exists('bio', $data)) {
            $data['bio'] = $data['bio'] === null ? null : (trim(strip_tags($data['bio'])) ?: null);
        }
        // Age group guards content, rivals and gifts, so it is not a switch to flip back and
        // forth (that is how one account gets shared between siblings): children's accounts
        // are only opened at sign-up with parental consent, and any change waits 30 days.
        if (array_key_exists('age_group', $data) && $data['age_group'] !== $user->age_group) {
            if ($data['age_group'] === 'kid' || $user->age_group === 'kid') {
                abort(422, $user->age_group === 'kid'
                    ? 'Çocuk hesabının yaş grubu veli tarafından destek ekibimize yazılarak değiştirilebilir.'
                    : 'Çocuk hesabı yalnızca kayıt sırasında veli onayıyla açılır.');
            }
            $days = (int) config('dilgo.security.age_group_change_days', 30);
            if ($user->age_group && $user->age_group_changed_at && $user->age_group_changed_at->gt(now()->subDays($days))) {
                abort(422, "Yaş grubunu {$days} günde bir değiştirebilirsin. Sonraki değişiklik: ".$user->age_group_changed_at->addDays($days)->format('d.m.Y'));
            }
            $user->forceFill(['age_group_changed_at' => now()]);
        }
        // Exam practice is for teens and adults only.
        if (($data['age_group'] ?? $user->age_group) === 'kid') {
            if (! empty($data['exam_target'])) {
                abort(422, 'Sınav modu çocuk hesaplarında kullanılamaz.');
            }
            if (isset($data['preferences']['exam_mode'])) {
                $data['preferences']['exam_mode'] = false;
            }
        }
        if (isset($data['preferences'])) {
            // merge and whitelist; never let the client overwrite server-owned keys (frame)
            $allowed = array_intersect_key($data['preferences'], array_flip(['email_reminders', 'sound', 'tts_voice', 'tts_rate', 'theme', 'tour_done', 'exam_mode']));
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
            'data' => $user->notifications()->limit(60)->get()->map(fn ($n) => [
                'id' => $n->id, 'data' => $n->data, 'read' => $n->read_at !== null, 'created_at' => $n->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function readNotification(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->whereKey($id)->firstOrFail()->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function deleteNotification(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->whereKey($id)->delete();

        return response()->json(['ok' => true]);
    }

    /** Clear the inbox: everything, or only what has been read (?read=1). */
    public function clearNotifications(Request $request): JsonResponse
    {
        $q = $request->user()->notifications();
        if ($request->boolean('read')) {
            $q->whereNotNull('read_at');
        }
        $q->delete();

        return response()->json(['ok' => true]);
    }

    public function readNotifications(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }

    /** Profile > Aboneliğim: the live period, the refund window and the history. */
    public function subscription(Request $request, SubscriptionService $subs): JsonResponse
    {
        return response()->json($subs->overview($request->user()));
    }

    public function cancelSubscription(Request $request, SubscriptionService $subs): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', Rule::in(array_keys(SubscriptionService::REASONS))],
            'note' => ['nullable', 'string', 'max:400'],
            'refund' => ['boolean'],
        ]);
        $out = $subs->cancel($request->user(), $data['reason'], $data['note'] ?? null, (bool) ($data['refund'] ?? false));

        return response()->json($out + ['user' => UserPresenter::me($request->user()->fresh())]);
    }

    public function resumeSubscription(Request $request, SubscriptionService $subs): JsonResponse
    {
        return response()->json($subs->resume($request->user()) + ['user' => UserPresenter::me($request->user()->fresh())]);
    }
}
