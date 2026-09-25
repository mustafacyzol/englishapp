<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use App\Services\GamificationService;
use Database\Seeders\BlogSeeder;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RewardsAndSiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_streak_milestone_pays_out_once_and_shows_on_the_roadmap(): void
    {
        $this->seed(GameSeeder::class);
        $user = User::factory()->create(['email_verified_at' => now(), 'daily_goal_xp' => 10]);
        $game = app(GamificationService::class);

        $this->travelTo(now('Europe/Istanbul')->setTime(12, 0));
        $game->record($user, 10, 'test');
        $this->travel(1)->days();
        $game->record($user, 10, 'test');
        $this->travel(1)->days();

        $gemsBefore = $user->fresh()->gems;
        $summary = $game->record($user, 10, 'test');
        $this->assertSame(3, $user->fresh()->streak_current);
        $this->assertContains('3 günlük seri', array_column($summary['rewards'], 'title'));
        $this->assertGreaterThanOrEqual($gemsBefore + 30, $user->fresh()->gems);

        // Same day again: the milestone is claimed, nothing is granted twice.
        $again = $game->record($user, 10, 'test');
        $this->assertNotContains('3 günlük seri', array_column($again['rewards'], 'title'));

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/rewards/roadmap')
            ->assertOk()
            ->assertJsonPath('streak', 3)
            ->assertJsonPath('milestones.0.days', 3)
            ->assertJsonPath('milestones.0.claimed', true)
            ->assertJsonPath('milestones.1.claimed', false);
    }

    public function test_blog_is_public_and_contact_form_stores_messages(): void
    {
        Mail::fake();
        $this->seed(BlogSeeder::class);

        $list = $this->getJson('/api/v1/blog')->assertOk()->json('data');
        $this->assertNotEmpty($list);
        $this->getJson('/api/v1/blog/'.$list[0]['slug'])->assertOk()->assertJsonPath('post.slug', $list[0]['slug']);

        $this->postJson('/api/v1/contact', ['name' => 'Ayşe', 'email' => 'ayse@example.com', 'topic' => 'course', 'message' => 'Kurslarınız hakkında bilgi almak istiyorum.'])
            ->assertStatus(422)->assertJsonValidationErrors('kvkk');

        $this->postJson('/api/v1/contact', ['name' => 'Ayşe', 'email' => 'ayse@example.com', 'topic' => 'course', 'message' => 'Kurslarınız hakkında bilgi almak istiyorum.', 'kvkk' => true, 'website' => 'spam'])
            ->assertStatus(422);

        $this->postJson('/api/v1/contact', ['name' => 'Ayşe', 'email' => 'ayse@example.com', 'topic' => 'course', 'message' => 'Kurslarınız hakkında bilgi almak istiyorum.', 'kvkk' => true])
            ->assertCreated();
        $this->assertSame(1, ContactMessage::query()->count());
    }
}
