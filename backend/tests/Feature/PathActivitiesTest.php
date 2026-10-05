<?php

namespace Tests\Feature;

use App\Models\AiConversation;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonMistake;
use App\Models\LessonProgress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PathActivitiesTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private User $u;

    protected function setUp(): void
    {
        parent::setUp();
        $this->u = User::factory()->create(['email_verified_at' => now(), 'onboarded' => true, 'cefr_level' => 'A1', 'premium_until' => now()->addYear()]);
        $this->actingAs($this->u);
    }

    /** Reaches a stop of A1 unit 1 by marking the ones before it done. */
    private function reach(string $kind): Lesson
    {
        $unit = Course::query()->where('cefr_level', 'A1')->first()->units()->orderBy('position')->first();
        $lesson = $unit->lessons()->where('kind', $kind)->firstOrFail();
        foreach ($unit->lessons()->where('position', '<', $lesson->position)->get() as $prev) {
            LessonProgress::query()->firstOrCreate(['user_id' => $this->u->id, 'lesson_id' => $prev->id], ['completed_at' => now(), 'best_score' => 100, 'crowns' => 1, 'attempts' => 1]);
        }

        return $lesson;
    }

    public function test_a_story_stop_needs_the_story_read(): void
    {
        $lesson = $this->reach('story');
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => []])->assertStatus(422);
        $this->postJson("/api/v1/stories/{$lesson->story->slug}/complete", ['answers' => []])->assertOk();
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => []])->assertOk()->assertJsonPath('passed', true);
    }

    public function test_a_word_set_stop_plays_the_library_set_and_needs_a_real_game(): void
    {
        $lesson = $this->reach('words');
        $this->assertSame('a1-1', $lesson->meta['set']);
        // no game played
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => ['correct' => 10, 'total' => 10]])->assertStatus(422);
        $deck = $this->getJson("/api/v1/words/deck?lesson={$lesson->id}")->assertOk();
        $this->assertSame('A1 · Merhaba!', $deck->json('set.title'));
        // too fast to be a real game
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => ['correct' => 10, 'total' => 10]])->assertStatus(422);
        Carbon::setTestNow(now()->addSeconds(40));
        // under half right
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => ['correct' => 2, 'total' => 10]])->assertStatus(422);
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => ['correct' => 8, 'total' => 10, 'game' => 'match']])->assertOk();
        Carbon::setTestNow();
        $this->assertDatabaseHas('word_set_plays', ['user_id' => $this->u->id, 'correct' => 8, 'total' => 10]);
    }

    public function test_a_defne_stop_needs_a_real_conversation(): void
    {
        $lesson = $this->reach('ai_talk');
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => []])->assertStatus(422);
        $c = AiConversation::query()->create(['user_id' => $this->u->id, 'mode' => 'roleplay', 'scenario_key' => $lesson->scenario_key]);
        foreach (['Hi!', 'I am Can.', 'Nice to meet you.'] as $t) {
            $c->messages()->create(['role' => 'user', 'content' => $t]);
        }
        $this->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => []])->assertOk();
    }

    public function test_mistakes_come_back_on_the_review_stop_until_fixed(): void
    {
        $first = $this->reach('lesson');
        $answers = collect($first->exercises)->map(fn ($ex) => match ($ex['type']) {
            'speak' => $ex['text'], 'match' => true, 'spot_error' => $ex['error_index'].':'.$ex['answer'], default => $ex['answer'],
        })->all();
        $wrongAt = collect($first->exercises)->search(fn ($ex) => in_array($ex['type'], ['choice', 'listen_choice'], true));
        $answers[$wrongAt] = 99; // one wrong answer
        $this->postJson("/api/v1/lessons/{$first->id}/complete", ['answers' => $answers])->assertOk();
        $this->assertSame(1, LessonMistake::query()->where('user_id', $this->u->id)->whereNull('fixed_at')->count());

        $review = $this->reach('review');
        $served = $this->getJson("/api/v1/lessons/{$review->id}")->assertOk()->json('lesson');
        $this->assertSame(1, $served['mistakes']);
        $this->assertSame($first->title, $served['exercises'][0]['review_of']);
        $this->getJson('/api/v1/path')->assertJsonPath('mistakes_due', 1);

        $right = fn ($exs) => collect($exs)->map(fn ($ex) => match ($ex['type']) {
            'speak' => $ex['text'], 'match' => true, 'spot_error' => $ex['error_index'].':'.$ex['answer'], default => $ex['answer'],
        })->all();
        $this->postJson("/api/v1/lessons/{$review->id}/complete", ['answers' => $right($served['exercises'])])->assertOk();
        $m = LessonMistake::query()->first();
        $this->assertSame(1, $m->streak);
        $this->assertNull($m->fixed_at); // one right answer is not enough

        // two days later it is due again; a second right answer clears it
        Carbon::setTestNow(now()->addDays(2)->addMinute());
        $served = $this->getJson("/api/v1/lessons/{$review->id}")->json('lesson');
        $this->assertSame(1, $served['mistakes']);
        $this->postJson("/api/v1/lessons/{$review->id}/complete", ['answers' => $right($served['exercises'])])->assertOk();
        $this->assertNotNull($m->fresh()->fixed_at);
        Carbon::setTestNow();
    }
}
