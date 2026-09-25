<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoryRead extends Model
{
    protected $guarded = ['id'];

    protected $attributes = ['progress' => 0, 'bookmarked' => false];

    protected function casts(): array
    {
        return ['bookmarked' => 'boolean', 'completed_at' => 'datetime'];
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }
}
