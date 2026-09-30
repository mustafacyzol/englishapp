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
    public function dashboard(Request $request): JsonResponse
    {
        // Money and people only for those who may see them.
        $sales = $request->user()->hasPermission('sales');
        $people = $request->user()->hasPermission('users');
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
                'revenue_30d' => $sales ? (float) Order::query()->where('status', 'paid')->where('paid_at', '>=', $since)->sum('total') : null,
                'orders_30d' => $sales ? Order::query()->where('status', 'paid')->where('paid_at', '>=', $since)->count() : null,
                'stories' => Story::query()->count(),
                'open_vouchers' => UserItem::query()->where('status', 'active')->whereHas('item', fn ($q) => $q->where('type', 'live_lesson'))->count(),
            ],
            'series' => ['revenue' => $sales ? $revenue : [], 'signups' => $signups, 'dau' => $dau],
            'recent_orders' => $sales ? Order::query()->with('user:id,name,email', 'plan:id,name')->latest()->limit(8)->get() : [],
            'recent_users' => $people ? User::query()->latest()->limit(8)->get(['id', 'name', 'email', 'created_at', 'email_verified_at', 'premium_until']) : [],
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $q = User::query()
            ->when(is_string($request->query('q')) ? $request->query('q') : null, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")->orWhere('username', 'like', "%{$s}%")))
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
            'user' => UserPresenter::me($user) + ['custom_permissions' => $user->permissions !== null, 'is_banned' => $user->is_banned, 'banned_reason' => $user->banned_reason, 'last_login_at' => $user->last_login_at, 'last_login_ip' => $user->last_login_ip, 'locked_until' => $user->locked_until],
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
            'permissions' => ['sometimes', 'nullable', 'array'],
            'permissions.*' => [Rule::in(User::PERMISSIONS)],
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

        // Only super admins change roles or permissions, or touch other admins.
        $access = array_key_exists('role', $data) || array_key_exists('permissions', $data);
        if ($access || $user->isAdmin()) {
            abort_unless($admin->isSuperAdmin() || $user->id === $admin->id && ! $access, 403, 'Bu değişiklik için süper yönetici yetkisi gerekli.');
        }
        // Support staff manage learners, not other staff.
        abort_if($user->isStaff() && $user->id !== $admin->id && ! $admin->isAdmin(), 403, 'Ekip üyelerini yalnızca yöneticiler düzenleyebilir.');
        abort_if($access && $user->id === $admin->id, 422, 'Kendi rolünü ve yetkilerini değiştiremezsin.');

        DB::transaction(function () use ($data, $user, $rewards) {
            $user->fill(array_intersect_key($data, array_flip(['name', 'cefr_level'])));
            if (isset($data['role'])) {
                $user->role = $data['role'];
                $user->tokens()->delete();
            }
            if (array_key_exists('permissions', $data)) {
                $user->permissions = $data['permissions'] === null ? null : array_values(array_unique($data['permissions']));
                $user->tokens()->where('abilities', 'like', '%admin%')->delete();
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

    /**
     * Create an account from the panel. Staff roles and custom permissions are
     * for super admins only. Without a password the person gets a welcome
     * e-mail and sets their own via "Şifremi unuttum".
     */
    public function createUser(Request $request, RewardService $rewards): JsonResponse
    {
        $admin = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')],
            'password' => ['nullable', 'string', 'min:10', 'max:100'],
            'role' => ['sometimes', Rule::in(User::ROLES)],
            'permissions' => ['sometimes', 'nullable', 'array'],
            'permissions.*' => [Rule::in(User::PERMISSIONS)],
            'cefr_level' => ['sometimes', 'in:A1,A2,B1,B2,C1,C2'],
            'age_group' => ['sometimes', 'nullable', 'in:kid,teen,adult'],
            'premium_days' => ['sometimes', 'nullable', 'integer', 'between:1,3650'],
            'verify_email' => ['sometimes', 'boolean'],
            'send_welcome' => ['sometimes', 'boolean'],
        ]);
        $role = $data['role'] ?? 'user';
        abort_if(($role !== 'user' || ! empty($data['permissions'])) && ! $admin->isSuperAdmin(), 403, 'Ekip hesabı açmak için süper yönetici yetkisi gerekli.');

        $user = DB::transaction(function () use ($data, $role, $rewards) {
            $user = User::query()->create([
                'name' => strip_tags($data['name']),
                'email' => strtolower($data['email']),
                'password' => $data['password'] ?? \Illuminate\Support\Str::password(32),
                'cefr_level' => $data['cefr_level'] ?? 'A1',
                'age_group' => $data['age_group'] ?? null,
            ]);
            $user->role = $role;
            $user->permissions = $role === 'user' ? null : ($data['permissions'] ?? null);
            if (! empty($data['verify_email'])) {
                $user->email_verified_at = now();
            }
            $user->save();
            if (! empty($data['premium_days'])) {
                $rewards->grantPremiumDays($user, $data['premium_days'], 'admin');
            }

            return $user;
        });

        if ($data['send_welcome'] ?? true) {
            $base = config('dilgo.brand.frontend_url');
            \Illuminate\Support\Facades\Mail::to($user->email)->queue(new \App\Mail\NoticeMail(
                'DilGO hesabın hazır',
                'Hoş geldin, '.$user->name.'!',
                ['Senin için bir DilGO hesabı açıldı. Giriş e-postan: '.$user->email, empty($data['password']) ? 'İlk girişten önce "Şifremi unuttum" ile kendi şifreni belirle.' : 'Şifreni hesabı açan kişiden alabilir, ilk girişte değiştirebilirsin.'],
                empty($data['password']) ? 'Şifremi belirle' : 'Giriş yap',
                $base.(empty($data['password']) ? '/forgot-password' : '/login'),
            ));
        }
        Audit::log('admin.user.created', $admin, $user, ['role' => $role]);

        return response()->json($this->user($user->fresh())->getData(true), 201);
    }

    /** Everyone with panel access, with what they can open. Super admins only. */
    public function staff(): JsonResponse
    {
        $rows = User::query()->whereIn('role', ['support', 'editor', 'admin', 'super_admin'])->orderByRaw("CASE role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END")->get();

        return response()->json([
            'data' => $rows->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role, 'permissions' => $u->permissionList(), 'custom' => $u->permissions !== null, 'two_factor' => $u->two_factor_confirmed_at !== null, 'last_login_at' => $u->last_login_at]),
            'areas' => User::PERMISSIONS,
            'role_defaults' => User::ROLE_PERMISSIONS,
        ]);
    }

    /**
     * Money in plain numbers: gross paid, refunded, net, per period and per plan,
     * plus a daily series. All amounts are order totals after discounts.
     */
    public function revenue(Request $request): JsonResponse
    {
        $days = (int) $request->integer('days', 30);
        $days = in_array($days, [7, 30, 90, 365], true) ? $days : 30;
        $tz = 'Europe/Istanbul';
        $period = function ($from) {
            $paid = Order::query()->whereIn('status', ['paid', 'refunded'])->when($from, fn ($q) => $q->where('paid_at', '>=', $from));
            $gross = (float) (clone $paid)->sum('total');
            $refunded = (float) (clone $paid)->where('status', 'refunded')->sum('total');

            return [
                'gross' => round($gross, 2),
                'refunded' => round($refunded, 2),
                'net' => round($gross - $refunded, 2),
                'orders' => (clone $paid)->count(),
                'discounts' => round((float) (clone $paid)->sum('discount'), 2),
            ];
        };
        $since = now($tz)->subDays($days - 1)->startOfDay()->utc();
        $series = Order::query()->whereIn('status', ['paid', 'refunded'])->where('paid_at', '>=', $since)
            ->selectRaw("DATE(paid_at) as d, SUM(total) as gross, SUM(CASE WHEN status = 'refunded' THEN total ELSE 0 END) as refunded, COUNT(*) as count")
            ->groupBy('d')->orderBy('d')->get()
            ->map(fn ($r) => ['d' => $r->d, 'gross' => round((float) $r->gross, 2), 'net' => round((float) $r->gross - (float) $r->refunded, 2), 'count' => (int) $r->count]);
        $byPlan = Order::query()->whereIn('orders.status', ['paid', 'refunded'])->where('paid_at', '>=', $since)
            ->leftJoin('plans', 'plans.id', '=', 'orders.plan_id')
            ->selectRaw("COALESCE(plans.name, 'Silinmiş paket') as name, COUNT(*) as count, SUM(CASE WHEN orders.status = 'paid' THEN orders.total ELSE 0 END) as net")
            ->groupBy('name')->orderByDesc('net')->get()
            ->map(fn ($r) => ['name' => $r->name, 'count' => (int) $r->count, 'net' => round((float) $r->net, 2)]);
        $active = User::query()->where('premium_until', '>', now())->count();
        $paying = \App\Models\Subscription::query()->where('status', 'active')->where('ends_at', '>', now())->where('source', 'purchase')->distinct('user_id')->count('user_id');

        return response()->json([
            'currency' => 'TRY',
            'days' => $days,
            'periods' => [
                'today' => $period(now($tz)->startOfDay()->utc()),
                'week' => $period(now($tz)->subDays(6)->startOfDay()->utc()),
                'month' => $period(now($tz)->subDays(29)->startOfDay()->utc()),
                'all' => $period(null),
            ],
            'range' => $period($since),
            'series' => $series,
            'by_plan' => $byPlan,
            'subscribers' => ['premium_active' => $active, 'paying_active' => $paying],
            'avg_order' => round((float) Order::query()->where('status', 'paid')->avg('total'), 2),
            'pending' => Order::query()->where('status', 'pending')->where('created_at', '>=', now()->subDay())->count(),
        ]);
    }

    /** Premium members now: who, which plan, from where, until when. */
    public function subscribers(Request $request): JsonResponse
    {
        $status = $request->query('status', 'active');
        $q = \App\Models\Subscription::query()->with('plan:id,name', 'user:id,name,email,premium_until')
            ->when($status === 'active', fn ($q) => $q->where('status', 'active')->where('ends_at', '>', now()))
            ->when($status === 'expiring', fn ($q) => $q->where('status', 'active')->whereBetween('ends_at', [now(), now()->addDays(7)]))
            ->when($status === 'ended', fn ($q) => $q->where(fn ($w) => $w->where('status', '!=', 'active')->orWhere('ends_at', '<=', now())))
            ->when($request->query('source'), fn ($q, $s) => $q->where('source', $s))
            ->when(is_string($request->query('q')) ? $request->query('q') : null, fn ($q, $s) => $q->whereHas('user', fn ($u) => $u->where('email', 'like', "%{$s}%")->orWhere('name', 'like', "%{$s}%")))
            ->latest('starts_at');

        return response()->json($q->paginate(25)->toArray() + ['counts' => [
            'active' => \App\Models\Subscription::query()->where('status', 'active')->where('ends_at', '>', now())->count(),
            'expiring' => \App\Models\Subscription::query()->where('status', 'active')->whereBetween('ends_at', [now(), now()->addDays(7)])->count(),
        ]]);
    }

    public function orders(Request $request): JsonResponse
    {
        $q = Order::query()->with('user:id,name,email', 'plan:id,name', 'coupon:id,code')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when(is_string($request->query('q')) ? $request->query('q') : null, fn ($q, $s) => $q->where(fn ($w) => $w->where('uuid', 'like', "%{$s}%")->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$s}%"))))
            ->latest();

        return response()->json($q->paginate(25));
    }

    public function refundOrder(Request $request, Order $order): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403, 'İadeyi yalnızca yöneticiler yapabilir.');
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
            'brand.tagline' => ['sometimes', 'nullable', 'string', 'max:140'],
            'contact.email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'contact.phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'contact.address' => ['sometimes', 'nullable', 'string', 'max:300'],
            'social.instagram' => ['sometimes', 'nullable', 'url:https', 'max:300'],
            'social.youtube' => ['sometimes', 'nullable', 'url:https', 'max:300'],
            'social.tiktok' => ['sometimes', 'nullable', 'url:https', 'max:300'],
            'social.linkedin' => ['sometimes', 'nullable', 'url:https', 'max:300'],
            'social.x' => ['sometimes', 'nullable', 'url:https', 'max:300'],
            'seo.description' => ['sometimes', 'nullable', 'string', 'max:300'],
            'features.duel' => ['sometimes', 'boolean'],
            'features.ai' => ['sometimes', 'boolean'],
            'features.stories' => ['sometimes', 'boolean'],
            'features.exam' => ['sometimes', 'boolean'],
            'features.chest_partners' => ['sometimes', 'boolean'],
            'features.social_login' => ['sometimes', 'boolean'],
            'features.leagues' => ['sometimes', 'boolean'],
            'corporate.enabled' => ['sometimes', 'boolean'],
            'corporate.name' => ['sometimes', 'nullable', 'string', 'max:60'],
            'corporate.tagline' => ['sometimes', 'nullable', 'string', 'max:140'],
            'corporate.price' => ['sometimes', 'nullable', 'string', 'max:40'],
            'corporate.note' => ['sometimes', 'nullable', 'string', 'max:140'],
            'corporate.features' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'corporate.cta' => ['sometimes', 'nullable', 'string', 'max:40'],
            'corporate.url' => ['sometimes', 'nullable', 'string', 'max:300', 'regex:~^(/[^/\\s]|https://)~'],
            'gamification.daily_chest' => ['sometimes', 'boolean'],
            'auth.remember_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
        ]);
        // dotted keys arrive nested, flatten
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

    /**
     * Upload a new avatar image (square PNG, JPG or WebP). Stored on the public
     * disk under a random name; the file type is checked from its content.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'image' => ['required', 'file', 'mimes:png,jpg,jpeg,webp', 'max:'.config('dilgo.avatars.upload_max_kb'), 'dimensions:min_width=128,min_height=128,max_width=2048,max_height=2048'],
            'label' => ['required', 'string', 'max:60'],
            'tier' => ['required', 'in:standard,premium'],
        ]);
        $path = $request->file('image')->store('avatars', 'public');
        $key = 'u'.\Illuminate\Support\Str::lower(\Illuminate\Support\Str::random(10));
        $avatar = \App\Models\Avatar::query()->create([
            'key' => $key, 'label' => strip_tags($data['label']), 'tier' => $data['tier'], 'image_path' => $path,
            'position' => (int) \App\Models\Avatar::query()->max('position') + 1,
        ]);
        Audit::log('admin.avatar.uploaded', $request->user(), $avatar);

        return response()->json(['data' => $avatar->toArray() + ['url' => $avatar->url()]], 201);
    }

    /**
     * Send the newsletter to confirmed, still-subscribed addresses (or to one test
     * address first). Every e-mail carries its own one-click unsubscribe link.
     */
    public function sendNewsletter(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'min:3', 'max:150'],
            'body' => ['required', 'string', 'min:10', 'max:10000'],
            'cta_label' => ['nullable', 'string', 'max:40', 'required_with:cta_url'],
            'cta_url' => ['nullable', 'url', 'max:500'],
            'test_email' => ['nullable', 'email'],
        ]);
        $lines = array_values(array_filter(array_map('trim', preg_split('/\n{2,}/', strip_tags($data['body'])))));
        $base = config('dilgo.brand.frontend_url');
        $send = function (string $email, ?string $token) use ($data, $lines, $base) {
            $footer = $token ? 'Bu e-postayı DilGO bültenine abone olduğun için aldın. Çıkmak için: '.$base.'/newsletter/unsubscribe/'.$token : '(Deneme gönderimi)';
            \Illuminate\Support\Facades\Mail::to($email)->queue(new \App\Mail\NoticeMail($data['subject'], $data['subject'], [...$lines, $footer], $data['cta_label'] ?? null, $data['cta_url'] ?? null));
        };
        if (! empty($data['test_email'])) {
            $send($data['test_email'], null);

            return response()->json(['sent' => 1, 'test' => true]);
        }
        $count = 0;
        \App\Models\NewsletterSubscriber::query()->whereNotNull('confirmed_at')->whereNull('unsubscribed_at')
            ->chunkById(200, function ($subs) use ($send, &$count) {
                foreach ($subs as $s) {
                    $send($s->email, $s->token);
                    $count++;
                }
            });
        \App\Support\Audit::log('newsletter.sent', $request->user(), null, ['subject' => $data['subject'], 'recipients' => $count]);

        return response()->json(['sent' => $count, 'test' => false]);
    }
}
