<?php

namespace App\Support;

/**
 * A light check for text other learners will see (public word sets, profile
 * bio): no links or contact details, no shouting runs of the same character,
 * no words from a short block list. It does not replace moderation; it keeps
 * the obvious spam and abuse from ever going public.
 */
class ContentGuard
{
    /** Kept short and unambiguous on purpose; editors extend it from the admin settings. */
    private const BLOCKED = ['amk', 'aq', 'orospu', 'piç', 'siktir', 'yarrak', 'göt', 'fuck', 'shit', 'bitch', 'porn', 'casino', 'bahis', 'betting'];

    /** Returns a reason in Turkish when the text must not be public, null when it is fine. */
    public static function problem(string $text): ?string
    {
        $t = mb_strtolower($text);
        if (preg_match('~(https?://|www\.|\.(com|net|org|xyz|ru|tk)\b|t\.me/|wa\.me/)~iu', $t)) {
            return 'Paylaşılan içerikte bağlantı olamaz.';
        }
        if (preg_match('~(\+?\d[\d\s-]{8,}\d|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})~iu', $t)) {
            return 'Paylaşılan içerikte telefon ya da e-posta olamaz.';
        }
        if (preg_match('~(.)\1{7,}~u', $t)) {
            return 'Aynı harfi bu kadar tekrar etme.';
        }
        $extra = array_filter(array_map('trim', explode(',', (string) Settings::get('moderation.blocked_words', ''))));
        foreach ([...self::BLOCKED, ...$extra] as $w) {
            if ($w !== '' && preg_match('~(?<![\p{L}])'.preg_quote(mb_strtolower($w), '~').'(?![\p{L}])~u', $t)) {
                return 'Paylaşılan içerikte uygunsuz bir kelime var.';
            }
        }

        return null;
    }
}
