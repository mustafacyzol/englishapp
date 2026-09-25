<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonProgress extends Model
{
    protected $guarded = ['id'];

    protected $attributes = ['best_score' => 0, 'attempts' => 0, 'crowns' => 0];

    protected $table = 'lesson_progress';

    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
