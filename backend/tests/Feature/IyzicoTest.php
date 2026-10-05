<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IyzicoTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private const SECRET = 'sandbox-secret';

    protected function setUp(): void
    {
        parent::setUp();
        config(['dilgo.payments.gateway' => 'iyzico', 'dilgo.payments.iyzico.api_key' => 'sandbox-key', 'dilgo.payments.iyzico.secret_key' => self::SECRET]);
    }

    private function order(): Order
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $plan = Plan::query()->where('is_active', true)->where('price', '>', 0)->firstOrFail();

        return Order::query()->create(['uuid' => (string) \Illuminate\Support\Str::uuid(), 'user_id' => $user->id, 'plan_id' => $plan->id, 'amount' => $plan->price, 'discount' => 0, 'total' => $plan->price, 'currency' => 'TRY', 'status' => 'pending', 'gateway' => 'iyzico', 'gateway_token' => 'tok-1']);
    }

    private function detail(Order $o, bool $tamper = false): array
    {
        $r = ['status' => 'success', 'paymentStatus' => 'SUCCESS', 'paymentId' => '2345', 'currency' => 'TRY', 'basketId' => $o->uuid, 'conversationId' => $o->uuid,
            'paidPrice' => number_format((float) $o->total, 2, '.', ''), 'price' => number_format((float) $o->amount, 2, '.', ''), 'token' => 'tok-1'];
        $trim = fn ($v) => str_contains($v, '.') ? rtrim(rtrim($v, '0'), '.') : $v;
        $data = implode(':', [$r['paymentStatus'], $r['paymentId'], $r['currency'], $r['basketId'], $r['conversationId'], $trim($r['paidPrice']), $trim($r['price']), $r['token']]);
        $r['signature'] = $tamper ? str_repeat('0', 64) : hash_hmac('sha256', $data, self::SECRET);

        return $r;
    }

    public function test_a_signed_success_pays_and_a_forged_one_does_not(): void
    {
        $good = $this->order();
        $bad = $this->order();
        $bad->update(['gateway_token' => 'tok-2']);
        // the forged answer carries the right order but a signature made without the secret
        Http::fake(['*/checkoutform/auth/ecom/detail' => Http::sequence()->push($this->detail($good))->push(['token' => 'tok-2'] + $this->detail($bad, true))]);
        $this->post('/api/v1/payments/iyzico/callback', ['token' => 'tok-1'])->assertRedirect();
        $this->assertSame('paid', $good->fresh()->status);
        $this->assertNotNull($good->user->fresh()->premium_until);

        $this->post('/api/v1/payments/iyzico/callback', ['token' => 'tok-2'])->assertRedirect();
        $this->assertNotSame('paid', $bad->fresh()->status);
    }

    public function test_webhook_needs_a_valid_signature_and_confirms_with_iyzico(): void
    {
        $o = $this->order();
        $payload = ['iyziEventType' => 'CHECKOUT_FORM_AUTH', 'iyziPaymentId' => 2345, 'token' => 'tok-1', 'paymentConversationId' => $o->uuid, 'status' => 'SUCCESS'];
        $this->postJson('/api/v1/payments/iyzico/webhook', $payload, ['X-IYZ-SIGNATURE-V3' => 'nope'])->assertStatus(401);
        $this->assertSame('pending', $o->fresh()->status);

        Http::fake(['*/checkoutform/auth/ecom/detail' => Http::response($this->detail($o))]);
        $sig = hash_hmac('sha256', 'CHECKOUT_FORM_AUTH2345tok-1'.$o->uuid.'SUCCESS', self::SECRET);
        $this->postJson('/api/v1/payments/iyzico/webhook', $payload, ['X-IYZ-SIGNATURE-V3' => $sig])->assertOk();
        $this->assertSame('paid', $o->fresh()->status);
    }

    public function test_admin_refund_goes_through_iyzico(): void
    {
        $o = $this->order();
        $o->update(['status' => 'paid', 'paid_at' => now(), 'gateway_ref' => '2345']);
        $admin = User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]);
        $this->withToken($admin->createToken('admin-panel', ['user', 'admin'])->plainTextToken);

        Http::fake(['*/v2/payment/refund' => Http::sequence()
            ->push(['status' => 'failure', 'errorMessage' => 'Yetersiz bakiye'])
            ->push(['status' => 'success', 'paymentId' => '2345', 'refundHostReference' => 'r-1'])]);
        $this->postJson("/api/v1/admin/orders/{$o->id}/refund", [])->assertStatus(502);
        $this->assertSame('paid', $o->fresh()->status);

        $this->postJson("/api/v1/admin/orders/{$o->id}/refund", [])->assertOk();
        $this->assertSame('refunded', $o->fresh()->status);
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/v2/payment/refund') && $r['paymentId'] === '2345');
    }
}
