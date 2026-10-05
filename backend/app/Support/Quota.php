<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Per-learner quotas for anything a person creates: words, sets, copies,
 * shares. Route throttles stop bursts; these stop slow, steady abuse (a script
 * adding a thousand sets over a day) and say plainly what the limit is.
 *
 *   Quota::take($user, 'word-sets.create', 20, 'day', 'Bugün en fazla 20 set oluşturabilirsin.');
 */
class Quota
{
    private const WINDOWS = ['minute' => 60, 'hour' => 3600, 'day' => 86400];

    /** Counts one use; a 429 with the message once the window is full. */
    public static function take(User $user, string $key, int $max, string $window, string $message): void
    {
        $k = "quota:{$key}:{$user->id}";
        abort_if(RateLimiter::tooManyAttempts($k, $max), 429, $message);
        RateLimiter::hit($k, self::WINDOWS[$window] ?? 3600);
    }

    /** How many uses are left in the window (for showing "3 hakkın kaldı"). */
    public static function left(User $user, string $key, int $max): int
    {
        return max(0, RateLimiter::remaining("quota:{$key}:{$user->id}", $max));
    }
}
