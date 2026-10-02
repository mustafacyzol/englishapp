<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * The rules of the learning path, in one place:
 *
 *  - Levels go in order. A course above your level stays locked until the course
 *    of your level is finished (then your level moves up by itself) or the
 *    placement test puts you there. Courses below your level are open for review.
 *  - Inside your level, lessons in a unit go one after another: you cannot land
 *    in the middle of a topic. You may, however, jump to the start of any unit.
 *  - The placement test can open units up front (`path_unlocks`): every lesson in
 *    an opened unit is available, the ones before it are shown as passed over.
 *
 * Lesson states: completed, current (where to continue), open, locked.
 */
class PathService
{
    public const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    public function courses(): Collection
    {
        return Course::query()->where('is_published', true)->orderBy('position')->get();
    }

    /** -1 below the learner's level, 0 their level, 1 above. */
    public function relation(User $user, Course $course): int
    {
        $mine = array_search($user->cefr_level ?? 'A1', self::LEVELS, true);
        $theirs = array_search($course->cefr_level, self::LEVELS, true);

        return $theirs <=> $mine;
    }

    /** States for every lesson of a course, keyed by lesson id. */
    public function states(User $user, Course $course): array
    {
        $course->loadMissing('units.lessons');
        $ids = $course->units->flatMap->lessons->pluck('id');
        $done = LessonProgress::query()->where('user_id', $user->id)->whereIn('lesson_id', $ids)->whereNotNull('completed_at')->pluck('lesson_id')->flip();
        $rel = $this->relation($user, $course);
        $opened = (int) (($user->path_unlocks ?? [])[(string) $course->id] ?? -1);

        $states = [];
        foreach ($course->units->values() as $u => $unit) {
            $prevDone = true;
            foreach ($unit->lessons->values() as $k => $lesson) {
                $isDone = $done->has($lesson->id);
                $states[$lesson->id] = match (true) {
                    $isDone => 'completed',
                    $rel > 0 => 'locked',
                    $rel < 0, $u <= $opened => 'open',
                    $k === 0, $prevDone => 'open',
                    default => 'locked',
                };
                $prevDone = $isDone;
            }
        }
        // where to continue: the first open lesson in path order
        foreach ($states as $id => $s) {
            if ($s === 'open') {
                $states[$id] = 'current';
                break;
            }
        }

        return $states;
    }

    public function canOpen(User $user, Lesson $lesson): bool
    {
        $course = $lesson->unit?->course;
        if (! $course) {
            return true;
        }

        return in_array($this->states($user, $course)[$lesson->id] ?? 'locked', ['completed', 'current', 'open'], true);
    }

    /** Finished every lesson of your level? Move up one level (once). */
    public function maybeLevelUp(User $user): ?string
    {
        $course = $this->courses()->firstWhere('cefr_level', $user->cefr_level);
        if (! $course) {
            return null;
        }
        $states = $this->states($user, $course);
        if (! $states || in_array('locked', $states, true) || in_array('open', $states, true) || in_array('current', $states, true)) {
            return null;
        }
        $next = $this->courses()->first(fn ($c) => array_search($c->cefr_level, self::LEVELS, true) > array_search($user->cefr_level, self::LEVELS, true));
        if (! $next) {
            return null;
        }
        $user->forceFill(['cefr_level' => $next->cefr_level])->save();

        return $next->cefr_level;
    }

    /**
     * After the placement test: how far into the level's course to open, from how
     * the learner did on that level's band. Under 40% starts at the beginning;
     * above it, a share of the units opens (never the last one, it must be earned).
     */
    public function applyPlacement(User $user, string $level, array $bands): void
    {
        $course = $this->courses()->firstWhere('cefr_level', $level);
        if (! $course) {
            return;
        }
        $band = $bands[$level] ?? ['correct' => 0, 'total' => 1];
        $ratio = ($band['correct'] ?? 0) / max(1, $band['total'] ?? 1);
        $units = $course->units()->count();
        $open = $ratio < 0.4 ? -1 : min($units - 2, (int) floor($ratio * $units) - 1);
        $unlocks = $user->path_unlocks ?? [];
        $unlocks[(string) $course->id] = max($open, -1);
        $user->forceFill(['path_unlocks' => $unlocks])->save();
    }
}
