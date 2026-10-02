<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * A small application firewall that runs before everything else.
 *
 *  - Scanner paths (.env, .git, wp-login.php, phpmyadmin, backups...) get a 404.
 *  - Attack patterns in the path or query string (SQL injection, traversal,
 *    script injection, JNDI, PHP stream wrappers) get a 403.
 *  - Known scanner user agents get a 403.
 *  - Bodies larger than the limit get a 413 (uploads have their own limit).
 *  - Every refusal is a strike; too many strikes in a window bans the IP for a while.
 *
 * Request bodies are not pattern-matched: learners type free text (and English
 * sentences can look like anything), so bodies are protected by validation,
 * Eloquent bindings and output escaping instead.
 */
class Firewall
{
    private const PATHS = '~(^|/)(\.env|\.git|\.svn|\.hg|\.ds_store|\.htpasswd|\.aws|wp-admin|wp-login\.php|wp-content|wp-includes|xmlrpc\.php|phpmyadmin|pma|adminer(\.php)?|cgi-bin|server-status|vendor/phpunit|composer\.(json|lock)|artisan|storage/logs)(/|$)|\.(sql|bak|old|swp|backup|tar|tgz|gz|zip|rar|7z|log|ini|sh|env)$~i';

    private const PATTERNS = [
        'sqli' => '~(\bunion\b[\s/*+]+(all[\s/*+]+)?select\b|\bselect\b.+\bfrom\b.+\binformation_schema\b|\b(sleep|benchmark|pg_sleep)\s*\(|\bwaitfor\s+delay\b|(\'|")\s*(or|and)\s+\d+\s*=\s*\d+|\bdrop\s+table\b|;\s*shutdown\b)~i',
        'traversal' => '~(\.\./|\.\.\\\\|%2e%2e(%2f|/|%5c)|/etc/passwd|c:\\\\windows)~i',
        'xss' => '~(<\s*script\b|javascript\s*:|\bon(error|load|mouseover)\s*=|<\s*iframe\b|<\s*svg[^>]*\bon\w+\s*=)~i',
        'rce' => '~(\$\{jndi:|\b(php|phar|expect|zip|data)://|;\s*(wget|curl|nc|bash|sh)\b|\|\s*(wget|curl|nc|bash|sh)\b|`[^`]*`)~i',
    ];

    private const AGENTS = '~(sqlmap|nikto|nmap|masscan|acunetix|wpscan|nessus|openvas|dirbuster|gobuster|ffuf|nuclei|zgrab|havij|w3af|netsparker|jorgee)~i';

    public function handle(Request $request, Closure $next): Response
    {
        $cfg = config('dilgo.waf');
        if (! ($cfg['enabled'] ?? true)) {
            return $next($request);
        }
        $ip = (string) $request->ip();
        if (in_array($ip, $cfg['allow_ips'] ?? [], true)) {
            return $next($request);
        }
        if (Cache::has("waf:ban:{$ip}")) {
            return $this->refuse(403, 'Erişimin geçici olarak kısıtlandı.');
        }

        $path = '/'.ltrim(rawurldecode($request->path()), '/');
        if (preg_match(self::PATHS, $path)) {
            return $this->strike($request, 'path', 404, 'Bulunamadı.');
        }

        $query = rawurldecode((string) $request->server('QUERY_STRING', ''));
        foreach (self::PATTERNS as $rule => $re) {
            if (preg_match($re, $path) || ($query !== '' && preg_match($re, $query))) {
                return $this->strike($request, $rule, 403, 'İstek güvenlik kuralına takıldı.');
            }
        }

        if (preg_match(self::AGENTS, (string) $request->userAgent())) {
            return $this->strike($request, 'agent', 403, 'İstek güvenlik kuralına takıldı.');
        }

        $length = (int) $request->server('CONTENT_LENGTH', 0);
        $upload = str_starts_with((string) $request->header('Content-Type'), 'multipart/form-data');
        $limit = 1024 * ($upload ? ($cfg['max_upload_kb'] ?? 8192) : ($cfg['max_body_kb'] ?? 1024));
        if ($length > $limit) {
            return $this->refuse(413, 'Gönderilen veri çok büyük.');
        }

        return $next($request);
    }

    private function strike(Request $request, string $rule, int $status, string $message): Response
    {
        $cfg = config('dilgo.waf');
        $ip = (string) $request->ip();
        $key = "waf:strikes:{$ip}";
        Cache::add($key, 0, now()->addMinutes($cfg['strike_window_minutes'] ?? 10));
        $n = Cache::increment($key);
        if ($n >= ($cfg['strikes'] ?? 8)) {
            Cache::put("waf:ban:{$ip}", true, now()->addMinutes($cfg['ban_minutes'] ?? 60));
            Cache::forget($key);
        }
        Log::warning('waf.block', ['rule' => $rule, 'ip' => $ip, 'method' => $request->method(), 'path' => mb_substr($request->path(), 0, 200), 'strikes' => $n]);

        return $this->refuse($status, $message);
    }

    private function refuse(int $status, string $message): Response
    {
        return response()->json(['message' => $message], $status, ['Cache-Control' => 'no-store']);
    }
}
