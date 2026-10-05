<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CouponService
{
    /** How long an unpaid checkout keeps its coupon use reserved. */
    public const HOLD_MINUTES = 30;

    public function resolve(string $code, User $user, Plan $plan): Coupon
    {
        $coupon = Coupon::query()->whereRaw('UPPER(code) = ?', [strtoupper(trim($code))])->first();
        $fail = fn (string $msg) => throw ValidationException::withMessages(['coupon' => $msg]);

        if (! $coupon || ! $coupon->is_active) {
            $fail('Kupon kodu geçersiz.');
        }
        if ($coupon->owner_user_id && $coupon->owner_user_id !== $user->id) {
            $fail('Bu kupon başka bir hesaba tanımlı.');
        }
        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            $fail('Bu kupon henüz aktif değil.');
        }
        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            $fail('Kuponun süresi dolmuş.');
        }
        // checkouts still open with this coupon hold a use, so one code cannot pay for two orders at once
        $holding = fn () => Order::query()->where('coupon_id', $coupon->id)->where('status', 'pending')->where('created_at', '>=', now()->subMinutes(self::HOLD_MINUTES));
        if ($coupon->max_uses !== null && $coupon->used_count + $holding()->count() >= $coupon->max_uses) {
            $fail('Kupon kullanım limiti doldu.');
        }
        if ($coupon->plan_ids && ! in_array($plan->id, $coupon->plan_ids)) {
            $fail('Kupon bu paket için geçerli değil.');
        }
        if ($coupon->min_amount && (float) $plan->price < (float) $coupon->min_amount) {
            $fail('Sepet tutarı kupon için yetersiz.');
        }
        if ($coupon->redemptions()->where('user_id', $user->id)->count() + $holding()->where('user_id', $user->id)->count() >= $coupon->max_uses_per_user) {
            $fail('Bu kuponu zaten kullandın.');
        }
        if ($coupon->first_order_only && Order::query()->where('user_id', $user->id)->where('status', 'paid')->exists()) {
            $fail('Bu kupon yalnızca ilk alışverişte geçerli.');
        }

        return $coupon;
    }

    public function discount(Coupon $coupon, float $amount): float
    {
        $discount = $coupon->type === 'percent'
            ? $amount * min(100, (float) $coupon->value) / 100
            : (float) $coupon->value;

        return round(min($amount, max(0, $discount)), 2);
    }
}
