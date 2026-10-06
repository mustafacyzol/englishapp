<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Presenters\UserPresenter;
use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Services\InstitutionService;
use App\Services\SchoolService;
use App\Models\Assignment;
use App\Models\SchoolClass;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The institution panel (/kurum) for school and company managers, plus the
 * learner-side join flows (invite link or join code).
 */
class InstitutionController extends Controller
{
    public function __construct(private readonly InstitutionService $service, private readonly SchoolService $school) {}

    /** Public: what an invite link points to, so the landing screen can greet the learner. */
    public function invitation(string $token): JsonResponse
    {
        $m = InstitutionMember::query()->where('invite_token', $token)->where('status', 'invited')->with('institution')->first();
        abort_unless($m && $m->institution?->isCurrent(), 404, 'Davet bulunamadı ya da süresi doldu.');

        return response()->json(['institution' => $m->institution->only(['name', 'type', 'city']), 'email' => $m->email, 'name' => $m->name, 'role' => $m->role]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $m = $this->service->acceptToken($request->user(), $token);
        abort_unless($m, 404, 'Davet bulunamadı ya da süresi doldu.');

        return response()->json(['ok' => true, 'user' => UserPresenter::me($request->user()->fresh())]);
    }

    public function join(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:12']]);
        $this->service->joinByCode($request->user(), $data['code']);

        return response()->json(['ok' => true, 'user' => UserPresenter::me($request->user()->fresh())]);
    }

    public function show(Request $request): JsonResponse
    {
        $staff = $this->school->staff($request->user());

        return response()->json($this->service->report($staff->institution, $this->school->scope($staff)) + [
            'role' => $staff->role,
            'school_classes' => $this->school->classes($staff),
            'teachers' => $this->school->teachers($staff),
        ]);
    }

    /** Managers can brand their panel (logo, colour) and keep contact details current. */
    public function update(Request $request): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        abort_unless($staff->role === 'manager', 403, 'Okul ayarlarını yönetici düzenler.');
        $inst = $staff->institution;
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:3', 'max:160'],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'logo_url' => ['sometimes', 'nullable', 'url:https', 'max:500'],
            'brand_color' => ['sometimes', 'nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'contact_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'contact_phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'complete_setup' => ['sometimes', 'boolean'],
        ]);
        if (! empty($data['complete_setup'])) {
            $data['setup_completed_at'] = $inst->setup_completed_at ?? now();
        }
        unset($data['complete_setup']);
        foreach (['name', 'city', 'contact_name'] as $k) {
            if (isset($data[$k])) {
                $data[$k] = strip_tags($data[$k]);
            }
        }
        $inst->update($data);
        Audit::log('institution.updated', $request->user(), $inst, ['keys' => array_keys($data)]);

        return response()->json($this->service->report($inst->fresh()) + ['role' => 'manager', 'school_classes' => $this->school->classes($staff), 'teachers' => $this->school->teachers($staff)]);
    }

    /**
     * Logo upload from the device: PNG, JPG or WebP up to 1 MB and 64-2000 px. SVG is
     * refused on purpose (it can carry scripts). The file gets a random name on the
     * public disk and the previous uploaded logo is deleted.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        abort_unless($staff->role === 'manager', 403, 'Okul logosunu yönetici değiştirir.');
        $request->validate(['logo' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp', 'max:1024', 'dimensions:min_width=64,min_height=64,max_width=2000,max_height=2000']], [
            'logo.mimes' => 'Logo PNG, JPG ya da WebP olmalı.',
            'logo.max' => 'Logo en fazla 1 MB olabilir.',
            'logo.dimensions' => 'Logo 64 ile 2000 piksel arasında olmalı.',
        ]);
        $inst = $staff->institution;
        $this->deleteStoredLogo($inst->logo_url);
        $path = $request->file('logo')->store('logos', 'public');
        $inst->update(['logo_url' => \Illuminate\Support\Facades\Storage::disk('public')->url($path)]);
        Audit::log('institution.logo', $request->user(), $inst);

        return response()->json(['logo_url' => $inst->logo_url]);
    }

    public function deleteLogo(Request $request): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        abort_unless($staff->role === 'manager', 403);
        $this->deleteStoredLogo($staff->institution->logo_url);
        $staff->institution->update(['logo_url' => null]);

        return response()->json(['logo_url' => null]);
    }

    private function deleteStoredLogo(?string $url): void
    {
        if ($url && preg_match('#/storage/(logos/[A-Za-z0-9._-]+)$#', $url, $m)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($m[1]);
        }
    }

    /** Principals invite teachers and students; teachers invite students into their own classes. */
    public function invite(Request $request): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        $data = $request->validate([
            'role' => ['sometimes', 'in:student,teacher'],
            'rows' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*.email' => ['required', 'string', 'max:190'],
            'rows.*.name' => ['nullable', 'string', 'max:80'],
            'rows.*.class_name' => ['nullable', 'string', 'max:60'],
        ]);
        $role = $data['role'] ?? 'student';
        abort_if($role === 'teacher' && $staff->role !== 'manager', 403, 'Öğretmenleri yalnızca okul yöneticisi davet edebilir.');
        if ($staff->role === 'teacher') {
            foreach ($data['rows'] as $row) {
                abort_unless($this->school->canSeeClass($staff, $row['class_name'] ?? null), 422, 'Öğrencileri yalnızca kendi sınıflarına davet edebilirsin.');
            }
        }

        return response()->json($this->service->invite($staff->institution, $data['rows'], $role, $request->user()));
    }

    public function removeMember(Request $request, InstitutionMember $member): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        abort_unless($member->institution_id === $staff->institution_id && $member->role !== 'manager', 404);
        abort_if($member->role === 'teacher' && $staff->role !== 'manager', 403);
        abort_if($member->role === 'student' && ! $this->school->canSeeClass($staff, $member->class_name), 403);
        $this->service->remove($member);

        return response()->json(['ok' => true]);
    }

    /** Move a student to another class (teachers only between their own classes). */
    public function moveMember(Request $request, InstitutionMember $member): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        $data = $request->validate(['class_name' => ['nullable', 'string', 'max:60']]);
        abort_unless($member->institution_id === $staff->institution_id && $member->role === 'student', 404);
        abort_unless($this->school->canSeeClass($staff, $member->class_name) && $this->school->canSeeClass($staff, $data['class_name']), 403);
        $member->update(['class_name' => $data['class_name']]);

        return response()->json(['ok' => true]);
    }

    /* ---------------------------------------------------------- classes */

    public function saveClass(Request $request, ?SchoolClass $class = null): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        abort_unless($staff->role === 'manager', 403, 'Sınıfları okul yöneticisi düzenler.');
        abort_if($class && $class->institution_id !== $staff->institution_id, 404);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60', \Illuminate\Validation\Rule::unique('school_classes')->where('institution_id', $staff->institution_id)->ignore($class?->id)],
            'grade' => ['nullable', 'integer', 'between:1,12'],
            'teacher_member_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists('institution_members', 'id')->where('institution_id', $staff->institution_id)->where('role', 'teacher')],
        ]);
        $data['name'] = strip_tags($data['name']);
        if ($class) {
            // renaming a class moves its students and homework along with it
            if ($class->name !== $data['name']) {
                InstitutionMember::query()->where('institution_id', $staff->institution_id)->where('class_name', $class->name)->update(['class_name' => $data['name']]);
                Assignment::query()->where('institution_id', $staff->institution_id)->where('class_name', $class->name)->update(['class_name' => $data['name']]);
            }
            $class->update($data);
        } else {
            $class = SchoolClass::query()->create($data + ['institution_id' => $staff->institution_id]);
        }
        Audit::log('school.class_saved', $request->user(), $staff->institution, ['class' => $class->name]);

        return response()->json(['classes' => $this->school->classes($staff)]);
    }

    public function deleteClass(Request $request, SchoolClass $class): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        abort_unless($staff->role === 'manager' && $class->institution_id === $staff->institution_id, 403);
        InstitutionMember::query()->where('institution_id', $staff->institution_id)->where('class_name', $class->name)->update(['class_name' => null]);
        $class->delete();

        return response()->json(['classes' => $this->school->classes($staff)]);
    }

    /* ------------------------------------------------------ assignments */

    public function assignments(Request $request): JsonResponse
    {
        $staff = $this->school->staff($request->user());

        return response()->json(['data' => $this->school->assignments($staff)]);
    }

    public function createAssignment(Request $request): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        $data = $request->validate([
            'class_name' => ['nullable', 'string', 'max:60'],
            'kind' => ['required', \Illuminate\Validation\Rule::in(Assignment::KINDS)],
            'target' => ['nullable', 'string', 'max:120'],
            'title' => ['nullable', 'string', 'max:160'],
            'note' => ['nullable', 'string', 'max:1000'],
            'due_at' => ['nullable', 'date', 'after:now', 'before:+1 year'],
        ]);
        // a teacher always targets one of their own classes
        abort_unless($staff->role === 'manager' || ($data['class_name'] ?? null) !== null, 422, 'Bir sınıf seç.');
        abort_unless($this->school->canSeeClass($staff, $data['class_name'] ?? null), 403);
        if ($data['kind'] === 'unit') {
            abort_unless(\App\Models\GradeUnit::query()->whereKey((int) ($data['target'] ?? 0))->where('is_published', true)->exists(), 422, 'Ünite bulunamadı.');
        }
        if ($data['kind'] === 'exam' && ($data['target'] ?? null)) {
            abort_unless(in_array($data['target'], ['mix', ...array_keys(\App\Support\Exams::SECTIONS)], true), 422, 'Geçersiz sınav bölümü.');
        }
        if ($data['kind'] === 'lesson') {
            abort_unless(\App\Models\Lesson::query()->whereKey((int) ($data['target'] ?? 0))->exists(), 422, 'Ders bulunamadı.');
        }
        if ($data['kind'] === 'words') {
            // only ready-made sets, public ones or the teacher's own can be assigned
            $set = \App\Models\WordSet::query()->find((int) ($data['target'] ?? 0));
            abort_unless($set && $set->isVisibleTo($request->user()), 422, 'Kelime seti bulunamadı.');
        }
        if ($data['kind'] === 'story') {
            abort_unless(\App\Models\Story::query()->where('slug', $data['target'] ?? '')->exists(), 422, 'Hikâye bulunamadı.');
        }
        $a = Assignment::query()->create([
            'institution_id' => $staff->institution_id,
            'class_name' => $data['class_name'] ?? null,
            'created_by' => $request->user()->id,
            'kind' => $data['kind'],
            'target' => $data['target'] ?? null,
            'title' => strip_tags($data['title'] ?? '') ?: $this->school->defaultTitle($data['kind'], $data['target'] ?? null),
            'note' => isset($data['note']) ? strip_tags($data['note']) : null,
            'due_at' => $data['due_at'] ?? null,
        ]);
        Audit::log('school.assignment_created', $request->user(), $staff->institution, ['assignment' => $a->id]);
        // every student of the class (or the whole school) hears about it in their notifications
        $students = \App\Models\InstitutionMember::query()->where('institution_id', $staff->institution_id)->where('role', 'student')->where('status', 'active')
            ->when($a->class_name, fn ($q) => $q->where('class_name', $a->class_name))->with('user')->get()->pluck('user')->filter();
        \Illuminate\Support\Facades\Notification::send($students, new \App\Notifications\AssignmentGiven($a, $request->user()->name, $this->school->link($a)));

        return response()->json(['data' => $this->school->assignments($staff)], 201);
    }

    public function deleteAssignment(Request $request, Assignment $assignment): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        abort_unless($assignment->institution_id === $staff->institution_id && ($staff->role === 'manager' || $assignment->created_by === $request->user()->id), 403);
        $assignment->delete();

        return response()->json(['data' => $this->school->assignments($staff)]);
    }

    /** What a teacher can assign: lessons and stories of the platform. */
    /**
     * What a teacher can assign, grouped like the student's own panel: the
     * coursebook units of each grade (and exam track), the CEFR path lessons,
     * stories, word sets and the practice areas.
     */
    public function catalog(Request $request): JsonResponse
    {
        $this->school->staff($request->user());
        $tracks = \App\Services\GradeUnitService::TRACKS;
        $units = \App\Models\GradeUnit::query()->where('is_published', true)->orderBy('position')->orderBy('id')->get(['id', 'track', 'title', 'title_tr', 'cefr_level']);

        return response()->json([
            'units' => collect($tracks)->map(fn ($label, $track) => [
                'track' => $track, 'label' => $label,
                'units' => $units->where('track', $track)->values()->map(fn ($u, $i) => ['id' => $u->id, 'n' => $i + 1, 'title' => $u->title, 'title_tr' => $u->title_tr, 'level' => $u->cefr_level]),
            ])->filter(fn ($t) => $t['units']->isNotEmpty())->values(),
            // the general path, without the generated coursebook copies
            'lessons' => \App\Models\Lesson::query()->whereNull('meta->grade_unit')->with('unit:id,course_id,title,position', 'unit.course:id,cefr_level')
                ->orderBy('unit_id')->orderBy('position')->limit(800)->get(['id', 'title', 'unit_id', 'kind'])
                ->map(fn ($l) => ['id' => $l->id, 'title' => $l->title, 'kind' => $l->kind, 'unit' => $l->unit?->title, 'level' => $l->unit?->course?->cefr_level]),
            'stories' => \App\Models\Story::query()->where('is_published', true)->orderBy('cefr_level')->get(['slug', 'title', 'cefr_level']),
            'word_sets' => \App\Models\WordSet::query()->visibleTo($request->user())->orderByRaw('CASE WHEN user_id IS NULL THEN 0 ELSE 1 END')->orderBy('level')->limit(300)->get(['id', 'title', 'level', 'exam', 'words_count']),
            'exam_sections' => [['key' => 'mix', 'label' => 'Karışık'], ...collect(\App\Support\Exams::SECTIONS)->map(fn ($v, $k) => ['key' => $k, 'label' => $v['label']])->values()],
        ]);
    }

    /* ---------------------------------------------------------- students */

    /** The student's school league: their class or the whole school, this week or this month. */
    public function myLeaderboard(Request $request): JsonResponse
    {
        $m = InstitutionMember::query()->where('user_id', $request->user()->id)->where('role', 'student')->where('status', 'active')->with('institution:id,name,logo_url')->first();
        abort_unless($m, 404, 'Bir okula bağlı değilsin.');
        $scope = $request->query('scope') === 'school' ? 'school' : 'class';
        $period = $request->query('period') === 'month' ? 'month' : 'week';

        return response()->json([
            'institution' => $m->institution?->only(['name', 'logo_url']),
            'class_name' => $m->class_name,
            'scope' => $scope,
            'period' => $period,
            'data' => $this->school->leaderboard($m->institution_id, $scope === 'class' ? $m->class_name : null, $period, $request->user()->id),
        ]);
    }

    /** Staff view of the same league; a teacher only for their own classes. */
    public function leaderboard(Request $request): JsonResponse
    {
        $staff = $this->school->staff($request->user());
        $class = $request->query('class') ?: null;
        abort_unless($staff->role === 'manager' || $class !== null, 422, 'Bir sınıf seç.');
        abort_unless($this->school->canSeeClass($staff, $class), 403);
        $period = $request->query('period') === 'month' ? 'month' : 'week';

        return response()->json(['class_name' => $class, 'period' => $period, 'data' => $this->school->leaderboard($staff->institution_id, $class, $period)]);
    }

    public function myAssignments(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->school->forStudent($request->user())]);
    }

    public function markDone(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();
        $ok = $this->school->forStudent($user)->firstWhere('id', $assignment->id);
        abort_unless($ok, 404);
        // lessons, units, stories and sets check themselves: no ticking them off by hand
        abort_if(in_array($assignment->kind, ['unit', 'lesson', 'story', 'words'], true), 422, 'Bu ödev, yaptığında kendiliğinden işaretlenir.');
        \App\Models\AssignmentCompletion::query()->firstOrCreate(['assignment_id' => $assignment->id, 'user_id' => $user->id], ['completed_at' => now()]);

        return response()->json(['data' => $this->school->forStudent($user)]);
    }
}
