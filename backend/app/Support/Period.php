<?php

namespace App\Support;

use Carbon\CarbonImmutable;

class Period
{
    public const TZ = 'Europe/Istanbul';

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::TZ);
    }

    public static function today(): string
    {
        return self::now()->toDateString();
    }

    public static function weekKey(?CarbonImmutable $at = null): string
    {
        $at ??= self::now();

        return $at->format('o-\WW');
    }

    public static function weekEndsAt(): CarbonImmutable
    {
        return self::now()->endOfWeek();
    }
}
