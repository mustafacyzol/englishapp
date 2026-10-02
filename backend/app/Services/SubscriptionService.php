<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Subscription;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Validation\ValidationException;

/**
 * Premium as the learner sees it in their profile. Packages are paid once and
 * never renew on their own, so "cancel" means: end with the current period
 * (and tell us why). Inside the 14-day window a paid order can also be put up
 * for a refund; an admin approves it from the orders screen, which takes the
 * Premium days back.
 */
class SubscriptionService
{
    public const REFUND_DAYS = 14;

    public const REASONS = [
        'price' => 'Fiyat bana yüksek geldi',
        'time' => 'Çalışmaya vaktim yok',
        'content' => 'Aradığım içerik yok',
        'technical' => 'Teknik sorun yaşadım',
        'other_app' => 'Başka bir uygulamaya geçiyorum',
        'goal_done' => 'Hedefime ulaştım',
        'other' => 'Başka bir sebep',
    ];

    /** The live period: the subscription whose window covers today, latest first. */
    public function current(User $user): ?Subscription
    {
        return $user->subscriptions()->with('plan:id,name,slug,interval,duration_days')
            ->where('status', 'active')->where('ends_at', '>', now())
            ->latest('ends_at')->first();
    }

    public function refundableOrder(User $user, ?Subscription $sub): ?Order
    {
        if (! $sub?->order_id) {
            return null;
        }
        $order = Order::query()->whereKey($sub->order_id)->where('user_id', $user->id)->first();

        return $order && $order->status === 'paid' && $order->paid_at?->gt(now()->subDays(self::REFUND_DAYS)) ? $order : null;
    }

    public function overview(User $user): array
    {
        $sub = $this->current($user);
        $order = $sub?->order_id ? Order::query()->whereKey($sub->order_id)->where('user_id', $user->id)->first() : null;
        $refundable = $this->refundableOrder($user, $sub);

        return [
            'premium' => ['active' => $user->isPremium(), 'until' => $user->premium_until?->toIso8601String()],
            'auto_renew' => false,
            'current' => $sub ? [
                'id' => $sub->id,
                'plan' => $sub->plan?->only(['name', 'slug', 'interval', 'duration_days']),
                'source' => $sub->source,
                'starts_at' => $sub->starts_at->toIso8601String(),
                'ends_at' => $sub->ends_at->toIso8601String(),
                'cancelled_at' => $sub->cancelled_at?->toIso8601String(),
                'cancel_reason' => $sub->cancel_reason,
            ] : null,
            'order' => $order ? [
                'uuid' => $order->uuid,
                'total' => $order->total,
                'currency' => $order->currency,
                'status' => $order->status,
                'paid_at' => $order->paid_at?->toIso8601String(),
                'refund_requested_at' => $order->refund_requested_at?->toIso8601String(),
            ] : null,
            'refund' => [
                'eligible' => (bool) $refundable && ! $refundable->refund_requested_at,
                'deadline' => $refundable?->paid_at?->copy()->addDays(self::REFUND_DAYS)->toIso8601String(),
                'requested' => (bool) $order?->refund_requested_at,
            ],
            'reasons' => self::REASONS,
            'history' => $user->subscriptions()->with('plan:id,name')->latest('starts_at')->limit(20)->get()
                ->map(fn (Subscription $s) => [
                    'id' => $s->id, 'plan' => $s->plan?->name, 'source' => $s->source, 'status' => $s->status,
                    'starts_at' => $s->starts_at->toIso8601String(), 'ends_at' => $s->ends_at->toIso8601String(),
                    'cancelled_at' => $s->cancelled_at?->toIso8601String(),
                ]),
        ];
    }

    /** Ends with the period. With `refund`, the paid order goes to the admins as a refund request. */
    public function cancel(User $user, string $reason, ?string $note, bool $refund): array
    {
        $sub = $this->current($user);
        if (! $sub) {
            throw ValidationException::withMessages(['subscription' => 'İptal edilecek aktif bir Premium üyeliğin yok.']);
        }
        if ($refund) {
            $order = $this->refundableOrder($user, $sub);
            if (! $order) {
                throw ValidationException::withMessages(['refund' => 'Bu üyelik için iade süresi geçmiş ya da ödeme bulunamadı.']);
            }
            if ($order->refund_requested_at) {
                throw ValidationException::withMessages(['refund' => 'İade talebin zaten alındı.']);
            }
            $order->update(['refund_requested_at' => now(), 'refund_reason' => trim(self::REASONS[$reason].($note ? ": {$note}" : ''))]);
            Audit::log('subscription.refund_requested', $user, $order);
        }
        $sub->update(['cancelled_at' => $sub->cancelled_at ?? now(), 'cancel_reason' => $reason, 'cancel_note' => $note]);
        Audit::log('subscription.cancelled', $user, $sub);

        return $this->overview($user->fresh());
    }

    /** Changed their mind: undo the cancellation (a pending refund request is withdrawn too). */
    public function resume(User $user): array
    {
        $sub = $this->current($user);
        if (! $sub || ! $sub->cancelled_at) {
            throw ValidationException::withMessages(['subscription' => 'Geri alınacak bir iptal yok.']);
        }
        $sub->update(['cancelled_at' => null, 'cancel_reason' => null, 'cancel_note' => null]);
        if ($sub->order_id) {
            Order::query()->whereKey($sub->order_id)->where('status', 'paid')->update(['refund_requested_at' => null, 'refund_reason' => null]);
        }
        Audit::log('subscription.resumed', $user, $sub);

        return $this->overview($user->fresh());
    }
}
