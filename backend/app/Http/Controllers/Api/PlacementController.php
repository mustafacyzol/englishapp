<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Adaptive-lite placement test: questions grouped by CEFR band; the level is the
 * highest band where the learner answers at least 60% correctly (with every
 * lower band also passed).
 */
class PlacementController extends Controller
{
    public function questions(): JsonResponse
    {
        $bank = $this->bank();

        return response()->json(['data' => collect($bank)->map(fn ($q, $i) => ['id' => $i, 'level' => $q['level'], 'type' => $q['type'] ?? 'choice', 'prompt' => $q['prompt'], 'options' => $q['options'], 'audio' => $q['audio'] ?? null])->values()]);
    }

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate(['answers' => ['required', 'array']]);
        $bank = $this->bank();
        $bands = [];
        foreach ($bank as $i => $q) {
            $bands[$q['level']]['total'] = ($bands[$q['level']]['total'] ?? 0) + 1;
            $ok = isset($data['answers'][$i]) && (int) $data['answers'][$i] === $q['answer'];
            $bands[$q['level']]['correct'] = ($bands[$q['level']]['correct'] ?? 0) + ($ok ? 1 : 0);
        }

        $level = 'A1';
        foreach (['A1', 'A2', 'B1', 'B2', 'C1'] as $band) {
            $b = $bands[$band] ?? ['total' => 1, 'correct' => 0];
            if ($b['correct'] / max(1, $b['total']) >= 0.6) {
                $level = match ($band) {
                    'A1' => 'A2', 'A2' => 'B1', 'B1' => 'B2', 'B2' => 'C1', 'C1' => 'C2'
                };
            } else {
                break;
            }
        }
        // Passing a band means you are ready for the next one, but cap at the band reached.
        $order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        $firstFail = collect($order)->first(fn ($b) => isset($bands[$b]) && $bands[$b]['correct'] / $bands[$b]['total'] < 0.6);
        if ($firstFail) {
            $level = $firstFail;
        }

        if ($user = $request->user('sanctum')) {
            $user->update(['cefr_level' => $level]);
        }

        return response()->json(['level' => $level, 'bands' => $bands]);
    }

    private function bank(): array
    {
        return json_decode(file_get_contents(database_path('data/placement.json')), true);
    }
}
