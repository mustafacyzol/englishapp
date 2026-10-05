<?php

namespace App\Services\Payments;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * iyzico Checkout Form integration (hosted payment page) using the IYZWSv2
 * HMAC-SHA256 authorization scheme. No SDK dependency, works on shared hosting.
 *
 *  - initialize: opens the hosted form, the learner pays on iyzico's page
 *  - retrieve:   the callback asks iyzico for the result and checks the
 *                response signature (paymentStatus:paymentId:currency:basketId:
 *                conversationId:paidPrice:price:token, HMAC-SHA256 hex)
 *  - refund:     v2 refund by paymentId, full or partial
 *  - webhook:    X-IYZ-SIGNATURE-V3 check for the server-to-server notice
 *
 * See docs.iyzico.com: Checkout Form, Response Signature Validation, Refund & Cancel, Webhook.
 */
class IyzicoGateway implements PaymentGateway
{
    private const INIT_PATH = '/payment/iyzipos/checkoutform/initialize/auth/ecom';

    private const DETAIL_PATH = '/payment/iyzipos/checkoutform/auth/ecom/detail';

    private const REFUND_PATH = '/v2/payment/refund';

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
                'name' => $order->plan?->name ?? config('dilgo.brand.name').' Premium',
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

        $signed = $this->signatureOk($response, ['paymentStatus', 'paymentId', 'currency', 'basketId', 'conversationId', 'paidPrice', 'price', 'token']);
        $paid = $signed
            && ($response['status'] ?? null) === 'success'
            && ($response['paymentStatus'] ?? null) === 'SUCCESS'
            && ($response['basketId'] ?? null) === $order->uuid
            && ($response['conversationId'] ?? $order->uuid) === $order->uuid
            && abs((float) ($response['paidPrice'] ?? 0) - (float) $order->total) < 0.01;

        return ['paid' => $paid, 'reference' => (string) ($response['paymentId'] ?? ''), 'raw' => $response];
    }

    /** A signed request with the saved keys (BIN lookup); proves the keys and the environment match. */
    public function ping(): string
    {
        $r = $this->request('/payment/bin/check', ['locale' => 'tr', 'binNumber' => '554960']);
        if (($r['status'] ?? null) !== 'success') {
            throw new RuntimeException('iyzico: '.($r['errorMessage'] ?? 'yanıt alınamadı'));
        }

        return 'iyzico anahtarları çalışıyor ('.(\App\Support\Integrations::get('payments.iyzico.mode') === 'live' ? 'canlı' : 'sandbox').').';
    }

    public function refund(Order $order, float $amount): array
    {
        abort_if(blank($order->gateway_ref), 422, 'Bu siparişin iyzico ödeme numarası yok, iade iyzico panelinden yapılmalı.');
        $response = $this->request(self::REFUND_PATH, [
            'locale' => 'tr',
            'conversationId' => $order->uuid,
            'paymentId' => $order->gateway_ref,
            'price' => number_format($amount, 2, '.', ''),
            'currency' => $order->currency,
            'ip' => request()?->ip() ?? '127.0.0.1',
        ]);
        $ok = ($response['status'] ?? null) === 'success';

        return ['ok' => $ok, 'reference' => (string) ($response['refundHostReference'] ?? ''), 'message' => $response['errorMessage'] ?? null, 'raw' => $response];
    }

    /**
     * The webhook iyzico sends for a checkout form payment (HPP format):
     * HMAC-SHA256(secretKey, iyziEventType + iyziPaymentId + token + paymentConversationId + status), hex.
     */
    public function webhookSignatureOk(array $payload, ?string $header): bool
    {
        $secret = (string) (\App\Support\Integrations::iyzico()['secret_key'] ?? '');
        if ($secret === '' || ! $header) {
            return false;
        }
        $data = ($payload['iyziEventType'] ?? '').($payload['iyziPaymentId'] ?? '').($payload['token'] ?? '').($payload['paymentConversationId'] ?? '').($payload['status'] ?? '');

        return hash_equals(hash_hmac('sha256', $data, $secret), strtolower($header));
    }

    /**
     * iyzico signs its responses: the listed fields joined with ":" (prices
     * without trailing zeros), HMAC-SHA256 with the secret key, hex. A response
     * that carries a signature must match it; older accounts that send none pass.
     */
    private function signatureOk(array $response, array $fields): bool
    {
        if (! isset($response['signature'])) {
            return true;
        }
        $secret = (string) (\App\Support\Integrations::iyzico()['secret_key'] ?? '');
        $parts = array_map(function ($f) use ($response) {
            $v = (string) ($response[$f] ?? '');

            return in_array($f, ['paidPrice', 'price'], true) && str_contains($v, '.') ? rtrim(rtrim($v, '0'), '.') : $v;
        }, $fields);
        $ok = hash_equals(hash_hmac('sha256', implode(':', $parts), $secret), strtolower((string) $response['signature']));
        if (! $ok) {
            \Illuminate\Support\Facades\Log::warning('iyzico response signature mismatch', ['conversationId' => $response['conversationId'] ?? null]);
        }

        return $ok;
    }

    private function request(string $path, array $body): array
    {
        $cfg = \App\Support\Integrations::iyzico();
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
