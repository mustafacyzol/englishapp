<?php

namespace App\Http\Presenters;

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
            ],
            'hearts' => app(HeartService::class)->sync($user),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
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
