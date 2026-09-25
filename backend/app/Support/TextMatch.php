<?php

namespace App\Support;

use Illuminate\Support\Str;

class TextMatch
{
    public static function normalize(string $text): string
    {
        $text = Str::lower(Str::ascii($text));
        $text = str_replace(['’', "'"], '', $text);
        $text = preg_replace('/[^a-z0-9\s]/', ' ', $text);

        return trim(preg_replace('/\s+/', ' ', $text));
    }

    public static function equals(string $given, string|array $expected): bool
    {
        $given = self::normalize($given);
        foreach ((array) $expected as $candidate) {
            if ($given === self::normalize($candidate)) {
                return true;
            }
        }

        return false;
    }

    /** Word-level similarity 0..1 (used for speaking exercises). */
    public static function similarity(string $a, string $b): float
    {
        $wa = explode(' ', self::normalize($a));
        $wb = explode(' ', self::normalize($b));
        if ($wb === [''] || $wa === ['']) {
            return 0.0;
        }
        $matched = count(array_intersect($wa, $wb));

        return round($matched / max(count($wa), count($wb)), 2);
    }
}
