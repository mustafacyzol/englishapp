<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    // Web app origin(s) + Capacitor native shells (iOS: capacitor://localhost, Android: https://localhost)
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,capacitor://localhost,https://localhost'))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Client'],
    'exposed_headers' => ['Retry-After', 'X-RateLimit-Remaining'],
    'max_age' => 86400,
    'supports_credentials' => false, // bearer tokens, no cookies → no CSRF surface
];
