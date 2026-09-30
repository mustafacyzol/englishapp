<?php

use App\Models\Subscription;
use App\Models\User;
use App\Models\UserItem;
use App\Notifications\ComeBack;
use App\Notifications\StreakReminder;
use App\Notifications\WeeklyReport;
use Illuminate\Support\Facades\DB;
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

Artisan::command('dilgo:weekly-report', function () {
    $from = Period::now()->subWeek()->startOfWeek()->toDateString();
    $to = Period::now()->subWeek()->endOfWeek()->toDateString();
    $count = 0;
    // Only learners who studied at least once last week: a report of zeros is not a nudge.
    $ids = DB::table('daily_activities')->whereBetween('date', [$from, $to])->where('xp', '>', 0)->distinct()->pluck('user_id');
    User::query()->whereIn('id', $ids)->where('is_banned', false)->chunkById(200, function ($users) use ($from, $to, &$count) {
        foreach ($users as $user) {
            $rows = DB::table('daily_activities')->where('user_id', $user->id)->whereBetween('date', [$from, $to])->get();
            $user->notify(new WeeklyReport([
                'xp' => (int) $rows->sum('xp'), 'days' => $rows->where('xp', '>', 0)->count(), 'lessons' => (int) $rows->sum('lessons'),
                'stories' => (int) $rows->sum('stories'),
                'words' => DB::table('user_words')->where('user_id', $user->id)->whereBetween('created_at', [$from, $to.' 23:59:59'])->count(),
                'streak' => (int) $user->streak_current, 'best_day' => optional($rows->sortByDesc('xp')->first())->date,
            ]));
            $count++;
        }
    });
    $this->info("Sent {$count} weekly reports");
})->purpose('Monday progress report for last week\'s active learners');

Artisan::command('dilgo:come-back', function () {
    $count = 0;
    foreach (ComeBack::STAGES as $days => $stage) {
        $day = Period::now()->subDays($days)->toDateString();
        // Last studied exactly $days days ago, and not nudged at this stage yet.
        $ids = DB::table('daily_activities')->where('xp', '>', 0)->groupBy('user_id')->havingRaw('MAX(date) = ?', [$day])->pluck('user_id');
        User::query()->whereIn('id', $ids)->where('is_banned', false)->chunkById(200, function ($users) use ($stage, &$count) {
            foreach ($users as $user) {
                $prefs = $user->preferences ?? [];
                if (($prefs['comeback_stage'] ?? 0) >= $stage && ($prefs['comeback_at'] ?? null) >= now()->subDays(20)->toDateString()) {
                    continue;
                }
                $next = \App\Models\Lesson::query()->whereHas('unit.course', fn ($q) => $q->where('cefr_level', $user->cefr_level))
                    ->whereNotIn('id', DB::table('lesson_progress')->where('user_id', $user->id)->whereNotNull('completed_at')->select('lesson_id'))->orderBy('unit_id')->orderBy('position')->value('title') ?? 'Sıradaki ders';
                $user->notify(new ComeBack($stage, $next));
                $user->forceFill(['preferences' => [...$prefs, 'comeback_stage' => $stage, 'comeback_at' => now()->toDateString()]])->save();
                $count++;
            }
        });
    }
    $this->info("Nudged {$count} learners");
})->purpose('Friendly notes for learners who stopped coming back (2, 5, 14 days)');

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
Schedule::command('dilgo:weekly-report')->weeklyOn(1, '09:10')->timezone(Period::TZ);
Schedule::command('dilgo:come-back')->dailyAt('18:20')->timezone(Period::TZ);
Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('model:prune')->daily();
