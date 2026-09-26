<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Duel extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'rounds' => 'array',
            'ghost_skills' => 'array',
            'ghost_notified' => 'boolean',
            'finished_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ghost(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ghost_id');
    }
}
