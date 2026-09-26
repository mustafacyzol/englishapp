<?php

namespace App\Support;

/**
 * The four skills every activity feeds. Each exercise type trains one skill, so
 * a mixed lesson splits its XP across skills in proportion to what was practised.
 */
class Skills
{
    public const ALL = ['reading', 'listening', 'speaking', 'writing'];

    public const LABELS = ['reading' => 'Okuma', 'listening' => 'Dinleme', 'speaking' => 'Konuşma', 'writing' => 'Yazma'];

    /** XP needed per skill level: level n starts at 60·n·(n+1)/2 → 0, 60, 180, 360, 600 … */
    public const STEP = 60;

    private const BY_TYPE = [
        'choice' => 'reading', 'fill' => 'reading', 'spot_error' => 'reading', 'sequence' => 'reading', 'match' => 'reading',
        'listen_choice' => 'listening', 'listen_type' => 'listening', 'dialogue' => 'listening',
        'speak' => 'speaking',
        'translate' => 'writing', 'order' => 'writing',
    ];

    public static function forType(string $type): string
    {
        return self::BY_TYPE[$type] ?? 'reading';
    }

    /** Lesson/skill label from the curriculum (vocabulary, grammar …) mapped onto the four skills. */
    public static function normalize(?string $skill): ?string
    {
        return match ($skill) {
            'reading', 'vocabulary', 'grammar' => 'reading',
            'listening' => 'listening',
            'speaking' => 'speaking',
            'writing' => 'writing',
            default => null,
        };
    }

    /**
     * @param  list<array>  $exercises
     * @return array<string,float> skill → weight (sums to 1)
     */
    public static function weightsFor(array $exercises, ?string $fallback = null): array
    {
        $counts = [];
        foreach ($exercises as $ex) {
            $s = self::forType((string) ($ex['type'] ?? ''));
            $counts[$s] = ($counts[$s] ?? 0) + 1;
        }
        if (! $counts) {
            return [self::normalize($fallback) ?? 'reading' => 1.0];
        }
        $total = array_sum($counts);

        return array_map(fn ($c) => $c / $total, $counts);
    }

    /**
     * Splits an XP amount across skills, keeping the integer total exact.
     *
     * @param  array<string,float>  $weights
     * @return array<string,int>
     */
    public static function split(int $xp, array $weights): array
    {
        $weights = array_intersect_key($weights, array_flip(self::ALL));
        if ($xp <= 0 || ! $weights) {
            return [];
        }
        $sum = array_sum($weights) ?: 1;
        $out = [];
        $given = 0;
        arsort($weights);
        foreach ($weights as $skill => $w) {
            $out[$skill] = (int) floor($xp * $w / $sum);
            $given += $out[$skill];
        }
        // Hand the rounding remainder to the largest share.
        $out[array_key_first($weights)] += $xp - $given;

        return array_filter($out);
    }

    public static function level(int $xp): int
    {
        // Solve 60·n(n+1)/2 ≤ xp for the largest n.
        return (int) floor((sqrt(1 + 8 * $xp / self::STEP) - 1) / 2);
    }

    public static function levelFloor(int $level): int
    {
        return (int) (self::STEP * $level * ($level + 1) / 2);
    }
}
