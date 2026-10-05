<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\GradeUnit;
use App\Services\GradeUnitService;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Editing the school-grade units: titles, words, sentences, guidebook note,
 * order and where each sits on the CEFR path. Every change rebuilds that
 * grade's lessons, so what the editor sees is what pupils get.
 */
class GradeUnitController extends Controller
{
    public function __construct(private GradeUnitService $grades) {}

    public function index(Request $request): JsonResponse
    {
        $track = $request->validate(['track' => ['nullable', Rule::in(array_keys(GradeUnitService::TRACKS))]])['track'] ?? 'g5';
        $units = GradeUnit::query()->where('track', $track)->orderBy('position')->orderBy('id')->get();
        $courses = Course::query()->with('units:id,course_id,title,position')->orderBy('position')->get();
        $published = $units->where('is_published', true)->values();

        return response()->json([
            'track' => $track,
            'tracks' => collect(GradeUnitService::TRACKS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'count' => GradeUnit::query()->where('track', $key)->count()])->values(),
            'units' => $units,
            // where each unit lands in every course, for the "on the path" preview
            'courses' => $courses->map(fn (Course $c) => [
                'level' => $c->cefr_level,
                'units' => $c->units->sortBy('position')->values()->map(fn ($u) => $u->title),
                'slots' => $this->grades->slots($published, $c->units->count()),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, true);
        $data['position'] = (int) GradeUnit::query()->where('track', $data['track'])->max('position') + 1;
        $unit = GradeUnit::query()->create($data);
        $this->grades->sync($unit->track);
        Audit::log('admin.grade_units.created', $request->user(), $unit);

        return response()->json(['unit' => $unit], 201);
    }

    public function update(Request $request, GradeUnit $gradeUnit): JsonResponse
    {
        $old = $gradeUnit->track;
        $gradeUnit->update($this->validated($request, false));
        $this->grades->sync($old);
        if ($gradeUnit->track !== $old) {
            $this->grades->sync($gradeUnit->track);
        }
        Audit::log('admin.grade_units.updated', $request->user(), $gradeUnit);

        return response()->json(['unit' => $gradeUnit]);
    }

    public function destroy(Request $request, GradeUnit $gradeUnit): JsonResponse
    {
        $track = $gradeUnit->track;
        $gradeUnit->delete();
        $this->grades->sync($track);
        Audit::log('admin.grade_units.deleted', $request->user(), null, ['id' => $gradeUnit->id, 'track' => $track]);

        return response()->json(['ok' => true]);
    }

    /** New order for one grade: the ids, first to last. */
    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'track' => ['required', Rule::in(array_keys(GradeUnitService::TRACKS))],
            'ids' => ['required', 'array', 'max:40'],
            'ids.*' => ['integer'],
        ]);
        foreach (array_values($data['ids']) as $i => $id) {
            GradeUnit::query()->where('track', $data['track'])->whereKey($id)->update(['position' => $i]);
        }
        $this->grades->sync($data['track']);
        Audit::log('admin.grade_units.reordered', $request->user(), null, ['track' => $data['track']]);

        return response()->json(['ok' => true]);
    }

    /** Copy a unit into another grade, as the starting point for that grade's version. */
    public function copy(Request $request, GradeUnit $gradeUnit): JsonResponse
    {
        $track = $request->validate(['track' => ['required', Rule::in(array_keys(GradeUnitService::TRACKS))]])['track'];
        $copy = $gradeUnit->replicate()->fill([
            'track' => $track, 'slot' => null,
            'position' => (int) GradeUnit::query()->where('track', $track)->max('position') + 1,
        ]);
        $copy->save();
        $this->grades->sync($track);
        Audit::log('admin.grade_units.copied', $request->user(), $copy, ['from' => $gradeUnit->id]);

        return response()->json(['unit' => $copy], 201);
    }

    private function validated(Request $request, bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';

        return $request->validate([
            'track' => [$req, Rule::in(array_keys(GradeUnitService::TRACKS))],
            'title' => [$req, 'string', 'max:120'],
            'title_tr' => ['nullable', 'string', 'max:120'],
            'words' => [$req, 'array', 'min:4', 'max:20'],
            'words.*' => ['array', 'size:2'],
            'words.*.0' => ['required', 'string', 'max:60'],
            'words.*.1' => ['required', 'string', 'max:80'],
            'sentences' => ['nullable', 'array', 'max:6'],
            'sentences.*' => ['array', 'size:2'],
            'sentences.*.0' => ['required', 'string', 'max:200'],
            'sentences.*.1' => ['required', 'string', 'max:200'],
            'note' => ['nullable', 'string', 'max:4000'],
            'slot' => ['nullable', 'integer', 'min:1', 'max:20'],
            'is_published' => ['sometimes', 'boolean'],
        ]);
    }
}
