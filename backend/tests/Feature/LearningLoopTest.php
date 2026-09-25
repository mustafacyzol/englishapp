<?php

namespace Tests\Feature;

use App\Models\Lesson;
use App\Models\Plan;
use App\Models\RedeemCode;
use App\Models\RewardItem;
use App\Models\Story;
use App\Models\User;
use App\Services\GamificationService;
use App\Services\RewardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LearningLoopTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->user = User::factory()->create(['email_verified_at' => now(), 'gems' => 1000]);
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_path_marks_first_lesson_current(): void
    {
        $res = $this->getJson('/api/v1/path')->assertOk();
        $this->assertSame('current', $res->json('units.0.lessons.0.state'));
        $this->assertSame('locked', $res->json('units.0.lessons.1.state'));
    }

    public function test_completing_a_perfect_lesson_awards_xp_streak_quests_and_badges(): void
    {
        $lesson = Lesson::query()->where('title', 'Ben kimim? (am / is / are)')->firstOrFail();
        $answers = collect($lesson->exercises)->map(fn ($ex) => match ($ex['type']) {
            'choice', 'fill', 'listen_choice' => $ex['answer'],
            'translate', 'listen_type' => $ex['answer'],
            'speak' => $ex['text'],
            'match' => true,
        })->all();

        $res = $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => $answers])->assertOk();
        $this->assertSame(100, $res->json('score'));
        $this->assertTrue($res->json('perfect'));
        $this->assertSame(20, $res->json('reward.xp_gained')); // 15 + 5 perfect bonus
        $this->assertSame(1, $res->json('reward.streak'));
        $this->assertContains('lessons_1', collect($res->json('reward.achievements'))->pluck('key')->all());
        $this->assertContains('perfect_1', collect($res->json('reward.achievements'))->pluck('key')->all());
    }

    public function test_wrong_answers_cost_hearts(): void
    {
        $lesson = Lesson::query()->where('title', 'Selamlaşma')->firstOrFail();
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => []])->assertOk();
        $this->assertLessThan(5, $this->user->fresh()->hearts);
    }

    public function test_story_completion_and_saved_words_feed_review(): void
    {
        $story = Story::query()->where('slug', 'the-red-umbrella')->firstOrFail();
        $this->getJson('/api/v1/stories/the-red-umbrella')->assertOk()->assertJsonPath('locked', false);
        $this->postJson('/api/v1/stories/the-red-umbrella/complete', ['answers' => [1, 2, 1]])
            ->assertOk()->assertJsonPath('score', 100);

        $this->postJson('/api/v1/words', ['word' => 'Umbrella', 'translation' => 'şemsiye', 'source' => 'story', 'source_id' => $story->id])->assertCreated();
        $queue = $this->getJson('/api/v1/review')->assertOk();
        $id = $queue->json('data.0.id');
        $this->postJson('/api/v1/review', ['reviews' => [['id' => $id, 'grade' => 5]]])->assertOk()->assertJsonPath('reviewed', 1);
        $this->assertSame(0, $this->getJson('/api/v1/review')->json('data') ? count($this->getJson('/api/v1/review')->json('data')) : 0);
    }

    public function test_premium_story_is_teaser_only_for_free_users(): void
    {
        $this->getJson('/api/v1/stories/the-algorithm-that-learned-to-wait')->assertOk()
            ->assertJsonPath('locked', true)->assertJsonCount(2, 'story.paragraphs');
    }

    public function test_shop_inventory_activation_and_chest(): void
    {
        $boost = RewardItem::query()->where('key', 'xp_boost_15')->first();
        $owned = $this->postJson("/api/v1/shop/{$boost->id}/buy")->assertCreated()->json('item');
        $this->assertSame(850, $this->user->fresh()->gems);

        $this->postJson("/api/v1/inventory/{$owned['id']}/activate")->assertOk();
        $this->assertSame(2.0, app(GamificationService::class)->xpMultiplier($this->user->fresh()));
        $this->postJson("/api/v1/inventory/{$owned['id']}/activate")->assertUnprocessable();

        $chest = RewardItem::query()->where('key', 'mystery_chest')->first();
        $c = $this->postJson("/api/v1/shop/{$chest->id}/buy")->assertCreated()->json('item');
        $this->postJson("/api/v1/inventory/{$c['id']}/activate")->assertOk()->assertJsonStructure(['message', 'extra' => ['prize']]);
    }

    public function test_live_lesson_voucher_can_be_redeemed_by_school(): void
    {
        $card = app(RewardService::class)->grant($this->user, 'live_lesson', 'admin');
        $code = $this->postJson("/api/v1/inventory/{$card->id}/activate")->assertOk()->json('extra.code');
        $this->assertStringStartsWith('BDO-', $code);

        $staff = User::factory()->create(['role' => 'editor', 'email_verified_at' => now()]);
        $this->app['auth']->forgetGuards();
        $token = $staff->createToken('admin', ['user', 'admin'])->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/admin/vouchers', ['code' => $code, 'redeem' => true])
            ->assertOk()->assertJsonPath('voucher.status', 'used');
    }

    public function test_redeem_code_grants_premium_once(): void
    {
        RedeemCode::query()->create(['code' => 'OKUL2026', 'type' => 'premium_days', 'amount' => 30, 'max_uses' => 100]);
        $this->postJson('/api/v1/redeem', ['code' => 'okul2026'])->assertOk();
        $this->assertTrue($this->user->fresh()->isPremium());
        $this->postJson('/api/v1/redeem', ['code' => 'OKUL2026'])->assertUnprocessable();
    }

    public function test_checkout_with_coupon_through_fake_gateway(): void
    {
        $plan = Plan::query()->where('slug', 'quarterly')->first();
        $this->postJson('/api/v1/checkout/quote', ['plan_id' => $plan->id, 'coupon' => 'hosgeldin'])
            ->assertOk()->assertJsonPath('total', 261.75);

        $res = $this->postJson('/api/v1/checkout', ['plan_id' => $plan->id, 'coupon' => 'HOSGELDIN'])->assertCreated();
        $url = $res->json('checkout.payment_page_url');
        $this->get(parse_url($url, PHP_URL_PATH).'?'.parse_url($url, PHP_URL_QUERY))->assertRedirect();

        $user = $this->user->fresh();
        $this->assertTrue($user->isPremium());
        $this->assertSame(1500, $user->gems); // 1000 + 500 bonus
        $this->assertSame(1, $user->items()->whereHas('item', fn ($q) => $q->where('key', 'live_lesson'))->count());

        // coupon is first-order-only now
        $this->postJson('/api/v1/checkout/quote', ['plan_id' => $plan->id, 'coupon' => 'HOSGELDIN'])->assertUnprocessable();
    }

    public function test_league_standings_and_weekly_close(): void
    {
        $lesson = Lesson::query()->where('title', 'Selamlaşma')->firstOrFail();
        $answers = collect($lesson->exercises)->map(fn ($ex) => $ex['type'] === 'match' ? true : ($ex['type'] === 'speak' ? $ex['text'] : $ex['answer']))->all();
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => $answers])->assertOk();

        $league = $this->getJson('/api/v1/league')->assertOk();
        $this->assertSame(1, $league->json('rows.0.rank'));
        $week = $league->json('week_key');

        $this->artisan('dilgo:close-leagues', ['week' => $week])->assertSuccessful();
        $this->assertSame(1, $this->user->fresh()->league_tier);
    }

    public function test_ai_teacher_reports_unavailable_without_key(): void
    {
        config(['dilgo.ai.api_key' => null]);
        $this->getJson('/api/v1/ai/scenarios')->assertOk()->assertJsonPath('usage.limit', 10);
        $conv = $this->postJson('/api/v1/ai/conversations', ['mode' => 'roleplay', 'scenario_key' => 'order-at-a-cafe'])->assertCreated();
        $this->postJson('/api/v1/ai/conversations/'.$conv->json('conversation.id').'/messages', ['text' => 'A latte please'])->assertStatus(503);
    }

    public function test_placement_sets_level(): void
    {
        $bank = json_decode(file_get_contents(database_path('data/placement.json')), true);
        $answers = collect($bank)->map(fn ($q) => in_array($q['level'], ['A1', 'A2'], true) ? $q['answer'] : -1)->all();
        $this->postJson('/api/v1/placement', ['answers' => $answers])->assertOk()->assertJsonPath('level', 'B1');
        $this->assertSame('B1', $this->user->fresh()->cefr_level);
    }
}
