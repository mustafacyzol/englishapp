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
        // Brand and contact shown in the footer, contact page and e-mails.
        'brand.tagline' => 'Oku, dinle, konuş, yaz. İngilizceyi dört beceriyle öğren.',
        'contact.email' => 'dilgo.brand.support_email',
        'contact.phone' => null,
        'contact.address' => null,
        'social.instagram' => null,
        'social.youtube' => null,
        'social.tiktok' => null,
        'social.linkedin' => null,
        'social.x' => null,
        'seo.description' => null,
        // Feature switches, off hides the feature everywhere for learners.
        'features.duel' => true,
        'features.ai' => true,
        'features.stories' => true,
        'features.exam' => true,
        'features.chest_partners' => true,
        'features.social_login' => true,
        'features.leagues' => true,
        // Economy
        'gamification.daily_chest' => true,
        'auth.remember_days' => 'dilgo.security.token_ttl_days',
    ];

    /** The subset safe to expose on the public /config endpoint. */
    public const PUBLIC = ['brand.tagline', 'contact.email', 'contact.phone', 'contact.address', 'social.instagram', 'social.youtube', 'social.tiktok', 'social.linkedin', 'social.x', 'seo.description',
        'features.duel', 'features.ai', 'features.stories', 'features.exam', 'features.chest_partners', 'features.social_login', 'features.leagues'];

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
