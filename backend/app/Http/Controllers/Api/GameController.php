<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Presenters\UserPresenter;
use App\Models\Achievement;
use App\Models\DailyActivity;
use App\Models\Quest;
use App\Models\RedeemCode;
use App\Models\RedeemCodeUse;
use App\Models\RewardItem;
use App\Models\Story;
use App\Models\User;
use App\Models\UserItem;
use App\Models\UserQuest;
use App\Services\GamificationService;
use App\Services\HeartService;
use App\Services\LeagueService;
use App\Services\RewardService;
use App\Support\Audit;
use App\Support\Period;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GameController extends Controller
{
    public function __construct(
        private readonly GamificationService $game,
        private readonly RewardService $rewards,
    ) {}

    /** Home dashboard payload: everything the top bar + home screen need in one request. */
    public function dashboard(Request $request, LeagueService $leagues): JsonResponse
    {
        $user = $request->user();
        $today = DailyActivity::query()->where('user_id', $user->id)->where('date', Period::today())->first();
        $standings = $leagues->standings($user);
        $me = collect($standings['rows'])->firstWhere('is_me', true);
        $skills = $this->game->skillReport($user);

        return response()->json([
            'user' => UserPresenter::me($user),
            'today' => [
                'xp' => $today->xp ?? 0,
                'goal' => $user->daily_goal_xp,
                'goal_met' => (bool) ($today->goal_met ?? false),
                'lessons' => $today->lessons ?? 0,
                'minutes' => $today->minutes ?? 0,
            ],
            'week' => $this->week($user),
            'skills' => $skills,
            'plan' => $this->dailyPlan($user, $today, $skills),
            'quests' => $this->questList($user, 'daily'),
            'league' => [
                'tier' => $standings['tier'],
                'tier_name' => $standings['tier_name'],
                'rank' => $me['rank'] ?? null,
                'xp' => $me['xp'] ?? 0,
                'size' => count($standings['rows']),
                'ends_at' => $standings['ends_at'],
            ],
            'next_rewards' => $this->game->roadmap($user)['next'],
            'due_words' => $user->words()->where('due_at', '<=', now())->count(),
            'unread_notifications' => $user->unreadNotifications()->count(),
            'available_items' => $user->items()->where('status', 'available')->count(),
            'announcement' => Settings::get('announcement'),
        ]);
    }

    /** Four-skill report card: totals, levels, 7-day trends and the skill to work on next. */
    public function skills(Request $request): JsonResponse
    {
        return response()->json($this->game->skillReport($request->user()));
    }

    /**
     * Today's plan: one small task per skill, the weakest (or the learner's chosen
     * focus) first — so no skill is ever left behind and there's always a next step.
     */
    private function dailyPlan(User $user, ?DailyActivity $today, array $skills): array
    {
        $interests = $user->interests ?? [];
        $story = Story::query()->where('is_published', true)
            ->where('cefr_level', '<=', $user->cefr_level)
            ->whereNotIn('id', $user->storyReads()->whereNotNull('completed_at')->pluck('story_id'))
            ->when($interests, fn ($q) => $q->orderByRaw('CASE WHEN category IN ('.implode(',', array_fill(0, count($interests), '?')).') THEN 0 ELSE 1 END', $interests))
            ->orderBy('cefr_level', 'desc')->first(['slug', 'title', 'reading_minutes']);

        $tasks = [
            'reading' => ['title' => $story ? "Oku: {$story->title}" : 'Bir hikâye oku', 'detail' => $story ? "{$story->reading_minutes} dk · seviyene göre" : 'Kütüphaneden seç', 'to' => $story ? "/stories/{$story->slug}" : '/stories', 'minutes' => $story->reading_minutes ?? 4],
            'listening' => ['title' => 'Dinle ve yakala', 'detail' => 'Bir hikâyeyi sesli dinle ya da dinleme turu yap', 'to' => $story ? "/stories/{$story->slug}?listen=1" : '/practice', 'minutes' => 3],
            'speaking' => ['title' => 'Defne ile 3 dakika konuş', 'detail' => 'Sesli arama · telaffuzun anında düzelir', 'to' => '/ai?call=1', 'minutes' => 3],
            'writing' => ['title' => 'Yazma atölyesi', 'detail' => 'Kısa bir metin yaz, Defne işaretlesin', 'to' => '/ai/writing', 'minutes' => 5],
        ];
        $order = collect($skills['skills'])->sortBy('xp')->pluck('key')->all();
        if ($user->focus_skill && ($i = array_search($user->focus_skill, $order, true)) !== false) {
            array_splice($order, $i, 1);
            array_unshift($order, $user->focus_skill);
        }

        return array_map(fn ($s) => $tasks[$s] + [
            'skill' => $s,
            'done' => (int) ($today?->{"xp_{$s}"} ?? 0) > 0,
            'focus' => $s === $user->focus_skill,
            'weakest' => $s === $skills['weakest'],
        ], $order);
    }

    private function week(User $user): array
    {
        $start = Period::now()->startOfWeek();
        $rows = DailyActivity::query()->where('user_id', $user->id)
            ->whereBetween('date', [$start->toDateString(), $start->addDays(6)->toDateString()])
            ->get()->keyBy(fn ($r) => substr((string) $r->date, 0, 10));

        return collect(range(0, 6))->map(function ($i) use ($start, $rows) {
            $d = $start->addDays($i)->toDateString();
            $r = $rows->get($d);

            return ['date' => $d, 'xp' => $r->xp ?? 0, 'goal_met' => (bool) ($r->goal_met ?? false), 'freeze' => (bool) ($r->freeze_used ?? false)];
        })->all();
    }

    /** 26-week heatmap for the profile page. */
    public function calendar(Request $request): JsonResponse
    {
        $from = Period::now()->subWeeks(26)->startOfWeek()->toDateString();

        return response()->json([
            'data' => DailyActivity::query()->where('user_id', $request->user()->id)->where('date', '>=', $from)
                ->orderBy('date')->get(['date', 'xp', 'goal_met', 'freeze_used', 'lessons', 'stories', 'minutes']),
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $u = $request->user();
        $metrics = ['lessons_completed', 'stories_read', 'words_saved', 'words_mastered', 'ai_messages', 'speaking', 'perfect_lessons', 'goal_days'];

        return response()->json(['data' => collect($metrics)->mapWithKeys(fn ($m) => [$m => $this->game->metricValue($u, $m)])->all()
            + ['minutes' => (int) $u->dailyActivities()->sum('minutes'), 'xp_total' => $u->xp_total]]);
    }

    private function questList(User $user, ?string $period = null): array
    {
        $quests = Quest::query()->where('is_active', true)->when($period, fn ($q) => $q->where('period', $period))->orderBy('period')->orderBy('target')->get();

        return $quests->map(function (Quest $q) use ($user) {
            $uq = UserQuest::query()->firstOrCreate(['user_id' => $user->id, 'quest_id' => $q->id, 'period_key' => $this->game->questPeriodKey($q)]);

            return [
                'id' => $uq->id,
                'title' => $q->title,
                'metric' => $q->metric,
                'period' => $q->period,
                'target' => $q->target,
                'progress' => $uq->progress,
                'completed' => (bool) $uq->completed_at,
                'claimed' => (bool) $uq->claimed_at,
                'reward_gems' => $q->reward_gems,
                'reward_xp' => $q->reward_xp,
                'reward_item_key' => $q->reward_item_key,
            ];
        })->all();
    }

    public function quests(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->questList($request->user()),
            'resets' => ['daily' => Period::now()->endOfDay()->toIso8601String(), 'weekly' => Period::weekEndsAt()->toIso8601String()],
        ]);
    }

    public function claimQuest(Request $request, UserQuest $userQuest): JsonResponse
    {
        $result = $this->game->claimQuest($request->user(), $userQuest);

        return response()->json($result + ['user' => UserPresenter::me($request->user()->fresh())]);
    }

    public function achievements(Request $request): JsonResponse
    {
        $user = $request->user();
        $unlocked = $user->userAchievements()->get()->keyBy('achievement_id');
        $cache = [];

        $data = Achievement::query()->orderBy('position')->orderBy('threshold')->get()
            ->map(function (Achievement $a) use ($unlocked, $user, &$cache) {
                $ua = $unlocked->get($a->id);
                $value = $cache[$a->metric] ??= $this->game->metricValue($user, $a->metric);

                return [
                    'id' => $a->id,
                    'key' => $a->key,
                    'title' => $a->is_hidden && ! $ua ? '???' : $a->title,
                    'description' => $a->is_hidden && ! $ua ? 'Gizli rozet — keşfetmeye devam et.' : $a->description,
                    'category' => $a->category,
                    'tier' => $a->tier,
                    'icon' => $a->icon,
                    'threshold' => $a->threshold,
                    'progress' => min($value, $a->threshold),
                    'reward_gems' => $a->reward_gems,
                    'unlocked_at' => $ua?->unlocked_at?->toIso8601String(),
                    'seen' => (bool) $ua?->seen_at,
                ];
            });
        $user->userAchievements()->whereNull('seen_at')->update(['seen_at' => now()]);

        return response()->json(['data' => $data]);
    }

    public function league(Request $request, LeagueService $leagues): JsonResponse
    {
        return response()->json($leagues->standings($request->user()));
    }

    public function hearts(Request $request, HeartService $hearts): JsonResponse
    {
        return response()->json($hearts->sync($request->user()));
    }

    public function refillHearts(Request $request, HeartService $hearts): JsonResponse
    {
        $user = $request->user();
        $price = (int) Settings::get('gamification.heart_refill_gems');
        $state = $hearts->sync($user);
        abort_if($state['unlimited'] || $state['hearts'] >= User::MAX_HEARTS, 422, 'Canların zaten dolu.');

        DB::transaction(function () use ($user, $price) {
            $fresh = User::query()->lockForUpdate()->find($user->id);
            if ($fresh->gems < $price) {
                throw ValidationException::withMessages(['gems' => 'Yeterli elmasın yok.']);
            }
            $fresh->forceFill(['gems' => $fresh->gems - $price, 'hearts' => User::MAX_HEARTS, 'hearts_updated_at' => null])->save();
        });

        return response()->json(['user' => UserPresenter::me($user->fresh())]);
    }

    /** "Practice to earn a heart" — a short review session restores one heart. */
    public function earnHeart(Request $request, HeartService $hearts): JsonResponse
    {
        $data = $request->validate(['correct' => ['required', 'integer', 'min:5']]);
        $user = $request->user();
        $hearts->sync($user);
        if ($user->hearts < User::MAX_HEARTS) {
            $user->forceFill(['hearts' => $user->hearts + 1])->save();
        }

        return response()->json(['hearts' => $hearts->sync($user->fresh())]);
    }

    public function shop(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'items' => RewardItem::query()->where('is_active', true)->whereNotNull('price_gems')->orderBy('position')->get(),
            'gems' => $user->gems,
            'heart_refill_gems' => (int) Settings::get('gamification.heart_refill_gems'),
        ]);
    }

    public function buy(Request $request, RewardItem $item): JsonResponse
    {
        $owned = $this->rewards->buy($request->user(), $item);

        return response()->json(['item' => $owned->load('item'), 'user' => UserPresenter::me($request->user()->fresh())], 201);
    }

    public function inventory(Request $request): JsonResponse
    {
        $user = $request->user();
        // expire timed items lazily
        $user->items()->where('status', 'active')->whereNotNull('expires_at')->where('expires_at', '<', now())->update(['status' => 'expired']);

        return response()->json([
            'data' => $user->items()->with('item')->orderByRaw("CASE status WHEN 'available' THEN 0 WHEN 'active' THEN 1 ELSE 2 END")->latest()->limit(100)->get(),
        ]);
    }

    public function activate(Request $request, UserItem $userItem): JsonResponse
    {
        $result = $this->rewards->activate($request->user(), $userItem);
        Audit::log('item.activated', $request->user(), $userItem);

        return response()->json($result + ['user' => UserPresenter::me($request->user()->fresh())]);
    }

    public function redeem(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:40']]);
        $user = $request->user();

        return DB::transaction(function () use ($data, $user) {
            $code = RedeemCode::query()->whereRaw('UPPER(code) = ?', [strtoupper(trim($data['code']))])->lockForUpdate()->first();
            $invalid = fn (string $m) => throw ValidationException::withMessages(['code' => $m]);

            if (! $code || ! $code->is_active) {
                $invalid('Kod geçersiz.');
            }
            if ($code->expires_at?->isPast()) {
                $invalid('Kodun süresi dolmuş.');
            }
            if ($code->used_count >= $code->max_uses) {
                $invalid('Kod kullanım limitine ulaştı.');
            }
            if (RedeemCodeUse::query()->where('redeem_code_id', $code->id)->where('user_id', $user->id)->exists()) {
                $invalid('Bu kodu zaten kullandın.');
            }

            RedeemCodeUse::query()->create(['redeem_code_id' => $code->id, 'user_id' => $user->id]);
            $code->increment('used_count');

            $message = match ($code->type) {
                'premium_days' => (function () use ($user, $code) {
                    $this->rewards->grantPremiumDays($user, $code->amount, 'redeem');

                    return "{$code->amount} gün Premium hesabına tanımlandı!";
                })(),
                'gems' => (function () use ($user, $code) {
                    $user->increment('gems', $code->amount);

                    return "{$code->amount} elmas hesabına eklendi!";
                })(),
                'item' => (function () use ($user, $code) {
                    $item = $this->rewards->grant($user, $code->item, 'redeem');

                    return $item->item->name.' ödül kasana eklendi!';
                })(),
                default => 'Kod kullanıldı.',
            };
            Audit::log('redeem.used', $user, $code);

            return response()->json(['message' => $message, 'type' => $code->type, 'user' => UserPresenter::me($user->fresh())]);
        });
    }

    public function roadmap(Request $request): JsonResponse
    {
        return response()->json($this->game->roadmap($request->user()));
    }

    public function referrals(Request $request): JsonResponse
    {
        $user = $request->user();
        $list = $user->referrals()->with('referee:id,name,username,avatar,created_at')->latest()->limit(100)->get();

        return response()->json([
            'code' => $user->referral_code,
            'link' => config('dilgo.brand.frontend_url').'/r/'.$user->referral_code,
            'rewards' => [
                'referee_gems' => (int) Settings::get('referral.referee_gems'),
                'referrer_gems' => (int) Settings::get('referral.referrer_gems'),
                'referrer_premium_days' => (int) Settings::get('referral.referrer_premium_days'),
            ],
            'stats' => [
                'total' => $list->count(),
                'qualified' => $list->where('status', '!=', 'pending')->count(),
                'rewarded' => $list->where('status', 'rewarded')->count(),
            ],
            'data' => $list->map(fn ($r) => ['name' => $r->referee?->name, 'username' => $r->referee?->username, 'avatar' => $r->referee?->avatar, 'status' => $r->status, 'joined_at' => $r->created_at->toIso8601String()]),
        ]);
    }

    public function profile(string $username): JsonResponse
    {
        $user = User::query()->where('username', $username)->where('is_banned', false)->firstOrFail();
        $badges = $user->userAchievements()->with('achievement:id,key,title,tier,icon,category')->latest('unlocked_at')->limit(12)->get()->pluck('achievement');

        return response()->json(['user' => UserPresenter::public($user), 'badges' => $badges]);
    }
}
