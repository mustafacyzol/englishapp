<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserWord extends Model
{
    protected $guarded = ['id'];

    protected $attributes = ['ease' => 2.5, 'interval_days' => 0, 'repetitions' => 0];

    protected function casts(): array
    {
        return ['due_at' => 'datetime', 'last_reviewed_at' => 'datetime', 'ease' => 'float'];
    }
}
