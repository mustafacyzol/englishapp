<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Story;
use App\Models\Testimonial;
use App\Models\User;
use App\Support\Settings;
use App\Support\Turnstile;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class PublicController extends Controller
{
    /** Boot config for web + mobile clients. */
    public function config(): JsonResponse
    {
        return response()->json([
            'brand' => config('dilgo.brand.name'),
            'school' => config('dilgo.brand.school'),
            'support_email' => config('dilgo.brand.support_email'),
            'registration_open' => (bool) Settings::get('registration_open', true),
            'maintenance' => (bool) Settings::get('maintenance_mode', false),
            'announcement' => Settings::get('announcement'),
            'captcha' => Turnstile::enabled(),
            'school_cta_url' => Settings::get('school.cta_url'),
            'school_whatsapp' => Settings::get('school.whatsapp'),
            'league_tiers' => config('dilgo.gamification.league.tiers'),
            'daily_goal_options' => config('dilgo.gamification.daily_goal_options'),
        ]);
    }

    public function landing(): JsonResponse
    {
        $data = Cache::remember('landing.stats', 600, fn () => [
            'learners' => User::query()->count(),
            'stories' => Story::query()->where('is_published', true)->count(),
            'featured_stories' => Story::query()->where('is_published', true)->where('is_premium', false)->latest('id')->limit(6)
                ->get(['slug', 'title', 'title_tr', 'cefr_level', 'category', 'cover_image', 'reading_minutes']),
            'testimonials' => Testimonial::query()->where('is_published', true)->orderBy('position')->limit(12)
                ->get(['id', 'name', 'role', 'avatar', 'quote', 'highlight', 'rating', 'cefr_level', 'streak']),
        ]);

        return response()->json($data + ['plans' => Plan::query()->where('is_active', true)->orderBy('position')->get()]);
    }
}
