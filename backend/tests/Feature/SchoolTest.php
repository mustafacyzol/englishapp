<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Models\Lesson;
use App\Models\User;
use Database\Seeders\CourseSeeder;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SchoolTest extends TestCase
{
    use RefreshDatabase;

    private function member(Institution $inst, User $u, string $role, ?string $class = null): InstitutionMember
    {
        return InstitutionMember::query()->create(['institution_id' => $inst->id, 'user_id' => $u->id, 'email' => $u->email, 'name' => $u->name, 'role' => $role, 'status' => 'active', 'class_name' => $class, 'joined_at' => now()]);
    }

    public function test_principal_teacher_and_student_roles(): void
    {
        Notification::fake();
        $this->seed([GameSeeder::class, CourseSeeder::class]);
        $inst = Institution::query()->create(['name' => 'Atatürk Ortaokulu', 'slug' => 'ataturk', 'type' => 'school', 'seats' => 100, 'join_code' => 'ATA123']);
        $principal = User::factory()->create(['email_verified_at' => now()]);
        $teacherUser = User::factory()->create(['email_verified_at' => now()]);
        $s1 = User::factory()->create(['email_verified_at' => now()]);
        $s2 = User::factory()->create(['email_verified_at' => now()]);
        $this->member($inst, $principal, 'manager');
        $teacher = $this->member($inst, $teacherUser, 'teacher');
        $this->member($inst, $s1, 'student', '8-A');
        $this->member($inst, $s2, 'student', '8-B');

        // the principal creates classes and gives 8-A to the teacher
        $this->actingAs($principal, 'sanctum')->postJson('/api/v1/institution/classes', ['name' => '8-A', 'grade' => 8, 'teacher_member_id' => $teacher->id])->assertOk();
        $this->actingAs($principal, 'sanctum')->postJson('/api/v1/institution/classes', ['name' => '8-B', 'grade' => 8])->assertOk();
        $this->actingAs($principal, 'sanctum')->getJson('/api/v1/institution')->assertOk()->assertJsonPath('role', 'manager')->assertJsonCount(2, 'school_classes')->assertJsonCount(1, 'teachers');

        // the teacher sees only 8-A and cannot invite teachers or touch 8-B
        $res = $this->actingAs($teacherUser, 'sanctum')->getJson('/api/v1/institution')->assertOk()->assertJsonPath('role', 'teacher');
        $this->assertSame([$s1->email], collect($res->json('members'))->pluck('email')->all());
        $this->actingAs($teacherUser, 'sanctum')->postJson('/api/v1/institution/invite', ['role' => 'teacher', 'rows' => [['email' => 'x@example.com']]])->assertForbidden();
        $this->actingAs($teacherUser, 'sanctum')->postJson('/api/v1/institution/invite', ['rows' => [['email' => 'y@example.com', 'class_name' => '8-B']]])->assertStatus(422);
        $this->actingAs($teacherUser, 'sanctum')->postJson('/api/v1/institution/classes', ['name' => '9-A'])->assertForbidden();

        // homework: a lesson for 8-A completes itself when the student finishes it
        $lesson = Lesson::query()->first();
        $a = $this->actingAs($teacherUser, 'sanctum')->postJson('/api/v1/institution/assignments', ['class_name' => '8-A', 'kind' => 'lesson', 'target' => (string) $lesson->id])->assertCreated()->json('data.0');
        $this->assertSame(1, $a['students']);
        $this->assertSame(0, $a['done']);
        $this->actingAs($s1, 'sanctum')->getJson('/api/v1/me/assignments')->assertOk()->assertJsonPath('data.0.done', false);
        $this->actingAs($s2, 'sanctum')->getJson('/api/v1/me/assignments')->assertOk()->assertJsonCount(0, 'data');
        DB::table('lesson_progress')->insert(['user_id' => $s1->id, 'lesson_id' => $lesson->id, 'best_score' => 90, 'attempts' => 1, 'completed_at' => now()->addMinute(), 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($s1, 'sanctum')->getJson('/api/v1/me/assignments')->assertJsonPath('data.0.done', true);
        $this->actingAs($teacherUser, 'sanctum')->getJson('/api/v1/institution/assignments')->assertJsonPath('data.0.done', 1);

        // a custom task is ticked off by the student; a stranger cannot
        $custom = $this->actingAs($principal, 'sanctum')->postJson('/api/v1/institution/assignments', ['kind' => 'custom', 'title' => 'Read page 12'])->assertCreated()->json('data.0.id');
        $this->actingAs($s2, 'sanctum')->postJson("/api/v1/me/assignments/{$custom}/done")->assertOk();
        $this->actingAs(User::factory()->create(), 'sanctum')->postJson("/api/v1/me/assignments/{$custom}/done")->assertNotFound();
        $this->actingAs($s1, 'sanctum')->getJson('/api/v1/institution')->assertForbidden();
    }
}
