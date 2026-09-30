<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Duel;
use App\Services\ArenaService;
use App\Services\DuelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DuelController extends Controller
{
    public function __construct(private readonly DuelService $duels, private readonly ArenaService $arena) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->duels->overview($request->user()));
    }

    public function start(Request $request): JsonResponse
    {
        $duel = $this->duels->start($request->user());

        return response()->json(['duel' => $this->duels->present($duel), 'tickets_left' => $this->duels->ticketsLeft($request->user())], 201);
    }

    public function finish(Request $request, Duel $duel): JsonResponse
    {
        $request->validate([
            'answers' => ['present', 'array', 'max:16'],
            'answers.*' => ['array', 'size:2'],
            'answers.*.1' => ['integer', 'min:0', 'max:120000'],
        ]);

        // validated() would drop the un-ruled answer slot, so read the raw (shape-checked) array.
        $result = $this->duels->finish($request->user(), $duel, array_values($request->input('answers', [])));
        \App\Models\ArenaPresence::query()->whereKey($request->user()->id)->update(['status' => 'idle', 'matched_duel_id' => null]);

        return response()->json($result);
    }

    public function lobby(Request $request): JsonResponse
    {
        return response()->json($this->arena->lobby($request->user()));
    }

    public function queue(Request $request): JsonResponse
    {
        return response()->json($this->arena->queue($request->user(), $request->isMethod('post')));
    }

    public function leave(Request $request): JsonResponse
    {
        $this->arena->leave($request->user());

        return response()->json(['ok' => true]);
    }

    public function progress(Request $request, Duel $duel): JsonResponse
    {
        $data = $request->validate(['i' => ['required', 'integer', 'min:0', 'max:16'], 'score' => ['required', 'integer', 'min:0', 'max:10000']]);
        $this->arena->progress($request->user(), $duel, $data['i'], $data['score']);

        return response()->json(['rival' => $this->arena->rival($request->user(), $duel)]);
    }

    public function rival(Request $request, Duel $duel): JsonResponse
    {
        return response()->json(['rival' => $this->arena->rival($request->user(), $duel)]);
    }
}
