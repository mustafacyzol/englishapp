<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\DailyActivity;
use App\Models\LeagueMembership;
use App\Models\Quest;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserItem;
use App\Models\UserQuest;
use App\Models\XpEvent;
use App\Notifications\AchievementUnlocked;
use App\Support\Period;
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
     */
    public function record(User $user, int $baseXp, string $source, ?int $sourceId = null, array $metrics = []): array
    {
        return DB::transaction(function () use ($user, $baseXp, $source, $sourceId, $metrics) {
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

            return [
                'xp_gained' => $xp,
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
                'gems' => $user->gems,
            ];
        });
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
            $new[] = $achievement->only(['id', 'key', 'title', 'description', 'tier', 'icon', 'reward_gems']);
        }

        return $new;
    }
}
