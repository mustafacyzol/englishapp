<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Story;
use App\Models\StoryRead;
use App\Services\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        $q = Story::query()->where('is_published', true)
            ->when($request->query('level'), fn ($q, $l) => $q->where('cefr_level', $l))
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->when(is_string($request->query('q')) ? $request->query('q') : null, fn ($q, $s) => $q->where(fn ($w) => $w->where('title', 'like', "%{$s}%")->orWhere('title_tr', 'like', "%{$s}%")))
            ->orderByRaw('published_at IS NULL, published_at DESC')->orderByDesc('id');

        $page = $q->paginate(min(48, (int) $request->query('per_page', 24)), ['id', 'slug', 'title', 'title_tr', 'summary', 'cefr_level', 'category', 'cover_image', 'reading_minutes', 'word_count', 'is_premium', 'reads_count', 'audio_url']);

        $reads = $user ? StoryRead::query()->where('user_id', $user->id)->whereIn('story_id', $page->pluck('id'))->get()->keyBy('story_id') : collect();
        $page->getCollection()->transform(fn (Story $s) => $s->toArray() + [
            'has_audio' => filled($s->audio_url),
            'progress' => $reads->get($s->id)?->progress ?? 0,
            'completed' => (bool) $reads->get($s->id)?->completed_at,
            'bookmarked' => (bool) $reads->get($s->id)?->bookmarked,
        ]);

        return response()->json($page);
    }

    public function categories(): JsonResponse
    {
        return response()->json(['data' => Story::query()->where('is_published', true)->whereNotNull('category')->distinct()->orderBy('category')->pluck('category')]);
    }

    public function show(Request $request, Story $story): JsonResponse
    {
        abort_unless($story->is_published || $request->user()?->isStaff(), 404);
        $user = $request->user();
        $locked = $story->is_premium && ! $user->isPremium();

        $read = StoryRead::query()->firstOrCreate(['user_id' => $user->id, 'story_id' => $story->id]);
        if ($read->wasRecentlyCreated) {
            $story->increment('reads_count');
        }

        $data = $story->toArray();
        if ($locked) {
            // teaser: first two paragraphs only
            $data['paragraphs'] = array_slice($story->paragraphs, 0, 2);
            $data['questions'] = [];
            $data['audio_url'] = null;
        }

        return response()->json(['story' => $data, 'locked' => $locked, 'read' => $read]);
    }

    public function progress(Request $request, Story $story): JsonResponse
    {
        $data = $request->validate(['progress' => ['required', 'integer', 'between:0,100']]);
        $read = StoryRead::query()->firstOrCreate(['user_id' => $request->user()->id, 'story_id' => $story->id]);
        $read->update(['progress' => max($read->progress, $data['progress'])]);

        return response()->json(['read' => $read]);
    }

    public function complete(Request $request, Story $story, GamificationService $game): JsonResponse
    {
        $user = $request->user();
        abort_if($story->is_premium && ! $user->isPremium(), 402, 'Bu hikaye Premium üyelere özel.');
        $data = $request->validate(['answers' => ['nullable', 'array'], 'minutes' => ['nullable', 'integer', 'max:180'], 'listened' => ['boolean']]);

        $questions = $story->questions ?? [];
        $correct = 0;
        foreach ($questions as $i => $q) {
            if (self::isRight($q, $data['answers'][$i] ?? null)) {
                $correct++;
            }
        }
        $score = $questions ? (int) round($correct / count($questions) * 100) : 100;

        $read = StoryRead::query()->firstOrCreate(['user_id' => $user->id, 'story_id' => $story->id]);
        $first = ! $read->completed_at;
        $read->update(['progress' => 100, 'completed_at' => $read->completed_at ?? now(), 'quiz_score' => max($read->quiz_score ?? 0, $score)]);

        // XP follows understanding: a small base for finishing plus XP for every right
        // answer. The first read pays more; re-reads are practice.
        $x = config('dilgo.economy.xp');
        $xp = $first
            ? (int) $x['story_first'] + $correct * (int) $x['story_per_correct']
            : (int) $x['story_repeat'] + $correct * (int) $x['story_repeat_per_correct'];
        // Stories are read and, when the narration was played, listened to as well.
        $skills = ($data['listened'] ?? false) ? ['reading' => 0.6, 'listening' => 0.4] : ['reading' => 1];
        $summary = $game->record($user, $xp, 'story', $story->id, ['stories' => $first ? 1 : 0, 'minutes' => $data['minutes'] ?? $story->reading_minutes], $skills);

        return response()->json([
            'score' => $score, 'correct' => $correct, 'total' => count($questions), 'reward' => $summary,
            'xp_breakdown' => ['base' => $first ? (int) $x['story_first'] : (int) $x['story_repeat'], 'per_correct' => $first ? (int) $x['story_per_correct'] : (int) $x['story_repeat_per_correct'], 'first' => $first],
        ]);
    }

    /**
     * Comprehension question types set by admins:
     *  choice / truefalse: the picked option index;
     *  gap: a typed word or phrase, matched loosely against `answer` and `accept`;
     *  order: the sentence built from the shuffled words (`options` holds them in the right order).
     */
    public static function isRight(array $q, mixed $given): bool
    {
        if ($given === null || $given === '') {
            return false;
        }
        $type = $q['type'] ?? 'choice';
        $norm = [PlacementController::class, 'normalize'];
        if ($type === 'gap') {
            return is_string($given) && collect([(string) ($q['answer'] ?? ''), ...($q['accept'] ?? [])])->filter()->contains(fn ($a) => $norm($a) === $norm($given));
        }
        if ($type === 'order') {
            return is_string($given) && $norm(implode(' ', $q['options'] ?? [])) === $norm($given);
        }

        return is_numeric($given) && (int) $given === (int) ($q['answer'] ?? -1);
    }

    public function bookmark(Request $request, Story $story): JsonResponse
    {
        $read = StoryRead::query()->firstOrCreate(['user_id' => $request->user()->id, 'story_id' => $story->id]);
        $read->update(['bookmarked' => ! $read->bookmarked]);

        return response()->json(['bookmarked' => $read->bookmarked]);
    }

    public function rate(Request $request, Story $story): JsonResponse
    {
        $data = $request->validate(['rating' => ['required', 'integer', 'between:1,5']]);
        StoryRead::query()->updateOrCreate(['user_id' => $request->user()->id, 'story_id' => $story->id], ['rating' => $data['rating']]);

        return response()->json(['ok' => true]);
    }

    public function library(Request $request): JsonResponse
    {
        $reads = StoryRead::query()->where('user_id', $request->user()->id)
            ->where(fn ($q) => $q->where('bookmarked', true)->orWhere('progress', '>', 0))
            ->with('story:id,slug,title,title_tr,cefr_level,cover_image,reading_minutes,category')
            ->latest('updated_at')->limit(60)->get();

        return response()->json(['data' => $reads]);
    }
}
