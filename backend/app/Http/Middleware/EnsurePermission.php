<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: ->middleware('perm:sales'). Admits staff who hold that admin panel
 * area, and only on a token that passed the admin second factor.
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $area): Response
    {
        $user = $request->user();
        abort_unless($user?->hasPermission($area), 403, 'Bu bölüm için yetkin yok.');
        abort_unless($user->currentAccessToken()?->can('admin') ?? false, 403, 'Yönetici doğrulaması gerekli.');

        return $next($request);
    }
}
