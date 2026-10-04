<?php

namespace App\Support;

/**
 * The backdrop behind a learner's avatar, chosen in the profile studio. It travels
 * with the avatar value as "key@backdrop" (e.g. "glasses@mint"), so every list that
 * already carries the avatar (leagues, arena, profiles) shows it without new fields.
 */
class AvatarBackdrops
{
    public const STANDARD = ['cream', 'mint', 'sky', 'blush', 'lilac', 'sun', 'peach', 'sage', 'sand', 'night'];

    public const PREMIUM = ['gold', 'obsidian', 'aurora', 'rosegold', 'pearl', 'emerald'];

    /** [avatar key, backdrop or null] from a stored value. */
    public static function split(?string $value): array
    {
        [$key, $bg] = array_pad(explode('@', (string) $value, 2), 2, null);

        return [$key, $bg !== null && in_array($bg, [...self::STANDARD, ...self::PREMIUM], true) ? $bg : null];
    }

    public static function isPremium(?string $bg): bool
    {
        return $bg !== null && in_array($bg, self::PREMIUM, true);
    }
}
