<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonMistake extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['due_at' => 'datetime', 'fixed_at' => 'datetime'];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
