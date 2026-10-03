<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WordSet extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['is_public' => 'boolean'];

    public function items(): HasMany
    {
        return $this->hasMany(WordSetItem::class)->orderBy('position');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Ready-made sets, public ones and the learner's own. */
    public function scopeVisibleTo(Builder $q, ?User $user): Builder
    {
        return $q->where(fn ($w) => $w->whereNull('user_id')->orWhere('is_public', true)->when($user, fn ($x) => $x->orWhere('user_id', $user->id)));
    }

    public function isVisibleTo(?User $user): bool
    {
        return $this->user_id === null || $this->is_public || ($user && $this->user_id === $user->id);
    }
}
