<?php

/*
|--------------------------------------------------------------------------
| DilGO platform configuration
|--------------------------------------------------------------------------
| Every tunable business rule lives here so the product team can adjust it
| through .env without touching code. Runtime-editable values (from the admin
| panel) are stored in the `settings` table and read through App\Support\Settings.
*/

return [
    'brand' => [
        'name' => env('APP_NAME', 'DilGO'),
        'school' => env('BRAND_SCHOOL', 'Bayrak Dil Okulları'),
        'support_email' => env('BRAND_SUPPORT_EMAIL', 'destek@dilgo.app'),
        'frontend_url' => rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/'),
    ],

    'otp' => [
        'length' => 6,
        'ttl_minutes' => (int) env('OTP_TTL_MINUTES', 10),
        'max_attempts' => 5,
        'resend_cooldown_seconds' => 60,
    ],

    'security' => [
        'max_failed_logins' => (int) env('SECURITY_MAX_FAILED_LOGINS', 5),
        'lock_minutes' => (int) env('SECURITY_LOCK_MINUTES', 15),
        'admin_email_otp' => (bool) env('ADMIN_REQUIRE_EMAIL_OTP', true),
        'token_ttl_days' => (int) env('AUTH_TOKEN_TTL_DAYS', 60),
        'turnstile_secret' => env('TURNSTILE_SECRET_KEY'),
        'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,capacitor://localhost,https://localhost'))),
    ],

    'gamification' => [
        'heart_regen_minutes' => 30,
        'heart_refill_gems' => 350,
        'streak_freeze_max' => 2,
        'daily_goal_options' => [10, 20, 30, 50],
        'perfect_lesson_bonus_xp' => 5,
        'league' => [
            'group_size' => 30,
            'promote' => 7,
            'demote' => 5,
            'tiers' => ['Bronz', 'Gümüş', 'Altın', 'Safir', 'Yakut', 'Zümrüt', 'Ametist', 'İnci', 'Obsidyen', 'Elmas'],
            'top3_gems' => [100, 60, 40],
        ],
    ],

    'referral' => [
        'referee_gems' => 100,       // new user gets on email verification
        'referrer_gems' => 150,      // inviter gets when friend verifies email
        'referrer_premium_days' => 7, // inviter gets when friend makes first purchase
    ],

    'ai' => [
        'enabled' => (bool) env('AI_ENABLED', true),
        'api_key' => env('ANTHROPIC_API_KEY'),
        'model' => env('AI_MODEL', 'claude-opus-5'),
        'effort' => env('AI_EFFORT', 'low'), // tutor chat is latency-sensitive
        'max_tokens' => (int) env('AI_MAX_TOKENS', 2048),
        'history_messages' => 20,
        'daily_limit_free' => (int) env('AI_DAILY_LIMIT_FREE', 10),
        'daily_limit_premium' => (int) env('AI_DAILY_LIMIT_PREMIUM', 200),
    ],

    'payments' => [
        'gateway' => env('PAYMENT_GATEWAY', 'fake'), // iyzico | fake
        'iyzico' => [
            'api_key' => env('IYZICO_API_KEY'),
            'secret_key' => env('IYZICO_SECRET_KEY'),
            'base_url' => env('IYZICO_BASE_URL', 'https://sandbox-api.iyzipay.com'),
        ],
    ],
];
