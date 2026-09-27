<?php

namespace App\Http\Middleware;

use App\Support\Settings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Blocks a route when the admin has switched its feature off (features.* setting). */
class EnsureFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        abort_unless((bool) Settings::get("features.{$feature}", true), 404, 'Bu özellik şu anda kapalı.');

        return $next($request);
    }
}
