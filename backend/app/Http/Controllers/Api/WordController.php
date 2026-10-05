<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserWord;
use App\Services\GamificationService;
use App\Services\SrsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $words = $user->words()
            ->when(is_string($request->query('q')) ? $request->query('q') : null, fn ($q, $s) => $q->where('word', 'like', "%{$s}%"))
            ->when($request->query('filter') === 'due', fn ($q) => $q->where('due_at', '<=', now()))
            ->when($request->query('filter') === 'mastered', fn ($q) => $q->where('interval_days', '>=', 21))
            ->latest()->paginate(50);

        return response()->json(array_merge($words->toArray(), [
            'stats' => [
                'total' => $user->words()->count(),
                'due' => $user->words()->where('due_at', '<=', now())->count(),
                'mastered' => $user->words()->where('interval_days', '>=', 21)->count(),
            ],
        ]));
    }

    public function store(Request $request, GamificationService $game): JsonResponse
    {
        $data = $request->validate([
            'word' => ['required', 'string', 'max:120'],
            'translation' => ['nullable', 'string', 'max:255'],
            'example' => ['nullable', 'string', 'max:1000'],
            'source' => ['nullable', 'in:story,lesson,ai,manual'],
            'source_id' => ['nullable', 'integer'],
        ]);
        $user = $request->user();
        $word = UserWord::query()->firstOrCreate(
            ['user_id' => $user->id, 'word' => mb_strtolower(trim($data['word']))],
            $data + ['due_at' => now()]
        );
        if ($word->wasRecentlyCreated) {
            $game->checkAchievements($user);
        }

        return response()->json(['word' => $word], $word->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, UserWord $word): JsonResponse
    {
        abort_unless($word->user_id === $request->user()->id, 404);
        $word->delete();

        return response()->json(['ok' => true]);
    }

    public function queue(Request $request): JsonResponse
    {
        $words = $request->user()->words()->where('due_at', '<=', now())->orderBy('due_at')->limit(20)->get();
        $distractors = $request->user()->words()->whereNotNull('translation')->inRandomOrder()->limit(30)->pluck('translation');

        return response()->json(['data' => $words, 'distractors' => $distractors]);
    }

    /**
     * A practice deck for the word games: due words first, then the least-known
     * saved words; topped up with level-matched starter words (id = null) when the
     * notebook is still thin, so the games are playable from day one.
     */
    public function deck(Request $request): JsonResponse
    {
        $n = min(30, max(6, (int) $request->query('n', 16)));
        $user = $request->user();
        // a word set: any ready-made, public or own set, in every game
        if ($setId = (int) $request->query('set')) {
            $set = \App\Models\WordSet::query()->findOrFail($setId);
            abort_unless($set->isVisibleTo($user), 404);
            $deck = $set->items->map(fn ($i) => ['id' => null, 'word' => $i->word, 'translation' => $i->translation, 'example' => $i->example, 'interval_days' => 0]);

            return response()->json(['data' => $deck->shuffle()->take($n)->values(), 'saved' => 0, 'set' => $set->only(['id', 'title'])]);
        }
        // a "words" node on the path plays with that unit's own vocabulary
        if ($lessonId = (int) $request->query('lesson')) {
            $lesson = \App\Models\Lesson::query()->findOrFail($lessonId);
            abort_unless(app(\App\Services\PathService::class)->canOpen($user, $lesson), 403, 'Bu ders henüz kilitli.');
            $acts = app(\App\Services\PathActivities::class);
            $acts->deckServed($user, $lesson);
            // the stop plays the unit's ready-made word set (the same one in the word-set library)
            $set = $acts->wordSet($lesson);
            $list = $set
                ? $set->items->map(fn ($i) => ['word' => $i->word, 'translation' => $i->translation, 'example' => $i->example])
                : collect($lesson->meta['words'] ?? []);
            $saved = $user->words()->whereIn('word', $list->pluck('word'))->get(['id', 'word', 'translation', 'example', 'interval_days'])->keyBy(fn ($w) => mb_strtolower($w->word));
            $deck = $list->map(fn ($w) => $saved->has(mb_strtolower($w['word']))
                ? $saved[mb_strtolower($w['word'])]->only(['id', 'word', 'translation', 'example', 'interval_days'])
                : ['id' => null, 'word' => $w['word'], 'translation' => $w['translation'], 'example' => $w['example'] ?? null, 'interval_days' => 0]);

            return response()->json(['data' => $deck->shuffle()->take($n)->values(), 'saved' => $saved->count(), 'lesson' => $lesson->only(['id', 'title']), 'set' => $set?->only(['id', 'title'])]);
        }
        $mine = $user->words()->whereNotNull('translation')
            ->orderByRaw('CASE WHEN due_at <= ? THEN 0 ELSE 1 END', [now()])
            ->orderBy('interval_days')->orderBy('due_at')
            ->limit($n)->get(['id', 'word', 'translation', 'example', 'interval_days', 'due_at']);

        $deck = $mine->map(fn ($w) => $w->only(['id', 'word', 'translation', 'example', 'interval_days']))->all();
        if (count($deck) < $n) {
            $starter = json_decode(file_get_contents(database_path('data/starter_words.json')), true);
            $level = in_array($user->cefr_level, ['C1', 'C2'], true) ? 'B2' : $user->cefr_level;
            $known = $mine->pluck('word')->map(fn ($w) => mb_strtolower($w))->all();
            $pool = collect($starter[$level] ?? $starter['A1'])->reject(fn ($w) => in_array($w[0], $known, true))->shuffle();
            foreach ($pool->take($n - count($deck)) as [$word, $tr, $ex]) {
                $deck[] = ['id' => null, 'word' => $word, 'translation' => $tr, 'example' => $ex, 'interval_days' => 0];
            }
        }

        return response()->json(['data' => array_values($deck), 'saved' => $mine->count()]);
    }

    public function review(Request $request, SrsService $srs, GamificationService $game): JsonResponse
    {
        $data = $request->validate([
            'reviews' => ['present', 'array', 'max:50'],
            'reviews.*.id' => ['required', 'integer'],
            'reviews.*.grade' => ['required', 'integer', 'between:0,5'],
            // correct answers on starter words (not in the notebook yet), from the word games
            'played' => ['nullable', 'integer', 'min:0', 'max:30'],
        ]);
        $user = $request->user();
        $words = $user->words()->whereIn('id', collect($data['reviews'])->pluck('id'))->get()->keyBy('id');
        $count = 0;
        foreach ($data['reviews'] as $r) {
            if ($w = $words->get($r['id'])) {
                $srs->review($w, $r['grade']);
                $count++;
            }
        }
        abort_if($count === 0 && empty($data['played']), 422, 'Tekrar edilecek kelime yok.');
        // right answers in practice are what "earn a heart" spends (see GameController::earnHeart)
        $right = collect($data['reviews'])->filter(fn ($r) => $words->has($r['id']) && $r['grade'] >= 3)->count() + (int) ($data['played'] ?? 0);
        $key = "hearts:credit:{$user->id}";
        \Illuminate\Support\Facades\Cache::add($key, 0, now()->addDay());
        \Illuminate\Support\Facades\Cache::increment($key, $right);

        // Amounts come from the economy table; the daily cap for word games is applied centrally.
        $e = config('dilgo.economy.xp');
        $xp = $count * $e['review_per_word'] + (int) ($data['played'] ?? 0) * $e['practice_per_correct'];
        $summary = $game->record($user, $xp, $count ? 'review' : 'practice', null, ['reviews' => $count], ['reading' => 0.6, 'listening' => 0.25, 'writing' => 0.15]);

        return response()->json(['reviewed' => $count, 'reward' => $summary]);
    }
}
