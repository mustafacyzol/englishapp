<?php

namespace Tests\Feature;

use App\Models\GradeUnit;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GradeUnitTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function editor(): User
    {
        $u = User::factory()->create(['role' => 'editor', 'email_verified_at' => now()]);
        $this->app['auth']->forgetGuards();
        $this->withToken($u->createToken('admin-panel', ['user', 'admin'])->plainTextToken);

        return $u;
    }

    public function test_every_grade_has_units_spread_over_every_course(): void
    {
        $this->assertSame(11, GradeUnit::query()->distinct()->count('track'));
        // one generated lesson per grade unit per course, all at the start of a unit
        $this->assertSame(GradeUnit::query()->count() * 4, Lesson::query()->whereNotNull('meta->grade_unit')->count());
        $this->assertSame(0, Lesson::query()->whereNotNull('meta->grade_unit')->where('position', '!=', 0)->count());
    }

    public function test_editor_adds_reorders_pins_and_removes_units(): void
    {
        $this->editor();
        $words = [['apple', 'elma'], ['pear', 'armut'], ['plum', 'erik'], ['fig', 'incir']];
        $id = $this->postJson('/api/v1/admin/grade-units', ['track' => 'g5', 'title' => 'Fruit Market', 'words' => $words, 'sentences' => [['I like figs.', 'İncir severim.']]])
            ->assertCreated()->json('unit.id');
        $this->assertSame(4, Lesson::query()->where('meta->grade_unit', $id)->count());

        // a pupil of grade 5 meets it; a pupil of grade 6 does not
        $pupil = User::factory()->create(['email_verified_at' => now(), 'school_stage' => 'ortaokul', 'grade' => 5]);
        $other = User::factory()->create(['email_verified_at' => now(), 'school_stage' => 'ortaokul', 'grade' => 6]);
        $this->editor();
        $this->putJson("/api/v1/admin/grade-units/{$id}", ['slot' => 1])->assertOk();
        $this->assertStringContainsString('Fruit Market', $this->actingAs($pupil)->getJson('/api/v1/path')->json('units.0.title'));
        $this->assertStringNotContainsString('Fruit Market', $this->actingAs($other)->getJson('/api/v1/path')->json('units.0.title'));

        // validation: too few words, unknown grade
        $this->editor();
        $this->postJson('/api/v1/admin/grade-units', ['track' => 'g5', 'title' => 'X', 'words' => [['a', 'b']]])->assertUnprocessable();
        $this->postJson('/api/v1/admin/grade-units', ['track' => 'g13', 'title' => 'X', 'words' => $words])->assertUnprocessable();

        $copy = $this->postJson("/api/v1/admin/grade-units/{$id}/copy", ['track' => 'g6'])->assertCreated()->json('unit.id');
        $this->assertSame('g6', GradeUnit::query()->find($copy)->track);
        $ids = GradeUnit::query()->where('track', 'g5')->orderBy('position')->pluck('id')->reverse()->values()->all();
        $this->postJson('/api/v1/admin/grade-units/reorder', ['track' => 'g5', 'ids' => $ids])->assertOk();
        $this->assertSame($id, GradeUnit::query()->where('track', 'g5')->orderBy('position')->value('id'));

        $this->deleteJson("/api/v1/admin/grade-units/{$id}")->assertOk();
        $this->assertSame(0, Lesson::query()->where('meta->grade_unit', $id)->count());
    }

    public function test_learners_cannot_edit_grade_units(): void
    {
        $u = User::factory()->create(['email_verified_at' => now()]);
        $this->actingAs($u)->getJson('/api/v1/admin/grade-units')->assertForbidden();
    }
}
