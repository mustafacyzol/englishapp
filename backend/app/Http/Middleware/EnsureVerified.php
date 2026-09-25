<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->email_verified_at) {
            return response()->json(['message' => 'Önce e-posta adresini doğrulamalısın.', 'code' => 'email_unverified'], 403);
        }

        return $next($request);
    }
}
