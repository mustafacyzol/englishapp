<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\AdminController;
use App\Http\Controllers\Api\Admin\ResourceController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\DuelController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\InstitutionController;
use App\Http\Controllers\Api\LearnController;
use App\Http\Controllers\Api\PlacementController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\WordController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ---- Public -------------------------------------------------------------
    Route::get('config', [PublicController::class, 'config']);
    Route::get('economy', [PublicController::class, 'economy']);
    Route::get('avatars', [PublicController::class, 'avatars']);
    Route::get('landing', [PublicController::class, 'landing']);
    Route::get('plans', [BillingController::class, 'plans']);
    Route::get('stories', [StoryController::class, 'index']);
    Route::get('stories/categories', [StoryController::class, 'categories']);
    Route::get('placement', [PlacementController::class, 'questions']);
    Route::post('placement', [PlacementController::class, 'submit'])->middleware('throttle:10,1');
    Route::post('placement/band', [PlacementController::class, 'band'])->middleware('throttle:30,1');
    Route::get('u/{username}', [GameController::class, 'profile']);
    Route::get('blog', [SiteController::class, 'blog']);
    Route::get('blog/{slug}', [SiteController::class, 'post']);
    Route::post('contact', [SiteController::class, 'contact'])->middleware('throttle:5,10');
    Route::post('schools/apply', [SiteController::class, 'schoolApply'])->middleware('throttle:5,10');
    Route::post('newsletter', [SiteController::class, 'subscribe'])->middleware('throttle:5,10');
    Route::post('newsletter/confirm/{token}', [SiteController::class, 'confirmSubscription'])->middleware('throttle:20,1');
    Route::post('newsletter/unsubscribe/{token}', [SiteController::class, 'unsubscribe'])->middleware('throttle:20,1');
    Route::get('invites/{token}', [InstitutionController::class, 'invitation'])->middleware('throttle:30,1');

    // Payment provider callbacks (no auth, verified server-to-server)
    Route::post('payments/iyzico/callback', [BillingController::class, 'iyzicoCallback'])->middleware('throttle:60,1');
    Route::get('payments/fake/{uuid}', [BillingController::class, 'fakePay']);

    // ---- Auth ---------------------------------------------------------------
    Route::prefix('auth')->middleware('throttle:auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:otp');
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
        Route::post('social/{provider}', [AuthController::class, 'social'])->whereIn('provider', ['google', 'apple']);
    });

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('placement/claim', [PlacementController::class, 'claim'])->middleware('throttle:20,1');
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/email/send', [AuthController::class, 'sendVerification'])->middleware('throttle:otp');
        Route::post('auth/email/verify', [AuthController::class, 'verifyEmail'])->middleware('throttle:auth');
        Route::post('auth/admin/challenge', [AuthController::class, 'adminChallenge'])->middleware('throttle:otp');
        Route::post('auth/admin/verify', [AuthController::class, 'adminVerify'])->middleware('throttle:auth');

        // Account & security
        Route::patch('account', [AccountController::class, 'update']);
        Route::post('account/password', [AccountController::class, 'changePassword'])->middleware('throttle:auth');
        Route::get('account/sessions', [AccountController::class, 'sessions']);
        Route::get('account/subscription', [AccountController::class, 'subscription']);
        Route::post('account/subscription/cancel', [AccountController::class, 'cancelSubscription'])->middleware('throttle:10,1');
        Route::post('account/subscription/resume', [AccountController::class, 'resumeSubscription'])->middleware('throttle:10,1');
        Route::delete('account/sessions/{id}', [AccountController::class, 'revokeSession']);
        Route::post('account/2fa/setup', [AccountController::class, 'twoFactorSetup']);
        Route::post('account/2fa/confirm', [AccountController::class, 'twoFactorConfirm'])->middleware('throttle:auth');
        Route::post('account/2fa/disable', [AccountController::class, 'twoFactorDisable'])->middleware('throttle:auth');
        Route::post('account/delete/request', [AccountController::class, 'requestDeletion'])->middleware('throttle:otp');
        Route::post('account/delete', [AccountController::class, 'destroy'])->middleware('throttle:auth');
        Route::get('notifications', [AccountController::class, 'notifications']);

        // Institutions (B2B seats)
        Route::post('invites/{token}/accept', [InstitutionController::class, 'accept'])->middleware('throttle:10,1');
        Route::post('institution/join', [InstitutionController::class, 'join'])->middleware('throttle:10,1');
        Route::get('institution', [InstitutionController::class, 'show']);
        Route::patch('institution', [InstitutionController::class, 'update'])->middleware('throttle:20,1');
        Route::post('institution/logo', [InstitutionController::class, 'uploadLogo'])->middleware('throttle:10,1');
        Route::delete('institution/logo', [InstitutionController::class, 'deleteLogo']);
        Route::post('institution/invite', [InstitutionController::class, 'invite'])->middleware('throttle:20,1');
        Route::delete('institution/members/{member}', [InstitutionController::class, 'removeMember']);
        Route::patch('institution/members/{member}', [InstitutionController::class, 'moveMember']);
        Route::post('institution/classes', [InstitutionController::class, 'saveClass'])->middleware('throttle:30,1');
        Route::patch('institution/classes/{class}', [InstitutionController::class, 'saveClass'])->middleware('throttle:30,1');
        Route::delete('institution/classes/{class}', [InstitutionController::class, 'deleteClass']);
        Route::get('institution/assignments', [InstitutionController::class, 'assignments']);
        Route::post('institution/assignments', [InstitutionController::class, 'createAssignment'])->middleware('throttle:30,1');
        Route::delete('institution/assignments/{assignment}', [InstitutionController::class, 'deleteAssignment']);
        Route::get('institution/catalog', [InstitutionController::class, 'catalog']);
        Route::get('me/assignments', [InstitutionController::class, 'myAssignments']);
        Route::get('me/school-league', [InstitutionController::class, 'myLeaderboard']);
        Route::get('institution/leaderboard', [InstitutionController::class, 'leaderboard']);
        Route::post('me/assignments/{assignment}/done', [InstitutionController::class, 'markDone'])->middleware('throttle:30,1');
        Route::post('notifications/read', [AccountController::class, 'readNotifications']);
        Route::post('notifications/{id}/read', [AccountController::class, 'readNotification']);
        Route::delete('notifications/{id}', [AccountController::class, 'deleteNotification']);
        Route::delete('notifications', [AccountController::class, 'clearNotifications']);

        // Everything below requires a verified e-mail
        Route::post('speech', [AiController::class, 'speech'])->middleware('throttle:240,1');
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
            Route::get('words/deck', [WordController::class, 'deck']);
            Route::get('word-sets', [\App\Http\Controllers\Api\WordSetController::class, 'index']);
            Route::get('word-sets/{set}', [\App\Http\Controllers\Api\WordSetController::class, 'show']);
            Route::middleware('throttle:60,1')->group(function () {
                Route::post('word-sets', [\App\Http\Controllers\Api\WordSetController::class, 'store']);
                Route::put('word-sets/{set}', [\App\Http\Controllers\Api\WordSetController::class, 'update']);
                Route::delete('word-sets/{set}', [\App\Http\Controllers\Api\WordSetController::class, 'destroy']);
                Route::post('word-sets/{set}/save', [\App\Http\Controllers\Api\WordSetController::class, 'save']);
                Route::post('word-sets/{set}/copy', [\App\Http\Controllers\Api\WordSetController::class, 'copy']);
                Route::post('word-sets/{set}/learn', [\App\Http\Controllers\Api\WordSetController::class, 'learn']);
                Route::post('word-sets/{set}/played', [\App\Http\Controllers\Api\WordSetController::class, 'played']);
            });
            Route::post('review', [WordController::class, 'review'])->middleware('throttle:30,1');

            // AI teacher (speaking + writing)
            Route::get('ai/scenarios', [AiController::class, 'scenarios']);
            Route::get('ai/conversations', [AiController::class, 'conversations']);
            Route::post('ai/conversations', [AiController::class, 'start'])->middleware(['feature:ai', 'throttle:ai']);
            Route::get('ai/conversations/{conversation}', [AiController::class, 'show']);
            Route::post('ai/conversations/{conversation}/messages', [AiController::class, 'send'])->middleware(['feature:ai', 'throttle:ai']);
            Route::delete('ai/conversations/{conversation}', [AiController::class, 'destroy']);
            Route::post('ai/tts', [AiController::class, 'tts'])->middleware(['feature:ai', 'throttle:60,1']);
            Route::post('ai/writing', [AiController::class, 'writing'])->middleware(['feature:ai', 'throttle:ai']);

            // Gamification
            Route::get('me/calendar', [GameController::class, 'calendar']);
            Route::get('me/stats', [GameController::class, 'stats']);
            Route::get('me/skills', [GameController::class, 'skills']);
            Route::get('quests', [GameController::class, 'quests']);
            Route::post('quests/{userQuest}/claim', [GameController::class, 'claimQuest']);
            Route::get('achievements', [GameController::class, 'achievements']);
            Route::get('league', [GameController::class, 'league'])->middleware('feature:leagues');
            Route::get('hearts', [GameController::class, 'hearts']);
            Route::post('hearts/refill', [GameController::class, 'refillHearts']);
            Route::post('hearts/earn', [GameController::class, 'earnHeart'])->middleware('throttle:10,60');
            Route::get('shop', [GameController::class, 'shop']);
            Route::post('shop/{item}/buy', [GameController::class, 'buy'])->middleware('throttle:30,1');
            Route::get('inventory', [GameController::class, 'inventory']);
            Route::get('coupons', [GameController::class, 'coupons']);
            Route::post('coupons/{userItem}/used', [GameController::class, 'couponUsed'])->middleware('throttle:30,1');
            Route::post('inventory/{userItem}/activate', [GameController::class, 'activate'])->middleware('throttle:30,1');
            Route::post('redeem', [GameController::class, 'redeem'])->middleware('throttle:redeem');
            Route::get('referrals', [GameController::class, 'referrals']);
            Route::get('rewards/roadmap', [GameController::class, 'roadmap']);

            // Gölge Düellosu
            Route::get('duel', [DuelController::class, 'index'])->middleware('feature:duel');
            Route::post('duel', [DuelController::class, 'start'])->middleware(['feature:duel', 'throttle:20,1']);
            Route::post('duel/{duel}/finish', [DuelController::class, 'finish'])->middleware('throttle:30,1');
            Route::get('arena/lobby', [DuelController::class, 'lobby'])->middleware(['feature:duel', 'throttle:60,1']);
            Route::post('arena/queue', [DuelController::class, 'queue'])->middleware(['feature:duel', 'throttle:20,1']);
            Route::get('arena/queue', [DuelController::class, 'queue'])->middleware(['feature:duel', 'throttle:90,1']);
            Route::delete('arena/queue', [DuelController::class, 'leave']);
            Route::post('duel/{duel}/progress', [DuelController::class, 'progress'])->middleware('throttle:120,1');
            Route::get('duel/{duel}/rival', [DuelController::class, 'rival'])->middleware('throttle:120,1');

            // Sınav modu (YDS, YÖKDİL, YDT, IELTS, TOEFL)
            Route::get('exam', [ExamController::class, 'index'])->middleware('feature:exam');
            Route::get('exam/practice', [ExamController::class, 'practice'])->middleware(['feature:exam', 'throttle:60,1']);
            Route::get('exam/mock', [ExamController::class, 'mock'])->middleware(['feature:exam', 'throttle:20,1']);
            Route::post('exam/answer', [ExamController::class, 'answer'])->middleware(['feature:exam', 'throttle:120,1']);

            // Billing
            Route::post('checkout/quote', [BillingController::class, 'quote'])->middleware('throttle:redeem');
            Route::post('checkout', [BillingController::class, 'start'])->middleware('throttle:10,1');
            Route::get('orders', [BillingController::class, 'orders']);
            Route::get('orders/{uuid}', [BillingController::class, 'order']);
        });

        // ---- Admin (step-up token with "admin" ability) ----------------------
        Route::prefix('admin')->middleware('role:staff')->group(function () {
            Route::get('dashboard', [AdminController::class, 'dashboard']);
            Route::get('settings', [AdminController::class, 'settings'])->middleware('perm:settings');
            Route::put('settings', [AdminController::class, 'updateSettings'])->middleware('perm:settings');
            Route::get('integrations', [AdminController::class, 'integrations'])->middleware('perm:settings');
            Route::put('integrations', [AdminController::class, 'updateIntegrations'])->middleware('perm:settings');
            Route::post('integrations/test-mail', [AdminController::class, 'testMail'])->middleware(['perm:settings', 'throttle:5,1']);
            Route::post('vouchers', [AdminController::class, 'voucher'])->middleware('perm:desk');

            Route::middleware('perm:users')->group(function () {
                Route::get('users', [AdminController::class, 'users']);
                Route::post('users', [AdminController::class, 'createUser'])->middleware('throttle:30,1');
                Route::get('users/{user}', [AdminController::class, 'user']);
                Route::patch('users/{user}', [AdminController::class, 'updateUser']);
            });
            Route::get('staff', [AdminController::class, 'staff'])->middleware('role:super_admin');
            Route::middleware('perm:sales')->group(function () {
                Route::get('revenue', [AdminController::class, 'revenue']);
                Route::get('subscribers', [AdminController::class, 'subscribers']);
                Route::get('orders', [AdminController::class, 'orders']);
                Route::post('orders/{order}/refund', [AdminController::class, 'refundOrder']);
            });
            Route::get('audit', [AdminController::class, 'audit'])->middleware('perm:audit');
            Route::post('newsletter/send', [AdminController::class, 'sendNewsletter'])->middleware(['perm:marketing', 'throttle:10,60']);
            Route::post('redeem-codes/generate', [ResourceController::class, 'generateCodes'])->middleware('perm:gamification');
            Route::post('avatars/upload', [AdminController::class, 'uploadAvatar'])->middleware(['perm:gamification', 'throttle:30,1']);
            Route::middleware('perm:institutions')->group(function () {
                Route::get('institutions/{institution}/report', [AdminController::class, 'institutionReport']);
                Route::post('institutions/{institution}/invite', [AdminController::class, 'institutionInvite']);
                Route::delete('institution-members/{member}', [AdminController::class, 'institutionRemove']);
            });

            Route::get('{resource}', [ResourceController::class, 'index']);
            Route::post('{resource}', [ResourceController::class, 'store']);
            Route::get('{resource}/{id}', [ResourceController::class, 'show'])->whereNumber('id');
            Route::put('{resource}/{id}', [ResourceController::class, 'update'])->whereNumber('id');
            Route::delete('{resource}/{id}', [ResourceController::class, 'destroy'])->whereNumber('id');
        });
    });
});
