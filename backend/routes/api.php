<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\AdminController;
use App\Http\Controllers\Api\Admin\ResourceController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\LearnController;
use App\Http\Controllers\Api\PlacementController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\WordController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ---- Public -------------------------------------------------------------
    Route::get('config', [PublicController::class, 'config']);
    Route::get('landing', [PublicController::class, 'landing']);
    Route::get('plans', [BillingController::class, 'plans']);
    Route::get('stories', [StoryController::class, 'index']);
    Route::get('stories/categories', [StoryController::class, 'categories']);
    Route::get('placement', [PlacementController::class, 'questions']);
    Route::post('placement', [PlacementController::class, 'submit'])->middleware('throttle:10,1');
    Route::get('u/{username}', [GameController::class, 'profile']);

    // Payment provider callbacks (no auth — verified server-to-server)
    Route::post('payments/iyzico/callback', [BillingController::class, 'iyzicoCallback'])->middleware('throttle:60,1');
    Route::get('payments/fake/{uuid}', [BillingController::class, 'fakePay']);

    // ---- Auth ---------------------------------------------------------------
    Route::prefix('auth')->middleware('throttle:auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:otp');
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
    });

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/email/send', [AuthController::class, 'sendVerification'])->middleware('throttle:otp');
        Route::post('auth/email/verify', [AuthController::class, 'verifyEmail'])->middleware('throttle:auth');
        Route::post('auth/admin/challenge', [AuthController::class, 'adminChallenge'])->middleware('throttle:otp');
        Route::post('auth/admin/verify', [AuthController::class, 'adminVerify'])->middleware('throttle:auth');

        // Account & security
        Route::patch('account', [AccountController::class, 'update']);
        Route::post('account/password', [AccountController::class, 'changePassword'])->middleware('throttle:auth');
        Route::get('account/sessions', [AccountController::class, 'sessions']);
        Route::delete('account/sessions/{id}', [AccountController::class, 'revokeSession']);
        Route::post('account/2fa/setup', [AccountController::class, 'twoFactorSetup']);
        Route::post('account/2fa/confirm', [AccountController::class, 'twoFactorConfirm'])->middleware('throttle:auth');
        Route::post('account/2fa/disable', [AccountController::class, 'twoFactorDisable'])->middleware('throttle:auth');
        Route::post('account/delete/request', [AccountController::class, 'requestDeletion'])->middleware('throttle:otp');
        Route::post('account/delete', [AccountController::class, 'destroy'])->middleware('throttle:auth');
        Route::get('notifications', [AccountController::class, 'notifications']);
        Route::post('notifications/read', [AccountController::class, 'readNotifications']);

        // Everything below requires a verified e-mail
        Route::middleware('verified.api')->group(function () {
            Route::get('dashboard', [GameController::class, 'dashboard']);

            // Learn path
            Route::get('courses', [LearnController::class, 'courses']);
            Route::get('path/{course?}', [LearnController::class, 'path']);
            Route::get('units/{unit}/guidebook', [LearnController::class, 'guidebook']);
            Route::get('lessons/{lesson}', [LearnController::class, 'lesson']);
            Route::post('lessons/{lesson}/complete', [LearnController::class, 'complete'])->middleware('throttle:30,1');

            // Stories (reading + listening)
            Route::get('library', [StoryController::class, 'library']);
            Route::get('stories/{story:slug}', [StoryController::class, 'show']);
            Route::post('stories/{story:slug}/progress', [StoryController::class, 'progress']);
            Route::post('stories/{story:slug}/complete', [StoryController::class, 'complete'])->middleware('throttle:20,1');
            Route::post('stories/{story:slug}/bookmark', [StoryController::class, 'bookmark']);
            Route::post('stories/{story:slug}/rate', [StoryController::class, 'rate']);

            // Vocabulary + spaced repetition
            Route::get('words', [WordController::class, 'index']);
            Route::post('words', [WordController::class, 'store'])->middleware('throttle:120,1');
            Route::delete('words/{word}', [WordController::class, 'destroy']);
            Route::get('review', [WordController::class, 'queue']);
            Route::post('review', [WordController::class, 'review'])->middleware('throttle:30,1');

            // AI teacher (speaking + writing)
            Route::get('ai/scenarios', [AiController::class, 'scenarios']);
            Route::get('ai/conversations', [AiController::class, 'conversations']);
            Route::post('ai/conversations', [AiController::class, 'start'])->middleware('throttle:ai');
            Route::get('ai/conversations/{conversation}', [AiController::class, 'show']);
            Route::post('ai/conversations/{conversation}/messages', [AiController::class, 'send'])->middleware('throttle:ai');
            Route::delete('ai/conversations/{conversation}', [AiController::class, 'destroy']);
            Route::post('ai/writing', [AiController::class, 'writing'])->middleware('throttle:ai');

            // Gamification
            Route::get('me/calendar', [GameController::class, 'calendar']);
            Route::get('me/stats', [GameController::class, 'stats']);
            Route::get('quests', [GameController::class, 'quests']);
            Route::post('quests/{userQuest}/claim', [GameController::class, 'claimQuest']);
            Route::get('achievements', [GameController::class, 'achievements']);
            Route::get('league', [GameController::class, 'league']);
            Route::get('hearts', [GameController::class, 'hearts']);
            Route::post('hearts/refill', [GameController::class, 'refillHearts']);
            Route::post('hearts/earn', [GameController::class, 'earnHeart'])->middleware('throttle:10,60');
            Route::get('shop', [GameController::class, 'shop']);
            Route::post('shop/{item}/buy', [GameController::class, 'buy'])->middleware('throttle:30,1');
            Route::get('inventory', [GameController::class, 'inventory']);
            Route::post('inventory/{userItem}/activate', [GameController::class, 'activate'])->middleware('throttle:30,1');
            Route::post('redeem', [GameController::class, 'redeem'])->middleware('throttle:redeem');
            Route::get('referrals', [GameController::class, 'referrals']);

            // Billing
            Route::post('checkout/quote', [BillingController::class, 'quote'])->middleware('throttle:redeem');
            Route::post('checkout', [BillingController::class, 'start'])->middleware('throttle:10,1');
            Route::get('orders', [BillingController::class, 'orders']);
            Route::get('orders/{uuid}', [BillingController::class, 'order']);
        });

        // ---- Admin (step-up token with "admin" ability) ----------------------
        Route::prefix('admin')->middleware('role:staff')->group(function () {
            Route::get('dashboard', [AdminController::class, 'dashboard']);
            Route::get('settings', [AdminController::class, 'settings']);
            Route::put('settings', [AdminController::class, 'updateSettings']);
            Route::post('vouchers', [AdminController::class, 'voucher']);

            Route::middleware('role:admin')->group(function () {
                Route::get('users', [AdminController::class, 'users']);
                Route::get('users/{user}', [AdminController::class, 'user']);
                Route::patch('users/{user}', [AdminController::class, 'updateUser']);
                Route::get('orders', [AdminController::class, 'orders']);
                Route::post('orders/{order}/refund', [AdminController::class, 'refundOrder']);
                Route::get('audit', [AdminController::class, 'audit']);
                Route::post('redeem-codes/generate', [ResourceController::class, 'generateCodes']);
            });

            Route::get('{resource}', [ResourceController::class, 'index']);
            Route::post('{resource}', [ResourceController::class, 'store']);
            Route::get('{resource}/{id}', [ResourceController::class, 'show'])->whereNumber('id');
            Route::put('{resource}/{id}', [ResourceController::class, 'update'])->whereNumber('id');
            Route::delete('{resource}/{id}', [ResourceController::class, 'destroy'])->whereNumber('id');
        });
    });
});
