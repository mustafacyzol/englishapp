<?php

namespace App\Services;

use App\Models\User;

class HeartService
{
    /** Applies time-based regeneration and returns the current heart state. */
    public function sync(User $user): array
    {
        if ($user->isPremium()) {
            return ['hearts' => User::MAX_HEARTS, 'unlimited' => true, 'next_heart_at' => null];
        }

        $regen = config('dilgo.gamification.heart_regen_minutes');
        if ($user->hearts < User::MAX_HEARTS && $user->hearts_updated_at) {
            $gained = intdiv((int) $user->hearts_updated_at->diffInMinutes(now()), $regen);
            if ($gained > 0) {
                $user->hearts = min(User::MAX_HEARTS, $user->hearts + $gained);
                $user->hearts_updated_at = $user->hearts >= User::MAX_HEARTS ? null : $user->hearts_updated_at->addMinutes($gained * $regen);
                $user->save();
            }
        }

        return [
            'hearts' => $user->hearts,
            'unlimited' => false,
            'next_heart_at' => $user->hearts < User::MAX_HEARTS && $user->hearts_updated_at
                ? $user->hearts_updated_at->copy()->addMinutes($regen)->toIso8601String() : null,
        ];
    }

    public function lose(User $user, int $count): void
    {
        if ($user->isPremium() || $count <= 0) {
            return;
        }
        $this->sync($user);
        $user->hearts = max(0, $user->hearts - $count);
        $user->hearts_updated_at ??= now();
        $user->save();
    }
}
