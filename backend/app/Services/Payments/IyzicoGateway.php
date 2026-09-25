<?php

namespace App\Services\Payments;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * iyzico Checkout Form integration (hosted payment page) using the IYZWSv2
 * HMAC-SHA256 authorization scheme. No SDK dependency — works on shared hosting.
 */
class IyzicoGateway implements PaymentGateway
{
    private const INIT_PATH = '/payment/iyzipos/checkoutform/initialize/auth/ecom';

    private const DETAIL_PATH = '/payment/iyzipos/checkoutform/auth/ecom/detail';

    public function name(): string
    {
        return 'iyzico';
    }

    public function initialize(Order $order): array
    {
        $user = $order->user;
        [$first, $last] = array_pad(explode(' ', trim($user->name), 2), 2, '-');
        $price = number_format((float) $order->amount, 2, '.', '');
        $paid = number_format((float) $order->total, 2, '.', '');
        $ip = request()?->ip() ?? '127.0.0.1';

        $body = [
            'locale' => 'tr',
            'conversationId' => $order->uuid,
            'price' => $price,
            'paidPrice' => $paid,
            'currency' => $order->currency,
            'basketId' => $order->uuid,
            'paymentGroup' => 'PRODUCT',
            'callbackUrl' => url('/api/v1/payments/iyzico/callback'),
            'enabledInstallments' => [1, 2, 3, 6],
            'buyer' => [
                'id' => (string) $user->id,
                'name' => $first,
                'surname' => $last ?: '-',
                'email' => $user->email,
                'identityNumber' => '11111111111',
                'registrationAddress' => 'Online',
                'ip' => $ip,
                'city' => 'Istanbul',
                'country' => 'Turkey',
            ],
            'billingAddress' => [
                'contactName' => $user->name,
                'city' => 'Istanbul',
                'country' => 'Turkey',
                'address' => 'Online',
            ],
            'basketItems' => [[
                'id' => 'plan-'.$order->plan_id,
                'name' => $order->plan?->name ?? 'DilGO Premium',
                'category1' => 'Education',
                'itemType' => 'VIRTUAL',
                // iyzico requires basket total == price; discount is reflected in paidPrice.
                'price' => $price,
            ]],
        ];

        $response = $this->request(self::INIT_PATH, $body);
        if (($response['status'] ?? null) !== 'success') {
            throw new RuntimeException('iyzico: '.($response['errorMessage'] ?? 'initialize failed'));
        }

        return [
            'token' => $response['token'],
            'payment_page_url' => $response['paymentPageUrl'] ?? null,
            'checkout_form_content' => $response['checkoutFormContent'] ?? null,
        ];
    }

    public function retrieve(Order $order, string $token): array
    {
        $response = $this->request(self::DETAIL_PATH, [
            'locale' => 'tr',
            'conversationId' => $order->uuid,
            'token' => $token,
        ]);

        $paid = ($response['status'] ?? null) === 'success'
            && ($response['paymentStatus'] ?? null) === 'SUCCESS'
            && ($response['basketId'] ?? $order->uuid) === $order->uuid
            && abs((float) ($response['paidPrice'] ?? 0) - (float) $order->total) < 0.01;

        return ['paid' => $paid, 'reference' => (string) ($response['paymentId'] ?? ''), 'raw' => $response];
    }

    private function request(string $path, array $body): array
    {
        $cfg = config('dilgo.payments.iyzico');
        if (blank($cfg['api_key']) || blank($cfg['secret_key'])) {
            throw new RuntimeException('iyzico keys are not configured.');
        }

        $json = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $random = now()->getTimestampMs().Str::random(8);
        $signature = hash_hmac('sha256', $random.$path.$json, $cfg['secret_key']);
        $auth = base64_encode("apiKey:{$cfg['api_key']}&randomKey:{$random}&signature:{$signature}");

        return Http::timeout(20)
            ->withHeaders([
                'Authorization' => 'IYZWSv2 '.$auth,
                'x-iyzi-rnd' => $random,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->withBody($json, 'application/json')
            ->post(rtrim($cfg['base_url'], '/').$path)
            ->json() ?? [];
    }
}
