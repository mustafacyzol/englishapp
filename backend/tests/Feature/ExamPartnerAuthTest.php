<?php

namespace Tests\Feature;

use App\Models\ExamQuestion;
use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Models\PartnerOffer;
use App\Models\RewardItem;
use App\Models\User;
use App\Models\UserItem;
use App\Services\DuelService;
use App\Services\InstitutionService;
use App\Support\Settings;
use Database\Seeders\ExamSeeder;
use Database\Seeders\GameSeeder;
use Database\Seeders\PartnerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class ExamPartnerAuthTest extends TestCase
{
    use RefreshDatabase;

    private function learner(array $attrs = []): User
    {
        return User::factory()->create($attrs + ['email_verified_at' => now(), 'onboarded' => true]);
    }

    public function test_exam_practice_hides_the_key_and_grades_on_the_server(): void
    {
        $this->seed([GameSeeder::class, ExamSeeder::class]);
        $user = $this->learner(['exam_target' => 'yds']);

        $overview = $this->actingAs($user)->getJson('/api/v1/exam')->assertOk();
        $this->assertSame('yds', $overview->json('target'));
        $this->assertNotEmpty($overview->json('stats'));

        $set = $this->actingAs($user)->getJson('/api/v1/exam/practice?section=grammar&n=5')->assertOk();
        $q = $set->json('questions.0');
        $this->assertArrayNotHasKey('answer', $q);
        $this->assertArrayNotHasKey('explanation', $q);

        $key = ExamQuestion::query()->find($q['id'])->answer;
        $right = $this->actingAs($user)->postJson('/api/v1/exam/answer', ['question_id' => $q['id'], 'choice' => $key, 'ms' => 9000])->assertOk();
        $this->assertTrue($right->json('correct'));
        $this->assertGreaterThan(0, $right->json('xp'));
        $this->assertNotEmpty($right->json('explanation'));

        // Re-submitting the same question straight away earns nothing.
        $again = $this->actingAs($user)->postJson('/api/v1/exam/answer', ['question_id' => $q['id'], 'choice' => $key])->assertOk();
        $this->assertSame(0, $again->json('xp'));
        $this->assertSame(1, $this->actingAs($user)->getJson('/api/v1/exam')->json('total.answered'));
    }

    public function test_seeded_answer_keys_are_not_all_the_same_letter(): void
    {
        $this->seed(ExamSeeder::class);
        $this->assertGreaterThan(2, ExamQuestion::query()->distinct()->count('answer'));
    }

    public function test_chest_can_drop_a_partner_coupon_and_publishes_odds(): void
    {
        $this->seed([GameSeeder::class, PartnerSeeder::class]);
        $user = $this->learner();
        // A chest whose only prize is a partner gift.
        $chest = RewardItem::query()->create(['key' => 'test_chest', 'name' => 'Test', 'type' => 'chest', 'icon' => 'chest', 'rarity' => 'rare', 'value' => ['pool' => [['weight' => 1, 'type' => 'partner']]]]);
        $owned = UserItem::query()->create(['user_id' => $user->id, 'reward_item_id' => $chest->id, 'status' => 'available', 'source' => 'test']);

        // Odds are attached to every chest in the shop, not only when a chest is listed first.
        $shop = collect($this->actingAs($user)->getJson('/api/v1/shop')->assertOk()->json('items'));
        $this->assertTrue($shop->where('type', 'chest')->every(fn ($i) => ! empty($i['odds'])));
        $this->assertNotSame('chest', $shop->first()['type']);

        $inv = $this->actingAs($user)->getJson('/api/v1/inventory')->assertOk();
        $this->assertEquals(100, $inv->json('data.0.odds.0.chance'));

        $res = $this->actingAs($user)->postJson("/api/v1/inventory/{$owned->id}/activate")->assertOk();
        $this->assertSame('partner', $res->json('extra.prize.type'));
        $coupon = UserItem::query()->where('user_id', $user->id)->where('source', 'chest')->first();
        $this->assertNotNull($coupon->code);
        $this->assertSame('active', $coupon->status);
        $this->assertSame(1, PartnerOffer::query()->sum('awarded'));

        // With every offer out of stock the chest still pays out (gems fallback).
        PartnerOffer::query()->update(['stock' => 1, 'awarded' => 1]);
        $second = UserItem::query()->create(['user_id' => $user->id, 'reward_item_id' => $chest->id, 'status' => 'available', 'source' => 'test']);
        $gems = $user->fresh()->gems;
        $this->actingAs($user)->postJson("/api/v1/inventory/{$second->id}/activate")->assertOk()->assertJsonPath('extra.prize.type', 'gems');
        $this->assertSame($gems + 200, $user->fresh()->gems);
    }

    public function test_remember_me_controls_the_token_lifetime(): void
    {
        $this->learner(['email' => 'ada@example.com', 'password' => 'secret123']);

        $short = $this->postJson('/api/v1/auth/login', ['login' => 'ada@example.com', 'password' => 'secret123'])->assertOk();
        $this->assertFalse($short->json('remember'));
        $this->assertTrue(PersonalAccessToken::findToken($short->json('token'))->expires_at->lt(now()->addDays(2)));

        $long = $this->postJson('/api/v1/auth/login', ['login' => 'ada@example.com', 'password' => 'secret123', 'remember' => true])->assertOk();
        $this->assertTrue(PersonalAccessToken::findToken($long->json('token'))->expires_at->gt(now()->addDays(30)));
    }

    public function test_social_login_is_off_until_configured_and_verifies_the_token(): void
    {
        $this->postJson('/api/v1/auth/social/google', ['id_token' => 'x'])->assertNotFound();

        Notification::fake();
        config(['services.google.client_id' => 'client-123']);
        Http::fake(['oauth2.googleapis.com/*' => Http::sequence()
            ->push(['aud' => 'someone-else', 'iss' => 'accounts.google.com', 'sub' => '1', 'email' => 'x@example.com', 'email_verified' => 'true', 'exp' => time() + 60])
            ->push(['aud' => 'client-123', 'iss' => 'accounts.google.com', 'sub' => 'g-42', 'email' => 'Deniz@Example.com', 'email_verified' => 'true', 'name' => 'Deniz', 'exp' => time() + 60]),
        ]);

        // A token minted for another app is rejected.
        $this->postJson('/api/v1/auth/social/google', ['id_token' => 'tok'])->assertStatus(422);

        $res = $this->postJson('/api/v1/auth/social/google', ['id_token' => 'tok', 'exam_target' => 'ydt'])->assertCreated();
        $user = User::query()->where('email', 'deniz@example.com')->first();
        $this->assertSame('g-42', $user->google_id);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('ydt', $res->json('user.exam_target'));
        $this->assertTrue($res->json('user.linked.google'));
    }

    public function test_admin_can_switch_a_feature_off(): void
    {
        $user = $this->learner();
        Settings::put(['features.exam' => false]);
        $this->actingAs($user)->getJson('/api/v1/exam')->assertNotFound();
        $this->assertFalse($this->getJson('/api/v1/config')->json('site.features.exam'));
    }

    public function test_institution_manager_can_brand_the_panel(): void
    {
        $inst = Institution::query()->create(['name' => 'Kolej', 'type' => 'school', 'seats' => 10]);
        $manager = $this->learner();
        $stranger = $this->learner();
        app(InstitutionService::class)->activate(InstitutionMember::query()->create(['institution_id' => $inst->id, 'email' => $manager->email, 'role' => 'manager']), $manager);

        $this->actingAs($stranger)->patchJson('/api/v1/institution', ['brand_color' => '#123456'])->assertForbidden();
        $this->actingAs($manager)->patchJson('/api/v1/institution', ['logo_url' => 'http://insecure.example/logo.png'])->assertStatus(422);
        $this->actingAs($manager)->patchJson('/api/v1/institution', ['logo_url' => 'https://cdn.example.com/logo.png', 'brand_color' => '#123456'])
            ->assertOk()->assertJsonPath('institution.brand_color', '#123456');
    }

    public function test_duel_combo_multiplies_a_streak(): void
    {
        $flat = DuelService::score([[true, 0], [false, 0], [true, 0], [false, 0]]);
        $streak = DuelService::score([[true, 0], [true, 0], [false, 0], [false, 0]]);
        $this->assertSame(320, $flat['total']);
        $this->assertSame(160 + 200, $streak['total']);
        $this->assertSame(2, $streak['best_combo']);
        // A late answer earns no speed bonus.
        $this->assertSame(100, DuelService::points(true, DuelService::ITEM_MS));
    }
}
