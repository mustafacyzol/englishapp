<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\DailyActivity;
use App\Models\Duel;
use App\Models\LeagueMembership;
use App\Models\Quest;
use App\Models\RewardClaim;
use App\Models\RewardItem;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserItem;
use App\Models\UserQuest;
use App\Models\XpEvent;
use App\Notifications\AchievementUnlocked;
use App\Support\Period;
use App\Support\Skills;
use Illuminate\Support\Facades\DB;

class GamificationService
{
    /** Metrics tracked in daily_activities and usable by quests. */
    public const METRICS = ['lessons', 'stories', 'reviews', 'ai_messages', 'speaking', 'perfect_lessons', 'minutes'];

    public function __construct(
        private readonly LeagueService $leagues,
        private readonly RewardService $rewards,
    ) {}

    /**
     * Central entry point: every learning action flows through here so XP, streak,
     * league, quests and achievements always stay consistent.
     *
     * @param  array<string,int>  $metrics  e.g. ['lessons' => 1, 'perfect_lessons' => 1]
     * @param  array<string,float>  $skills  how the XP splits across the four skills, e.g. ['reading' => .5, 'listening' => .5]
     */
    public function record(User $user, int $baseXp, string $source, ?int $sourceId = null, array $metrics = [], array $skills = []): array
    {
        return DB::transaction(function () use ($user, $baseXp, $source, $sourceId, $metrics, $skills) {
            $user->refresh();
            $levelBefore = $user->level();
            $multiplier = $this->xpMultiplier($user);
            $xp = (int) round($baseXp * $multiplier);
            $today = Period::today();

            if ($xp > 0) {
                XpEvent::query()->create([
                    'user_id' => $user->id,
                    'amount' => $xp,
                    'source' => $source,
                    'source_id' => $sourceId,
                    'week_key' => Period::weekKey(),
                ]);
                $user->xp_total += $xp;
            }

            $activity = DailyActivity::query()->firstOrCreate(['user_id' => $user->id, 'date' => $today]);
            $activity->xp += $xp;
            $skillXp = Skills::split($xp, $skills);
            foreach ($skillXp as $skill => $amount) {
                $activity->{"xp_{$skill}"} += $amount;
            }
            foreach ($metrics as $metric => $amount) {
                if (in_array($metric, self::METRICS, true)) {
                    $activity->{$metric} += $amount;
                }
            }
            $goalJustMet = ! $activity->goal_met && $activity->xp >= $user->daily_goal_xp;
            $activity->goal_met = $activity->goal_met || $goalJustMet;
            $activity->save();

            $streakExtended = $xp > 0 ? $this->touchStreak($user) : false;
            $user->last_active_at = now();
            $user->save();

            if ($xp > 0) {
                $this->leagues->addXp($user, $xp);
            }

            $quests = $this->progressQuests($user, $metrics + ['xp' => $xp]);
            $achievements = $this->checkAchievements($user);
            $levelAfter = $user->level();
            $rewards = $this->roadmapRewards($user, $goalJustMet, $levelBefore, $levelAfter);

            return [
                'xp_gained' => $xp,
                'skill_xp' => (object) $skillXp,
                'multiplier' => $multiplier,
                'xp_total' => $user->xp_total,
                'level' => $levelAfter,
                'level_up' => $levelAfter > $levelBefore,
                'streak' => $user->streak_current,
                'streak_extended' => $streakExtended,
                'daily_xp' => $activity->xp,
                'daily_goal' => $user->daily_goal_xp,
                'goal_met_now' => $goalJustMet,
                'quests_completed' => $quests,
                'achievements' => $achievements,
                'rewards' => $rewards,
                'gems' => $user->fresh()->gems,
            ];
        });
    }

    /**
     * Grants the fixed reward roadmap: daily-goal gems, level-up gems (+ a chest
     * every N levels) and streak milestones. Each is claimed at most once.
     *
     * @return list<array{title:string, icon:string, gems?:int, item?:string}>
     */
    public function roadmapRewards(User $user, bool $goalJustMet, int $levelBefore, int $levelAfter): array
    {
        $cfg = config('dilgo.rewards');
        $out = [];

        if ($goalJustMet && $this->claim($user, 'goal:'.Period::today())) {
            $user->increment('gems', $cfg['daily_goal_gems']);
            $out[] = ['title' => 'Günlük hedef bonusu', 'icon' => 'gem', 'gems' => $cfg['daily_goal_gems']];
        }

        for ($lvl = $levelBefore + 1; $lvl <= $levelAfter; $lvl++) {
            if (! $this->claim($user, "level:{$lvl}")) {
                continue;
            }
            $user->increment('gems', $cfg['level_up_gems']);
            $out[] = ['title' => "Seviye {$lvl} ödülü", 'icon' => 'gem', 'gems' => $cfg['level_up_gems']];
            if ($lvl % $cfg['level_chest_every'] === 0) {
                $card = $this->rewards->grant($user, 'mystery_chest', 'level', ['level' => $lvl]);
                $out[] = ['title' => "Seviye {$lvl}: Gizemli Sandık", 'icon' => 'chest', 'item' => $card->item->name];
            }
        }

        foreach ($cfg['streak_milestones'] as $days => $reward) {
            if ($user->streak_current < $days || ! $this->claim($user, "streak:{$days}")) {
                continue;
            }
            if (! empty($reward['gems'])) {
                $user->increment('gems', $reward['gems']);
                $out[] = ['title' => "{$days} günlük seri", 'icon' => 'flame', 'gems' => $reward['gems']];
            }
            if (! empty($reward['item'])) {
                $card = $this->rewards->grant($user, $reward['item'], 'streak', ['days' => $days]);
                $out[] = ['title' => "{$days} günlük seri: {$card->item->name}", 'icon' => $card->item->icon, 'item' => $card->item->name];
            }
        }

        return $out;
    }

    private function claim(User $user, string $key): bool
    {
        return RewardClaim::query()->firstOrCreate(['user_id' => $user->id, 'key' => $key])->wasRecentlyCreated;
    }

    /** Upcoming roadmap rewards with progress, for the dashboard and the Ödüller page. */
    public function roadmap(User $user): array
    {
        $cfg = config('dilgo.rewards');
        $claimed = RewardClaim::query()->where('user_id', $user->id)->pluck('key')->flip();
        $items = RewardItem::query()->pluck('name', 'key');
        $icons = RewardItem::query()->pluck('icon', 'key');
        $streak = $this->effectiveStreak($user);

        $milestones = collect($cfg['streak_milestones'])->map(fn ($r, $days) => [
            'kind' => 'streak',
            'days' => $days,
            'title' => ! empty($r['item']) ? $items[$r['item']] ?? $r['item'] : "{$r['gems']} elmas",
            'icon' => ! empty($r['item']) ? $icons[$r['item']] ?? 'chest' : 'gem',
            'gems' => $r['gems'] ?? 0,
            'claimed' => $claimed->has("streak:{$days}"),
            'current' => min($streak, $days),
            'target' => $days,
            'unit' => 'gün',
        ])->values();

        $level = $user->level();
        $nextChest = (int) (ceil(($level + 1) / $cfg['level_chest_every']) * $cfg['level_chest_every']);

        $next = [];
        if ($m = $milestones->firstWhere('claimed', false)) {
            $next[] = $m;
        }
        $next[] = ['kind' => 'level', 'title' => "Seviye {$nextChest}: Gizemli Sandık", 'icon' => 'chest', 'current' => $user->xp_total, 'target' => User::xpForLevel($nextChest), 'unit' => 'XP'];

        return [
            'streak' => $streak,
            'level' => $level,
            'milestones' => $milestones,
            'level_up_gems' => $cfg['level_up_gems'],
            'level_chest_every' => $cfg['level_chest_every'],
            'daily_goal_gems' => $cfg['daily_goal_gems'],
            'next' => $next,
        ];
    }

    public function xpMultiplier(User $user): float
    {
        $boost = UserItem::query()
            ->where('user_id', $user->id)->where('status', 'active')
            ->where('expires_at', '>', now())
            ->whereHas('item', fn ($q) => $q->where('type', 'xp_boost'))
            ->with('item')->get()
            ->max(fn (UserItem $i) => (float) ($i->item->value['multiplier'] ?? 1));

        return max(1.0, (float) ($boost ?? 1));
    }

    /**
     * Extends the streak for today's first XP. Consumes streak freezes to bridge missed days.
     */
    public function touchStreak(User $user): bool
    {
        $today = Period::now()->startOfDay();
        $last = $user->streak_last_date ? Period::now()->setDateFrom($user->streak_last_date)->startOfDay() : null;

        if ($last && $last->equalTo($today)) {
            return false;
        }

        $gap = $last ? (int) $last->diffInDays($today) : null;

        if ($gap === 1) {
            $user->streak_current++;
        } elseif ($gap !== null && $gap > 1) {
            $missed = $gap - 1;
            $freezes = UserItem::query()->where('user_id', $user->id)->where('status', 'available')
                ->whereHas('item', fn ($q) => $q->where('type', 'streak_freeze'))
                ->orderBy('id')->limit($missed)->get();

            if ($freezes->count() >= $missed && $user->streak_current > 0) {
                $freezes->each->update(['status' => 'used', 'activated_at' => now()]);
                for ($i = 1; $i <= $missed; $i++) {
                    DailyActivity::query()->updateOrCreate(
                        ['user_id' => $user->id, 'date' => $last->addDays($i)->toDateString()],
                        ['freeze_used' => true]
                    );
                }
                $user->streak_current++;
            } else {
                $user->streak_current = 1;
            }
        } else {
            $user->streak_current = 1;
        }

        $user->streak_last_date = $today->toDateString();
        $user->streak_longest = max($user->streak_longest, $user->streak_current);

        return true;
    }

    /** Streak shown to the user: 0 if they already missed a day without enough freezes. */
    public function effectiveStreak(User $user): int
    {
        if (! $user->streak_last_date) {
            return 0;
        }
        $gap = (int) Period::now()->startOfDay()->diffInDays(Period::now()->setDateFrom($user->streak_last_date)->startOfDay(), true);
        if ($gap <= 1) {
            return $user->streak_current;
        }
        $freezes = UserItem::query()->where('user_id', $user->id)->where('status', 'available')
            ->whereHas('item', fn ($q) => $q->where('type', 'streak_freeze'))->count();

        return $freezes >= $gap - 1 ? $user->streak_current : 0;
    }

    /** @return list<array> quests completed by this action */
    public function progressQuests(User $user, array $metrics): array
    {
        $completed = [];
        $quests = Quest::query()->where('is_active', true)->whereIn('metric', array_keys(array_filter($metrics)))->get();

        foreach ($quests as $quest) {
            $uq = UserQuest::query()->firstOrCreate([
                'user_id' => $user->id,
                'quest_id' => $quest->id,
                'period_key' => $this->questPeriodKey($quest),
            ]);
            if ($uq->completed_at) {
                continue;
            }
            $uq->progress = min($quest->target, $uq->progress + $metrics[$quest->metric]);
            if ($uq->progress >= $quest->target) {
                $uq->completed_at = now();
                $completed[] = ['id' => $uq->id, 'title' => $quest->title, 'reward_gems' => $quest->reward_gems];
            }
            $uq->save();
        }

        return $completed;
    }

    public function questPeriodKey(Quest $quest): string
    {
        return $quest->period === 'weekly' ? Period::weekKey() : Period::today();
    }

    public function claimQuest(User $user, UserQuest $uq): array
    {
        abort_unless($uq->user_id === $user->id, 404);
        abort_if(! $uq->completed_at, 422, 'Görev henüz tamamlanmadı.');
        abort_if((bool) $uq->claimed_at, 422, 'Ödül zaten alındı.');

        return DB::transaction(function () use ($user, $uq) {
            $uq->update(['claimed_at' => now()]);
            $quest = $uq->quest;
            $user->increment('gems', $quest->reward_gems);
            $item = $quest->reward_item_key ? $this->rewards->grant($user, $quest->reward_item_key, 'quest') : null;
            if ($quest->reward_xp > 0) {
                $this->record($user, $quest->reward_xp, 'quest', $quest->id);
            }

            return ['gems' => $quest->reward_gems, 'xp' => $quest->reward_xp, 'item' => $item?->load('item')];
        });
    }

    public function metricValue(User $user, string $metric): int
    {
        return match ($metric) {
            'xp_total' => $user->xp_total,
            'level' => $user->level(),
            'streak' => $user->streak_longest,
            'lessons_completed' => $user->lessonProgress()->whereNotNull('completed_at')->count(),
            'stories_read' => $user->storyReads()->whereNotNull('completed_at')->count(),
            'words_saved' => $user->words()->count(),
            'words_mastered' => $user->words()->where('interval_days', '>=', 21)->count(),
            'ai_messages' => (int) $user->dailyActivities()->sum('ai_messages'),
            'speaking' => (int) $user->dailyActivities()->sum('speaking'),
            'perfect_lessons' => (int) $user->dailyActivities()->sum('perfect_lessons'),
            'reviews' => (int) $user->dailyActivities()->sum('reviews'),
            'goal_days' => $user->dailyActivities()->where('goal_met', true)->count(),
            'referrals' => $user->referrals()->where('status', '!=', 'pending')->count(),
            'league_top3' => $user->hasMany(LeagueMembership::class)->where('final_rank', '<=', 3)->count(),
            'league_tier' => $user->league_tier,
            'duel_wins' => $user->hasMany(Duel::class)->where('result', 'win')->count(),
            'duel_trophies' => $user->duel_best,
            'skills_balanced' => $this->balancedSkillLevel($user),
            default => 0,
        };
    }

    /** @return list<array> newly unlocked achievements */
    public function checkAchievements(User $user): array
    {
        $unlockedIds = UserAchievement::query()->where('user_id', $user->id)->pluck('achievement_id');
        $pending = Achievement::query()->whereNotIn('id', $unlockedIds)->orderBy('threshold')->get();
        $cache = [];
        $new = [];

        foreach ($pending as $achievement) {
            $value = $cache[$achievement->metric] ??= $this->metricValue($user, $achievement->metric);
            if ($value < $achievement->threshold) {
                continue;
            }
            UserAchievement::query()->create([
                'user_id' => $user->id,
                'achievement_id' => $achievement->id,
                'unlocked_at' => now(),
            ]);
            if ($achievement->reward_gems) {
                $user->increment('gems', $achievement->reward_gems);
            }
            if ($achievement->reward_item_key) {
                $this->rewards->grant($user, $achievement->reward_item_key, 'achievement');
            }
            $user->notify(new AchievementUnlocked($achievement));
            $new[] = $achievement->only(['id', 'key', 'title', 'description', 'tier', 'icon', 'category', 'reward_gems']);
        }

        return $new;
    }

    /**
     * Per-skill XP totals, levels and a 7-day trend — the four-skill report card.
     *
     * @return array{skills: list<array>, weakest: string, strongest: string, balance: int}
     */
    public function skillReport(User $user): array
    {
        $cols = array_map(fn ($s) => "xp_{$s}", Skills::ALL);
        $totals = DB::table('daily_activities')->where('user_id', $user->id)
            ->selectRaw(implode(', ', array_map(fn ($c) => "COALESCE(SUM({$c}),0) as {$c}", $cols)))->first();
        $since = Period::now()->subDays(6)->toDateString();
        $recent = DailyActivity::query()->where('user_id', $user->id)->where('date', '>=', $since)->get()->keyBy(fn ($a) => substr((string) $a->date, 0, 10));
        $days = collect(range(6, 0))->map(fn ($i) => Period::now()->subDays($i)->toDateString());

        $skills = [];
        foreach (Skills::ALL as $s) {
            $xp = (int) ($totals->{"xp_{$s}"} ?? 0);
            $level = Skills::level($xp);
            $floor = Skills::levelFloor($level);
            $ceil = Skills::levelFloor($level + 1);
            $trend = $days->map(fn ($d) => (int) ($recent[$d]->{"xp_{$s}"} ?? 0))->all();
            $skills[] = [
                'key' => $s,
                'label' => Skills::LABELS[$s],
                'xp' => $xp,
                'level' => $level,
                'progress' => $ceil > $floor ? round(($xp - $floor) / ($ceil - $floor), 3) : 0,
                'to_next' => $ceil - $xp,
                'week_xp' => array_sum($trend),
                'trend' => $trend,
            ];
        }
        $byXp = collect($skills)->sortBy('xp');
        $weakest = $byXp->first()['key'];
        // When everything is tied (a new learner) start from the skill they told us to focus on.
        if ($byXp->first()['xp'] === $byXp->last()['xp'] && $user->focus_skill) {
            $weakest = $user->focus_skill;
        }
        $max = max(1, $byXp->last()['xp']);
        $balance = (int) round(collect($skills)->avg(fn ($s) => $s['xp'] / $max) * 100);

        return ['skills' => $skills, 'weakest' => $weakest, 'strongest' => $byXp->last()['key'], 'balance' => $byXp->last()['xp'] === 0 ? 0 : $balance];
    }

    /** The lowest of the four skill levels — a badge family rewards keeping all four up together. */
    public function balancedSkillLevel(User $user): int
    {
        return (int) collect($this->skillReport($user)['skills'])->min('level');
    }
}
