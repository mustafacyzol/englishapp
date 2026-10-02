<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Social sign-in: set the OAuth client id(s) to enable the buttons.
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
    ],

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
    ],

    // Defne's voice. With a key set, calls use real speech audio and the avatar's
    // mouth follows the audio level; without it the browser's own voice is used.
    'elevenlabs' => [
        'key' => env('ELEVENLABS_API_KEY'),
        'voice_id' => env('ELEVENLABS_VOICE_ID', 'EXAVITQu4vr4xnSDxMaL'),
        'model' => env('ELEVENLABS_MODEL', 'eleven_multilingual_v2'),
        // optional second voice for words, lessons and stories (defaults to Defne's)
        'narrator_voice_id' => env('ELEVENLABS_NARRATOR_VOICE_ID'),
    ],

    // Other neural voices for words, lessons and stories. Any one is enough; the
    // admin panel (Yönetim > Entegrasyonlar) can set or override them.
    'openai_tts' => [
        'key' => env('OPENAI_TTS_KEY'),
        'voice' => env('OPENAI_TTS_VOICE', 'nova'),
        'model' => env('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts'),
    ],
    'google_tts' => [
        'key' => env('GOOGLE_TTS_KEY'),
        'voice' => env('GOOGLE_TTS_VOICE', 'en-GB-Neural2-C'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
