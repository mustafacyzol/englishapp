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
        $lesson = $this->node('A1', 0, 1);
        $answers = collect($lesson->exercises)->map(fn ($ex) => $this->correctAnswer($ex))->all();
        // a later stop opens only once the one before it is done, even in a course below your level
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => $answers])->assertForbidden();
        $this->user->forceFill(['cefr_level' => 'A2'])->save();
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => $answers])->assertForbidden();
        $first = $this->node('A1', 0, 0);
        \App\Models\LessonProgress::query()->create(['user_id' => $this->user->id, 'lesson_id' => $first->id, 'best_score' => 100, 'attempts' => 1, 'crowns' => 1, 'completed_at' => now()]);

        $res = $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => $answers])->assertOk();
        $this->assertSame(100, $res->json('score'));
        $this->assertTrue($res->json('perfect'));
        $this->assertSame(20, $res->json('reward.xp_gained')); // 15 + 5 perfect bonus
        $this->assertSame(1, $res->json('reward.streak'));
        $this->assertContains('lessons_1', collect($res->json('reward.achievements'))->pluck('key')->all());
        $this->assertContains('perfect_1', collect($res->json('reward.achievements'))->pluck('key')->all());
    }

    /** A path node by level, unit and stop index (position 0 is kept for school-grade lessons). */
    private function node(string $level, int $unit, int $pos): Lesson
    {
        return \App\Models\Course::query()->where('cefr_level', $level)->firstOrFail()
            ->units()->where('position', $unit)->firstOrFail()
            ->lessons()->where('position', $pos + 1)->firstOrFail();
    }

    /** The answer the client would submit for a correct attempt, per exercise type. */
    private function correctAnswer(array $ex): mixed
    {
        return match ($ex['type']) {
            'speak' => $ex['text'],
            'match' => true,
            'spot_error' => $ex['error_index'].':'.$ex['answer'],
            'sequence' => $ex['answer'],
            default => $ex['answer'],
        };
    }

    public function test_wrong_answers_cost_hearts(): void
    {
        $lesson = $this->node('A1', 0, 0);
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

        $staff = User::factory()->create(['role' => 'support', 'email_verified_at' => now()]);
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
        $lesson = $this->node('A1', 0, 0);
        $answers = collect($lesson->exercises)->map(fn ($ex) => $this->correctAnswer($ex))->all();
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

    public function test_placement_is_applied_without_revealing_the_level(): void
    {
        $bank = json_decode(file_get_contents(database_path('data/placement.json')), true);
        // typed tasks are graded loosely: case, spaces and punctuation do not matter
        $right = fn ($q) => ($q['type'] ?? 'choice') === 'choice' ? $q['answer'] : '  '.strtoupper($q['answer'][0]).'!';
        $answers = collect($bank)->map(fn ($q) => in_array($q['level'], ['A1', 'A2'], true) ? $right($q) : -1)->all();

        // signed in: the level is applied at once, but the response only carries a token
        $res = $this->postJson('/api/v1/placement', ['answers' => $answers])->assertCreated()->assertJsonMissingPath('level');
        $this->assertSame('B1', $this->user->fresh()->cefr_level);
        $this->postJson('/api/v1/placement/claim', ['token' => $res->json('token')])->assertOk()->assertJsonPath('result.level', 'B1')
            ->assertJsonPath('result.activities.order.total', 5)
            ->assertJsonPath('result.activities.order.correct', 2);
        $this->assertSame('order', collect($this->getJson('/api/v1/placement')->json('data'))->firstWhere('type', 'order')['type']);
        $this->assertArrayNotHasKey('answer', $this->getJson('/api/v1/placement')->json('data.0'));

        // someone else cannot take a result that already belongs to this learner
        $other = User::factory()->create();
        $this->actingAs($other, 'sanctum')->postJson('/api/v1/placement/claim', ['token' => $res->json('token')])->assertNotFound();
        $this->postJson('/api/v1/placement/claim', ['token' => 'nope'])->assertNotFound();
    }

    public function test_guest_placement_is_applied_on_sign_up(): void
    {
        $bank = json_decode(file_get_contents(database_path('data/placement.json')), true);
        $answers = collect($bank)->map(fn ($q) => $q['level'] !== 'C1' ? (($q['type'] ?? 'choice') === 'choice' ? $q['answer'] : $q['answer'][0]) : 0)->all();
        app('auth')->forgetGuards();
        $token = $this->withHeaders(['Authorization' => ''])->postJson('/api/v1/placement', ['answers' => $answers])->assertCreated()->json('token');
        $this->assertDatabaseHas('placement_results', ['token' => $token, 'user_id' => null, 'level' => 'B2']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Deniz', 'email' => 'deniz.test@example.com', 'password' => 'secret123', 'password_confirmation' => 'secret123',
            'accept_terms' => true, 'placement_token' => $token,
        ])->assertCreated();
        $u = User::query()->where('email', 'deniz.test@example.com')->first();
        $this->assertSame('B2', $u->cefr_level);
        $this->assertDatabaseHas('placement_results', ['token' => $token, 'user_id' => $u->id]);
    }

    public function test_weekly_report_and_come_back_notes_are_sent_once(): void
    {
        \Illuminate\Support\Facades\Notification::fake();
        $lastWeek = \App\Support\Period::now()->subWeek()->startOfWeek()->addDay()->toDateString();
        \Illuminate\Support\Facades\DB::table('daily_activities')->insert(['user_id' => $this->user->id, 'date' => $lastWeek, 'xp' => 40, 'lessons' => 2]);
        $this->artisan('dilgo:weekly-report')->assertSuccessful();
        \Illuminate\Support\Facades\Notification::assertSentTo($this->user, \App\Notifications\WeeklyReport::class, fn ($n) => $n->week['xp'] === 40 && $n->week['lessons'] === 2);

        $away = User::factory()->create();
        \Illuminate\Support\Facades\DB::table('daily_activities')->insert(['user_id' => $away->id, 'date' => \App\Support\Period::now()->subDays(5)->toDateString(), 'xp' => 10]);
        $this->artisan('dilgo:come-back')->assertSuccessful();
        $this->artisan('dilgo:come-back')->assertSuccessful();
        \Illuminate\Support\Facades\Notification::assertSentToTimes($away, \App\Notifications\ComeBack::class, 1);
        $this->assertSame(2, $away->fresh()->preferences['comeback_stage']);
    }

    public function test_placement_stops_at_the_first_failed_band(): void
    {
        $bank = json_decode(file_get_contents(database_path('data/placement.json')), true);
        $right = fn ($q) => ($q['type'] ?? 'choice') === 'choice' ? $q['answer'] : (is_array($q['answer']) ? $q['answer'][0] : $q['answer']);
        $answers = [];
        foreach ($bank as $i => $q) {
            if ($q['level'] === 'A1') $answers[$i] = $right($q);
            if ($q['level'] === 'A2') $answers[$i] = -1; // cannot do A2
        }
        $a1 = collect($answers)->filter(fn ($v, $i) => $bank[$i]['level'] === 'A1')->all();
        $a2 = collect($answers)->filter(fn ($v, $i) => $bank[$i]['level'] === 'A2')->all();
        $this->postJson('/api/v1/placement/band', ['level' => 'A1', 'answers' => $a1])->assertOk()->assertJsonPath('passed', true);
        $this->postJson('/api/v1/placement/band', ['level' => 'A2', 'answers' => $a2])->assertOk()->assertJsonPath('passed', false);
        // the app submits right away: everything after A2 is unanswered, the level is A2
        $token = $this->postJson('/api/v1/placement', ['answers' => $answers])->assertCreated()->json('token');
        $this->assertSame('A2', \App\Models\PlacementResult::query()->where('token', $token)->value('level'));
    }

    public function test_every_order_task_has_exactly_the_tiles_its_answer_needs(): void
    {
        $norm = fn ($s) => array_count_values(preg_split('/\s+/', trim(preg_replace("/[^\\p{L}\\p{N}' ]+/u", ' ', mb_strtolower($s)))));
        foreach (json_decode(file_get_contents(database_path('data/placement.json')), true) as $n => $q) {
            if (($q['type'] ?? 'choice') !== 'order') continue;
            foreach ((array) $q['answer'] as $a) {
                $this->assertEquals($norm(implode(' ', $q['tiles'])), $norm($a), 'placement task '.($n + 1));
            }
        }
    }
}

