<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CourseSeeder;
use Database\Seeders\ExamSeeder;
use Database\Seeders\GameSeeder;
use Database\Seeders\GradeUnitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackTest extends TestCase
{
    use RefreshDatabase;

    public function test_path_follows_stage_grade_and_exam(): void
    {
        $this->seed([GameSeeder::class, CourseSeeder::class, GradeUnitSeeder::class]);
        $u = User::factory()->create(['email_verified_at' => now(), 'school_stage' => 'ortaokul', 'grade' => 8, 'exam_target' => 'lgs', 'age_group' => 'teen']);
        $path = $this->actingAs($u)->getJson('/api/v1/path')->assertOk();
        $this->assertSame('grade', $path->json('track.key'));
        // the coursebook's unit titles, and the grade's own lesson opens the unit
        $this->assertSame('Friendship & Teen Life', $path->json('units.0.title'));
        $this->assertSame('g8', $path->json('units.0.lessons.0.meta.track'));
        $this->assertSame('current', $path->json('units.0.lessons.0.state'));
        $this->assertSame('quiz', $path->json('units.0.lessons')[count($path->json('units.0.lessons')) - 1]['kind']);
        $guide = $this->actingAs($u)->getJson('/api/v1/units/'.$path->json('units.0.id').'/guidebook')->assertOk();
        $this->assertStringContainsString('LGS', $guide->json('guidebook'));
        // most stops of a unit are vocabulary and grammar
        $skills = collect($path->json('units.0.lessons'))->pluck('skill');
        $this->assertGreaterThan($skills->count() / 2, $skills->filter(fn ($s) => in_array($s, ['vocabulary', 'grammar'], true))->count());

        $adult = User::factory()->create(['email_verified_at' => now(), 'school_stage' => 'universite', 'exam_target' => 'yds', 'age_group' => 'adult']);
        // an exam learner meets the exam's own units; nobody else's
        $adultPath = $this->actingAs($adult)->getJson('/api/v1/path')->assertJsonPath('track.key', 'exam')->assertJsonPath('units.0.title', 'Science and Research');
        $this->assertSame(['x_yds'], collect($adultPath->json('units.*.lessons.*.meta.track'))->filter()->unique()->values()->all());
        $plain = User::factory()->create(['email_verified_at' => now(), 'school_stage' => 'yetiskin', 'age_group' => 'adult']);
        $plainPath = $this->actingAs($plain)->getJson('/api/v1/path')->assertJsonPath('track.key', 'general')->assertJsonPath('units.0.title', 'Hello!');
        $this->assertEmpty(collect($plainPath->json('units.*.lessons.*.meta.track'))->filter());
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
