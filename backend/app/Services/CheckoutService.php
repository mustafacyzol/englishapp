<?php

namespace App\Services;

use App\Mail\NoticeMail;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use App\Services\Payments\FakeGateway;
use App\Services\Payments\IyzicoGateway;
use App\Services\Payments\PaymentGateway;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class CheckoutService
{
    public function __construct(
        private readonly CouponService $coupons,
        private readonly RewardService $rewards,
        private readonly ReferralService $referrals,
    ) {}

    public function gateway(?string $name = null): PaymentGateway
    {
        return match ($name ?? config('dilgo.payments.gateway')) {
            'iyzico' => app(IyzicoGateway::class),
            default => app(FakeGateway::class),
        };
    }

    public function quote(User $user, Plan $plan, ?string $couponCode): array
    {
        $coupon = $couponCode ? $this->coupons->resolve($couponCode, $user, $plan) : null;
        $amount = (float) $plan->price;
        $discount = $coupon ? $this->coupons->discount($coupon, $amount) : 0.0;

        return [
            'plan' => $plan,
            'coupon' => $coupon,
            'amount' => $amount,
            'discount' => $discount,
            'total' => round($amount - $discount, 2),
            'currency' => $plan->currency,
        ];
    }

    /** @return array{order:Order, checkout:array|null} */
    public function start(User $user, Plan $plan, ?string $couponCode): array
    {
        $quote = $this->quote($user, $plan, $couponCode);
        $gateway = $this->gateway();

        $order = Order::query()->create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'coupon_id' => $quote['coupon']?->id,
            'amount' => $quote['amount'],
            'discount' => $quote['discount'],
            'total' => $quote['total'],
            'currency' => $quote['currency'],
            'gateway' => $quote['total'] <= 0 ? 'free' : $gateway->name(),
        ]);

        if ($quote['total'] <= 0) {
            $this->fulfill($order, 'free');

            return ['order' => $order->fresh(), 'checkout' => null];
        }

        $checkout = $gateway->initialize($order);
        $order->update(['gateway_token' => $checkout['token']]);

        return ['order' => $order, 'checkout' => $checkout];
    }

    public function confirm(Order $order, string $token): Order
    {
        if ($order->status === 'paid') {
            return $order;
        }
        $result = $this->gateway($order->gateway)->retrieve($order, $token);

        if (! $result['paid']) {
            $order->update(['status' => 'failed', 'gateway_payload' => $result['raw'] ?? null]);
            Audit::log('payment.failed', $order->user, $order);

            return $order;
        }

        $order->forceFill(['gateway_payload' => $result['raw'] ?? null])->save();
        $this->fulfill($order, $result['reference'] ?? null);

        return $order->fresh();
    }

    /** Idempotent: grants premium, bonus gems, live lesson credits, coupon usage, referral reward. */
    public function fulfill(Order $order, ?string $reference): void
    {
        DB::transaction(function () use ($order, $reference) {
            $order = Order::query()->lockForUpdate()->find($order->id);
            if ($order->status === 'paid') {
                return;
            }
            $user = $order->user;
            $plan = $order->plan;
            $isFirstPurchase = ! Order::query()->where('user_id', $user->id)->where('status', 'paid')->exists();

            $order->update(['status' => 'paid', 'paid_at' => now(), 'gateway_ref' => $reference]);

            if ($plan) {
                $this->rewards->grantPremiumDays($user, $plan->duration_days, 'purchase', $plan->id, $order->id);
                if ($plan->bonus_gems) {
                    $user->increment('gems', $plan->bonus_gems);
                }
                for ($i = 0; $i < $plan->live_lesson_credits; $i++) {
                    $this->rewards->grant($user, 'live_lesson', 'purchase', ['order' => $order->uuid]);
                }
            }

            if ($order->coupon_id) {
                Coupon::query()->whereKey($order->coupon_id)->increment('used_count');
                CouponRedemption::query()->create([
                    'coupon_id' => $order->coupon_id,
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                    'discount' => $order->discount,
                ]);
            }

            if ($isFirstPurchase) {
                $this->referrals->onFirstPurchase($user);
            }

            Audit::log('payment.paid', $user, $order, ['total' => $order->total]);

            DB::afterCommit(fn () => Mail::to($user->email)->queue(new NoticeMail(
                'Premium üyeliğin aktif 🎉',
                'Teşekkürler, '.$user->name.'!',
                [
                    ($plan?->name ?? 'Premium').' paketin hesabına tanımlandı.',
                    'Tutar: '.number_format((float) $order->total, 2, ',', '.').' '.$order->currency.' · Sipariş: '.Str::upper(Str::substr($order->uuid, 0, 8)),
                ],
                'Öğrenmeye devam et',
                config('dilgo.brand.frontend_url').'/learn'
            )));
        });
    }
}
