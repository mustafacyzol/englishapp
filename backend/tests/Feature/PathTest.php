<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use App\Services\PathService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PathTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function learner(string $level = 'A1'): User
    {
        return User::factory()->create(['email_verified_at' => now(), 'onboarded' => true, 'cefr_level' => $level]);
    }

    public function test_units_go_in_order_but_unit_starts_are_open(): void
    {
        $u = $this->learner();
        $res = $this->actingAs($u)->getJson('/api/v1/path')->assertOk()->assertJsonPath('course.access', 'current');
        $units = $res->json('units');
        $this->assertSame('current', $units[0]['lessons'][0]['state']);
        $this->assertSame('locked', $units[0]['lessons'][1]['state']); // middle of a topic
        $this->assertSame('open', $units[1]['lessons'][0]['state']);   // start of another topic

        $this->getJson('/api/v1/lessons/'.$units[0]['lessons'][1]['id'])->assertForbidden();
        $this->getJson('/api/v1/lessons/'.$units[1]['lessons'][0]['id'])->assertOk();
    }

    public function test_higher_levels_are_locked_and_lower_ones_open(): void
    {
        $u = $this->learner('A2');
        $a1 = Course::query()->where('cefr_level', 'A1')->first();
        $b1 = Course::query()->where('cefr_level', 'B1')->first();
        $this->actingAs($u)->getJson("/api/v1/path/{$a1->id}")->assertOk()->assertJsonPath('course.access', 'review')
            ->assertJsonPath('units.0.lessons.1.state', 'open');
        $locked = $this->getJson("/api/v1/path/{$b1->id}")->assertOk()->assertJsonPath('course.access', 'locked')->json('units.0.lessons.0.id');
        $this->getJson("/api/v1/lessons/{$locked}")->assertForbidden();
    }

    public function test_level_changes_only_through_placement(): void
    {
        $u = $this->learner();
        $this->actingAs($u)->patchJson('/api/v1/account', ['cefr_level' => 'B2'])->assertUnprocessable();

        app(PathService::class)->applyPlacement($u, 'A1', ['A1' => ['total' => 8, 'correct' => 8]]);
        $a1 = Course::query()->where('cefr_level', 'A1')->first();
        $this->assertArrayHasKey((string) $a1->id, $u->fresh()->path_unlocks);
    }
}
