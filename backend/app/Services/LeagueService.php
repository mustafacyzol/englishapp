<?php

namespace App\Services;

use App\Models\LeagueGroup;
use App\Models\LeagueMembership;
use App\Models\User;
use App\Notifications\LeagueResult;
use App\Support\Period;
use Illuminate\Support\Facades\DB;

class LeagueService
{
    public function tierName(int $tier): string
    {
        return config('dilgo.gamification.league.tiers')[$tier] ?? 'Bronz';
    }

    public function membershipFor(User $user): LeagueMembership
    {
        $week = Period::weekKey();
        $existing = LeagueMembership::query()->where('user_id', $user->id)->where('week_key', $week)->first();
        if ($existing) {
            return $existing;
        }

        $size = config('dilgo.gamification.league.group_size');
        $group = LeagueGroup::query()
            ->where('week_key', $week)->where('tier', $user->league_tier)->where('is_closed', false)
            ->has('memberships', '<', $size)
            ->orderBy('id')->first()
            ?? LeagueGroup::query()->create(['week_key' => $week, 'tier' => $user->league_tier]);

        return LeagueMembership::query()->firstOrCreate(
            ['user_id' => $user->id, 'week_key' => $week],
            ['league_group_id' => $group->id]
        );
    }

    public function addXp(User $user, int $xp): void
    {
        $this->membershipFor($user)->increment('xp', $xp);
    }

    public function standings(User $user): array
    {
        $membership = $this->membershipFor($user);
        $group = $membership->group;
        $cfg = config('dilgo.gamification.league');

        $rows = $group->memberships()
            ->with('user:id,name,username,avatar,streak_current,premium_until')
            ->orderByDesc('xp')->orderBy('updated_at')
            ->get()
            ->values()
            ->map(fn (LeagueMembership $m, int $i) => [
                'rank' => $i + 1,
                'user_id' => $m->user_id,
                'name' => $m->user?->name,
                'username' => $m->user?->username,
                'avatar' => $m->user?->avatar,
                'xp' => $m->xp,
                'is_me' => $m->user_id === $user->id,
                'is_premium' => $m->user?->isPremium() ?? false,
            ]);

        $count = $rows->count();

        return [
            'week_key' => $group->week_key,
            'ends_at' => Period::weekEndsAt()->toIso8601String(),
            'tier' => $group->tier,
            'tier_name' => $this->tierName($group->tier),
            'tiers' => $cfg['tiers'],
            'promote_count' => $group->tier < count($cfg['tiers']) - 1 ? $cfg['promote'] : 0,
            'demote_count' => $group->tier > 0 && $count > $cfg['promote'] + $cfg['demote'] ? $cfg['demote'] : 0,
            'rows' => $rows,
        ];
    }

    /** Close every open group of a finished week: promote, demote, reward top 3. */
    public function closeWeek(string $weekKey): int
    {
        $cfg = config('dilgo.gamification.league');
        $maxTier = count($cfg['tiers']) - 1;
        $closed = 0;

        LeagueGroup::query()->where('week_key', $weekKey)->where('is_closed', false)->each(function (LeagueGroup $group) use ($cfg, $maxTier, &$closed) {
            DB::transaction(function () use ($group, $cfg, $maxTier) {
                $members = $group->memberships()->with('user')->orderByDesc('xp')->orderBy('updated_at')->get();
                $count = $members->count();

                foreach ($members->values() as $i => $m) {
                    $rank = $i + 1;
                    $user = $m->user;
                    if (! $user) {
                        continue;
                    }
                    $result = 'stayed';
                    if ($rank <= $cfg['promote'] && $m->xp > 0 && $group->tier < $maxTier) {
                        $result = 'promoted';
                        $user->league_tier = min($maxTier, $group->tier + 1);
                    } elseif ($group->tier > 0 && ($m->xp === 0 || ($count > $cfg['promote'] + $cfg['demote'] && $rank > $count - $cfg['demote']))) {
                        $result = 'demoted';
                        $user->league_tier = max(0, $group->tier - 1);
                    }
                    $gems = $cfg['top3_gems'][$rank - 1] ?? 0;
                    if ($gems && $m->xp > 0) {
                        $user->gems += $gems;
                    }
                    $user->save();
                    if ($rank === 1 && $m->xp > 0 && ($item = config('dilgo.rewards.league_winner_item'))) {
                        app(RewardService::class)->grant($user, $item, 'league', ['week' => $group->week_key]);
                    }
                    $m->update(['final_rank' => $rank, 'result' => $result]);
                    if ($m->xp > 0) {
                        $user->notify(new LeagueResult($rank, $result, $this->tierName($user->league_tier), $gems));
                    }
                }
                $group->update(['is_closed' => true]);
            });
            $closed++;
        });

        return $closed;
    }
}
