<?php

namespace Tests\Feature;

use App\Models\PartnerOffer;
use App\Models\RewardItem;
use App\Models\User;
use App\Models\UserItem;
use App\Services\GamificationService;
use App\Services\RewardService;
use Database\Seeders\GameSeeder;
use Database\Seeders\PartnerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EconomyAgeTest extends TestCase
{
    use RefreshDatabase;

    private function learner(array $attrs = []): User
    {
        return User::factory()->create($attrs + ['email_verified_at' => now(), 'onboarded' => true]);
    }

    public function test_a_single_tap_does_not_extend_the_streak(): void
    {
        $user = $this->learner();
        $game = app(GamificationService::class);
        $this->assertFalse($game->record($user, 3, 'exam')['streak_extended']);
        $this->assertTrue($game->record($user, 8, 'exam')['streak_extended']); // today's total reaches 10
        $this->assertSame(1, $user->fresh()->streak_current);
    }

    public function test_daily_caps_stop_xp_farming_per_activity(): void
    {
        $user = $this->learner();
        $game = app(GamificationService::class);
        $total = 0;
        for ($i = 0; $i < 40; $i++) {
            $total += $game->record($user, 3, 'exam')['xp_gained'];
        }
        $this->assertSame(config('dilgo.economy.daily_caps.exam'), $total);
        // another activity still earns
        $this->assertSame(10, $game->record($user, 10, 'lesson')['xp_gained']);
    }

    public function test_children_never_get_adult_partner_gifts_and_gifts_are_findable(): void
    {
        $this->seed([GameSeeder::class, PartnerSeeder::class]);
        $kid = $this->learner(['age_group' => 'kid']);
        $adultOnly = PartnerOffer::query()->where('audience', 'adult')->pluck('id');
        $this->assertNotEmpty($adultOnly);

        for ($i = 0; $i < 25; $i++) {
            $won = app(RewardService::class)->grantPartnerGift($kid);
            $this->assertNotContains($won->meta['offer_id'], $adultOnly->all());
        }

        // Won gifts show up in Kuponlarım and in notifications, and can be marked as used.
        $list = $this->actingAs($kid)->getJson('/api/v1/coupons')->assertOk()->json('data');
        $this->assertCount(25, $list);
        $this->assertSame('gift', $kid->notifications()->first()->data['kind']);
        $this->actingAs($kid)->postJson("/api/v1/coupons/{$list[0]['id']}/used")->assertOk()->assertJsonPath('item.status', 'used');
        $this->actingAs($kid)->postJson("/api/v1/coupons/{$list[0]['id']}/used")->assertStatus(422);

        // odds shown to a child only list the gifts a child can actually win
        $chest = RewardItem::query()->where('key', 'mystery_chest')->first();
        $partners = collect(app(RewardService::class)->odds($chest, $kid))->firstWhere('type', 'partner')['partners'];
        $this->assertTrue(collect($partners)->every(fn ($p) => ! str_contains($p, 'kahve') && ! str_contains($p, 'Sinema')));
    }

    public function test_someone_elses_coupon_cannot_be_touched(): void
    {
        $this->seed([GameSeeder::class, PartnerSeeder::class]);
        $a = $this->learner(['age_group' => 'adult']);
        $b = $this->learner();
        $won = app(RewardService::class)->grantPartnerGift($a);
        $this->actingAs($b)->postJson("/api/v1/coupons/{$won->id}/used")->assertNotFound();
        $this->assertSame('active', UserItem::query()->find($won->id)->status);
    }

    public function test_tts_is_off_without_a_key_and_cached_with_one(): void
    {
        $user = $this->learner();
        $this->actingAs($user)->postJson('/api/v1/ai/tts', ['text' => 'Hello there'])->assertNoContent();

        config(['services.elevenlabs.key' => 'k']);
        Http::fake(['api.elevenlabs.io/*' => Http::response('MP3DATA', 200, ['Content-Type' => 'audio/mpeg'])]);
        $this->actingAs($user)->postJson('/api/v1/ai/tts', ['text' => 'Hello there'])->assertOk()->assertHeader('Content-Type', 'audio/mpeg');
        $this->actingAs($user)->postJson('/api/v1/ai/tts', ['text' => 'Hello there'])->assertOk();
        Http::assertSentCount(1); // second call served from cache
        \Illuminate\Support\Facades\Storage::disk('local')->deleteDirectory('tts');
    }

    public function test_avatars_standard_for_all_premium_only_while_premium(): void
    {
        $user = $this->learner();
        $this->actingAs($user)->patchJson('/api/v1/account', ['avatar' => 'hoodie'])->assertOk()->assertJsonPath('user.avatar', 'hoodie');
        $this->actingAs($user)->patchJson('/api/v1/account', ['avatar' => 'pilot'])->assertForbidden();
        $this->actingAs($user)->patchJson('/api/v1/account', ['avatar' => 'not-a-real-one'])->assertUnprocessable();

        $user->forceFill(['premium_until' => now()->addDays(3)])->save();
        $this->actingAs($user)->patchJson('/api/v1/account', ['avatar' => 'pilot'])->assertOk()->assertJsonPath('user.avatar', 'pilot');

        // When Premium ends the premium avatar is no longer shown.
        $user->forceFill(['premium_until' => now()->subDay()])->save();
        $this->assertNull($user->fresh()->displayAvatar());
    }
}
