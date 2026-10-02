<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Support\Integrations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationsTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function staff(string $role): User
    {
        $u = User::factory()->create(['role' => $role, 'email_verified_at' => now()]);
        $this->app['auth']->forgetGuards();
        $this->withToken($u->createToken('admin-panel', ['user', 'admin'])->plainTextToken);

        return $u;
    }

    public function test_super_admin_sets_keys_encrypted_and_masked(): void
    {
        $this->staff('super_admin');
        $data = $this->putJson('/api/v1/admin/integrations', [
            'payments.gateway' => 'iyzico',
            'payments.iyzico.mode' => 'live',
            'payments.iyzico.api_key' => 'api-123456',
            'payments.iyzico.secret_key' => 'sec-abcdef',
            'defne.lipsync_gain' => 6,
        ])->assertOk()->json('data');
        $this->assertSame('iyzico', $data['payments.gateway']);
        $this->assertSame(['set' => true, 'hint' => '••••cdef'], $data['payments.iyzico.secret_key']);

        $raw = Setting::query()->find('int.payments.iyzico.secret_key')->value;
        $this->assertNotSame('sec-abcdef', $raw);
        $this->assertSame('sec-abcdef', Integrations::iyzico()['secret_key']);
        $this->assertSame('https://api.iyzipay.com', Integrations::iyzico()['base_url']);
        $this->assertSame('iyzico', app(\App\Services\CheckoutService::class)->gateway()->name());

        // an empty secret keeps the stored one; the public config never exposes it
        $this->putJson('/api/v1/admin/integrations', ['payments.iyzico.secret_key' => ''])->assertOk();
        $this->assertSame('sec-abcdef', Integrations::iyzico()['secret_key']);
        $cfg = $this->getJson('/api/v1/config')->assertOk()->assertJsonPath('defne.gain', 6);
        $this->assertStringNotContainsString('sec-abcdef', $cfg->getContent());

        $this->putJson('/api/v1/admin/integrations', ['clear' => ['payments.iyzico.secret_key']])->assertOk();
        $this->assertEmpty(Integrations::iyzico()['secret_key']);

        $this->putJson('/api/v1/admin/integrations', ['defne.lipsync_gain' => 40])->assertUnprocessable();
    }

    public function test_plain_admin_can_read_but_not_change(): void
    {
        $this->staff('admin');
        $this->getJson('/api/v1/admin/integrations')->assertOk();
        $this->putJson('/api/v1/admin/integrations', ['payments.gateway' => 'iyzico'])->assertForbidden();
    }
}
