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

    public function test_smtp_settings_are_encrypted_applied_and_testable(): void
    {
        $this->staff('super_admin');
        $data = $this->putJson('/api/v1/admin/integrations', [
            'mail.host' => 'smtp.example.com', 'mail.port' => 465, 'mail.encryption' => 'ssl',
            'mail.username' => 'noreply@example.com', 'mail.password' => 'smtp-secret-99', 'mail.from_address' => 'noreply@example.com',
        ])->assertOk()->json('data');
        $this->assertSame(['set' => true, 'hint' => '••••t-99'], $data['mail.password']);
        $this->assertNotSame('smtp-secret-99', Setting::query()->find('int.mail.password')->value);

        Integrations::applyMail();
        $this->assertSame('smtp', config('mail.default'));
        $this->assertSame('smtp.example.com', config('mail.mailers.smtp.host'));
        $this->assertSame('smtps', config('mail.mailers.smtp.scheme'));
        $this->assertSame('smtp-secret-99', config('mail.mailers.smtp.password'));

        $this->putJson('/api/v1/admin/integrations', ['mail.host' => 'bad host;rm'])->assertUnprocessable();
        // the test button reports the transport error instead of a blank 500
        config(['mail.default' => 'array']);
        $this->mock(\Illuminate\Mail\MailManager::class, fn ($m) => $m->shouldReceive('raw')->andThrow(new \RuntimeException('Connection refused')));
        $this->postJson('/api/v1/admin/integrations/test-mail', ['to' => 'me@example.com'])->assertStatus(422)->assertJsonPath('ok', false);
    }
}
