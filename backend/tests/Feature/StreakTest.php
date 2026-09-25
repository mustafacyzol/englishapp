<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GamificationService;
use App\Services\RewardService;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StreakTest extends TestCase
{
    use RefreshDatabase;

    public function test_streak_grows_daily_and_freeze_bridges_a_missed_day(): void
    {
        $this->seed(GameSeeder::class);
        $user = User::factory()->create();
        $game = app(GamificationService::class);

        $this->travelTo(now('Europe/Istanbul')->setTime(12, 0));
        $game->record($user, 10, 'test');
        $this->travel(1)->days();
        $game->record($user, 10, 'test');
        $this->assertSame(2, $user->fresh()->streak_current);

        app(RewardService::class)->grant($user, 'streak_freeze', 'test');
        $this->travel(2)->days(); // missed one day
        $this->assertSame(2, $game->effectiveStreak($user->fresh()));
        $game->record($user, 10, 'test');
        $this->assertSame(3, $user->fresh()->streak_current);

        $this->travel(3)->days(); // missed two days, no freezes left
        $this->assertSame(0, $game->effectiveStreak($user->fresh()));
        $game->record($user, 10, 'test');
        $this->assertSame(1, $user->fresh()->streak_current);
        $this->assertSame(3, $user->fresh()->streak_longest);
    }
}
