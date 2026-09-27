<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use App\Services\GamificationService;
use App\Support\Exams;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Sınav modu: YDS, YÖKDİL, YDT, IELTS and TOEFL practice. Questions are served
 * without their key; each answer is graded here, so the score can't be forged.
 */
class ExamController extends Controller
{
    public function __construct(private readonly GamificationService $game) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $target = $user->exam_target;
        $sections = collect(Exams::SECTIONS)->map(fn ($s, $k) => $s + ['key' => $k])->values();

        $bySection = ExamAttempt::query()->where('user_id', $user->id)
            ->when($target, fn ($q) => $q->where('exam', $target))
            ->select('section', DB::raw('COUNT(*) as answered'), DB::raw('SUM(CASE WHEN correct THEN 1 ELSE 0 END) as right_count'))
            ->groupBy('section')->get()->keyBy('section');

        $available = ExamQuestion::query()->where('is_active', true)->get(['id', 'exams', 'section']);
        $examSections = $target ? Exams::EXAMS[$target]['sections'] : array_keys(Exams::SECTIONS);
        $stats = collect($examSections)->map(function ($key) use ($bySection, $available, $target) {
            $row = $bySection->get($key);
            $answered = (int) ($row->answered ?? 0);

            return [
                'key' => $key,
                'label' => Exams::SECTIONS[$key]['label'],
                'hint' => Exams::SECTIONS[$key]['hint'],
                'answered' => $answered,
                'accuracy' => $answered ? (int) round($row->right_count * 100 / $answered) : null,
                'questions' => $available->filter(fn ($q) => $q->section === $key && (! $target || in_array($target, $q->exams, true)))->count(),
            ];
        })->filter(fn ($s) => $s['questions'] > 0)->values();

        $answered = $stats->sum('answered');
        $right = $bySection->sum('right_count');
        // Weakest practised section first, otherwise the first one never tried.
        $recommended = $stats->filter(fn ($s) => $s['answered'] >= 3)->sortBy('accuracy')->first()
            ?? $stats->firstWhere('answered', 0) ?? $stats->first();

        return response()->json([
            'target' => $target,
            'exam_date' => $user->exam_date?->toDateString(),
            'days_left' => $user->exam_date ? max(0, (int) now()->startOfDay()->diffInDays($user->exam_date, false)) : null,
            'exams' => collect(Exams::EXAMS)->map(fn ($e, $k) => ['key' => $k] + $e)->values(),
            'sections' => $sections,
            'stats' => $stats,
            'total' => [
                'answered' => $answered,
                'accuracy' => $answered ? (int) round($right * 100 / $answered) : null,
                'today' => ExamAttempt::query()->where('user_id', $user->id)->where('created_at', '>=', now()->startOfDay())->count(),
            ],
            'recommended' => $recommended['key'] ?? null,
        ]);
    }

    public function practice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'exam' => ['nullable', Rule::in(Exams::keys())],
            'section' => ['nullable', Rule::in([...array_keys(Exams::SECTIONS), 'mix'])],
            'n' => ['nullable', 'integer', 'min:3', 'max:20'],
        ]);
        $user = $request->user();
        $exam = $data['exam'] ?? $user->exam_target ?? 'yds';
        $section = $data['section'] ?? 'mix';
        $n = $data['n'] ?? 10;

        $seen = ExamAttempt::query()->where('user_id', $user->id)->select('exam_question_id', DB::raw('COUNT(*) as c'))->groupBy('exam_question_id')->pluck('c', 'exam_question_id');
        $pool = ExamQuestion::query()->where('is_active', true)
            ->when($section !== 'mix', fn ($q) => $q->where('section', $section))
            ->get()
            ->filter(fn ($q) => in_array($exam, $q->exams, true))
            // least-seen first, random inside each band, then keep passages together
            ->sortBy(fn ($q) => ($seen[$q->id] ?? 0) * 1000 + random_int(0, 999))
            ->take($n)
            ->sortBy(fn ($q) => [$q->passage ? crc32($q->passage) : 0, $q->position])
            ->values();

        return response()->json([
            'exam' => $exam,
            'section' => $section,
            'seconds_per_question' => in_array($exam, ['yds', 'yokdil'], true) ? 135 : 90,
            'questions' => $pool->map(fn (ExamQuestion $q) => [
                'id' => $q->id,
                'section' => $q->section,
                'section_label' => Exams::SECTIONS[$q->section]['label'] ?? $q->section,
                'cefr' => $q->cefr,
                'passage' => $q->passage,
                'prompt' => $q->prompt,
                'options' => $q->options,
            ]),
        ]);
    }

    public function answer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question_id' => ['required', 'integer', 'exists:exam_questions,id'],
            'choice' => ['nullable', 'integer', 'min:0', 'max:5'],
            'ms' => ['nullable', 'integer', 'min:0', 'max:3600000'],
            'exam' => ['nullable', Rule::in(Exams::keys())],
        ]);
        $user = $request->user();
        $q = ExamQuestion::query()->findOrFail($data['question_id']);
        $correct = isset($data['choice']) && (int) $data['choice'] === $q->answer;

        // One graded attempt per question per minute stops XP farming by resubmitting.
        $recent = ExamAttempt::query()->where('user_id', $user->id)->where('exam_question_id', $q->id)->where('created_at', '>=', now()->subMinute())->exists();
        $xp = 0;
        if (! $recent) {
            ExamAttempt::query()->create([
                'user_id' => $user->id,
                'exam_question_id' => $q->id,
                'exam' => $data['exam'] ?? $user->exam_target ?? $q->exams[0],
                'section' => $q->section,
                'correct' => $correct,
                'ms' => $data['ms'] ?? 0,
            ]);
            $skills = $q->section === 'translation' ? ['reading' => .5, 'writing' => .5] : ($q->section === 'dialogue' ? ['reading' => .5, 'speaking' => .5] : ['reading' => .8, 'writing' => .2]);
            $xp = $this->game->record($user, $correct ? 4 : 1, 'exam', $q->id, ['minutes' => 1], $skills)['xp_gained'] ?? 0;
        }

        return response()->json([
            'correct' => $correct,
            'answer' => $q->answer,
            'explanation' => $q->explanation,
            'xp' => $xp,
        ]);
    }
}
