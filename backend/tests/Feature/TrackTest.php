<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CourseSeeder;
use Database\Seeders\ExamSeeder;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackTest extends TestCase
{
    use RefreshDatabase;

    public function test_path_follows_stage_grade_and_exam(): void
    {
        $this->seed([GameSeeder::class, CourseSeeder::class]);
        $u = User::factory()->create(['email_verified_at' => now(), 'school_stage' => 'ortaokul', 'grade' => 8, 'exam_target' => 'lgs', 'age_group' => 'teen']);
        $path = $this->actingAs($u)->getJson('/api/v1/path')->assertOk();
        $this->assertSame('maarif', $path->json('track.key'));
        $this->assertSame('lgs', $path->json('units.0.drill.exam'));
        $this->assertStringStartsWith('Tema 1', $path->json('units.0.tag.label'));
        // most stops of a unit are vocabulary and grammar
        $skills = collect($path->json('units.0.lessons'))->pluck('skill');
        $this->assertGreaterThan($skills->count() / 2, $skills->filter(fn ($s) => in_array($s, ['vocabulary', 'grammar'], true))->count());

        $adult = User::factory()->create(['email_verified_at' => now(), 'school_stage' => 'universite', 'exam_target' => 'yds', 'age_group' => 'adult']);
        $this->actingAs($adult)->getJson('/api/v1/path')->assertJsonPath('track.key', 'exam')->assertJsonPath('units.0.tag', null);
    }

    public function test_exam_changes_only_through_reonboarding_once_a_month(): void
    {
        $this->seed([GameSeeder::class, ExamSeeder::class]);
        $u = User::factory()->create(['email_verified_at' => now(), 'school_stage' => 'lise', 'grade' => 11, 'exam_target' => 'ydt', 'age_group' => 'teen']);
        $this->actingAs($u)->patchJson('/api/v1/account', ['exam_target' => 'ielts'])->assertUnprocessable();
        // another exam's mock is not on offer through a query parameter
        $this->actingAs($u)->getJson('/api/v1/exam/mock?exam=ielts')->assertOk()->assertJsonPath('exam', 'ydt');

        $this->actingAs($u)->postJson('/api/v1/account/track', ['school_stage' => 'lise', 'grade' => 12, 'exam_target' => 'ielts'])->assertOk()->assertJsonPath('user.exam_target', 'ielts');
        $this->actingAs($u)->postJson('/api/v1/account/track', ['school_stage' => 'lise', 'grade' => 12, 'exam_target' => 'ydt'])->assertUnprocessable();
        // an exam that does not belong to the stage is refused
        $kid = User::factory()->create(['email_verified_at' => now()]);
        $this->actingAs($kid)->postJson('/api/v1/account/track', ['school_stage' => 'ortaokul', 'grade' => 7, 'exam_target' => 'yds'])->assertUnprocessable();
        $this->actingAs($kid)->postJson('/api/v1/account/track', ['school_stage' => 'ortaokul', 'grade' => 5, 'exam_target' => 'lgs'])->assertOk()->assertJsonPath('user.exam_target', null);
    }
}
