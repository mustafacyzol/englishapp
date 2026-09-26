<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Duel;
use App\Services\DuelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DuelController extends Controller
{
    public function __construct(private readonly DuelService $duels) {}

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
        return response()->json($this->duels->finish($request->user(), $duel, array_values($request->input('answers', []))));
    }
}
