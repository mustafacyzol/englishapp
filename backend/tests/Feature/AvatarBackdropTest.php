<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvatarBackdropTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_backdrops_follow_the_avatar_and_premium_rules(): void
    {
        $u = User::factory()->create(['email_verified_at' => now(), 'onboarded' => true]);

        // a standard avatar on a standard backdrop is free
        $this->actingAs($u)->patchJson('/api/v1/account', ['avatar' => 'glasses@mint'])->assertOk()
            ->assertJsonPath('user.avatar', 'glasses@mint');
        // unknown backdrops are rejected
        $this->actingAs($u)->patchJson('/api/v1/account', ['avatar' => 'glasses@neon'])->assertStatus(422);
        // premium backdrops and avatars need Premium
        $this->actingAs($u)->patchJson('/api/v1/account', ['avatar' => 'glasses@gold'])->assertStatus(403);
        $this->actingAs($u)->patchJson('/api/v1/account', ['avatar' => 'king@mint'])->assertStatus(403);

        $u->forceFill(['premium_until' => now()->addMonth()])->save();
        $this->actingAs($u->fresh())->patchJson('/api/v1/account', ['avatar' => 'king@obsidian'])->assertOk()
            ->assertJsonPath('user.avatar', 'king@obsidian');
    }
}
