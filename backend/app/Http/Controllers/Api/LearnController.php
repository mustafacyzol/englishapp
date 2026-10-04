<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Unit;
use App\Services\HeartService;
use App\Services\LessonService;
use App\Services\PathService;
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

    /** One course of the path with per-lesson state (see PathService for the rules). */
    public function path(Request $request, PathService $paths, ?Course $course = null): JsonResponse
    {
        $user = $request->user();
        $course ??= $paths->courseFor($user);
        $course->load(['units.lessons' => fn ($q) => $q->select(['id', 'unit_id', 'title', 'skill', 'kind', 'position', 'xp_reward', 'is_premium', 'story_id', 'scenario_key', 'meta'])->with('story:id,slug')]);
        $states = $paths->states($user, $course);
        $progress = LessonProgress::query()->where('user_id', $user->id)->whereIn('lesson_id', array_keys($states))->get()->keyBy('lesson_id');

        $track = \App\Support\Tracks::for($user);
        $units = $course->units->values()->map(function ($unit, $i) use ($progress, $states, $user, $track, $course) {
            $lessons = $unit->lessons->map(fn (Lesson $lesson) => ['meta' => $lesson->meta ? ['game' => $lesson->meta['game'] ?? null] : null] + $lesson->toArray() + [
                'state' => $states[$lesson->id] ?? 'locked',
                'crowns' => $progress->get($lesson->id)?->crowns ?? 0,
                'best_score' => $progress->get($lesson->id)?->best_score ?? 0,
                'premium_locked' => $lesson->is_premium && ! $user->isPremium(),
            ]);
            $done = $lessons->where('state', 'completed')->count();

            return [
                'id' => $unit->id,
                'title' => $unit->title,
                'description' => $unit->description,
                'color' => $unit->color,
                'has_guidebook' => filled($unit->guidebook),
                'lessons' => $lessons,
                'progress' => $lessons->count() ? round($done / $lessons->count() * 100) : 0,
                'tag' => \App\Support\Tracks::unitTag($track, $course->cefr_level, $i),
                // exam learners: a short set in their exam's format once half the unit is done
                'drill' => $track['drill'] ? [
                    'exam' => $track['drill'],
                    'label' => \App\Support\Tracks::examName($track['drill']).' tarzı sorular',
                    'open' => $lessons->count() && $done / $lessons->count() >= 0.5,
                ] : null,
            ];
        });

        return response()->json([
            'course' => $course->only(['id', 'slug', 'title', 'description', 'cefr_level', 'color']) + ['access' => match ($paths->relation($user, $course)) { -1 => 'review', 0 => 'current', default => 'locked' }],
            'courses' => $paths->courses()->map(fn (Course $c) => $c->only(['id', 'title', 'cefr_level']) + ['access' => match ($paths->relation($user, $c)) { -1 => 'review', 0 => 'current', default => 'locked' }])->values(),
            'units' => $units,
            'track' => $track,
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
        abort_unless(app(PathService::class)->canOpen($user, $lesson), 403, 'Bu ders henüz kilitli. Önceki dersi bitir ya da bir ünitenin başından başla.');
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

        abort_unless(app(PathService::class)->canOpen($request->user(), $lesson), 403, 'Bu ders henüz kilitli.');
        $result = $lessons->complete($request->user(), $lesson, $data['answers'], $data['seconds'] ?? 0);
        // finishing the last lesson of your level moves you up one level
        $up = app(PathService::class)->maybeLevelUp($request->user()->fresh());
        if ($up) {
            // a new CEFR level is a badge of its own
            $result['reward']['achievements'] = array_merge($result['reward']['achievements'] ?? [], app(\App\Services\GamificationService::class)->checkAchievements($request->user()->fresh()));
        }

        return response()->json($result + ['level_up' => $up]);
    }
}
