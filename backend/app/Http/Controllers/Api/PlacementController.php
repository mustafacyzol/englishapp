<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlacementResult;
use App\Http\Presenters\UserPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * The placement test: 40 tasks, eight per CEFR band (A1 to C1), in rising
 * difficulty. Not only multiple choice: learners also build sentences from word
 * tiles (`order`), type a missing word (`gap`) and write what they hear
 * (`dictation`), across vocabulary, grammar, reading and listening. Answers never
 * leave the server; skipped tasks count as wrong.
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
            'type' => $q['type'] ?? 'choice',
            'options' => $q['options'] ?? [],
            'tiles' => $q['tiles'] ?? null,
        ])->values()]);
    }

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate(['answers' => ['required', 'array', 'max:60']]);
        $bank = $this->bank();
        $bands = [];
        $skills = array_fill_keys(self::SKILLS, ['total' => 0, 'correct' => 0]);
        $kinds = [];
        $answered = 0;
        foreach ($bank as $i => $q) {
            $given = $data['answers'][$i] ?? null;
            $type = $q['type'] ?? 'choice';
            [$did, $ok] = self::grade($q, $given);
            $answered += $did ? 1 : 0;
            $bands[$q['level']]['total'] = ($bands[$q['level']]['total'] ?? 0) + 1;
            $bands[$q['level']]['correct'] = ($bands[$q['level']]['correct'] ?? 0) + ($ok ? 1 : 0);
            $s = $q['skill'] ?? 'grammar';
            $skills[$s]['total']++;
            $skills[$s]['correct'] += $ok ? 1 : 0;
            $kinds[$type]['total'] = ($kinds[$type]['total'] ?? 0) + 1;
            $kinds[$type]['correct'] = ($kinds[$type]['correct'] ?? 0) + ($ok ? 1 : 0);
        }

        $result = PlacementResult::query()->create([
            'token' => Str::random(40),
            'level' => self::levelFrom($bands),
            'score' => (int) round(100 * array_sum(array_column($bands, 'correct')) / max(1, count($bank))),
            'bands' => $bands,
            'skills' => collect($skills)->map(fn ($s) => (int) round(100 * $s['correct'] / max(1, $s['total'])))->all(),
            'activities' => $kinds,
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
     * [answered?, correct?] for one task. Choices compare the option index; typed
     * answers and sentences compare case-, space- and punctuation-insensitively
     * against every accepted answer.
     */
    public static function grade(array $q, mixed $given): array
    {
        if (($q['type'] ?? 'choice') === 'choice') {
            if (! is_int($given) && ! (is_string($given) && ctype_digit($given))) {
                return [false, false];
            }
            $g = (int) $given;

            return [$g >= 0, $g === $q['answer']];
        }
        if (! is_string($given) || mb_strlen($given) > 300 || self::normalize($given) === '') {
            return [false, false];
        }
        $g = self::normalize($given);

        return [true, collect((array) $q['answer'])->contains(fn ($a) => self::normalize((string) $a) === $g)];
    }

    public static function normalize(string $s): string
    {
        $s = mb_strtolower(str_replace(['’', '‘', '`'], "'", trim($s)));
        $s = preg_replace('/[^\p{L}\p{N}\' ]+/u', ' ', $s);

        return trim(preg_replace('/\s+/', ' ', $s));
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
