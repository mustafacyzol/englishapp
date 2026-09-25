<?php

namespace App\Services;

use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\User;
use App\Support\TextMatch;

class LessonService
{
    public function __construct(
        private readonly GamificationService $game,
        private readonly HeartService $hearts,
    ) {}

    /**
     * Re-grades submitted answers server-side (the client gives instant feedback,
     * the server is the source of truth for XP).
     *
     * @param  list<mixed>  $answers  one entry per exercise
     */
    public function grade(Lesson $lesson, array $answers): array
    {
        $results = [];
        foreach (array_values($lesson->exercises ?? []) as $i => $ex) {
            $given = $answers[$i] ?? null;
            $results[] = match ($ex['type'] ?? '') {
                'choice', 'fill', 'listen_choice' => (string) $given === (string) ($ex['answer'] ?? ''),
                'translate', 'listen_type', 'order' => is_string($given) && TextMatch::equals($given, array_merge([(string) ($ex['answer'] ?? '')], $ex['alternatives'] ?? [])),
                'speak' => is_string($given) && TextMatch::similarity($given, (string) ($ex['text'] ?? '')) >= 0.6,
                'match' => $given === true,
                default => true,
            };
        }
        if (! $results) {
            // story / AI-talk lessons are validated by their own endpoints
            return ['results' => [], 'correct' => 0, 'total' => 0, 'mistakes' => 0, 'score' => 100];
        }
        $total = count($results);
        $correct = count(array_filter($results));

        return [
            'results' => $results,
            'correct' => $correct,
            'total' => $total,
            'mistakes' => $total - $correct,
            'score' => (int) round($correct / $total * 100),
        ];
    }

    public function complete(User $user, Lesson $lesson, array $answers, int $seconds = 0): array
    {
        $grade = $this->grade($lesson, $answers);
        $this->hearts->lose($user, $grade['mistakes']);

        $progress = LessonProgress::query()->firstOrNew(['user_id' => $user->id, 'lesson_id' => $lesson->id]);
        $firstTime = ! $progress->completed_at;
        $progress->attempts++;
        $progress->best_score = max($progress->best_score, $grade['score']);
        if ($grade['score'] >= 60) {
            $progress->completed_at ??= now();
            $progress->crowns = min(5, $progress->crowns + 1);
        }
        $progress->save();

        $perfect = $grade['score'] === 100;
        $passed = $grade['score'] >= 60;
        // Replays give reduced XP so the path stays the main XP source.
        $xp = $passed ? (int) round($lesson->xp_reward * ($firstTime ? 1 : 0.5)) : 3;
        if ($perfect) {
            $xp += config('dilgo.gamification.perfect_lesson_bonus_xp');
        }

        $speaking = collect($lesson->exercises ?? [])->where('type', 'speak')->count();
        $summary = $this->game->record($user, $xp, 'lesson', $lesson->id, array_filter([
            'lessons' => $passed ? 1 : 0,
            'perfect_lessons' => $perfect ? 1 : 0,
            'speaking' => $speaking,
            'minutes' => (int) ceil($seconds / 60),
        ]));

        return $grade + ['passed' => $passed, 'perfect' => $perfect, 'first_time' => $firstTime, 'reward' => $summary, 'hearts' => $this->hearts->sync($user->fresh())];
    }
}
