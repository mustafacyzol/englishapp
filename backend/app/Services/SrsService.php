<?php

namespace App\Services;

use App\Models\UserWord;

/**
 * SM-2 spaced repetition. Grades: 0 = forgot, 3 = hard, 4 = good, 5 = easy.
 */
class SrsService
{
    public function review(UserWord $word, int $grade): UserWord
    {
        $grade = max(0, min(5, $grade));

        if ($grade < 3) {
            $word->repetitions = 0;
            $word->interval_days = 0;
            $word->due_at = now()->addMinutes(10);
        } else {
            $word->repetitions++;
            $word->interval_days = match ($word->repetitions) {
                1 => 1,
                2 => 3,
                default => (int) ceil(max(1, $word->interval_days) * $word->ease),
            };
            $word->due_at = now()->addDays($word->interval_days);
        }

        $word->ease = max(1.3, round($word->ease + (0.1 - (5 - $grade) * (0.08 + (5 - $grade) * 0.02)), 2));
        $word->last_reviewed_at = now();
        $word->save();

        return $word;
    }
}
