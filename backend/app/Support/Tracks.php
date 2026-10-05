<?php

namespace App\Support;

use App\Models\User;
use App\Services\GradeUnitService;

/**
 * Which programme a learner's path follows, from the choices made at sign-up:
 * school stage and grade, and the exam they prepare for.
 *
 * Pupils from grade 2 to 12 (and LGS / YDT candidates, as grades 8 and 12) get
 * their grade's MEB units on the path (GradeUnitService). Everyone else follows
 * the general CEFR path. The path itself carries no banner for this: the unit
 * titles are what changes.
 */
class Tracks
{
    private const EXAM_NAMES = ['lgs' => 'LGS', 'ydt' => 'YDT', 'yds' => 'YDS', 'yokdil' => 'YÖKDİL', 'ielts' => 'IELTS', 'toefl' => 'TOEFL', 'proficiency' => 'Hazırlık'];

    public static function for(User $user): array
    {
        $grade = GradeUnitService::trackFor($user);

        return [
            'key' => $grade ? 'grade' : ($user->exam_target ? 'exam' : 'general'),
            'stage' => $user->school_stage,
            'grade' => $user->grade ? (int) $user->grade : null,
            'exam' => $user->exam_target,
            'grade_track' => $grade,
            'label' => $grade ? GradeUnitService::TRACKS[$grade] : (self::examName($user->exam_target) ?? 'Genel İngilizce'),
        ];
    }

    public static function examName(?string $exam): ?string
    {
        return $exam ? (self::EXAM_NAMES[$exam] ?? strtoupper($exam)) : null;
    }
}
