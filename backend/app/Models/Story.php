<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Story extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'paragraphs' => 'array',
            'vocabulary' => 'array',
            'questions' => 'array',
            'is_premium' => 'boolean',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function reads(): HasMany
    {
        return $this->hasMany(StoryRead::class);
    }
}
