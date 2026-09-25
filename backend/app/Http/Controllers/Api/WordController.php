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
            ->when($request->query('q'), fn ($q, $s) => $q->where('word', 'like', "%{$s}%"))
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

    public function review(Request $request, SrsService $srs, GamificationService $game): JsonResponse
    {
        $data = $request->validate([
            'reviews' => ['required', 'array', 'min:1', 'max:50'],
            'reviews.*.id' => ['required', 'integer'],
            'reviews.*.grade' => ['required', 'integer', 'between:0,5'],
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
        $summary = $game->record($user, min(30, $count * 2), 'review', null, ['reviews' => $count]);

        return response()->json(['reviewed' => $count, 'reward' => $summary]);
    }
}
