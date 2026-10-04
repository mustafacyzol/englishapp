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
            'plan' => $this->plan($user, $stats),
            'mock' => $target ? $this->mockShape($target) : null,
        ]);
    }

    /**
     * The learner's exam plan: how many questions a day the time left asks for,
     * and which two sections to lean on (weakest accuracy first, untried next).
     */
    private function plan($user, $stats): array
    {
        $days = $user->exam_date ? max(0, (int) now()->startOfDay()->diffInDays($user->exam_date, false)) : null;
        $daily = match (true) {
            $days === null => 15,
            $days <= 14 => 40,
            $days <= 45 => 30,
            $days <= 90 => 20,
            default => 15,
        };
        $focus = $stats->sortBy(fn ($s) => $s['accuracy'] ?? -1)->take(2)->pluck('key')->values();
        $done = ExamAttempt::query()->where('user_id', $user->id)->where('created_at', '>=', now()->startOfDay())->count();

        return ['daily_goal' => $daily, 'done_today' => $done, 'focus' => $focus, 'mock_every' => $days !== null && $days <= 30 ? 'Her 3 günde bir deneme' : 'Haftada bir deneme'];
    }

    /** A mock sized for one sitting, in the real exam's mix of sections and pace. */
    private function mockShape(string $exam): array
    {
        $e = Exams::EXAMS[$exam];
        $size = min($e['questions'], $exam === 'lgs' ? 10 : 20);
        $minutes = (int) round($e['minutes'] * $size / $e['questions']);

        return ['questions' => $size, 'minutes' => $minutes, 'full_questions' => $e['questions'], 'full_minutes' => $e['minutes']];
    }

    /**
     * Deneme sınavı: a mock in the format of the learner's exam. Sections are
     * drawn in the proportions of the real exam (its blueprint), least-seen
     * questions first, with the real time per question.
     */
    public function mock(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate(['exam' => ['nullable', Rule::in(Exams::keys())]]);
        // the exam is the one chosen at onboarding; another exam's format is not on offer
        $exam = $user->exam_target ?? 'yds';
        $shape = $this->mockShape($exam);
        $blueprint = Exams::EXAMS[$exam]['blueprint'];
        $total = array_sum($blueprint);
        $seen = ExamAttempt::query()->where('user_id', $user->id)->select('exam_question_id', DB::raw('COUNT(*) as c'))->groupBy('exam_question_id')->pluck('c', 'exam_question_id');
        $bank = ExamQuestion::query()->where('is_active', true)->get()->filter(fn ($q) => in_array($exam, $q->exams, true));
        [$target, $missed] = $this->adaptive($user);

        $picked = collect();
        // about a quarter of the mock (at least one question) re-checks earlier mistakes; in a
        // short mock a section's own share would round down to zero, so the budget is shared
        $budget = max(1, intdiv($shape['questions'], 4));
        foreach ($blueprint as $section => $count) {
            $want = max(1, (int) round($count / $total * $shape['questions']));
            $pool = $bank->where('section', $section);
            $again = $pool->whereIn('id', $missed)->shuffle()->take(min($budget, max(1, (int) floor($want / 4)), $want));
            $budget -= $again->count();
            // the rest at the learner's working difficulty: near the target level first, harder only
            // once the easier ones are done (someone who misses the easy ones won't get the hard ones)
            $rest = $pool->whereNotIn('id', $again->pluck('id'))->sortBy(fn ($q) => abs(self::rank($q->cefr) - $target) * 100000 + (self::rank($q->cefr) > $target ? 50000 : 0) + ($seen[$q->id] ?? 0) * 1000 + random_int(0, 999))->take($want - $again->count());
            $picked = $picked->concat($again)->concat($rest);
        }
        // top up from any section if the bank is thin, then trim to size
        if ($picked->count() < $shape['questions']) {
            $picked = $picked->concat($bank->whereNotIn('id', $picked->pluck('id'))->shuffle()->take($shape['questions'] - $picked->count()));
        }
        $order = array_flip(array_keys($blueprint));
        $picked = $picked->take($shape['questions'])->sortBy(fn ($q) => [$order[$q->section] ?? 99, $q->passage ? crc32($q->passage) : 0, $q->position])->values();

        return response()->json([
            'exam' => $exam,
            'name' => Exams::EXAMS[$exam]['name'],
            'minutes' => max(5, (int) round($shape['minutes'] * $picked->count() / max(1, $shape['questions']))),
            'questions' => $picked->map(fn (ExamQuestion $q) => [
                'id' => $q->id, 'section' => $q->section, 'section_label' => Exams::SECTIONS[$q->section]['label'] ?? $q->section,
                'cefr' => $q->cefr, 'passage' => $q->passage, 'prompt' => $q->prompt, 'options' => $q->options,
            ]),
        ]);
    }

    private const RANKS = ['A1' => 0, 'A2' => 1, 'B1' => 2, 'B2' => 3, 'C1' => 4, 'C2' => 5];

    private static function rank(?string $cefr): int
    {
        return self::RANKS[$cefr ?? 'B1'] ?? 2;
    }

    /**
     * [target difficulty, ids answered wrong before]. The target is the easiest level
     * where the learner is still below 70% (from their last 200 answers), or their
     * own level when there isn't enough history yet.
     */
    private function adaptive($user): array
    {
        $rows = ExamAttempt::query()->where('exam_attempts.user_id', $user->id)->latest('exam_attempts.id')->limit(200)
            ->join('exam_questions', 'exam_questions.id', '=', 'exam_attempts.exam_question_id')
            ->get(['exam_attempts.exam_question_id as qid', 'exam_attempts.correct', 'exam_questions.cefr']);
        $target = self::rank($user->cefr_level ?? 'B1');
        $by = $rows->groupBy(fn ($r) => self::rank($r->cefr));
        foreach (range(0, 5) as $r) {
            $g = $by->get($r);
            if ($g && $g->count() >= 3 && $g->where('correct', true)->count() / $g->count() < 0.7) {
                $target = $r;
                break;
            }
        }
        $last = $rows->groupBy('qid')->map(fn ($g) => (bool) $g->first()->correct);

        return [$target, $last->filter(fn ($ok) => ! $ok)->keys()->all()];
    }

    public function practice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'exam' => ['nullable', Rule::in(Exams::keys())],
            'section' => ['nullable', Rule::in([...array_keys(Exams::SECTIONS), 'mix'])],
            'n' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);
        $user = $request->user();
        $exam = $user->exam_target ?? 'yds';
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
            'seconds_per_question' => match ($exam) { 'yds', 'yokdil' => 135, 'lgs' => 75, default => 90 },
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
            $xp = $this->game->record($user, (int) config($correct ? 'dilgo.economy.xp.exam_correct' : 'dilgo.economy.xp.exam_attempt'), 'exam', $q->id, ['minutes' => 1], $skills)['xp_gained'] ?? 0;
        }

        return response()->json([
            'correct' => $correct,
            'answer' => $q->answer,
            'explanation' => $q->explanation,
            'xp' => $xp,
        ]);
    }
}
