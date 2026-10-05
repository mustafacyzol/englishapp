<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Unit;
use App\Services\GradeUnitService;
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
        $overlay = app(GradeUnitService::class)->overlay($track['grade_track'], $course);
        $units = $course->units->values()->map(function ($unit, $i) use ($progress, $states, $user, $track, $overlay) {
            $lessons = PathService::visible($unit->lessons, $track['grade_track'])->values()->map(fn (Lesson $lesson) => ['meta' => $lesson->meta ? array_filter(['game' => $lesson->meta['game'] ?? null, 'set' => $lesson->meta['set'] ?? null, 'track' => $lesson->meta['track'] ?? null]) : null] + $lesson->toArray() + [
                'state' => $states[$lesson->id] ?? 'locked',
                'crowns' => $progress->get($lesson->id)?->crowns ?? 0,
                'best_score' => $progress->get($lesson->id)?->best_score ?? 0,
                'premium_locked' => $lesson->is_premium && ! $user->isPremium(),
            ]);
            $done = $lessons->where('state', 'completed')->count();
            // a pupil sees their coursebook's unit title; the CEFR title becomes the subtitle
            $grade = $overlay[$i] ?? [];

            return [
                'id' => $unit->id,
                'title' => $grade ? implode(' & ', array_map(fn ($g) => $g->title, $grade)) : $unit->title,
                'description' => $grade ? $unit->title.' · '.$unit->description : $unit->description,
                'color' => $unit->color,
                'has_guidebook' => filled($unit->guidebook) || (bool) $grade,
                'lessons' => $lessons,
                'progress' => $lessons->count() ? round($done / $lessons->count() * 100) : 0,
                'grade' => $grade ? ['label' => GradeUnitService::TRACKS[$track['grade_track']], 'title_tr' => implode(' · ', array_filter(array_map(fn ($g) => $g->title_tr, $grade)))] : null,
            ];
        });

        return response()->json([
            'course' => $course->only(['id', 'slug', 'title', 'description', 'cefr_level', 'color']) + ['access' => match ($paths->relation($user, $course)) { -1 => 'review', 0 => 'current', default => 'locked' }],
            'courses' => $paths->courses()->map(fn (Course $c) => $c->only(['id', 'title', 'cefr_level']) + ['access' => match ($paths->relation($user, $c)) { -1 => 'review', 0 => 'current', default => 'locked' }])->values(),
            'units' => $units,
            'track' => $track,
            'mistakes_due' => app(\App\Services\PathActivities::class)->dueCount($user),
        ]);
    }

    /** The unit's guidebook: a pupil's copy opens with their coursebook unit, every copy closes with the tenses so far. */
    public function guidebook(Request $request, Unit $unit, GradeUnitService $grades): JsonResponse
    {
        $unit->loadMissing('course.units:id,course_id,position');
        $position = $unit->course->units->sortBy('position')->values()->search(fn ($u) => $u->id === $unit->id);
        $mine = $grades->overlay(GradeUnitService::trackFor($request->user()), $unit->course)[$position] ?? [];
        $intro = implode("\n", array_map(fn ($g) => $grades->guideSection($g), $mine));

        $tenses = \App\Support\TenseGuide::chapter($unit->course->cefr_level, (int) $position);

        return response()->json(['title' => $mine ? implode(' & ', array_map(fn ($g) => $g->title, $mine)) : $unit->title, 'guidebook' => trim($intro."\n".$unit->guidebook."\n\n".$tenses)]);
    }

    public function lesson(Request $request, Lesson $lesson, HeartService $hearts): JsonResponse
    {
        $user = $request->user();
        abort_if($lesson->is_premium && ! $user->isPremium(), 402, 'Bu ders Premium üyelere özel.');
        abort_unless(app(PathService::class)->canOpen($user, $lesson), 403, 'Bu ders henüz kilitli. Önceki dersi bitir ya da bir ünitenin başından başla.');
        $heartState = $hearts->sync($user);
        abort_if(! $heartState['unlimited'] && $heartState['hearts'] <= 0, 423, 'Canın kalmadı. Biraz bekle, can yenile ya da pratik yaparak kazan.');

        \Illuminate\Support\Facades\Cache::put("lesson:open:{$user->id}:{$lesson->id}", now()->timestamp, now()->addHours(6));
        $data = $lesson->load('story:id,slug,title')->only(['id', 'title', 'skill', 'kind', 'xp_reward', 'exercises', 'story', 'scenario_key']);
        // the review stop is personal: the learner's own due mistakes, then the unit's questions
        if ($lesson->kind === 'review') {
            $set = app(\App\Services\PathActivities::class)->reviewSet($user, $lesson);
            $data['exercises'] = $set['exercises'];
            $data['mistakes'] = count(array_filter($set['ids']));
        }

        return response()->json(['lesson' => $data, 'hearts' => $heartState]);
    }

    public function complete(Request $request, Lesson $lesson, LessonService $lessons): JsonResponse
    {
        $data = $request->validate([
            'answers' => ['present', 'array', 'max:60'],
            'seconds' => ['nullable', 'integer', 'min:0', 'max:7200'],
        ]);

        abort_unless(app(PathService::class)->canOpen($request->user(), $lesson), 403, 'Bu ders henüz kilitli.');
        // question lessons: opened first, and not finished faster than a person could read them
        $per = (float) config('dilgo.security.lesson_seconds_per_question', 1.5);
        if ($per > 0 && in_array($lesson->kind, ['lesson', 'checkpoint', 'review', 'quiz'], true)) {
            $key = "lesson:open:{$request->user()->id}:{$lesson->id}";
            $opened = \Illuminate\Support\Facades\Cache::get($key);
            abort_unless($opened, 422, 'Dersi açıp soruları cevaplayarak bitirmelisin.');
            $n = max(1, count($lesson->exercises ?? []));
            abort_if(now()->timestamp - $opened < (int) ceil($n * $per), 422, 'Ders çok hızlı bitti. Soruları okuyarak cevapla.');
            \Illuminate\Support\Facades\Cache::forget($key);
        }
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
