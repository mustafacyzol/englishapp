<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiScenario;
use App\Services\AiTutorService;
use App\Services\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(private readonly AiTutorService $tutor) {}

    public function scenarios(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => AiScenario::query()->where('is_active', true)->orderBy('position')
                ->get(['id', 'key', 'title', 'description', 'emoji', 'category', 'cefr_min', 'goals', 'is_premium'])
                ->map(fn ($s) => $s->toArray() + ['locked' => $s->is_premium && ! $user->isPremium()]),
            'usage' => $this->tutor->usageToday($user),
        ]);
    }

    public function conversations(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->conversations()->latest('updated_at')->limit(30)->get(['id', 'mode', 'scenario_key', 'title', 'updated_at']),
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', 'in:chat,roleplay,speaking'],
            'scenario_key' => ['nullable', 'string', 'exists:ai_scenarios,key'],
        ]);
        $user = $request->user();
        $scenario = isset($data['scenario_key']) ? AiScenario::query()->where('key', $data['scenario_key'])->first() : null;
        abort_if($scenario?->is_premium && ! $user->isPremium(), 402, 'Bu senaryo Premium üyelere özel.');

        $conversation = $user->conversations()->create([
            'mode' => $data['mode'],
            'scenario_key' => $scenario?->key,
            'title' => $scenario?->title ?? ($data['mode'] === 'speaking' ? 'Konuşma pratiği' : 'Serbest sohbet'),
            'meta' => ['goals' => $scenario?->goals ?? [], 'goals_completed' => []],
        ]);

        $opening = $scenario?->opening_line ?? "Hi {$user->name}! I'm Defne, your English coach. How's your day going?";
        $conversation->messages()->create(['role' => 'assistant', 'content' => $opening, 'feedback' => ['new_words' => [], 'correction' => null]]);

        return response()->json(['conversation' => $conversation->load('messages'), 'usage' => $this->tutor->usageToday($user)], 201);
    }

    public function show(Request $request, AiConversation $conversation): JsonResponse
    {
        abort_unless($conversation->user_id === $request->user()->id, 404);

        return response()->json(['conversation' => $conversation->load('messages'), 'usage' => $this->tutor->usageToday($request->user())]);
    }

    public function send(Request $request, AiConversation $conversation, GamificationService $game): JsonResponse
    {
        abort_unless($conversation->user_id === $request->user()->id, 404);
        $data = $request->validate(['text' => ['required', 'string', 'min:1', 'max:1000'], 'spoken' => ['boolean']]);

        $message = $this->tutor->reply($conversation, strip_tags($data['text']));
        $spoken = (bool) ($data['spoken'] ?? false);
        // A spoken reply trains speaking (and listening to Defne's answer); a typed one trains writing.
        $summary = $game->record($request->user(), $spoken ? 4 : 3, 'ai', $conversation->id, array_filter([
            'ai_messages' => 1,
            'speaking' => $spoken ? 1 : 0,
        ]), $spoken ? ['speaking' => 0.75, 'listening' => 0.25] : ['writing' => 0.75, 'reading' => 0.25]);

        return response()->json([
            'message' => $message,
            'goals_completed' => $conversation->fresh()->meta['goals_completed'] ?? [],
            'usage' => $this->tutor->usageToday($request->user()),
            'reward' => $summary,
        ]);
    }

    public function destroy(Request $request, AiConversation $conversation): JsonResponse
    {
        abort_unless($conversation->user_id === $request->user()->id, 404);
        $conversation->delete();

        return response()->json(['ok' => true]);
    }

    public function writing(Request $request, GamificationService $game): JsonResponse
    {
        $data = $request->validate([
            'text' => ['required', 'string', 'min:20', 'max:4000'],
            'task' => ['nullable', 'string', 'max:300'],
            'target_words' => ['nullable', 'array', 'max:6'],
            'target_words.*' => ['string', 'max:40'],
        ]);
        $user = $request->user();
        $result = $this->tutor->checkWriting($user, strip_tags($data['text']), $data['task'] ?? null, $data['target_words'] ?? []);
        $summary = $game->record($user, 15, 'writing', null, ['ai_messages' => 1], ['writing' => 1]);

        return response()->json(['result' => $result, 'reward' => $summary, 'usage' => $this->tutor->usageToday($user)]);
    }
}
