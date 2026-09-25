<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserQuest extends Model
{
    protected $guarded = ['id'];

    protected $attributes = ['progress' => 0];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime', 'claimed_at' => 'datetime'];
    }

    public function quest(): BelongsTo
    {
        return $this->belongsTo(Quest::class);
    }
}
