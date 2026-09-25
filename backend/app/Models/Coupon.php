<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'plan_ids' => 'array',
            'is_active' => 'boolean',
            'first_order_only' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'value' => 'decimal:2',
            'min_amount' => 'decimal:2',
        ];
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }
}
