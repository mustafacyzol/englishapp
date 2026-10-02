<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use App\Services\RewardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function subscriber(int $paidDaysAgo = 2): array
    {
        $u = User::factory()->create(['email_verified_at' => now(), 'onboarded' => true]);
        $plan = Plan::query()->first();
        $order = Order::query()->create([
            'uuid' => (string) Str::uuid(), 'user_id' => $u->id, 'plan_id' => $plan->id,
            'amount' => 199, 'total' => 199, 'status' => 'paid', 'gateway' => 'fake', 'paid_at' => now()->subDays($paidDaysAgo),
        ]);
        app(RewardService::class)->grantPremiumDays($u, 30, 'purchase', $plan->id, $order->id);

        return [$u->fresh(), $order];
    }

    public function test_overview_cancel_and_resume(): void
    {
        [$u] = $this->subscriber();
        $this->actingAs($u)->getJson('/api/v1/account/subscription')->assertOk()
            ->assertJsonPath('premium.active', true)
            ->assertJsonPath('auto_renew', false)
            ->assertJsonPath('refund.eligible', true);

        $this->postJson('/api/v1/account/subscription/cancel', ['reason' => 'nope'])->assertUnprocessable();
        $this->postJson('/api/v1/account/subscription/cancel', ['reason' => 'time', 'note' => 'Sınav dönemi'])->assertOk()
            ->assertJsonPath('current.cancel_reason', 'time')
            ->assertJsonPath('user.premium.active', true); // stays Premium until the period ends

        $this->postJson('/api/v1/account/subscription/resume')->assertOk()->assertJsonPath('current.cancelled_at', null);
        $this->postJson('/api/v1/account/subscription/resume')->assertUnprocessable();
    }

    public function test_refund_request_only_inside_the_window(): void
    {
        [$u, $order] = $this->subscriber();
        $this->actingAs($u)->postJson('/api/v1/account/subscription/cancel', ['reason' => 'price', 'refund' => true])->assertOk()
            ->assertJsonPath('refund.requested', true)
            ->assertJsonPath('refund.eligible', false);
        $this->assertNotNull($order->fresh()->refund_requested_at);
        $this->postJson('/api/v1/account/subscription/cancel', ['reason' => 'price', 'refund' => true])->assertUnprocessable();

        [$late] = $this->subscriber(20);
        $this->actingAs($late)->getJson('/api/v1/account/subscription')->assertJsonPath('refund.eligible', false);
        $this->postJson('/api/v1/account/subscription/cancel', ['reason' => 'price', 'refund' => true])->assertUnprocessable();
    }

    public function test_free_user_has_nothing_to_cancel(): void
    {
        $u = User::factory()->create(['email_verified_at' => now(), 'onboarded' => true]);
        $this->actingAs($u)->getJson('/api/v1/account/subscription')->assertOk()->assertJsonPath('current', null);
        $this->postJson('/api/v1/account/subscription/cancel', ['reason' => 'price'])->assertUnprocessable();
    }
}
