<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WordSet extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['is_public' => 'boolean', 'hidden_at' => 'datetime'];

    public function items(): HasMany
    {
        return $this->hasMany(WordSetItem::class)->orderBy('position');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(WordSetReport::class);
    }

    /** A fingerprint of the word list, to spot the same set posted again. */
    public static function hashOf(array $words): string
    {
        $w = array_values(array_unique(array_map(fn ($x) => mb_strtolower(trim((string) $x)), $words)));
        sort($w);

        return sha1(implode('|', $w));
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Ready-made sets, public ones and the learner's own. */
    public function scopeVisibleTo(Builder $q, ?User $user): Builder
    {
        // a shared set hidden by reports (or a moderator) stays visible only to its owner
        return $q->where(fn ($w) => $w->whereNull('user_id')->orWhere(fn ($p) => $p->where('is_public', true)->whereNull('hidden_at'))->when($user, fn ($x) => $x->orWhere('user_id', $user->id)));
    }

    public function isVisibleTo(?User $user): bool
    {
        return $this->user_id === null || ($this->is_public && $this->hidden_at === null) || ($user && $this->user_id === $user->id);
    }
}
