<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RewardItem extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['value' => 'array', 'is_active' => 'boolean'];
    }
}
