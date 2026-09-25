<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: ->middleware('role:admin') — "admin" also admits super_admin,
 * "staff" admits editor/admin/super_admin.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();
        $ok = match ($role) {
            'staff' => $user?->isStaff(),
            'admin' => $user?->isAdmin(),
            'super_admin' => $user?->isSuperAdmin(),
            default => false,
        };
        abort_unless($ok, 403, 'Bu işlem için yetkin yok.');

        // Staff tokens must have passed the admin second factor.
        abort_unless($request->user()->currentAccessToken()?->can('admin') ?? false, 403, 'Yönetici doğrulaması gerekli.');

        return $next($request);
    }
}
