<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyActivity extends Model
{
    protected $guarded = ['id'];

    protected $attributes = ['xp' => 0, 'lessons' => 0, 'stories' => 0, 'reviews' => 0, 'ai_messages' => 0, 'speaking' => 0, 'perfect_lessons' => 0, 'minutes' => 0, 'goal_met' => false, 'freeze_used' => false];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['goal_met' => 'boolean', 'freeze_used' => 'boolean'];
    }
}
