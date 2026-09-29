<?php

namespace Tests\Feature;

use App\Models\RewardItem;
use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileShopTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function learner(array $attrs = []): User
    {
        return User::factory()->create($attrs + ['email_verified_at' => now(), 'onboarded' => true]);
    }

    public function test_everyone_has_an_avatar_and_cosmetics_must_be_owned(): void
    {
        $u = $this->learner(['gems' => 5000]);
        $this->assertNotEmpty($u->avatar);
        $this->actingAs($u)->patchJson('/api/v1/account', ['avatar' => null])->assertUnprocessable();
        $this->patchJson('/api/v1/account', ['frame' => 'gold'])->assertForbidden();

        $frame = RewardItem::query()->where('key', 'frame_neon')->first();
        $this->postJson("/api/v1/shop/{$frame->id}/buy")->assertCreated();
        $this->postJson("/api/v1/shop/{$frame->id}/buy")->assertUnprocessable(); // already owned
        $this->patchJson('/api/v1/account', ['frame' => 'neon', 'bio' => '<b>Hello</b> world'])
            ->assertOk()->assertJsonPath('user.frame', 'neon')->assertJsonPath('user.bio', 'Hello world');

        // Others see the frame in the league table and on the public profile.
        $this->getJson("/api/v1/u/{$u->username}")->assertOk()->assertJsonPath('user.frame', 'neon');
        $this->getJson('/api/v1/league')->assertOk()->assertJsonFragment(['frame' => 'neon']);
    }

    public function test_bundle_opens_into_cards(): void
    {
        $u = $this->learner(['gems' => 2000]);
        $pack = RewardItem::query()->where('key', 'weekend_pack')->first();
        $card = $this->actingAs($u)->postJson("/api/v1/shop/{$pack->id}/buy")->assertCreated()->json('item');
        $this->postJson("/api/v1/inventory/{$card['id']}/activate")->assertOk();
        $this->assertSame(3, $u->items()->where('status', 'available')->count());
    }

    public function test_story_xp_follows_right_answers(): void
    {
        $u = $this->learner();
        $story = Story::query()->where('is_premium', false)->whereNotNull('questions')->first();
        $qs = $story->questions;
        $answers = array_map(fn ($q) => $q['answer'], $qs);
        $answers[0] = ((int) $answers[0] + 1) % max(2, count($qs[0]['options'] ?? [1, 2])); // one wrong
        $r = $this->actingAs($u)->postJson("/api/v1/stories/{$story->slug}/complete", ['answers' => $answers])->assertOk();
        $this->assertSame(count($qs) - 1, $r->json('correct'));
        $this->assertSame(8 + 3 * (count($qs) - 1), $r->json('reward.xp_gained'));
    }

    public function test_notifications_can_be_deleted_and_cleared(): void
    {
        $u = $this->learner();
        $u->notify(new \App\Notifications\GhostDuelResult('Ali', 'defended', 4));
        $u->notify(new \App\Notifications\GhostDuelResult('Ayşe', 'fell', -3));
        $id = $u->notifications()->first()->id;
        $this->actingAs($u)->deleteJson("/api/v1/notifications/{$id}")->assertOk();
        $this->assertSame(1, $u->notifications()->count());
        $this->deleteJson('/api/v1/notifications')->assertOk();
        $this->assertSame(0, $u->notifications()->count());
    }
}
