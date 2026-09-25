<?php

namespace App\Http\Middleware;

use App\Support\Settings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Soft maintenance switch controlled from the admin panel (staff keep access). */
class MaintenanceGate
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Settings::get('maintenance_mode') && ! $request->user('sanctum')?->isStaff()
            && ! $request->is('api/v1/auth/*', 'api/v1/config', 'api/v1/admin/*')) {
            return response()->json(['message' => 'Kısa bir bakım yapıyoruz. Birazdan geri döneceğiz!', 'code' => 'maintenance'], 503);
        }

        return $next($request);
    }
}
