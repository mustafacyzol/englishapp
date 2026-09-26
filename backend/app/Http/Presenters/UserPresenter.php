<?php

namespace App\Http\Presenters;

use App\Models\InstitutionMember;
use App\Models\User;
use App\Services\GamificationService;
use App\Services\HeartService;
use App\Services\LeagueService;

class UserPresenter
{
    public static function me(User $user): array
    {
        $game = app(GamificationService::class);
        $level = $user->level();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'email_verified' => $user->email_verified_at !== null,
            'role' => $user->role,
            'is_staff' => $user->isStaff(),
            'avatar' => $user->avatar,
            'locale' => $user->locale,
            'cefr_level' => $user->cefr_level,
            'learning_goal' => $user->learning_goal,
            'daily_goal_xp' => $user->daily_goal_xp,
            'onboarded' => $user->onboarded,
            'focus_skill' => $user->focus_skill,
            'interests' => $user->interests ?? [],
            'study_time' => $user->study_time,
            'motivation' => $user->motivation,
            ...self::institution($user),
            'preferences' => $user->preferences ?? (object) [],
            'marketing_opt_in' => $user->marketing_opt_in,
            'two_factor_enabled' => $user->hasTwoFactor(),
            'referral_code' => $user->referral_code,
            'premium' => [
                'active' => $user->isPremium(),
                'until' => $user->premium_until?->toIso8601String(),
            ],
            'stats' => [
                'xp_total' => $user->xp_total,
                'level' => $level,
                'level_floor' => User::xpForLevel($level),
                'level_ceil' => User::xpForLevel($level + 1),
                'gems' => $user->gems,
                'streak' => $game->effectiveStreak($user),
                'streak_longest' => $user->streak_longest,
                'league_tier' => $user->league_tier,
                'league_name' => app(LeagueService::class)->tierName($user->league_tier),
                'duel_trophies' => $user->duel_trophies,
            ],
            'hearts' => app(HeartService::class)->sync($user),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    /** The learner's school/company membership, if any (students hold a seat, managers see the panel). */
    private static function institution(User $user): array
    {
        $m = InstitutionMember::query()->where('user_id', $user->id)->where('status', 'active')
            ->orderByRaw("CASE WHEN role = 'manager' THEN 0 ELSE 1 END")->with('institution:id,name,type')->first();

        return ['institution' => $m?->institution?->only(['id', 'name', 'type']), 'institution_role' => $m?->role];
    }

    public static function public(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'avatar' => $user->avatar,
            'cefr_level' => $user->cefr_level,
            'xp_total' => $user->xp_total,
            'level' => $user->level(),
            'streak' => $user->streak_current,
            'league_tier' => $user->league_tier,
            'is_premium' => $user->isPremium(),
            'joined_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
