<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamQuestion extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['answer', 'explanation'];

    protected function casts(): array
    {
        return ['exams' => 'array', 'options' => 'array', 'answer' => 'integer', 'is_active' => 'boolean'];
    }
}
