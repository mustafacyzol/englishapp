<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerOffer extends Model
{
    protected $guarded = ['id', 'awarded'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'weight' => 'integer', 'stock' => 'integer', 'awarded' => 'integer', 'valid_days' => 'integer'];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    /** Offers that can still drop: active, partner active, stock left. */
    public function scopeAvailable(Builder $q): Builder
    {
        return $q->where('is_active', true)
            ->where('weight', '>', 0)
            ->where(fn ($s) => $s->whereNull('stock')->orWhereColumn('awarded', '<', 'stock'))
            ->whereHas('partner', fn ($p) => $p->where('is_active', true));
    }
}
