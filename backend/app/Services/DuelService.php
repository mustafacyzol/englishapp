<?php

namespace App\Services;

use App\Models\Duel;
use App\Models\Lesson;
use App\Models\User;
use App\Notifications\GhostDuelResult;
use App\Support\Period;
use App\Support\Skills;
use Illuminate\Support\Facades\DB;

/**
 * Gölge Düellosu — asynchronous four-skill duels against another learner's
 * "ghost". The ghost is a replay generated from the opponent's real per-skill
 * levels, so you can duel anyone at any time; when your ghost wins while you
 * are away it earns you trophies (and you get told about it).
 *
 * One duel = four rounds (reading, listening, speaking, writing), two quick
 * items each. Right answers score 100, speed adds up to 50.
 */
class DuelService
{
    public const ITEMS_PER_ROUND = 2;

    public const FREE_PER_DAY = 5;

    /** Rank ladder: min trophies → name, plus the league emblem tier used as its badge. */
    public const RANKS = [
        ['key' => 'acemi', 'name' => 'Acemi', 'min' => 0, 'tier' => 0],
        ['key' => 'cirak', 'name' => 'Çırak', 'min' => 150, 'tier' => 2],
        ['key' => 'kalfa', 'name' => 'Kalfa', 'min' => 400, 'tier' => 4],
        ['key' => 'usta', 'name' => 'Usta', 'min' => 800, 'tier' => 6],
        ['key' => 'ustat', 'name' => 'Üstat', 'min' => 1300, 'tier' => 8],
        ['key' => 'efsane', 'name' => 'Efsane', 'min' => 2000, 'tier' => 9],
    ];

    private const TYPES = [
        'reading' => ['choice', 'fill'],
        'listening' => ['listen_choice', 'listen_type'],
        'speaking' => ['speak'],
        'writing' => ['translate'],
    ];

    /** Practice ghosts used when no real opponent is available yet (clearly labelled in the UI). */
    private const TRAINING_GHOSTS = ['Antrenman Gölgesi', 'Gölge Koç', 'Sparring Gölgesi'];

    public function __construct(
        private readonly GamificationService $game,
        private readonly RewardService $rewards,
    ) {}

    public static function rankFor(int $trophies): array
    {
        $rank = self::RANKS[0];
        foreach (self::RANKS as $r) {
            if ($trophies >= $r['min']) {
                $rank = $r;
            }
        }

        return $rank;
    }

    public static function nextRank(int $trophies): ?array
    {
        foreach (self::RANKS as $r) {
            if ($r['min'] > $trophies) {
                return $r;
            }
        }

        return null;
    }

    public function ticketsLeft(User $user): ?int
    {
        if ($user->isPremium()) {
            return null; // unlimited
        }
        $today = $user->duels()->where('created_at', '>=', Period::now()->startOfDay()->utc())->count();

        return max(0, self::FREE_PER_DAY - $today);
    }

    /** Abandoned duels count as losses after 30 minutes, so quitting can't dodge a defeat. */
    public function expireStale(User $user): void
    {
        $user->duels()->where('status', 'active')->where('created_at', '<', now()->subMinutes(30))->get()
            ->each(fn (Duel $d) => $this->settle($d, 0, array_fill(0, count($this->flatItems($d)), false), 'expired'));
    }

    public function start(User $user): Duel
    {
        $this->expireStale($user);
        $user->refresh();
        abort_if($this->ticketsLeft($user) === 0, 402, 'Bugünkü ücretsiz düello hakların bitti. Yarın yenilenir — ya da Premium ile sınırsız oyna.');

        $ghost = $this->pickGhost($user);
        $ghostSkills = $ghost ? collect($this->game->skillReport($ghost)['skills'])->pluck('level', 'key')->all() : $this->trainingSkills($user);

        $seed = random_int(1, PHP_INT_MAX >> 1);
        mt_srand($seed);
        $rounds = [];
        foreach (Skills::ALL as $skill) {
            $items = [];
            foreach ($this->questions($user, $skill) as $ex) {
                $items[] = ['ex' => $ex, 'ghost' => $this->ghostAnswer((int) ($ghostSkills[$skill] ?? 0))];
            }
            $rounds[] = ['skill' => $skill, 'items' => $items];
        }
        mt_srand();

        return $user->duels()->create([
            'ghost_id' => $ghost?->id,
            'ghost_name' => $ghost?->name ?? self::TRAINING_GHOSTS[array_rand(self::TRAINING_GHOSTS)],
            'ghost_trophies' => $ghost?->duel_trophies ?? max(0, $user->duel_trophies + random_int(-40, 40)),
            'ghost_skills' => $ghostSkills,
            'rounds' => $rounds,
            'status' => 'active',
        ]);
    }

    /**
     * @param  list<array{0:mixed,1:int}>  $answers  [answer, milliseconds] per item, in round order
     */
    public function finish(User $user, Duel $duel, array $answers): array
    {
        abort_unless($duel->user_id === $user->id, 404);
        abort_if($duel->status !== 'active', 422, 'Bu düello zaten bitti.');

        $items = $this->flatItems($duel);
        $results = [];
        $score = 0;
        $skillCorrect = [];
        foreach ($items as $i => [$skill, $item]) {
            [$given, $ms] = [$answers[$i][0] ?? null, (int) ($answers[$i][1] ?? 20000)];
            $ok = LessonService::gradeOne($item['ex'], $given);
            $results[] = $ok;
            $score += self::points($ok, $ms);
            $skillCorrect[$skill] = ($skillCorrect[$skill] ?? 0) + ($ok ? 1 : 0);
        }

        return $this->settle($duel, $score, $results, 'finished', $skillCorrect);
    }

    private function settle(Duel $duel, int $score, array $results, string $status, array $skillCorrect = []): array
    {
        return DB::transaction(function () use ($duel, $score, $results, $status, $skillCorrect) {
            $user = $duel->user()->lockForUpdate()->first();
            $ghostScore = collect($this->flatItems($duel))->sum(fn ($p) => self::points($p[1]['ghost']['correct'], $p[1]['ghost']['ms']));
            $result = $score > $ghostScore ? 'win' : ($score < $ghostScore ? 'loss' : 'draw');

            $delta = match ($result) {
                'win' => 24 + min(8, intdiv($score - $ghostScore, 60)),
                'draw' => 4,
                'loss' => -min(12, $user->duel_trophies),
            };
            $rankBefore = self::rankFor($user->duel_trophies);
            $user->duel_trophies += $delta;
            $user->duel_best = max($user->duel_best, $user->duel_trophies);
            $user->save();
            $rankAfter = self::rankFor($user->duel_trophies);

            // The opponent's ghost defended (or lost) while they were away.
            $ghostDelta = 0;
            if ($duel->ghost_id && ($ghost = User::query()->lockForUpdate()->find($duel->ghost_id))) {
                $ghostDelta = match ($result) {
                    'loss' => 10,
                    'win' => -min(6, $ghost->duel_trophies),
                    default => 2,
                };
                $ghost->duel_trophies += $ghostDelta;
                $ghost->duel_best = max($ghost->duel_best, $ghost->duel_trophies);
                $ghost->save();
                $ghost->notify(new GhostDuelResult($user->name, $result === 'loss' ? 'defended' : ($result === 'win' ? 'fell' : 'draw'), $ghostDelta));
            }

            // Keep the learner's per-item results on the duel for the per-skill duel record.
            $k = 0;
            $rounds = $duel->rounds;
            foreach ($rounds as &$round) {
                foreach ($round['items'] as &$item) {
                    $item['mine'] = (bool) ($results[$k++] ?? false);
                }
                unset($item);
            }
            unset($round);

            $duel->update([
                'rounds' => $rounds,
                'status' => $status,
                'score' => $score,
                'ghost_score' => $ghostScore,
                'result' => $result,
                'trophies_delta' => $delta,
                'ghost_delta' => $ghostDelta,
                'finished_at' => now(),
            ]);

            $correct = count(array_filter($results));
            $reward = null;
            $chest = false;
            if ($status === 'finished') {
                $xp = 5 + $correct * 2 + ($result === 'win' ? 5 : 0);
                $weights = $skillCorrect ? array_map(fn ($c) => $c + 0.5, $skillCorrect) : array_fill_keys(Skills::ALL, 1);
                $reward = $this->game->record($user, $xp, 'duel', $duel->id, ['duels' => 1, 'duel_wins' => $result === 'win' ? 1 : 0], $weights);
                if ($result === 'win') {
                    $user->increment('gems', 5);
                    // Variable reward: every third win in a row opens a mystery chest.
                    $streak = $this->winStreak($user);
                    if ($streak > 0 && $streak % 3 === 0) {
                        $this->rewards->grant($user, 'mystery_chest', 'duel', ['streak' => $streak]);
                        $chest = true;
                    }
                }
            }

            return [
                'result' => $result,
                'score' => $score,
                'ghost_score' => $ghostScore,
                'correct' => $correct,
                'total' => count($results),
                'results' => $results,
                'ghost_results' => collect($this->flatItems($duel))->map(fn ($p) => $p[1]['ghost']['correct'])->all(),
                'trophies_delta' => $delta,
                'trophies' => $user->duel_trophies,
                'rank' => $rankAfter,
                'rank_up' => $rankAfter['min'] > $rankBefore['min'],
                'next_rank' => self::nextRank($user->duel_trophies),
                'win_streak' => $this->winStreak($user),
                'gems' => $result === 'win' && $status === 'finished' ? 5 : 0,
                'chest' => $chest,
                'reward' => $reward,
            ];
        });
    }

    public function overview(User $user): array
    {
        $this->expireStale($user);
        $user->refresh();
        $finished = $user->duels()->where('status', '!=', 'active');
        $counts = (clone $finished)->selectRaw('result, COUNT(*) c')->groupBy('result')->pluck('c', 'result');

        // Per-skill accuracy across the last 20 duels — the four-skill duel record.
        $recentDuels = (clone $finished)->where('status', 'finished')->latest('id')->limit(20)->get();
        $skillStats = array_fill_keys(Skills::ALL, ['correct' => 0, 'total' => 0]);
        foreach ($recentDuels as $d) {
            foreach ($d->rounds as $round) {
                foreach ($round['items'] as $item) {
                    if (array_key_exists('mine', $item)) {
                        $skillStats[$round['skill']]['total']++;
                        $skillStats[$round['skill']]['correct'] += $item['mine'] ? 1 : 0;
                    }
                }
            }
        }

        $defenses = Duel::query()->where('ghost_id', $user->id)->where('status', '!=', 'active')->where('ghost_notified', false)
            ->with('user:id,name,username')->latest('id')->limit(10)->get();
        Duel::query()->whereIn('id', $defenses->pluck('id'))->update(['ghost_notified' => true]);

        $top = User::query()->where('duel_trophies', '>', 0)->orderByDesc('duel_trophies')->orderBy('id')->limit(20)->get(['id', 'name', 'username', 'duel_trophies']);
        $myRank = User::query()->where('duel_trophies', '>', $user->duel_trophies)->count() + 1;

        return [
            'me' => [
                'trophies' => $user->duel_trophies,
                'best' => $user->duel_best,
                'rank' => self::rankFor($user->duel_trophies),
                'next_rank' => self::nextRank($user->duel_trophies),
                'wins' => (int) ($counts['win'] ?? 0),
                'losses' => (int) ($counts['loss'] ?? 0),
                'draws' => (int) ($counts['draw'] ?? 0),
                'win_streak' => $this->winStreak($user),
                'tickets_left' => $this->ticketsLeft($user),
                'tickets_total' => $user->isPremium() ? null : self::FREE_PER_DAY,
                'position' => $myRank,
            ],
            'skills' => collect($skillStats)->map(fn ($s, $k) => ['key' => $k, 'label' => Skills::LABELS[$k]] + $s)->values(),
            'recent' => $user->duels()->where('status', '!=', 'active')->latest('id')->limit(8)->get()->map(fn (Duel $d) => [
                'id' => $d->id, 'ghost_name' => $d->ghost_name, 'result' => $d->result, 'score' => $d->score,
                'ghost_score' => $d->ghost_score, 'delta' => $d->trophies_delta, 'at' => $d->finished_at?->toIso8601String(),
            ]),
            'defenses' => $defenses->map(fn (Duel $d) => [
                'id' => $d->id, 'challenger' => $d->user?->name ?? 'Bir öğrenci', 'held' => $d->result === 'loss',
                'delta' => $d->ghost_delta, 'at' => $d->finished_at?->toIso8601String(),
            ]),
            'leaderboard' => $top->values()->map(fn (User $u, $i) => [
                'position' => $i + 1, 'name' => $u->name, 'username' => $u->username, 'trophies' => $u->duel_trophies,
                'rank' => self::rankFor($u->duel_trophies)['name'], 'is_me' => $u->id === $user->id,
            ]),
            'ranks' => self::RANKS,
            'items_per_round' => self::ITEMS_PER_ROUND,
        ];
    }

    /** What the client needs to play: exercises plus the ghost's replay timeline. */
    public function present(Duel $duel): array
    {
        return [
            'id' => $duel->id,
            'ghost' => [
                'name' => $duel->ghost_name,
                'trophies' => $duel->ghost_trophies,
                'rank' => self::rankFor($duel->ghost_trophies),
                'skills' => $duel->ghost_skills,
                'training' => $duel->ghost_id === null,
            ],
            'rounds' => array_map(fn ($r) => [
                'skill' => $r['skill'],
                'label' => Skills::LABELS[$r['skill']],
                'items' => array_map(fn ($it) => ['ex' => $it['ex'], 'ghost' => $it['ghost']], $r['items']),
            ], $duel->rounds),
        ];
    }

    public static function points(bool $correct, int $ms): int
    {
        return $correct ? 100 + max(0, 50 - intdiv(max(0, $ms), 400)) : 0;
    }

    /** @return list<array{0:string,1:array}> [skill, item] pairs in play order */
    private function flatItems(Duel $duel): array
    {
        $out = [];
        foreach ($duel->rounds as $round) {
            foreach ($round['items'] as $item) {
                $out[] = [$round['skill'], $item];
            }
        }

        return $out;
    }

    private function winStreak(User $user): int
    {
        $streak = 0;
        foreach ($user->duels()->where('status', '!=', 'active')->latest('id')->limit(30)->pluck('result') as $r) {
            if ($r !== 'win') {
                break;
            }
            $streak++;
        }

        return $streak;
    }

    private function pickGhost(User $user): ?User
    {
        $base = User::query()->whereKeyNot($user->id)->where('is_banned', false)->whereNotNull('email_verified_at')->where('xp_total', '>', 0);

        return (clone $base)->whereBetween('duel_trophies', [max(0, $user->duel_trophies - 200), $user->duel_trophies + 200])->inRandomOrder()->first()
            ?? (clone $base)->inRandomOrder()->first();
    }

    private function trainingSkills(User $user): array
    {
        $mine = collect($this->game->skillReport($user)['skills'])->pluck('level', 'key');

        return collect(Skills::ALL)->mapWithKeys(fn ($s) => [$s => max(0, (int) ($mine[$s] ?? 0) + random_int(-1, 1))])->all();
    }

    /** A replayed answer: accuracy and speed grow with the ghost's level in that skill. */
    private function ghostAnswer(int $level): array
    {
        $p = min(0.92, 0.5 + 0.07 * $level);
        $correct = mt_rand() / mt_getrandmax() < $p;
        $ms = max(1800, mt_rand(3000, 9500) - $level * 350);

        return ['correct' => $correct, 'ms' => $ms];
    }

    /** @return list<array> exercises for one skill round, drawn from lessons at or below the learner's level */
    private function questions(User $user, string $skill): array
    {
        static $bank = [];
        $key = $user->cefr_level;
        $bank[$key] ??= Lesson::query()
            ->whereHas('unit.course', fn ($q) => $q->where('is_published', true)->where('cefr_level', '<=', $user->cefr_level))
            ->pluck('exercises')->flatten(1)->filter(fn ($e) => is_array($e))->values()->all();

        $pool = array_values(array_filter($bank[$key], fn ($e) => in_array($e['type'] ?? '', self::TYPES[$skill], true)));
        if (! $pool) {
            $pool = array_values(array_filter($bank[$key], fn ($e) => in_array($e['type'] ?? '', self::TYPES['reading'], true)));
        }
        shuffle($pool);

        return array_slice($pool, 0, self::ITEMS_PER_ROUND);
    }
}
