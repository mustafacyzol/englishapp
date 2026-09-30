<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlacementResult;
use App\Http\Presenters\UserPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * The placement test: 30 questions, six per CEFR band (A1 to C1) across
 * vocabulary, grammar, reading and listening, in rising difficulty. Answers
 * never leave the server; skipped questions count as wrong.
 *
 * The level is never returned on submit. The result is stored under a token and
 * applied to the account after sign-up (or at once for a signed-in learner),
 * then revealed in the app through `claim`.
 */
class PlacementController extends Controller
{
    public const SKILLS = ['vocabulary', 'grammar', 'reading', 'listening'];

    public function questions(): JsonResponse
    {
        return response()->json(['data' => collect($this->bank())->map(fn ($q, $i) => [
            'id' => $i,
            'level' => $q['level'],
            'skill' => $q['skill'] ?? 'grammar',
            'prompt' => $q['prompt'],
            'passage' => $q['passage'] ?? null,
            'say' => $q['say'] ?? null,
            'options' => $q['options'],
        ])->values()]);
    }

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate(['answers' => ['required', 'array', 'max:60'], 'answers.*' => ['integer', 'min:-1', 'max:5']]);
        $bank = $this->bank();
        $bands = [];
        $skills = array_fill_keys(self::SKILLS, ['total' => 0, 'correct' => 0]);
        $answered = 0;
        foreach ($bank as $i => $q) {
            $given = $data['answers'][$i] ?? null;
            $answered += $given !== null && (int) $given >= 0 ? 1 : 0;
            $ok = $given !== null && (int) $given === $q['answer'];
            $bands[$q['level']]['total'] = ($bands[$q['level']]['total'] ?? 0) + 1;
            $bands[$q['level']]['correct'] = ($bands[$q['level']]['correct'] ?? 0) + ($ok ? 1 : 0);
            $s = $q['skill'] ?? 'grammar';
            $skills[$s]['total']++;
            $skills[$s]['correct'] += $ok ? 1 : 0;
        }

        $result = PlacementResult::query()->create([
            'token' => Str::random(40),
            'level' => self::levelFrom($bands),
            'score' => (int) round(100 * array_sum(array_column($bands, 'correct')) / max(1, count($bank))),
            'bands' => $bands,
            'skills' => collect($skills)->map(fn ($s) => (int) round(100 * $s['correct'] / max(1, $s['total'])))->all(),
            'answered' => $answered,
        ]);

        if ($user = $request->user('sanctum')) {
            $result->applyTo($user);
        }

        return response()->json(['token' => $result->token, 'answered' => $answered, 'total' => count($bank)], 201);
    }

    /** Apply a finished test to the signed-in learner and return the result to reveal. */
    public function claim(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'max:64']]);
        $result = PlacementResult::claimable($data['token'], $request->user());
        abort_unless($result, 404, 'Bu test sonucu bulunamadı ya da süresi doldu.');
        $result->applyTo($request->user());

        return response()->json(['result' => $result->present(), 'user' => UserPresenter::me($request->user()->fresh())]);
    }

    /**
     * The level is the first band scored below 4 of 6 (67%): passing a band means
     * you are ready for the next one. Passing all five bands means C2.
     */
    public static function levelFrom(array $bands): string
    {
        foreach (['A1', 'A2', 'B1', 'B2', 'C1'] as $band) {
            $b = $bands[$band] ?? ['total' => 1, 'correct' => 0];
            if ($b['correct'] / max(1, $b['total']) < 0.6) {
                return $band;
            }
        }

        return 'C2';
    }

    private function bank(): array
    {
        return json_decode(file_get_contents(database_path('data/placement.json')), true);
    }
}
