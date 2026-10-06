<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WordSetReport extends Model
{
    public const UPDATED_AT = null;

    public const REASONS = ['spam' => 'Spam ya da reklam', 'inappropriate' => 'Uygunsuz içerik', 'wrong' => 'Yanlış çeviriler', 'other' => 'Başka bir sorun'];

    protected $guarded = ['id'];

    public function set(): BelongsTo
    {
        return $this->belongsTo(WordSet::class, 'word_set_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
