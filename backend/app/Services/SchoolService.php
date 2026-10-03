<?php

namespace App\Services;

use App\Support\Period;

use App\Models\Assignment;
use App\Models\AssignmentCompletion;
use App\Models\InstitutionMember;
use App\Models\Lesson;
use App\Models\SchoolClass;
use App\Models\Story;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The school side of an institution: a principal (manager) sees the whole school
 * and manages teachers and classes; a teacher sees only the classes assigned to
 * them, invites students into those classes and sets homework; a student sees
 * the homework of their class in the app.
 */
class SchoolService
{
    /** The signed-in user's staff membership (manager or teacher), or a 403. */
    public function staff(User $user): InstitutionMember
    {
        $m = InstitutionMember::query()->where('user_id', $user->id)->whereIn('role', ['manager', 'teacher'])->where('status', 'active')
            ->orderByRaw("CASE role WHEN 'manager' THEN 0 ELSE 1 END")->with('institution')->first();
        abort_unless($m?->institution, 403, 'Bu sayfa okul yöneticileri ve öğretmenlere özel.');

        return $m;
    }

    /** Class names this staff member may see: every class for a manager, their own for a teacher. */
    public function scope(InstitutionMember $staff): ?array
    {
        if ($staff->role === 'manager') {
            return null; // everything
        }

        return SchoolClass::query()->where('institution_id', $staff->institution_id)->where('teacher_member_id', $staff->id)->pluck('name')->all();
    }

    public function canSeeClass(InstitutionMember $staff, ?string $class): bool
    {
        $scope = $this->scope($staff);

        return $scope === null || ($class !== null && in_array($class, $scope, true));
    }

    public function classes(InstitutionMember $staff): Collection
    {
        $scope = $this->scope($staff);
        $counts = InstitutionMember::query()->where('institution_id', $staff->institution_id)->where('role', 'student')->where('status', '!=', 'removed')
            ->selectRaw('class_name, COUNT(*) c')->groupBy('class_name')->pluck('c', 'class_name');

        return SchoolClass::query()->where('institution_id', $staff->institution_id)->with('teacher:id,name,email')
            ->when($scope !== null, fn ($q) => $q->whereIn('name', $scope))->orderBy('grade')->orderBy('name')->get()
            ->map(fn (SchoolClass $c) => ['id' => $c->id, 'name' => $c->name, 'grade' => $c->grade, 'students' => (int) ($counts[$c->name] ?? 0),
                'teacher' => $c->teacher ? ['id' => $c->teacher->id, 'name' => $c->teacher->name ?? $c->teacher->email] : null]);
    }

    public function teachers(InstitutionMember $staff): Collection
    {
        if ($staff->role !== 'manager') {
            return collect();
        }
        $classes = SchoolClass::query()->where('institution_id', $staff->institution_id)->get()->groupBy('teacher_member_id');

        return InstitutionMember::query()->where('institution_id', $staff->institution_id)->where('role', 'teacher')->where('status', '!=', 'removed')->with('user')->orderBy('name')->get()
            ->map(fn (InstitutionMember $m) => ['id' => $m->id, 'name' => $m->name ?? $m->user?->name, 'email' => $m->email, 'status' => $m->status,
                'classes' => ($classes[$m->id] ?? collect())->pluck('name')->values(), 'last_active_at' => $m->user?->last_active_at?->toIso8601String()]);
    }

    /** Student user ids in scope for a class (or all classes in scope). */
    private function studentIds(InstitutionMember $staff, ?string $class): Collection
    {
        $scope = $this->scope($staff);

        return InstitutionMember::query()->where('institution_id', $staff->institution_id)->where('role', 'student')->where('status', 'active')->whereNotNull('user_id')
            ->when($class !== null, fn ($q) => $q->where('class_name', $class))
            ->when($class === null && $scope !== null, fn ($q) => $q->whereIn('class_name', $scope))
            ->pluck('user_id');
    }

    /** Which of these users finished the assignment (lessons and stories count themselves). */
    public function doneBy(Assignment $a, Collection $userIds): Collection
    {
        $manual = AssignmentCompletion::query()->where('assignment_id', $a->id)->whereIn('user_id', $userIds)->pluck('user_id');
        $auto = match ($a->kind) {
            'lesson' => DB::table('lesson_progress')->where('lesson_id', (int) $a->target)->whereIn('user_id', $userIds)->where('completed_at', '>=', $a->created_at)->pluck('user_id'),
            'words' => DB::table('word_set_plays')->where('word_set_id', (int) $a->target)->whereIn('user_id', $userIds)->where('created_at', '>=', $a->created_at)->distinct()->pluck('user_id'),
            'story' => DB::table('story_reads')->where('story_id', Story::query()->where('slug', $a->target)->value('id'))->whereIn('user_id', $userIds)->where('completed_at', '>=', $a->created_at)->pluck('user_id'),
            default => collect(),
        };

        return $manual->merge($auto)->unique()->values();
    }

    public function assignments(InstitutionMember $staff): Collection
    {
        $scope = $this->scope($staff);

        return Assignment::query()->where('institution_id', $staff->institution_id)
            ->when($scope !== null, fn ($q) => $q->where(fn ($w) => $w->whereIn('class_name', $scope)->orWhere('created_by', $staff->user_id)))
            ->with('author:id,name')->latest('id')->limit(100)->get()
            ->map(function (Assignment $a) use ($staff) {
                $ids = $this->studentIds($staff, $a->class_name);
                $done = $this->doneBy($a, $ids);

                return $this->present($a) + ['students' => $ids->count(), 'done' => $done->count(), 'done_ids' => $done->all(), 'author' => $a->author?->name];
            });
    }

    public function present(Assignment $a): array
    {
        return ['id' => $a->id, 'title' => $a->title, 'kind' => $a->kind, 'target' => $a->target, 'note' => $a->note, 'class_name' => $a->class_name,
            'due_at' => $a->due_at?->toIso8601String(), 'created_at' => $a->created_at?->toIso8601String(), 'link' => $this->link($a)];
    }

    /** Where the student goes to do it. */
    public function link(Assignment $a): string
    {
        return match ($a->kind) {
            'lesson' => "/lesson/{$a->target}",
            'story' => "/stories/{$a->target}",
            'words' => "/practice/sets/{$a->target}",
            'exam' => '/exam',
            'ai' => '/ai',
            'practice' => '/practice',
            default => '/learn',
        };
    }

    /** A title that names the real lesson or story when the teacher left it empty. */
    public function defaultTitle(string $kind, ?string $target): string
    {
        return match ($kind) {
            'lesson' => 'Ders: '.(Lesson::query()->find((int) $target)?->title ?? 'Yol haritasından bir ders'),
            'story' => 'Hikâye: '.(Story::query()->where('slug', $target)->value('title') ?? 'Bir hikâye'),
            'words' => 'Kelime seti: '.(\App\Models\WordSet::query()->find((int) $target)?->title ?? 'Kelime seti'),
            'exam' => 'Sınav modunda 10 soru',
            'ai' => 'Defne ile 5 dakikalık konuşma',
            'practice' => '20 kelime tekrarı',
            default => 'Ödev',
        };
    }

    /** The homework of a student's class, newest first, with their own status. */
    public function forStudent(User $user): Collection
    {
        $m = InstitutionMember::query()->where('user_id', $user->id)->where('role', 'student')->where('status', 'active')->first();
        if (! $m) {
            return collect();
        }

        return Assignment::query()->where('institution_id', $m->institution_id)
            ->where(fn ($q) => $q->whereNull('class_name')->orWhere('class_name', $m->class_name))
            ->where(fn ($q) => $q->whereNull('due_at')->orWhere('due_at', '>=', now()->subDays(7)))
            ->latest('id')->limit(30)->get()
            ->map(fn (Assignment $a) => $this->present($a) + ['done' => $this->doneBy($a, collect([$user->id]))->isNotEmpty()]);
    }

    /**
     * The school's own league: students ranked by XP earned this week (or this
     * month), for one class or the whole school. Students see it on the Leagues
     * page; principals and teachers (only their classes) in the school panel.
     *
     * @return list<array>
     */
    public function leaderboard(int $institutionId, ?string $class, string $period = 'week', ?int $meId = null): array
    {
        $from = $period === 'month' ? Period::now()->startOfMonth() : Period::now()->startOfWeek();
        $members = InstitutionMember::query()->where('institution_id', $institutionId)->where('role', 'student')->where('status', 'active')
            ->when($class, fn ($q) => $q->where('class_name', $class))->whereNotNull('user_id')
            ->with('user')->get();
        $xp = \App\Models\DailyActivity::query()->whereIn('user_id', $members->pluck('user_id'))->where('date', '>=', $from->toDateString())
            ->groupBy('user_id')->selectRaw('user_id, sum(xp) as xp, sum(lessons) as lessons')->get()->keyBy('user_id');

        return $members->filter(fn ($m) => $m->user)->map(fn ($m) => [
            'user_id' => $m->user_id,
            'name' => $m->user->name,
            'username' => $m->user->username,
            ...$m->user->look(),
            'class_name' => $m->class_name,
            'streak' => (int) $m->user->streak_current,
            'xp' => (int) ($xp[$m->user_id]->xp ?? 0),
            'lessons' => (int) ($xp[$m->user_id]->lessons ?? 0),
            'me' => $m->user_id === $meId,
        ])->sortByDesc('xp')->values()->map(fn ($r, $i) => $r + ['rank' => $i + 1])->all();
    }
}
