<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Unit;
use App\Services\HeartService;
use App\Services\LessonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LearnController extends Controller
{
    public function courses(Request $request): JsonResponse
    {
        $courses = Course::query()->where('is_published', true)->orderBy('position')
            ->withCount(['units'])->get(['id', 'slug', 'title', 'description', 'cefr_level', 'color']);

        return response()->json(['data' => $courses]);
    }

    /** The Duolingo-style path for one course, with per-lesson state. */
    public function path(Request $request, ?Course $course = null): JsonResponse
    {
        $user = $request->user();
        $course ??= Course::query()->where('is_published', true)->where('cefr_level', $user->cefr_level)->orderBy('position')->first()
            ?? Course::query()->where('is_published', true)->orderBy('position')->firstOrFail();

        $course->load(['units.lessons' => fn ($q) => $q->select(['id', 'unit_id', 'title', 'skill', 'kind', 'position', 'xp_reward', 'is_premium', 'story_id', 'scenario_key'])]);
        $progress = LessonProgress::query()->where('user_id', $user->id)
            ->whereIn('lesson_id', $course->units->flatMap->lessons->pluck('id'))
            ->get()->keyBy('lesson_id');

        $currentFound = false;
        $units = $course->units->map(function ($unit) use ($progress, &$currentFound, $user) {
            $lessons = $unit->lessons->map(function (Lesson $lesson) use ($progress, &$currentFound, $user) {
                $p = $progress->get($lesson->id);
                if ($p?->completed_at) {
                    $state = 'completed';
                } elseif (! $currentFound) {
                    $state = 'current';
                    $currentFound = true;
                } else {
                    $state = 'locked';
                }

                return $lesson->toArray() + [
                    'state' => $state,
                    'crowns' => $p?->crowns ?? 0,
                    'best_score' => $p?->best_score ?? 0,
                    'premium_locked' => $lesson->is_premium && ! $user->isPremium(),
                ];
            });
            $done = $lessons->where('state', 'completed')->count();

            return [
                'id' => $unit->id,
                'title' => $unit->title,
                'description' => $unit->description,
                'color' => $unit->color,
                'has_guidebook' => filled($unit->guidebook),
                'lessons' => $lessons,
                'progress' => $lessons->count() ? round($done / $lessons->count() * 100) : 0,
            ];
        });

        return response()->json([
            'course' => $course->only(['id', 'slug', 'title', 'description', 'cefr_level', 'color']),
            'units' => $units,
        ]);
    }

    public function guidebook(Unit $unit): JsonResponse
    {
        return response()->json(['title' => $unit->title, 'guidebook' => $unit->guidebook]);
    }

    public function lesson(Request $request, Lesson $lesson, HeartService $hearts): JsonResponse
    {
        $user = $request->user();
        abort_if($lesson->is_premium && ! $user->isPremium(), 402, 'Bu ders Premium üyelere özel.');
        $heartState = $hearts->sync($user);
        abort_if(! $heartState['unlimited'] && $heartState['hearts'] <= 0, 423, 'Canın kalmadı. Biraz bekle, can yenile ya da pratik yaparak kazan.');

        return response()->json([
            'lesson' => $lesson->load('story:id,slug,title')->only(['id', 'title', 'skill', 'kind', 'xp_reward', 'exercises', 'story', 'scenario_key']),
            'hearts' => $heartState,
        ]);
    }

    public function complete(Request $request, Lesson $lesson, LessonService $lessons): JsonResponse
    {
        $data = $request->validate([
            'answers' => ['present', 'array', 'max:60'],
            'seconds' => ['nullable', 'integer', 'min:0', 'max:7200'],
        ]);

        return response()->json($lessons->complete($request->user(), $lesson, $data['answers'], $data['seconds'] ?? 0));
    }
}
