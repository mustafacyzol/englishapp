<?php

namespace Tests\Feature;

use App\Models\GradeUnit;
use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Models\User;
use App\Models\WordSet;
use App\Notifications\AchievementUnlocked;
use App\Support\Settings;
use Database\Seeders\CourseSeeder;
use Database\Seeders\GameSeeder;
use Database\Seeders\GradeUnitSeeder;
use Database\Seeders\WordSetSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Moderation of shared sets, notification preferences, level decks, coursebook homework, starter gems. */
class RoundTwelveTest extends TestCase
{
    use RefreshDatabase;

    private function trusted(): User
    {
        return User::factory()->create(['email_verified_at' => now(), 'created_at' => now()->subDays(3)]);
    }

    private function words(string $extra = 'grape'): array
    {
        return [['word' => 'apple', 'translation' => 'elma'], ['word' => 'pear', 'translation' => 'armut'], ['word' => 'plum', 'translation' => 'erik'], ['word' => 'cherry', 'translation' => 'kiraz'], ['word' => $extra, 'translation' => 'meyve']];
    }

    public function test_shared_sets_need_real_words_and_cannot_repost_others(): void
    {
        $u = $this->trusted();
        // too few words to share
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'Az', 'is_public' => true, 'items' => array_slice($this->words(), 0, 3)])->assertUnprocessable();
        // keyboard mashing
        $junk = array_map(fn ($i) => ['word' => str_repeat('a', 5 + $i), 'translation' => 'x'.$i], range(1, 6));
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'Aaaa', 'is_public' => true, 'items' => $junk])->assertUnprocessable();
        // words "translated" to themselves
        $same = array_map(fn ($w) => ['word' => $w, 'translation' => $w], ['dog', 'cat', 'bird', 'fish', 'cow']);
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'Aynı', 'is_public' => true, 'items' => $same])->assertUnprocessable();
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'Meyveler', 'is_public' => true, 'items' => $this->words()])->assertOk();

        // someone else posting the very same list publicly is pointed to the original
        $this->actingAs($this->trusted())->postJson('/api/v1/word-sets', ['title' => 'Benim meyvelerim', 'is_public' => true, 'items' => array_reverse($this->words())])->assertUnprocessable();
    }

    public function test_reports_hide_a_set_and_moderators_restore_it(): void
    {
        $owner = $this->trusted();
        $set = $this->actingAs($owner)->postJson('/api/v1/word-sets', ['title' => 'Meyveler', 'is_public' => true, 'items' => $this->words()])->assertOk()->json('data');
        Settings::put(['moderation.report_hide' => 2]);

        // nobody reports their own set or an official one
        $this->actingAs($owner)->postJson("/api/v1/word-sets/{$set['id']}/report", ['reason' => 'spam'])->assertNotFound();
        $a = $this->trusted();
        $this->actingAs($a)->postJson("/api/v1/word-sets/{$set['id']}/report", ['reason' => 'spam'])->assertOk();
        // the same reporter twice still counts once
        $this->actingAs($a)->postJson("/api/v1/word-sets/{$set['id']}/report", ['reason' => 'spam'])->assertOk();
        // a fresh, unverified account does not tip the balance
        $this->actingAs(User::factory()->create())->postJson("/api/v1/word-sets/{$set['id']}/report", ['reason' => 'spam'])->assertOk();
        $this->assertNull(WordSet::query()->find($set['id'])->hidden_at);

        $this->actingAs($this->trusted())->postJson("/api/v1/word-sets/{$set['id']}/report", ['reason' => 'inappropriate'])->assertOk();
        $this->assertNotNull(WordSet::query()->find($set['id'])->hidden_at);
        // hidden from others, still there for the owner, who is told
        $this->actingAs($this->trusted())->getJson("/api/v1/word-sets/{$set['id']}")->assertNotFound();
        $this->actingAs($owner)->getJson("/api/v1/word-sets/{$set['id']}")->assertOk()->assertJsonPath('data.hidden', true);

        // the moderation queue, then a restore
        $mod = User::factory()->create(['role' => 'super_admin', 'email_verified_at' => now()]);
        $this->app['auth']->forgetGuards();
        $token = $mod->createToken('admin-panel', ['user', 'admin'])->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/admin/moderation/word-sets?status=hidden')->assertOk()->assertJsonPath('data.0.id', $set['id'])->assertJsonPath('data.0.reports_count', 3);
        $this->withToken($token)->postJson("/api/v1/admin/moderation/word-sets/{$set['id']}", ['action' => 'restore'])->assertOk();
        $this->assertNull(WordSet::query()->find($set['id'])->hidden_at);
        $this->assertSame(0, WordSet::query()->find($set['id'])->reports_count);

        // stopping an owner from sharing makes their sets private and blocks new shares
        $this->withToken($token)->postJson("/api/v1/admin/moderation/word-sets/{$set['id']}", ['action' => 'block_sharing'])->assertOk();
        $this->assertFalse(WordSet::query()->find($set['id'])->is_public);
        $this->app['auth']->forgetGuards();
        $this->actingAs($owner->fresh())->postJson('/api/v1/word-sets', ['title' => 'Yeni', 'is_public' => true, 'items' => $this->words('melon')])->assertForbidden();
        // a learner can never set that flag on themselves
        $this->actingAs($owner->fresh())->patchJson('/api/v1/account', ['preferences' => ['share_blocked' => false]])->assertOk();
        $this->assertTrue($owner->fresh()->preferences['share_blocked']);
    }

    public function test_notification_preferences_are_saved_and_respected(): void
    {
        $this->seed([GameSeeder::class]);
        $u = $this->trusted();
        $this->actingAs($u)->patchJson('/api/v1/account', ['preferences' => ['email_weekly' => false, 'notify' => ['achievements' => false]]])->assertOk();
        $this->actingAs($u)->patchJson('/api/v1/account', ['preferences' => ['notify' => ['league' => false]]])->assertOk();
        $prefs = $u->fresh()->preferences;
        $this->assertFalse($prefs['email_weekly']);
        $this->assertSame(['achievements' => false, 'league' => false], $prefs['notify']);
        // unknown groups are refused
        $this->actingAs($u)->patchJson('/api/v1/account', ['preferences' => ['notify' => ['spam' => true]]])->assertUnprocessable();

        $u->fresh()->notify(new AchievementUnlocked(\App\Models\Achievement::query()->first()));
        $this->assertSame(0, $u->notifications()->count());
    }

    public function test_games_can_be_played_with_any_level(): void
    {
        $this->seed([GameSeeder::class, WordSetSeeder::class]);
        $u = $this->trusted();
        $deck = $this->actingAs($u)->getJson('/api/v1/words/deck?n=12&level=B1')->assertOk()->assertJsonPath('level', 'B1')->json('data');
        $this->assertCount(12, $deck);
        $this->assertCount(12, array_unique(array_map(fn ($w) => mb_strtolower($w['word']), $deck)));
    }

    public function test_teachers_assign_coursebook_units_and_students_open_them(): void
    {
        $this->seed([GameSeeder::class, CourseSeeder::class, GradeUnitSeeder::class]);
        $inst = Institution::query()->create(['name' => 'Okul', 'slug' => 'okul', 'type' => 'school', 'seats' => 10, 'join_code' => 'OKL123']);
        $teacher = $this->trusted();
        $student = User::factory()->create(['email_verified_at' => now(), 'cefr_level' => 'A1']);
        InstitutionMember::query()->create(['institution_id' => $inst->id, 'user_id' => $teacher->id, 'email' => $teacher->email, 'role' => 'manager', 'status' => 'active', 'joined_at' => now()]);
        InstitutionMember::query()->create(['institution_id' => $inst->id, 'user_id' => $student->id, 'email' => $student->email, 'role' => 'student', 'status' => 'active', 'class_name' => '7-A', 'joined_at' => now()]);

        $catalog = $this->actingAs($teacher)->getJson('/api/v1/institution/catalog')->assertOk()->json();
        $this->assertContains('g7', array_column($catalog['units'], 'track'));
        $this->assertContains('x_yds', array_column($catalog['units'], 'track'));
        // the path list no longer repeats the generated coursebook copies
        $copies = \App\Models\Lesson::query()->whereNotNull('meta->grade_unit')->pluck('id')->all();
        $this->assertNotEmpty($copies);
        $this->assertEmpty(array_intersect(array_column($catalog['lessons'], 'id'), $copies));

        $unit = GradeUnit::query()->where('track', 'g7')->orderBy('position')->skip(5)->first();
        $this->actingAs($teacher)->postJson('/api/v1/institution/assignments', ['kind' => 'unit', 'target' => '999999'])->assertUnprocessable();
        $this->actingAs($teacher)->postJson('/api/v1/institution/assignments', ['kind' => 'unit', 'target' => (string) $unit->id])->assertCreated();

        $hw = $this->actingAs($student)->getJson('/api/v1/me/assignments')->assertOk()->json('data.0');
        $this->assertStringStartsWith('/lesson/', $hw['link']);
        // homework opens even though it is far ahead on the path (and from another grade)
        $lessonId = (int) substr($hw['link'], 8);
        $this->actingAs($student)->getJson("/api/v1/lessons/{$lessonId}")->assertOk();
        // and it cannot be ticked off by hand: doing the lesson does it
        $this->actingAs($student)->postJson("/api/v1/me/assignments/{$hw['id']}/done")->assertUnprocessable();
    }

    public function test_new_accounts_start_with_the_configured_gems(): void
    {
        Settings::put(['economy.signup_gems' => 120]);
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Can', 'email' => 'can@example.com', 'password' => 'Str0ng!Passw0rd', 'password_confirmation' => 'Str0ng!Passw0rd', 'accept_terms' => true,
        ])->assertCreated();
        $this->assertSame(120, User::query()->where('email', 'can@example.com')->value('gems'));
    }
}
