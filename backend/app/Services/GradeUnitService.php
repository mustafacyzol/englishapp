<?php

namespace App\Services;

use App\Models\Course;
use App\Models\GradeUnit;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * School-grade units on the CEFR path.
 *
 * A learner who chose a school grade (or LGS / YDT, which stand for grades 8
 * and 12) sees the unit titles of their own coursebook, and every grade unit
 * adds one lesson with its words and sentences to a CEFR unit. Grade units are
 * spread evenly over each course (a 10-unit grade on an 8-unit course puts two
 * of them in some units); an editor can pin a unit to a slot instead.
 *
 * The lessons are generated, never edited by hand: they carry
 * meta.grade_unit and meta.track, and PathService shows them only to learners
 * of that track. sync() rebuilds them after every change.
 */
class GradeUnitService
{
    /** Track key => label, in school order. */
    public const TRACKS = [
        'g2' => '2. sınıf', 'g3' => '3. sınıf', 'g4' => '4. sınıf',
        'g5' => '5. sınıf', 'g6' => '6. sınıf', 'g7' => '7. sınıf', 'g8' => '8. sınıf · LGS',
        'g9' => '9. sınıf', 'g10' => '10. sınıf', 'g11' => '11. sınıf', 'g12' => '12. sınıf · YDT',
    ];

    /** The grade track of a learner, from the school grade or the exam they chose. */
    public static function trackFor(User $user): ?string
    {
        $grade = (int) ($user->grade ?? 0);
        if (in_array($user->school_stage, ['ilkokul', 'ortaokul', 'lise'], true) && $grade >= 2 && $grade <= 12) {
            return "g{$grade}";
        }

        return match ($user->exam_target) {
            'lgs' => 'g8',
            'ydt' => 'g12',
            default => null,
        };
    }

    /** CEFR unit index (0-based) for each published grade unit of a track, given a course size. */
    public function slots(Collection $units, int $courseUnits): array
    {
        $count = $units->count();
        $out = [];
        foreach ($units->values() as $i => $u) {
            $out[$u->id] = $u->slot
                ? min($u->slot - 1, $courseUnits - 1)
                : min($courseUnits - 1, intdiv($i * $courseUnits, max(1, $count)));
        }

        return $out;
    }

    public function units(string $track): Collection
    {
        return GradeUnit::query()->where('track', $track)->where('is_published', true)->orderBy('position')->orderBy('id')->get();
    }

    /**
     * For the path: CEFR unit index => the grade units sitting there, so the
     * unit can carry the coursebook title.
     *
     * @return array<int, list<GradeUnit>>
     */
    public function overlay(?string $track, Course $course): array
    {
        if (! $track) {
            return [];
        }
        $units = $this->units($track);
        $slots = $this->slots($units, $course->units->count());
        $out = [];
        foreach ($units as $u) {
            $out[$slots[$u->id]][] = $u;
        }

        return $out;
    }

    /** Rebuild the generated lessons of one track (or all), removing ones whose unit is gone. */
    public function sync(?string $track = null): void
    {
        $courses = Course::query()->with('units:id,course_id,position')->orderBy('position')->get();
        foreach ($track ? [$track] : array_keys(self::TRACKS) as $t) {
            $units = $this->units($t);
            $keep = [];
            foreach ($courses as $course) {
                $cu = $course->units->sortBy('position')->values();
                if ($cu->isEmpty()) {
                    continue;
                }
                foreach ($this->slots($units, $cu->count()) as $id => $slot) {
                    $gu = $units->firstWhere('id', $id);
                    $lesson = Lesson::query()->whereIn('unit_id', $cu->pluck('id'))->where('meta->grade_unit', $gu->id)->first() ?? new Lesson;
                    $lesson->fill([
                        'unit_id' => $cu[$slot]->id,
                        'title' => $gu->title,
                        'skill' => 'vocabulary',
                        'kind' => 'lesson',
                        'position' => 0,
                        'xp_reward' => 15,
                        'is_premium' => false,
                        'meta' => ['grade_unit' => $gu->id, 'track' => $t],
                        'exercises' => $this->exercises($gu),
                    ])->save();
                    $keep[] = $lesson->id;
                }
            }
            Lesson::query()->where('meta->track', $t)->whereNotIn('id', $keep ?: [0])->delete();
        }
        // lessons of grade units that were deleted
        Lesson::query()->whereNotNull('meta->grade_unit')->whereNotIn('meta->track', array_keys(self::TRACKS))->delete();
    }

    /**
     * The lesson of a grade unit: the eight words met three ways (pairs, meaning,
     * listening), then the unit's sentences built, filled and said aloud.
     */
    public function exercises(GradeUnit $gu): array
    {
        $w = array_values(array_filter($gu->words ?? [], fn ($p) => is_array($p) && count($p) >= 2 && $p[0] !== '' && $p[1] !== ''));
        $s = array_values(array_filter($gu->sentences ?? [], fn ($p) => is_array($p) && count($p) >= 2 && $p[0] !== ''));
        $n = count($w);
        if ($n < 4) {
            return [];
        }
        $seed = crc32($gu->track.$gu->title);
        $pick = fn (int $i, int $col, array $skip) => array_values(array_diff(array_column($w, $col), $skip));
        $choice = function (int $i, bool $toEnglish) use ($w, $pick, $seed) {
            $right = $w[$i][$toEnglish ? 0 : 1];
            $others = array_slice($this->shuffle($pick($i, $toEnglish ? 0 : 1, [$right]), $seed + $i), 0, 3);
            $opts = $this->shuffle([$right, ...$others], $seed * 7 + $i);

            return $toEnglish
                ? ['type' => 'choice', 'prompt' => "\"{$w[$i][1]}\" İngilizcede hangisi?", 'options' => $opts, 'answer' => array_search($right, $opts, true)]
                : ['type' => 'choice', 'prompt' => "\"{$w[$i][0]}\" ne demek?", 'options' => $opts, 'answer' => array_search($right, $opts, true), 'audio' => $w[$i][0]];
        };
        $listen = function (int $i) use ($w, $pick, $seed) {
            $right = $w[$i][0];
            $opts = $this->shuffle([$right, ...array_slice($this->shuffle($pick($i, 0, [$right]), $seed + 3 * $i), 0, 3)], $seed + $i);

            return ['type' => 'listen_choice', 'prompt' => 'Ne duydun?', 'audio' => $right, 'options' => $opts, 'answer' => array_search($right, $opts, true)];
        };
        $half = intdiv($n, 2);
        $ex = [
            ['type' => 'match', 'prompt' => 'Eşleştir', 'pairs' => array_slice($w, 0, min(5, $half))],
            $choice(0 % $n, false),
            $listen(1 % $n),
            $choice(2 % $n, true),
            ['type' => 'match', 'prompt' => 'Eşleştir', 'pairs' => array_slice($w, $half, 5)],
            $choice($half % $n, false),
            $listen(($half + 1) % $n),
            $choice(($n - 1) % $n, true),
        ];
        foreach (array_slice($s, 0, 3) as $k => [$en, $tr]) {
            $clean = rtrim($en, '.?!');
            // a word of the unit inside the sentence becomes a gap; otherwise the sentence is built from tiles
            $hit = collect($w)->first(fn ($p) => preg_match('/\b'.preg_quote($p[0], '/').'\b/i', $clean));
            if ($hit && $k === 1) {
                $others = array_slice($this->shuffle($pick(0, 0, [$hit[0]]), $seed + 11), 0, 2);
                $opts = $this->shuffle([$hit[0], ...$others], $seed + 13);
                $ex[] = ['type' => 'fill', 'prompt' => preg_replace('/\b'.preg_quote($hit[0], '/').'\b/i', '___', $en, 1), 'options' => $opts, 'answer' => array_search($hit[0], $opts, true), 'hint' => $tr];
            } else {
                $distract = array_slice($this->shuffle(array_filter(array_column($w, 0), fn ($x) => ! str_contains(strtolower($clean), strtolower($x)) && ! str_contains($x, ' ')), $seed + $k), 0, 2);
                $ex[] = ['type' => 'translate', 'prompt' => $tr, 'answer' => $clean, 'alternatives' => [], 'tiles' => $this->shuffle([...explode(' ', str_replace(',', '', $clean)), ...$distract], $seed + 17 + $k)];
            }
            $ex[] = ['type' => 'speak', 'prompt' => 'Sesli söyle', 'text' => $en, 'translation' => $tr];
        }

        return $ex;
    }

    /** The grade section that opens a unit's guidebook for learners of that grade. */
    public function guideSection(GradeUnit $gu): string
    {
        $label = self::TRACKS[$gu->track] ?? $gu->track;
        $rows = collect($gu->words ?? [])->map(fn ($p) => '| '.str_replace('|', '/', $p[0]).' | '.str_replace('|', '/', $p[1] ?? '').' |')->implode("\n");
        $sentences = collect($gu->sentences ?? [])->map(fn ($p) => '- **'.$p[0].'** '.($p[1] ?? ''))->implode("\n");
        $md = "## {$label}: {$gu->title}\n\n".($gu->title_tr ? "Ders kitabındaki bu ünitenin ({$gu->title_tr}) kelimeleri ve kalıpları.\n\n" : '');
        if ($gu->note) {
            $md .= trim($gu->note)."\n\n";
        }

        return $md."| İngilizce | Türkçe |\n|---|---|\n{$rows}\n\n".($sentences ? "{$sentences}\n" : '');
    }

    private function shuffle(array $items, int $seed): array
    {
        mt_srand($seed);
        shuffle($items);
        mt_srand();

        return $items;
    }
}
