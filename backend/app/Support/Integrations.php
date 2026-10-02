<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

/**
 * Third-party services that the admin panel can configure without touching the
 * server: payments (iyzico), Defne's voice (ElevenLabs), lip sync and the AI
 * model. Values saved in the panel win over .env; secrets are stored encrypted
 * with APP_KEY and never sent back to the browser (only "set / not set" and the
 * last four characters).
 */
class Integrations
{
    private const CACHE = 'dilgo.integrations';

    /** key => [config fallback, secret?] */
    public const FIELDS = [
        'payments.gateway' => ['dilgo.payments.gateway', false],
        'payments.iyzico.api_key' => ['dilgo.payments.iyzico.api_key', true],
        'payments.iyzico.secret_key' => ['dilgo.payments.iyzico.secret_key', true],
        'payments.iyzico.mode' => [null, false], // sandbox | live
        'tts.elevenlabs.key' => ['services.elevenlabs.key', true],
        'tts.elevenlabs.voice_id' => ['services.elevenlabs.voice_id', false],
        'tts.elevenlabs.model' => ['services.elevenlabs.model', false],
        'tts.stability' => [null, false],
        'tts.similarity' => [null, false],
        'tts.elevenlabs.narrator_voice_id' => ['services.elevenlabs.narrator_voice_id', false],
        'tts.narrator' => [null, false], // auto | elevenlabs | openai | google | browser
        'tts.openai.key' => ['services.openai_tts.key', true],
        'tts.openai.voice' => ['services.openai_tts.voice', false],
        'tts.openai.model' => ['services.openai_tts.model', false],
        'tts.google.key' => ['services.google_tts.key', true],
        'tts.google.voice' => ['services.google_tts.voice', false],
        'defne.lipsync' => [null, false],      // true | false
        'defne.lipsync_gain' => [null, false], // how wide the mouth opens per loudness, 1..8
        'defne.voice_rate' => [null, false],   // 0.8..1.15
        'ai.api_key' => ['dilgo.ai.api_key', true],
        'ai.model' => ['dilgo.ai.model', false],
    ];

    private const DEFAULTS = [
        'payments.iyzico.mode' => 'sandbox',
        'tts.stability' => 0.5,
        'tts.similarity' => 0.75,
        'tts.narrator' => 'auto',
        'defne.lipsync' => true,
        'defne.lipsync_gain' => 4,
        'defne.voice_rate' => 1,
    ];

    private static function stored(): array
    {
        return Cache::rememberForever(self::CACHE, fn () => Setting::query()->where('key', 'like', 'int.%')->pluck('value', 'key')->all());
    }

    public static function get(string $key): mixed
    {
        [$fallback, $secret] = self::FIELDS[$key] ?? [null, false];
        $raw = self::stored()['int.'.$key] ?? null;
        if ($raw !== null && $raw !== '') {
            if ($secret) {
                try {
                    return Crypt::decryptString((string) $raw);
                } catch (\Throwable) {
                    return null;
                }
            }

            return $raw;
        }

        return $fallback ? config($fallback) : (self::DEFAULTS[$key] ?? null);
    }

    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            if (! array_key_exists($key, self::FIELDS)) {
                continue;
            }
            [, $secret] = self::FIELDS[$key];
            // an empty secret field means "keep what is there" (clearing goes through clear())
            if ($secret && ($value === null || $value === '')) {
                continue;
            }
            $stored = $secret ? Crypt::encryptString((string) $value) : $value;
            Setting::query()->updateOrCreate(['key' => 'int.'.$key], ['value' => $stored]);
        }
        Cache::forget(self::CACHE);
    }

    /** Removes stored values so the .env fallback (or nothing) applies again. */
    public static function clear(array $keys): void
    {
        Setting::query()->whereIn('key', array_map(fn ($k) => 'int.'.$k, array_intersect($keys, array_keys(self::FIELDS))))->delete();
        Cache::forget(self::CACHE);
    }

    /** What the admin panel sees: plain values, and for secrets only whether they are set. */
    public static function forAdmin(): array
    {
        $out = [];
        foreach (self::FIELDS as $key => [, $secret]) {
            $v = self::get($key);
            $out[$key] = $secret ? ['set' => filled($v), 'hint' => filled($v) ? '••••'.substr((string) $v, -4) : null] : $v;
        }

        return $out;
    }

    public static function iyzico(): array
    {
        $live = self::get('payments.iyzico.mode') === 'live';

        return [
            'api_key' => self::get('payments.iyzico.api_key'),
            'secret_key' => self::get('payments.iyzico.secret_key'),
            'base_url' => $live ? 'https://api.iyzipay.com' : (config('dilgo.payments.iyzico.base_url') ?: 'https://sandbox-api.iyzipay.com'),
        ];
    }

    public static function tts(): array
    {
        return [
            'key' => self::get('tts.elevenlabs.key'),
            'voice_id' => self::get('tts.elevenlabs.voice_id'),
            'model' => self::get('tts.elevenlabs.model'),
            'stability' => (float) self::get('tts.stability'),
            'similarity' => (float) self::get('tts.similarity'),
        ];
    }

    /** Public, safe values the app needs to drive Defne's face and voice. */
    public static function defne(): array
    {
        return [
            'voice' => filled(self::get('tts.elevenlabs.key')),
            // a neural English voice for words, lessons and stories
            'speech' => \App\Services\SpeechService::narratorProvider() !== null,
            'lipsync' => filter_var(self::get('defne.lipsync'), FILTER_VALIDATE_BOOLEAN),
            'gain' => (float) self::get('defne.lipsync_gain'),
            'rate' => (float) self::get('defne.voice_rate'),
        ];
    }
}
