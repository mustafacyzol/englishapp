<?php

namespace App\Support;

/**
 * The Turkish school ladder, used to tune content, exams and Defne's tone:
 * ilkokul (2-4. sınıf), ortaokul (5-8), lise (9-12), üniversite (hazırlık dahil)
 * and yetişkin. The age group used for safety rules follows from it.
 */
class SchoolStage
{
    public const STAGES = [
        'ilkokul' => ['label' => 'İlkokul', 'grades' => [2, 3, 4], 'cefr' => 'A1', 'exams' => []],
        'ortaokul' => ['label' => 'Ortaokul', 'grades' => [5, 6, 7, 8], 'cefr' => 'A1', 'exams' => ['lgs']],
        'lise' => ['label' => 'Lise', 'grades' => [9, 10, 11, 12], 'cefr' => 'A2', 'exams' => ['ydt', 'ielts', 'toefl']],
        'universite' => ['label' => 'Üniversite', 'grades' => [], 'cefr' => 'B1', 'exams' => ['proficiency', 'yds', 'yokdil', 'ielts', 'toefl']],
        'yetiskin' => ['label' => 'Yetişkin', 'grades' => [], 'cefr' => 'A2', 'exams' => ['yds', 'yokdil', 'ielts', 'toefl']],
    ];

    public static function keys(): array
    {
        return array_keys(self::STAGES);
    }

    /** kid | teen | adult, from stage and grade. */
    public static function ageGroup(?string $stage, ?int $grade): ?string
    {
        return match ($stage) {
            'ilkokul' => 'kid',
            'ortaokul' => ($grade ?? 5) <= 6 ? 'kid' : 'teen',
            'lise' => 'teen',
            'universite', 'yetiskin' => 'adult',
            default => null,
        };
    }

    /** A course level that suits the grade, when no placement test was taken. */
    public static function suggestedCefr(?string $stage, ?int $grade): ?string
    {
        if ($stage === 'ortaokul') {
            return ($grade ?? 5) >= 7 ? 'A2' : 'A1';
        }
        if ($stage === 'lise') {
            return ($grade ?? 9) >= 11 ? 'B1' : 'A2';
        }

        return self::STAGES[$stage]['cefr'] ?? null;
    }

    /** One line for Defne's system prompt. */
    public static function tutorBrief(?string $stage, ?int $grade): ?string
    {
        return match ($stage) {
            'ilkokul' => "The learner is a primary school pupil in Turkey (grade {$grade}). Topics from school English: greetings, colours, numbers, family, animals, toys, the classroom. Use single short sentences, pictures-in-words, songs and games; praise often.",
            'ortaokul' => "The learner is a middle school student in Turkey (grade {$grade}). Follow typical school English topics (friendship, daily routines, food, the internet, chores, adventures, natural forces).".(($grade ?? 0) === 8 ? ' They sit the LGS this year: practise four-option, dialogue and short reading questions.' : ''),
            'lise' => "The learner is a high school student in Turkey (grade {$grade}).".(($grade ?? 0) >= 11 ? ' If they target YKS-YDT, train dialogue completion, paragraph and translation questions.' : ' Strengthen grammar and reading for school exams.'),
            'universite' => 'The learner is a university student in Turkey, often in or preparing for the English prep year (hazırlık). Train academic reading, vocabulary and writing; help them pass the proficiency (muafiyet) exam.',
            default => null,
        };
    }
}
