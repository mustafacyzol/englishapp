<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Per-skill XP per day — powers the four-skill balance, trends and recommendations.
        Schema::table('daily_activities', function (Blueprint $table) {
            foreach (['reading', 'listening', 'speaking', 'writing'] as $s) {
                $table->unsignedInteger("xp_{$s}")->default(0);
            }
        });

        Schema::create('institutions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type', 20)->default('school'); // school | course | company
            $table->string('city', 80)->nullable();
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone', 40)->nullable();
            $table->unsignedInteger('seats')->default(0);
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->string('join_code', 12)->unique();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('institution_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('email');
            $table->string('name')->nullable();
            $table->string('class_name', 60)->nullable();
            $table->string('role', 20)->default('student'); // student | manager
            $table->string('status', 20)->default('invited'); // invited | active | removed
            $table->string('invite_token', 64)->nullable()->unique();
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
            $table->unique(['institution_id', 'email']);
            $table->index(['user_id', 'status']);
        });

        Schema::table('users', function (Blueprint $table) {
            // Personal onboarding answers — used across the product loop.
            $table->string('focus_skill', 20)->nullable();
            $table->json('interests')->nullable();
            $table->string('study_time', 20)->nullable(); // morning | lunch | evening | night
            $table->string('motivation', 30)->nullable();
            // Gölge Düellosu
            $table->unsignedInteger('duel_trophies')->default(0)->index();
            $table->unsignedInteger('duel_best')->default(0);
            $table->foreignId('institution_id')->nullable()->constrained()->nullOnDelete();
        });

        Schema::create('duels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ghost_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ghost_name', 60);
            $table->unsignedInteger('ghost_trophies')->default(0);
            $table->json('ghost_skills')->nullable();
            $table->json('rounds'); // questions + answer keys + ghost replay
            $table->string('status', 20)->default('active'); // active | finished | expired
            $table->unsignedSmallInteger('score')->default(0);
            $table->unsignedSmallInteger('ghost_score')->default(0);
            $table->string('result', 10)->nullable(); // win | loss | draw
            $table->smallInteger('trophies_delta')->default(0);
            $table->smallInteger('ghost_delta')->default(0);
            $table->boolean('ghost_notified')->default(false);
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
            $table->index(['ghost_id', 'finished_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('duels');
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('institution_id');
            $table->dropColumn(['focus_skill', 'interests', 'study_time', 'motivation', 'duel_trophies', 'duel_best']);
        });
        Schema::dropIfExists('institution_members');
        Schema::dropIfExists('institutions');
        Schema::table('daily_activities', function (Blueprint $table) {
            $table->dropColumn(['xp_reading', 'xp_listening', 'xp_speaking', 'xp_writing']);
        });
    }
};
