<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiScenario extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['goals' => 'array', 'is_premium' => 'boolean', 'is_active' => 'boolean'];
    }
}
