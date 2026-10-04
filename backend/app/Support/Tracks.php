<?php

namespace App\Support;

use App\Models\User;

/**
 * How the same CEFR path is presented to each learner, from the choices made at
 * sign-up: school stage and grade, and the exam they prepare for.
 *
 * Middle school follows the Türkiye Yüzyılı Maarif Modeli English programme
 * (MEB, 2024): eight themes per grade, A2.1 to A2.4 from grade 5 to 8. Each of
 * our A1/A2 units is tagged with the Maarif theme it serves, grades 5-6 work on
 * the A1 units and grades 7-8 on the A2 units. Exam learners get an exam drill
 * after every unit in their exam's format.
 */
class Tracks
{
    /** The eight Maarif themes, in programme order. */
    public const MAARIF = [
        1 => ['School Life', 'Okul hayatı'],
        2 => ['Classroom Life', 'Sınıf hayatı'],
        3 => ['Personal Life', 'Kişisel hayat'],
        4 => ['Family Life', 'Aile hayatı'],
        5 => ['Life in the Neighbourhood & City', 'Mahalle ve şehir'],
        6 => ['Life in the World', 'Dünya ve kültür'],
        7 => ['Life in Nature', 'Doğa'],
        8 => ['Life in the Universe & Future', 'Evren ve gelecek'],
    ];

    /** unit position (0-based) in each course => Maarif theme. */
    private const UNIT_THEME = [
        'A1' => [1, 4, 2, 3, 4, 6, 5, 7, 8],
        'A2' => [1, 6, 8, 5, 3, 6, 7, 2],
        'B1' => [3, 1, 8, 8, 6, 2, 5, 1],
        'B2' => [3, 7, 8, 7, 5, 5, 2, 6],
    ];

    private const EXAM_NAMES = ['lgs' => 'LGS', 'ydt' => 'YDT', 'yds' => 'YDS', 'yokdil' => 'YÖKDİL', 'ielts' => 'IELTS', 'toefl' => 'TOEFL', 'proficiency' => 'Hazırlık'];

    /** The learner's track: what the path header says and which extras each unit gets. */
    public static function for(User $user): array
    {
        $stage = $user->school_stage;
        $grade = $user->grade ? (int) $user->grade : null;
        $exam = $user->exam_target;
        $examName = $exam ? (self::EXAM_NAMES[$exam] ?? strtoupper($exam)) : null;

        if ($stage === 'ortaokul') {
            $g = $grade ?: 5;
            $level = ['5' => 'A2.1', '6' => 'A2.2', '7' => 'A2.3', '8' => 'A2.4'][(string) $g] ?? 'A2';

            return [
                'key' => 'maarif', 'stage' => $stage, 'grade' => $g, 'exam' => $exam,
                'label' => "Maarif Modeli · {$g}. sınıf",
                'sub' => $exam === 'lgs' || $g === 8
                    ? "MEB temalarına göre ünite ünite, her ünitenin sonunda LGS tarzı sorular ({$level})."
                    : "MEB İngilizce programının 8 temasıyla uyumlu yol ({$level}).",
                'drill' => $exam === 'lgs' || $g === 8 ? 'lgs' : null,
            ];
        }
        if ($stage === 'ilkokul') {
            return ['key' => 'primary', 'stage' => $stage, 'grade' => $grade, 'exam' => null,
                'label' => ($grade ? "{$grade}. sınıf · " : '').'Oyunla İngilizce',
                'sub' => 'Kısa dersler, bol oyun ve dinleme. Okul temalarıyla uyumlu.', 'drill' => null];
        }
        if ($examName) {
            $who = ['lise' => 'Lise', 'universite' => 'Üniversite', 'yetiskin' => 'Yetişkin'][$stage] ?? null;

            return ['key' => 'exam', 'stage' => $stage, 'grade' => $grade, 'exam' => $exam,
                'label' => ($who ? "{$who} · " : '')."{$examName} hazırlığı",
                'sub' => "Her ünite bitince {$examName} formatında kısa bir soru seti seni bekliyor.", 'drill' => $exam];
        }

        return ['key' => 'general', 'stage' => $stage, 'grade' => $grade, 'exam' => null,
            'label' => match ($stage) { 'lise' => 'Lise İngilizcesi', 'universite' => 'Üniversite · Genel İngilizce', default => 'Günlük İngilizce' },
            'sub' => 'Konuşma, okuma ve dinlemeyi dengeli çalıştıran genel yol.', 'drill' => null];
    }

    /** Small label for a unit header: the Maarif theme for middle school, nothing otherwise. */
    public static function unitTag(array $track, string $level, int $position): ?array
    {
        if (! in_array($track['key'], ['maarif', 'primary'], true)) {
            return null;
        }
        $theme = self::UNIT_THEME[$level][$position] ?? null;
        if (! $theme) {
            return null;
        }
        [$en, $tr] = self::MAARIF[$theme];

        return ['theme' => $theme, 'en' => $en, 'tr' => $tr, 'label' => "Tema {$theme} · {$en}"];
    }

    public static function examName(?string $exam): ?string
    {
        return $exam ? (self::EXAM_NAMES[$exam] ?? strtoupper($exam)) : null;
    }
}
