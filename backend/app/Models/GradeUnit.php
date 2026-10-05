<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One unit of a school grade's English programme (see GradeUnitService). */
class GradeUnit extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['words' => 'array', 'sentences' => 'array', 'is_published' => 'boolean', 'slot' => 'integer', 'position' => 'integer'];
    }
}
