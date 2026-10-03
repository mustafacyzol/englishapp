<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assignment extends Model
{
    public const KINDS = ['lesson', 'story', 'words', 'practice', 'exam', 'ai', 'custom'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['due_at' => 'datetime'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function completions(): HasMany
    {
        return $this->hasMany(AssignmentCompletion::class);
    }
}
