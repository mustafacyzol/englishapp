<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Presenters\UserPresenter;
use App\Models\AuditLog;
use App\Models\DailyActivity;
use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Models\Order;
use App\Models\RewardItem;
use App\Models\Story;
use App\Models\User;
use App\Models\UserItem;
use App\Services\InstitutionService;
use App\Services\RewardService;
use App\Support\Audit;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $since = now()->subDays(29)->startOfDay();
        $revenue = Order::query()->where('status', 'paid')->where('paid_at', '>=', $since)
            ->selectRaw('DATE(paid_at) as d, SUM(total) as total, COUNT(*) as count')->groupBy('d')->orderBy('d')->get();
        $signups = User::query()->where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as count')->groupBy('d')->orderBy('d')->get();
        $dau = DailyActivity::query()->where('date', '>=', $since->toDateString())->where('xp', '>', 0)
            ->selectRaw('date as d, COUNT(*) as count')->groupBy('date')->orderBy('date')->get();

        return response()->json([
            'kpis' => [
                'users' => User::query()->count(),
                'verified' => User::query()->whereNotNull('email_verified_at')->count(),
                'premium' => User::query()->where('premium_until', '>', now())->count(),
                'active_today' => DailyActivity::query()->where('date', now('Europe/Istanbul')->toDateString())->where('xp', '>', 0)->count(),
                'revenue_30d' => (float) Order::query()->where('status', 'paid')->where('paid_at', '>=', $since)->sum('total'),
                'orders_30d' => Order::query()->where('status', 'paid')->where('paid_at', '>=', $since)->count(),
                'stories' => Story::query()->count(),
                'open_vouchers' => UserItem::query()->where('status', 'active')->whereHas('item', fn ($q) => $q->where('type', 'live_lesson'))->count(),
            ],
            'series' => ['revenue' => $revenue, 'signups' => $signups, 'dau' => $dau],
            'recent_orders' => Order::query()->with('user:id,name,email', 'plan:id,name')->latest()->limit(8)->get(),
            'recent_users' => User::query()->latest()->limit(8)->get(['id', 'name', 'email', 'created_at', 'email_verified_at', 'premium_until']),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $q = User::query()
            ->when($request->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")->orWhere('username', 'like', "%{$s}%")))
            ->when($request->query('role'), fn ($q, $r) => $q->where('role', $r))
            ->when($request->query('status') === 'premium', fn ($q) => $q->where('premium_until', '>', now()))
            ->when($request->query('status') === 'banned', fn ($q) => $q->where('is_banned', true))
            ->when($request->query('status') === 'unverified', fn ($q) => $q->whereNull('email_verified_at'))
            ->latest();

        return response()->json($q->paginate(25, ['id', 'name', 'username', 'email', 'role', 'cefr_level', 'xp_total', 'gems', 'streak_current', 'premium_until', 'is_banned', 'email_verified_at', 'last_active_at', 'created_at']));
    }

    public function user(User $user): JsonResponse
    {
        return response()->json([
            'user' => UserPresenter::me($user) + ['is_banned' => $user->is_banned, 'banned_reason' => $user->banned_reason, 'last_login_at' => $user->last_login_at, 'last_login_ip' => $user->last_login_ip, 'locked_until' => $user->locked_until],
            'orders' => $user->orders()->with('plan:id,name')->latest()->limit(20)->get(),
            'items' => $user->items()->with('item:id,name,type')->latest()->limit(30)->get(),
            'audit' => AuditLog::query()->where('user_id', $user->id)->latest('id')->limit(30)->get(),
        ]);
    }

    public function updateUser(Request $request, User $user, RewardService $rewards): JsonResponse
    {
        $admin = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:60'],
            'role' => ['sometimes', Rule::in(User::ROLES)],
            'cefr_level' => ['sometimes', 'in:A1,A2,B1,B2,C1,C2'],
            'is_banned' => ['sometimes', 'boolean'],
            'banned_reason' => ['nullable', 'string', 'max:255'],
            'gems_delta' => ['sometimes', 'integer', 'between:-100000,100000'],
            'premium_days' => ['sometimes', 'integer', 'between:1,3650'],
            'grant_item_id' => ['sometimes', 'exists:reward_items,id'],
            'unlock' => ['sometimes', 'boolean'],
            'reset_2fa' => ['sometimes', 'boolean'],
            'verify_email' => ['sometimes', 'boolean'],
        ]);

        // Only super admins can change roles or touch other admins.
        if (isset($data['role']) || $user->isAdmin()) {
            abort_unless($admin->isSuperAdmin() || $user->id === $admin->id && ! isset($data['role']), 403, 'Bu değişiklik için süper yönetici yetkisi gerekli.');
        }
        abort_if(isset($data['role']) && $user->id === $admin->id, 422, 'Kendi rolünü değiştiremezsin.');

        DB::transaction(function () use ($data, $user, $rewards) {
            $user->fill(array_intersect_key($data, array_flip(['name', 'cefr_level'])));
            if (isset($data['role'])) {
                $user->role = $data['role'];
                $user->tokens()->delete();
            }
            if (isset($data['is_banned'])) {
                $user->is_banned = $data['is_banned'];
                $user->banned_reason = $data['is_banned'] ? ($data['banned_reason'] ?? null) : null;
                if ($data['is_banned']) {
                    $user->tokens()->delete();
                }
            }
            if (isset($data['gems_delta'])) {
                $user->gems = max(0, $user->gems + $data['gems_delta']);
            }
            if (! empty($data['unlock'])) {
                $user->failed_logins = 0;
                $user->locked_until = null;
            }
            if (! empty($data['reset_2fa'])) {
                $user->two_factor_secret = null;
                $user->two_factor_confirmed_at = null;
                $user->two_factor_recovery_codes = null;
            }
            if (! empty($data['verify_email']) && ! $user->email_verified_at) {
                $user->email_verified_at = now();
            }
            $user->save();

            if (isset($data['premium_days'])) {
                $rewards->grantPremiumDays($user, $data['premium_days'], 'admin');
            }
            if (isset($data['grant_item_id'])) {
                $rewards->grant($user, RewardItem::query()->findOrFail($data['grant_item_id']), 'admin');
            }
        });

        Audit::log('admin.user.updated', $admin, $user, array_diff_key($data, ['banned_reason' => 1]));

        return $this->user($user->fresh());
    }

    public function orders(Request $request): JsonResponse
    {
        $q = Order::query()->with('user:id,name,email', 'plan:id,name', 'coupon:id,code')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('uuid', 'like', "%{$s}%")->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$s}%"))))
            ->latest();

        return response()->json($q->paginate(25));
    }

    public function refundOrder(Request $request, Order $order): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        abort_unless($order->status === 'paid', 422, 'Yalnızca ödenmiş siparişler iade edilebilir.');
        $data = $request->validate(['revoke_premium' => ['boolean']]);

        DB::transaction(function () use ($order, $data) {
            $order->update(['status' => 'refunded']);
            if (! empty($data['revoke_premium'])) {
                $sub = $order->user->subscriptions()->where('order_id', $order->id)->first();
                if ($sub) {
                    $days = $sub->starts_at->diffInDays($sub->ends_at);
                    $sub->update(['status' => 'cancelled']);
                    $user = $order->user;
                    $user->premium_until = $user->premium_until?->subDays((int) $days);
                    $user->save();
                }
            }
        });
        Audit::log('admin.order.refunded', $request->user(), $order);

        return response()->json(['order' => $order->fresh()]);
    }

    public function audit(Request $request): JsonResponse
    {
        return response()->json(AuditLog::query()->with('user:id,name,email')
            ->when($request->query('action'), fn ($q, $a) => $q->where('action', 'like', "{$a}%"))
            ->when($request->query('user_id'), fn ($q, $u) => $q->where('user_id', $u))
            ->latest('id')->paginate(50));
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => Settings::all()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate([
            'maintenance_mode' => ['sometimes', 'boolean'],
            'registration_open' => ['sometimes', 'boolean'],
            'announcement' => ['sometimes', 'nullable', 'string', 'max:300'],
            'referral.referee_gems' => ['sometimes', 'integer', 'min:0'],
            'referral.referrer_gems' => ['sometimes', 'integer', 'min:0'],
            'referral.referrer_premium_days' => ['sometimes', 'integer', 'min:0'],
            'ai.daily_limit_free' => ['sometimes', 'integer', 'min:0'],
            'ai.daily_limit_premium' => ['sometimes', 'integer', 'min:0'],
            'gamification.heart_refill_gems' => ['sometimes', 'integer', 'min:0'],
            'school.cta_url' => ['sometimes', 'nullable', 'url'],
            'school.whatsapp' => ['sometimes', 'nullable', 'string', 'max:30'],
        ]);
        // dotted keys arrive nested — flatten
        $flat = [];
        foreach (Settings::EDITABLE as $key => $_) {
            if (data_get($data, $key, '__missing__') !== '__missing__' || array_key_exists($key, $data)) {
                $flat[$key] = data_get($data, $key);
            }
        }
        Settings::put($flat);
        Audit::log('admin.settings.updated', $request->user(), null, ['keys' => array_keys($flat)]);

        return response()->json(['data' => Settings::all()]);
    }

    /** School front-desk: look up and redeem a live-lesson voucher (BDO-XXXXXXXX). */
    public function voucher(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:24'], 'redeem' => ['boolean']]);
        $item = UserItem::query()->where('code', strtoupper(trim($data['code'])))->with('user:id,name,email', 'item:id,name,type')->firstOrFail();

        if (! empty($data['redeem'])) {
            abort_unless($item->status === 'active', 422, 'Bu kupon kullanılamaz (durum: '.$item->status.').');
            abort_if($item->expires_at?->isPast(), 422, 'Kuponun süresi dolmuş.');
            $item->update(['status' => 'used', 'meta' => array_merge($item->meta ?? [], ['redeemed_by' => $request->user()->id, 'redeemed_at' => now()->toIso8601String()])]);
            Audit::log('admin.voucher.redeemed', $request->user(), $item);
        }

        return response()->json(['voucher' => $item->fresh(['user:id,name,email', 'item:id,name,type'])]);
    }

    public function institutionReport(Institution $institution, InstitutionService $service): JsonResponse
    {
        return response()->json($service->report($institution));
    }

    public function institutionInvite(Request $request, Institution $institution, InstitutionService $service): JsonResponse
    {
        $data = $request->validate([
            'role' => ['required', 'in:student,manager'],
            'rows' => ['required', 'array', 'min:1', 'max:1000'],
            'rows.*.email' => ['required', 'string', 'max:190'],
            'rows.*.name' => ['nullable', 'string', 'max:80'],
            'rows.*.class_name' => ['nullable', 'string', 'max:60'],
        ]);

        return response()->json($service->invite($institution, $data['rows'], $data['role'], $request->user()));
    }

    public function institutionRemove(InstitutionMember $member, InstitutionService $service): JsonResponse
    {
        $service->remove($member);

        return response()->json(['ok' => true]);
    }
}
