<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }

        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(180)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('auth', fn (Request $r) => [
            Limit::perMinute(10)->by('ip:'.$r->ip()),
            Limit::perMinute(5)->by('login:'.strtolower((string) ($r->input('login') ?? $r->input('email'))).$r->ip()),
        ]);
        RateLimiter::for('otp', fn (Request $r) => [
            Limit::perMinute(3)->by('otp-ip:'.$r->ip()),
            Limit::perHour(10)->by('otp:'.($r->user()?->id ?: strtolower((string) $r->input('email')))),
        ]);
        RateLimiter::for('ai', fn (Request $r) => Limit::perMinute(12)->by('ai:'.($r->user()?->id ?: $r->ip())));
        RateLimiter::for('redeem', fn (Request $r) => Limit::perMinute(6)->by('redeem:'.($r->user()?->id ?: $r->ip())));
    }
}
