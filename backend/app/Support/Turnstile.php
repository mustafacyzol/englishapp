<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;

/**
 * Cloudflare Turnstile bot protection. Disabled (always passes) until
 * TURNSTILE_SECRET_KEY is configured, so local dev and mobile builds keep working.
 */
class Turnstile
{
    public static function enabled(): bool
    {
        return filled(config('dilgo.security.turnstile_secret'));
    }

    public static function verify(?string $token, ?string $ip = null): bool
    {
        if (! self::enabled()) {
            return true;
        }
        if (blank($token)) {
            return false;
        }

        $response = Http::asForm()->timeout(8)->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
            'secret' => config('dilgo.security.turnstile_secret'),
            'response' => $token,
            'remoteip' => $ip,
        ]);

        return (bool) $response->json('success', false);
    }
}
