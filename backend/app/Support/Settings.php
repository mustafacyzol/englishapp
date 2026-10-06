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
        'ai.daily_limit_defne' => 'dilgo.ai.daily_limit_defne',
        'gamification.heart_refill_gems' => 'dilgo.gamification.heart_refill_gems',
        'school.cta_url' => null,
        'school.whatsapp' => null,
        // Brand and contact shown in the footer, contact page and e-mails.
        'brand.tagline' => 'Oku, dinle, konuş, yaz. İngilizceyi dört beceriyle öğren.',
        'contact.email' => 'dilgo.brand.support_email',
        'contact.phone' => null,
        'contact.address' => null,
        'social.instagram' => 'https://www.instagram.com/dilgoapp', // örnek adres, Yönetim > Site ayarları'ndan kendi hesabınızla değiştirin
        'social.youtube' => 'https://www.youtube.com/@dilgoapp', // örnek adres, Yönetim > Site ayarları'ndan kendi hesabınızla değiştirin
        'social.tiktok' => 'https://www.tiktok.com/@dilgoapp', // örnek adres, Yönetim > Site ayarları'ndan kendi hesabınızla değiştirin
        'social.linkedin' => 'https://www.linkedin.com/company/dilgoapp', // örnek adres, Yönetim > Site ayarları'ndan kendi hesabınızla değiştirin
        'social.x' => 'https://x.com/dilgoapp', // örnek adres, Yönetim > Site ayarları'ndan kendi hesabınızla değiştirin
        // Store pages for the mobile apps (örnek adresler: yayınlanınca Yönetim > Site ayarları'ndan değiştirin)
        'apps.ios' => 'https://apps.apple.com/tr/app/dilgo/id0000000000',
        'apps.android' => 'https://play.google.com/store/apps/details?id=app.dilgo',
        'seo.description' => null,
        // Feature switches, off hides the feature everywhere for learners.
        'features.duel' => true,
        'features.ai' => true,
        'features.stories' => true,
        'features.exam' => true,
        'features.chest_partners' => true,
        'features.social_login' => true,
        'features.leagues' => true,
        // The corporate card shown next to the plans on the pricing section.
        'corporate.enabled' => true,
        'corporate.name' => 'Okullar için',
        'corporate.tagline' => 'İlkokuldan liseye; müdür, öğretmen ve öğrenci panelleriyle',
        'corporate.price' => 'Teklif alın',
        'corporate.note' => 'Öğrenci sayısına göre fiyatlandırılır',
        'corporate.features' => "Müdür ve öğretmen panelleri\nSınıflar, ödev verme ve takip\nLGS ve YKS-YDT hazırlığı\nTüm öğrencilere Premium özellikler\nOkulunuzun logosu ve rengi",
        'corporate.cta' => 'Okulunuz için teklif alın',
        'corporate.url' => '/okullar#basvuru',
        // Economy
        'economy.signup_gems' => 'dilgo.economy.signup_gems',
        'gamification.daily_chest' => true,
        'auth.remember_days' => 'dilgo.security.token_ttl_days',
        // Anti-spam: what one learner may create, and words never allowed in shared content
        'limits.word_sets_per_day' => 20,
        'limits.word_sets_total' => 60,
        'limits.public_sets' => 10,
        'limits.words_per_day' => 300,
        'limits.notebook_size' => 5000,
        'moderation.blocked_words' => null,
        'moderation.report_hide' => 3,
    ];

    /** The subset safe to expose on the public /config endpoint. */
    public const PUBLIC = ['brand.tagline', 'contact.email', 'contact.phone', 'contact.address', 'social.instagram', 'social.youtube', 'social.tiktok', 'social.linkedin', 'social.x', 'apps.ios', 'apps.android', 'seo.description',
        'features.duel', 'features.ai', 'features.stories', 'features.exam', 'features.chest_partners', 'features.social_login', 'features.leagues',
        'corporate.enabled', 'corporate.name', 'corporate.tagline', 'corporate.price', 'corporate.note', 'corporate.features', 'corporate.cta', 'corporate.url'];

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
