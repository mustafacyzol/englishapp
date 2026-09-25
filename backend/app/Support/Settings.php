<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Runtime settings editable from the admin panel, falling back to config/dilgo.php.
 */
class Settings
{
    public const CACHE_KEY = 'dilgo.settings';

    /** Keys the admin panel is allowed to edit, with their config fallback. */
    public const EDITABLE = [
        'maintenance_mode' => false,
        'registration_open' => true,
        'announcement' => null,
        'referral.referee_gems' => 'dilgo.referral.referee_gems',
        'referral.referrer_gems' => 'dilgo.referral.referrer_gems',
        'referral.referrer_premium_days' => 'dilgo.referral.referrer_premium_days',
        'ai.daily_limit_free' => 'dilgo.ai.daily_limit_free',
        'ai.daily_limit_premium' => 'dilgo.ai.daily_limit_premium',
        'gamification.heart_refill_gems' => 'dilgo.gamification.heart_refill_gems',
        'school.cta_url' => null,
        'school.whatsapp' => null,
    ];

    public static function all(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => Setting::query()->pluck('value', 'key')->all());

        $out = [];
        foreach (self::EDITABLE as $key => $fallback) {
            $default = is_string($fallback) && str_starts_with($fallback, 'dilgo.') ? config($fallback) : $fallback;
            $out[$key] = array_key_exists($key, $stored) ? $stored[$key] : $default;
        }

        return $out;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::all()[$key] ?? $default;
    }

    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            if (array_key_exists($key, self::EDITABLE)) {
                Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
            }
        }
        Cache::forget(self::CACHE_KEY);
    }
}
