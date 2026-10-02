<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolApplication extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['grades' => 'array', 'interests' => 'array', 'students' => 'integer'];
}
