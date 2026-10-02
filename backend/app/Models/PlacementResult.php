<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlacementResult extends Model
{
    protected $guarded = ['id'];

    /** The token is the claim secret: never shown, not even to admins. */
    protected $hidden = ['token'];

    protected function casts(): array
    {
        return ['bands' => 'array', 'skills' => 'array', 'activities' => 'array', 'claimed_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** An unclaimed result from the last 30 days, or one this user already owns. */
    public static function claimable(?string $token, User $user): ?self
    {
        if (! $token || strlen($token) > 64) {
            return null;
        }
        $r = self::query()->where('token', $token)->where('created_at', '>=', now()->subDays(30))->first();

        return $r && ($r->user_id === null || $r->user_id === $user->id) ? $r : null;
    }

    /** Give the learner this level and mark the result as theirs. */
    public function applyTo(User $user): void
    {
        if ($this->user_id === null) {
            $user->forceFill(['cefr_level' => $this->level])->save();
            app(\App\Services\PathService::class)->applyPlacement($user, $this->level, $this->bands ?? []);
            $this->forceFill(['user_id' => $user->id, 'claimed_at' => now()])->save();
        }
    }

    public function present(): array
    {
        return ['level' => $this->level, 'score' => $this->score, 'bands' => $this->bands, 'skills' => $this->skills, 'activities' => $this->activities, 'answered' => $this->answered];
    }
}
