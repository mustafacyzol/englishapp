<?php

use App\Models\Subscription;
use App\Models\User;
use App\Models\UserItem;
use App\Notifications\StreakReminder;
use App\Services\LeagueService;
use App\Support\Period;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
| Hostinger shared hosting has no daemon/supervisor. Add ONE cron job in hPanel:
|   * * * * *  /usr/bin/php /home/USER/dilgo-api/artisan schedule:run >> /dev/null 2>&1
| The scheduler below then also drains the queue every minute.
*/

Artisan::command('dilgo:close-leagues {week?}', function (LeagueService $leagues) {
    $week = $this->argument('week') ?? Period::weekKey(Period::now()->subWeek());
    $this->info("Closed {$leagues->closeWeek($week)} groups for {$week}");
})->purpose('Close league groups of a finished week (promote/demote/reward)');

Artisan::command('dilgo:streak-reminders {slot=evening}', function () {
    $today = Period::today();
    $slot = $this->argument('slot');
    $count = 0;
    // Each learner is reminded once, at the study time they chose during onboarding.
    User::query()->where('streak_current', '>', 0)->where('is_banned', false)
        ->where(fn ($q) => $slot === 'evening' ? $q->where('study_time', 'evening')->orWhereNull('study_time') : $q->where('study_time', $slot))
        ->whereDate('streak_last_date', Period::now()->subDay()->toDateString())
        ->whereNotExists(fn ($q) => $q->from('daily_activities')->whereColumn('daily_activities.user_id', 'users.id')->where('date', $today)->where('xp', '>', 0))
        ->chunkById(200, function ($users) use (&$count) {
            foreach ($users as $user) {
                $user->notify(new StreakReminder($user->streak_current));
                $count++;
            }
        });
    $this->info("Reminded {$count} learners");
})->purpose('Warn learners whose streak ends tonight');

Artisan::command('dilgo:expire', function () {
    $n = UserItem::query()->where('status', 'active')->whereNotNull('expires_at')->where('expires_at', '<', now())->update(['status' => 'expired']);
    $s = Subscription::query()->where('status', 'active')->where('ends_at', '<', now())->update(['status' => 'expired']);
    $this->info("Expired {$n} items, {$s} subscriptions");
})->purpose('Expire timed items and subscriptions');

Schedule::command('queue:work --stop-when-empty --max-time=50 --tries=3')->everyMinute()->withoutOverlapping();
Schedule::command('dilgo:expire')->hourly();
foreach (['morning' => '08:30', 'lunch' => '12:30', 'evening' => '19:00', 'night' => '21:30'] as $slot => $at) {
    Schedule::command("dilgo:streak-reminders {$slot}")->dailyAt($at)->timezone(Period::TZ);
}
Schedule::command('dilgo:close-leagues')->weeklyOn(1, '00:05')->timezone(Period::TZ);
Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('model:prune')->daily();
