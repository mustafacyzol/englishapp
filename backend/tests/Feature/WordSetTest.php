<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Models\User;
use App\Models\WordSet;
use Database\Seeders\GameSeeder;
use Database\Seeders\WordSetSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WordSetTest extends TestCase
{
    use RefreshDatabase;

    private function learner(): User
    {
        return User::factory()->create(['email_verified_at' => now()]);
    }

    public function test_ready_made_sets_can_be_searched_saved_copied_and_played(): void
    {
        $this->seed([GameSeeder::class, WordSetSeeder::class]);
        $u = $this->learner();
        $this->assertSame(33 + 35, WordSet::query()->whereNull('user_id')->count());

        $this->actingAs($u)->getJson('/api/v1/word-sets?level=A1')->assertOk()->assertJsonCount(9 + 8, 'data');
        $this->assertContains('LGS: Sık çıkan kelimeler', $this->actingAs($u)->getJson('/api/v1/word-sets?exam=lgs')->assertOk()->json('data.*.title'));
        // search finds words inside sets too
        $hit = $this->actingAs($u)->getJson('/api/v1/word-sets?q=boarding')->assertOk()->json('data');
        $this->assertSame('Seyahat İngilizcesi', $hit[0]['title']);

        $set = WordSet::query()->where('slug', 'seyahat')->first();
        $this->actingAs($u)->postJson("/api/v1/word-sets/{$set->id}/save")->assertOk()->assertJsonPath('saved', true);
        $this->actingAs($u)->getJson('/api/v1/word-sets?scope=saved')->assertOk()->assertJsonCount(1, 'data');

        // a copy is the learner's own and can grow
        $copy = $this->actingAs($u)->postJson("/api/v1/word-sets/{$set->id}/copy")->assertOk()->json('data');
        $this->assertTrue($copy['mine']);
        $items = collect($copy['items'])->map(fn ($i) => ['word' => $i['word'], 'translation' => $i['translation']])->push(['word' => 'hostel', 'translation' => 'hostel'])->all();
        $this->actingAs($u)->putJson("/api/v1/word-sets/{$copy['id']}", ['title' => 'Benim seyahat setim', 'items' => $items])->assertOk()->assertJsonPath('data.words_count', 21);
        // nobody edits the ready-made one
        $this->actingAs($u)->putJson("/api/v1/word-sets/{$set->id}", ['title' => 'x', 'items' => $items])->assertForbidden();

        // play it in any game, and put it in the notebook
        $deck = $this->actingAs($u)->getJson("/api/v1/words/deck?n=16&set={$set->id}")->assertOk()->json('data');
        $this->assertCount(16, $deck);
        $this->actingAs($u)->postJson("/api/v1/word-sets/{$set->id}/learn")->assertOk()->assertJsonPath('added', 20);
        $this->actingAs($u)->postJson("/api/v1/word-sets/{$set->id}/learn")->assertOk()->assertJsonPath('added', 0);
    }

    public function test_private_sets_stay_private_and_teachers_can_assign_sets(): void
    {
        $this->seed([GameSeeder::class, WordSetSeeder::class]);
        $owner = $this->learner();
        $other = $this->learner();
        $mine = $this->actingAs($owner)->postJson('/api/v1/word-sets', ['title' => 'Sınav öncesi', 'level' => 'B1', 'items' => [['word' => 'cram', 'translation' => 'sınava son dakika çalışmak'], ['word' => 'revise', 'translation' => 'tekrar etmek']]])->assertOk()->json('data');
        $this->actingAs($other)->getJson("/api/v1/word-sets/{$mine['id']}")->assertNotFound();
        $this->actingAs($other)->getJson("/api/v1/words/deck?set={$mine['id']}")->assertNotFound();

        $inst = Institution::query()->create(['name' => 'Okul', 'slug' => 'okul', 'type' => 'school', 'seats' => 10, 'join_code' => 'OKL123']);
        $teacher = $this->learner();
        $student = $this->learner();
        InstitutionMember::query()->create(['institution_id' => $inst->id, 'user_id' => $teacher->id, 'email' => $teacher->email, 'role' => 'manager', 'status' => 'active', 'joined_at' => now()]);
        InstitutionMember::query()->create(['institution_id' => $inst->id, 'user_id' => $student->id, 'email' => $student->email, 'role' => 'student', 'status' => 'active', 'class_name' => '9-A', 'joined_at' => now()]);
        $set = WordSet::query()->where('slug', 'okul')->first();
        // someone else's private set cannot be assigned
        $this->actingAs($teacher)->postJson('/api/v1/institution/assignments', ['kind' => 'words', 'target' => (string) $mine['id']])->assertStatus(422);
        $a = $this->actingAs($teacher)->postJson('/api/v1/institution/assignments', ['kind' => 'words', 'target' => (string) $set->id])->assertCreated()->json('data.0');
        $this->assertSame("/practice/sets/{$set->id}", $a['link']);
        $this->actingAs($student)->getJson('/api/v1/me/assignments')->assertJsonPath('data.0.done', false);
        $this->actingAs($student)->postJson("/api/v1/word-sets/{$set->id}/played", ['game' => 'match', 'correct' => 9, 'total' => 10])->assertOk();
        $this->actingAs($student)->getJson('/api/v1/me/assignments')->assertJsonPath('data.0.done', true);
    }

    public function test_creating_and_sharing_is_limited_and_checked(): void
    {
        $this->seed([GameSeeder::class]);
        $items = [['word' => 'apple', 'translation' => 'elma'], ['word' => 'pear', 'translation' => 'armut'], ['word' => 'plum', 'translation' => 'erik'], ['word' => 'cherry', 'translation' => 'kiraz'], ['word' => 'grape', 'translation' => 'üzüm']];
        $new = User::factory()->create(['email_verified_at' => now()]);
        // a brand-new account keeps its sets private
        $this->actingAs($new)->postJson('/api/v1/word-sets', ['title' => 'Meyveler', 'is_public' => true, 'items' => $items])->assertUnprocessable();

        $u = User::factory()->create(['email_verified_at' => now(), 'created_at' => now()->subDays(3)]);
        // links and blocked words never go public
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'Bedava www.spam.xyz', 'is_public' => true, 'items' => $items])->assertUnprocessable();
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'Meyveler', 'is_public' => true, 'items' => $items])->assertOk();

        // a daily quota on new sets
        \App\Support\Settings::put(['limits.word_sets_per_day' => 3]);
        $more = fn (string $w) => [...$items, ['word' => $w, 'translation' => $w.'-tr']];
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'İki', 'items' => $more('melon')])->assertOk();
        // the same word list twice is refused before it uses the quota
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'İki tekrar', 'items' => $more('melon')])->assertUnprocessable();
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'Üç', 'items' => $more('lemon')])->assertOk();
        $this->actingAs($u)->postJson('/api/v1/word-sets', ['title' => 'Dört', 'items' => $more('lime')])->assertStatus(429);

        // the word notebook has a ceiling
        \App\Support\Settings::put(['limits.notebook_size' => 1]);
        $this->actingAs($u)->postJson('/api/v1/words', ['word' => 'river'])->assertCreated();
        $this->actingAs($u)->postJson('/api/v1/words', ['word' => 'lake'])->assertUnprocessable();
        // the same word again is not a new entry
        $this->actingAs($u)->postJson('/api/v1/words', ['word' => 'River'])->assertOk();
    }
}
