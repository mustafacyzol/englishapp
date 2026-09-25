<?php

namespace Tests\Feature;

use App\Mail\OtpCodeMail;
use App\Models\User;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    private function capturedCode(): string
    {
        $code = null;
        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $m) use (&$code) {
            $code = $m->code;

            return true;
        });

        return $code;
    }

    public function test_register_verify_and_referral_rewards(): void
    {
        Mail::fake();
        $this->seed(GameSeeder::class);
        $inviter = User::factory()->create(['gems' => 0]);

        $res = $this->postJson('/api/v1/auth/register', [
            'name' => 'Ayşe Demir', 'email' => 'ayse@example.com',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
            'accept_terms' => true, 'referral_code' => $inviter->referral_code,
        ])->assertCreated()->assertJsonPath('user.email_verified', false);

        $token = $res->json('token');
        $this->withToken($token)->getJson('/api/v1/dashboard')->assertForbidden()->assertJsonPath('code', 'email_unverified');

        $this->withToken($token)->postJson('/api/v1/auth/email/verify', ['code' => '000000'])->assertUnprocessable();
        $this->withToken($token)->postJson('/api/v1/auth/email/verify', ['code' => $this->capturedCode()])
            ->assertOk()->assertJsonPath('user.email_verified', true);

        $this->assertSame(150, $inviter->fresh()->gems);
        $this->assertSame(150, User::query()->where('email', 'ayse@example.com')->value('gems')); // 50 start + 100
    }

    public function test_honeypot_blocks_bots(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Bot', 'email' => 'bot@example.com', 'password' => 'secret123',
            'password_confirmation' => 'secret123', 'accept_terms' => true, 'website' => 'spam',
        ])->assertUnprocessable()->assertJsonValidationErrors('website');
    }

    public function test_account_locks_after_repeated_failures_and_reset_unlocks(): void
    {
        Mail::fake();
        $user = User::factory()->create(['email' => 'lock@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['login' => 'lock@example.com', 'password' => 'wrong-pass1']);
        }
        $this->assertTrue($user->fresh()->isLocked());
        $this->travel(1)->minutes();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'lock@example.com'])->assertOk();
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'lock@example.com', 'code' => $this->capturedCode(),
            'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertOk()->assertJsonStructure(['token']);

        $this->assertFalse($user->fresh()->isLocked());
    }

    public function test_forgot_password_does_not_reveal_accounts(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])->assertOk();
    }

    public function test_admin_routes_require_step_up_otp(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]);
        $plain = $admin->createToken('web', ['user'])->plainTextToken;

        $this->withToken($plain)->getJson('/api/v1/admin/dashboard')->assertForbidden();

        $this->withToken($plain)->postJson('/api/v1/auth/admin/challenge')->assertOk()->assertJsonPath('method', 'email');
        $adminToken = $this->withToken($plain)->postJson('/api/v1/auth/admin/verify', ['code' => $this->capturedCode()])
            ->assertOk()->json('token');

        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->getJson('/api/v1/admin/dashboard')->assertOk()->assertJsonStructure(['kpis']);
    }

    public function test_regular_user_cannot_reach_admin(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $token = $user->createToken('web', ['user', 'admin'])->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/admin/users')->assertForbidden();
    }
}
