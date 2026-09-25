<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username', 40)->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role', 20)->default('user')->index(); // user | editor | admin | super_admin
            $table->string('avatar')->nullable();
            $table->string('locale', 5)->default('tr');
            $table->string('timezone', 64)->default('Europe/Istanbul');

            // Learning profile
            $table->string('cefr_level', 2)->default('A1');
            $table->string('learning_goal', 30)->nullable(); // travel | career | exam | school | fun
            $table->unsignedSmallInteger('daily_goal_xp')->default(30);
            $table->boolean('onboarded')->default(false);

            // Gamification
            $table->unsignedInteger('xp_total')->default(0);
            $table->unsignedInteger('gems')->default(50);
            $table->unsignedTinyInteger('hearts')->default(5);
            $table->timestamp('hearts_updated_at')->nullable();
            $table->unsignedInteger('streak_current')->default(0);
            $table->unsignedInteger('streak_longest')->default(0);
            $table->date('streak_last_date')->nullable();
            $table->unsignedTinyInteger('league_tier')->default(0);

            // Growth
            $table->string('referral_code', 16)->unique();
            $table->foreignId('referred_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('premium_until')->nullable()->index();

            // Security
            $table->boolean('is_banned')->default(false);
            $table->string('banned_reason')->nullable();
            $table->unsignedSmallInteger('failed_logins')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->timestamp('last_active_at')->nullable()->index();

            $table->json('preferences')->nullable();
            $table->boolean('marketing_opt_in')->default(false);
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        Schema::create('email_otps', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('purpose', 30); // verify_email | reset_password | admin_login | email_change | delete_account
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
            $table->index(['email', 'purpose']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 80)->index();
            $table->nullableMorphs('subject');
            $table->json('meta')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('email_otps');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
