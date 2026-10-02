<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class QuestRotationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_daily_quests_rotate_every_day_and_keep_the_xp_goal(): void
    {
        $u = User::factory()->create(['email_verified_at' => now(), 'onboarded' => true]);
        $days = [];
        foreach (range(0, 6) as $d) {
            Carbon::setTestNow(Carbon::parse('2026-10-05 12:00', 'Europe/Istanbul')->addDays($d));
            $this->app['auth']->forgetGuards();
            $daily = collect($this->actingAs($u)->getJson('/api/v1/quests')->assertOk()->json('data'))->where('period', 'daily');
            $this->assertCount(3, $daily);
            $this->assertContains('xp', $daily->pluck('metric')->all());
            $days[] = $daily->pluck('title')->sort()->implode('|');
        }
        Carbon::setTestNow();
        // a week of days does not show the same three quests every time
        $this->assertGreaterThan(1, count(array_unique($days)));
    }
}
