<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Lesson;
use App\Models\User;
use App\Notifications\InstitutionInvite;
use App\Support\Skills;
use Database\Seeders\CourseSeeder;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SkillsDuelInstitutionTest extends TestCase
{
    use RefreshDatabase;

    private function learner(array $attrs = []): User
    {
        return User::factory()->create($attrs + ['email_verified_at' => now(), 'onboarded' => true]);
    }

    public function test_skill_split_keeps_the_total_and_levels_grow(): void
    {
        $split = Skills::split(25, ['reading' => 0.5, 'listening' => 0.25, 'speaking' => 0.25]);
        $this->assertSame(25, array_sum($split));
        $this->assertSame(0, Skills::level(59));
        $this->assertSame(1, Skills::level(60));
        $this->assertSame(2, Skills::level(180));
    }

    public function test_lesson_xp_is_split_across_the_skills_it_trains(): void
    {
        $this->seed([GameSeeder::class, CourseSeeder::class]);
        $user = $this->learner(['focus_skill' => 'writing']);
        $lesson = Lesson::query()->whereJsonLength('exercises', '>', 3)->first();
        $answers = collect($lesson->exercises)->map(fn ($e) => match ($e['type']) {
            'speak' => $e['text'], 'translate', 'listen_type', 'order' => $e['answer'], 'match' => true,
            'spot_error' => $e['error_index'].':'.$e['answer'], default => $e['answer'],
        })->all();

        $res = $this->actingAs($user)->postJson("/api/v1/lessons/{$lesson->id}/complete", ['answers' => $answers])->assertOk();
        $this->assertSame($res->json('reward.xp_gained'), array_sum((array) $res->json('reward.skill_xp')));

        $report = $this->actingAs($user)->getJson('/api/v1/me/skills')->assertOk();
        $this->assertCount(4, $report->json('skills'));
        $this->assertSame($res->json('reward.xp_gained'), collect($report->json('skills'))->sum('xp'));

        $plan = $this->actingAs($user)->getJson('/api/v1/dashboard')->assertOk()->json('plan');
        $this->assertCount(4, $plan);
        $this->assertSame('writing', $plan[0]['skill']); // the learner's chosen focus leads the plan
    }

    public function test_onboarding_answers_are_saved_on_register(): void
    {
        Notification::fake();
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Ece Kaya', 'email' => 'ece@example.com', 'password' => 'secret123', 'password_confirmation' => 'secret123',
            'accept_terms' => true, 'learning_goal' => 'travel', 'focus_skill' => 'speaking',
            'interests' => ['travel', 'music'], 'study_time' => 'morning', 'motivation' => 'abroad',
        ])->assertCreated()
            ->assertJsonPath('user.focus_skill', 'speaking')
            ->assertJsonPath('user.interests', ['travel', 'music'])
            ->assertJsonPath('user.study_time', 'morning');
    }

    public function test_a_duel_can_be_played_and_moves_trophies(): void
    {
        $this->seed([GameSeeder::class, CourseSeeder::class]);
        $me = $this->learner();
        $ghost = $this->learner(['xp_total' => 500, 'duel_trophies' => 100]);

        $duel = $this->actingAs($me)->postJson('/api/v1/duel')->assertCreated()->json('duel');
        $this->assertCount(4, $duel['rounds']);
        $this->assertSame($ghost->name, $duel['ghost']['name']);

        // Answer everything correctly and fast.
        $answers = [];
        foreach ($duel['rounds'] as $round) {
            foreach ($round['items'] as $item) {
                $e = $item['ex'];
                $answers[] = [match ($e['type']) {
                    'speak' => $e['text'], default => $e['answer']
                }, 1500];
            }
        }
        $res = $this->actingAs($me)->postJson("/api/v1/duel/{$duel['id']}/finish", ['answers' => $answers])->assertOk();
        $this->assertSame(count($answers), $res->json('correct'));
        $this->assertSame('win', $res->json('result')); // a perfect, fast run always beats the replay
        $this->assertGreaterThanOrEqual(24, $me->fresh()->duel_trophies);
        $this->assertLessThan(100, $ghost->fresh()->duel_trophies);
        $this->assertSame(1, $ghost->notifications()->count());

        $this->actingAs($me)->postJson("/api/v1/duel/{$duel['id']}/finish", ['answers' => $answers])->assertUnprocessable();
        $this->actingAs($me)->getJson('/api/v1/duel')->assertOk()->assertJsonPath('me.wins', 1)->assertJsonPath('me.tickets_left', 4);
    }

    public function test_institution_invites_students_within_its_seats(): void
    {
        Notification::fake();
        $inst = Institution::query()->create(['name' => 'Test Koleji', 'seats' => 2, 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth()]);
        $manager = $this->learner();
        $inst->members()->create(['email' => $manager->email, 'role' => 'manager', 'status' => 'active', 'user_id' => $manager->id]);
        $existing = $this->learner();

        $this->actingAs($manager)->postJson('/api/v1/institution/invite', ['rows' => [
            ['email' => 'yeni@example.com', 'name' => 'Yeni', 'class_name' => '9-B'],
            ['email' => $existing->email],
        ]])->assertOk()->assertJsonPath('invited', 2);

        Notification::assertSentOnDemand(InstitutionInvite::class);
        $this->assertTrue($existing->fresh()->isPremium()); // an existing account joins right away

        $this->actingAs($manager)->postJson('/api/v1/institution/invite', ['rows' => [['email' => 'fazla@example.com']]])->assertUnprocessable();

        $token = $inst->members()->where('email', 'yeni@example.com')->value('invite_token');
        $this->getJson("/api/v1/invites/{$token}")->assertOk()->assertJsonPath('institution.name', 'Test Koleji');

        $report = $this->actingAs($manager)->getJson('/api/v1/institution')->assertOk();
        $this->assertSame(2, $report->json('summary.students'));
        $this->actingAs($existing)->getJson('/api/v1/institution')->assertForbidden();
    }
}
