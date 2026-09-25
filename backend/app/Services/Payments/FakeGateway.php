<?php

namespace App\Services\Payments;

use App\Models\Order;
use Illuminate\Support\Str;

/**
 * Local/staging gateway: lets the full purchase flow be tested without a real
 * payment provider. Refuses to run in production.
 */
class FakeGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'fake';
    }

    public function initialize(Order $order): array
    {
        abort_if(app()->isProduction(), 500, 'Fake payment gateway cannot be used in production.');
        $token = 'fake_'.Str::random(24);

        return [
            'token' => $token,
            'payment_page_url' => url("/api/v1/payments/fake/{$order->uuid}?token={$token}"),
        ];
    }

    public function retrieve(Order $order, string $token): array
    {
        return ['paid' => $order->gateway_token === $token, 'reference' => $token];
    }
}
