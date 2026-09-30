<?php

namespace App\Services;

use App\Models\ArenaPresence;
use App\Models\Duel;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * The live side of the arena, built for plain PHP hosting (no sockets): the
 * page sends a heartbeat while open, "Rakip bul" puts you in a short queue, and
 * two people searching at the same time are paired into a live match. Nobody
 * waits long: after QUEUE_SECONDS the client falls back to a ghost rival.
 */
class ArenaService
{
    /** Seen within this window = online. */
    public const ONLINE_SECONDS = 45;

    /** How long a search lasts before a ghost rival takes over. */
    public const QUEUE_SECONDS = 15;

    public function __construct(private readonly DuelService $duels) {}

    public function heartbeat(User $user): ArenaPresence
    {
        $p = ArenaPresence::query()->firstOrNew(['user_id' => $user->id]);
        $p->last_seen_at = now();
        // a search that was left behind (tab closed) is forgotten
        if ($p->status === 'searching' && $p->searching_since?->lt(now()->subSeconds(self::QUEUE_SECONDS + 10))) {
            $p->status = 'idle';
        }
        $p->status ??= 'idle';
        $p->save();

        return $p;
    }

    /** Who is in the arena right now: counts plus a few faces, your league first. */
    public function lobby(User $user): array
    {
        $this->heartbeat($user);
        $since = now()->subSeconds(self::ONLINE_SECONDS);
        $online = ArenaPresence::query()->where('last_seen_at', '>=', $since);
        $players = User::query()->whereIn('id', (clone $online)->where('user_id', '!=', $user->id)->pluck('user_id'))
            ->get(['id', 'name', 'username', 'avatar', 'preferences', 'premium_until', 'league_tier', 'duel_trophies'])
            ->sortBy(fn (User $u) => abs($u->league_tier - $user->league_tier))->take(12)->values();
        $status = ArenaPresence::query()->whereIn('user_id', $players->pluck('id'))->pluck('status', 'user_id');

        return [
            'online' => (clone $online)->count(),
            'searching' => (clone $online)->where('status', 'searching')->count(),
            'playing' => (clone $online)->whereIn('status', ['matched', 'playing'])->count(),
            'players' => $players->map(fn (User $u) => [
                'name' => $u->name, 'username' => $u->username, 'trophies' => $u->duel_trophies,
                'rank' => DuelService::rankFor($u->duel_trophies)['name'], 'status' => $status[$u->id] ?? 'idle', ...$u->look(),
            ]),
            'queue_seconds' => self::QUEUE_SECONDS,
        ];
    }

    /** Join the queue (or check on it): returns a live duel as soon as a rival is found. */
    public function queue(User $user, bool $join): array
    {
        $p = $this->heartbeat($user);
        if ($p->matched_duel_id && in_array($p->status, ['matched', 'playing'], true)) {
            $duel = Duel::query()->find($p->matched_duel_id);
            if ($duel && $duel->status === 'active') {
                $p->forceFill(['status' => 'playing'])->save();

                return ['status' => 'matched', 'duel' => $this->duels->present($duel), 'tickets_left' => $this->duels->ticketsLeft($user)];
            }
        }
        if ($join) {
            $this->duels->assertCanPlay($user);
            $p->forceFill(['status' => 'searching', 'searching_since' => now(), 'matched_duel_id' => null])->save();
        } elseif ($p->status !== 'searching') {
            return ['status' => 'idle'];
        }

        if ($duel = $this->tryMatch($user)) {
            return ['status' => 'matched', 'duel' => $this->duels->present($duel), 'tickets_left' => $this->duels->ticketsLeft($user)];
        }
        $waited = (int) $p->fresh()->searching_since?->diffInSeconds(now());

        return ['status' => $waited >= self::QUEUE_SECONDS ? 'timeout' : 'searching', 'waited' => $waited, 'searching' => ArenaPresence::query()->where('status', 'searching')->where('last_seen_at', '>=', now()->subSeconds(20))->count()];
    }

    public function leave(User $user): void
    {
        ArenaPresence::query()->where('user_id', $user->id)->where('status', 'searching')->update(['status' => 'idle']);
    }

    /** Pair with the longest-waiting searcher of the same age group, nearest league first. */
    private function tryMatch(User $user): ?Duel
    {
        return DB::transaction(function () use ($user) {
            $me = ArenaPresence::query()->whereKey($user->id)->lockForUpdate()->first();
            if (! $me || $me->status !== 'searching') {
                return null;
            }
            $candidates = ArenaPresence::query()->where('status', 'searching')->where('user_id', '!=', $user->id)
                ->where('last_seen_at', '>=', now()->subSeconds(12))->orderBy('searching_since')->lockForUpdate()->limit(20)->get();
            $rival = User::query()->whereIn('id', $candidates->pluck('user_id'))->where('is_banned', false)
                ->where(fn ($q) => $user->age_group ? $q->where('age_group', $user->age_group) : $q->whereNull('age_group')->orWhere('age_group', 'adult'))
                ->get()->filter(fn (User $u) => $this->duels->ticketsLeft($u) !== 0)
                ->sortBy(fn (User $u) => abs($u->league_tier - $user->league_tier))->first();
            if (! $rival) {
                return null;
            }
            [$mine, $theirs] = $this->duels->startLive($user, $rival);
            $me->forceFill(['status' => 'playing', 'matched_duel_id' => $mine->id])->save();
            ArenaPresence::query()->whereKey($rival->id)->update(['status' => 'matched', 'matched_duel_id' => $theirs->id]);

            return $mine;
        });
    }

    /** Store how far you are, so your rival sees you move. */
    public function progress(User $user, Duel $duel, int $index, int $score): void
    {
        abort_unless($duel->user_id === $user->id, 404);
        if ($duel->status === 'active' && $duel->match_id) {
            $duel->forceFill(['live' => ['i' => $index, 'score' => $score, 'at' => now()->toIso8601String()]])->save();
        }
        ArenaPresence::query()->whereKey($user->id)->update(['last_seen_at' => now()]);
    }

    /** Your rival's real progress in a live match (null when it is a ghost duel). */
    public function rival(User $user, Duel $duel): ?array
    {
        abort_unless($duel->user_id === $user->id, 404);
        if (! $duel->match_id) {
            return null;
        }
        $other = Duel::query()->where('match_id', $duel->match_id)->where('id', '!=', $duel->id)->first();
        if (! $other) {
            return null;
        }
        $at = isset($other->live['at']) ? \Illuminate\Support\Carbon::parse($other->live['at']) : null;

        return [
            'i' => (int) ($other->live['i'] ?? 0),
            'score' => $other->status === 'active' ? (int) ($other->live['score'] ?? 0) : $other->score,
            'finished' => $other->status !== 'active',
            'connected' => $other->status !== 'active' || ($at && $at->gt(now()->subSeconds(20))) || $other->created_at->gt(now()->subSeconds(20)),
        ];
    }
}
