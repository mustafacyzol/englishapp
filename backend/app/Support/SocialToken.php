<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Verifies "Sign in with Google / Apple" ID tokens on the server. The client only
 * ever hands us the provider's signed token; we check signature, audience, issuer
 * and expiry here before trusting the e-mail inside it. Providers stay disabled
 * until their client id is configured.
 */
class SocialToken
{
    public static function enabled(string $provider): bool
    {
        return (bool) config("services.{$provider}.client_id");
    }

    /** @return array{sub:string, email:?string, email_verified:bool, name:?string}|null */
    public static function verify(string $provider, string $token): ?array
    {
        return match ($provider) {
            'google' => self::google($token),
            'apple' => self::apple($token),
            default => null,
        };
    }

    private static function audiences(string $provider): array
    {
        return array_filter(array_map('trim', explode(',', (string) config("services.{$provider}.client_id"))));
    }

    private static function google(string $token): ?array
    {
        $res = Http::timeout(8)->get('https://oauth2.googleapis.com/tokeninfo', ['id_token' => $token]);
        if (! $res->ok()) {
            return null;
        }
        $c = $res->json();
        if (! in_array($c['aud'] ?? null, self::audiences('google'), true)) {
            return null;
        }
        if (! in_array($c['iss'] ?? null, ['accounts.google.com', 'https://accounts.google.com'], true) || (int) ($c['exp'] ?? 0) < time()) {
            return null;
        }

        return [
            'sub' => (string) $c['sub'],
            'email' => isset($c['email']) ? strtolower($c['email']) : null,
            'email_verified' => filter_var($c['email_verified'] ?? false, FILTER_VALIDATE_BOOL),
            'name' => $c['name'] ?? null,
        ];
    }

    private static function apple(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$h, $p, $s] = $parts;
        $header = json_decode(self::b64($h), true);
        $claims = json_decode(self::b64($p), true);
        if (($header['alg'] ?? null) !== 'RS256' || ! is_array($claims)) {
            return null;
        }
        $keys = Cache::remember('apple.jwks', 3600, fn () => Http::timeout(8)->get('https://appleid.apple.com/auth/keys')->json('keys') ?? []);
        $jwk = collect($keys)->firstWhere('kid', $header['kid'] ?? null);
        if (! $jwk) {
            return null;
        }
        $ok = openssl_verify("{$h}.{$p}", self::b64($s), self::pem($jwk['n'], $jwk['e']), OPENSSL_ALGO_SHA256) === 1;
        if (! $ok || ($claims['iss'] ?? null) !== 'https://appleid.apple.com' || ! in_array($claims['aud'] ?? null, self::audiences('apple'), true) || (int) ($claims['exp'] ?? 0) < time()) {
            return null;
        }

        return [
            'sub' => (string) $claims['sub'],
            'email' => isset($claims['email']) ? strtolower($claims['email']) : null,
            'email_verified' => filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOL),
            'name' => null,
        ];
    }

    private static function b64(string $v): string
    {
        return base64_decode(strtr($v, '-_', '+/').str_repeat('=', (4 - strlen($v) % 4) % 4));
    }

    /** RSA modulus/exponent (JWK) to a PEM public key. */
    private static function pem(string $n, string $e): string
    {
        $int = function (string $b): string {
            $b = ltrim($b, "\x00");
            if ($b === '' || ord($b[0]) > 0x7F) {
                $b = "\x00".$b;
            }

            return "\x02".self::len($b).$b;
        };
        $rsa = "\x30".self::len($seq = $int(self::b64($n)).$int(self::b64($e))).$seq;
        $algo = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
        $bit = "\x03".self::len("\x00".$rsa)."\x00".$rsa;
        $spki = "\x30".self::len($algo.$bit).$algo.$bit;

        return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($spki), 64, "\n")."-----END PUBLIC KEY-----\n";
    }

    private static function len(string $bytes): string
    {
        $l = strlen($bytes);
        if ($l < 0x80) {
            return chr($l);
        }
        $out = ltrim(pack('N', $l), "\x00");

        return chr(0x80 | strlen($out)).$out;
    }
}
