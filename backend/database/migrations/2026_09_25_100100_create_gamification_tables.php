<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xp_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('amount');
            $table->string('source', 30); // lesson | story | review | ai | quest | achievement | admin
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('week_key', 10)->index(); // 2026-W39
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('daily_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('xp')->default(0);
            $table->unsignedSmallInteger('lessons')->default(0);
            $table->unsignedSmallInteger('stories')->default(0);
            $table->unsignedSmallInteger('reviews')->default(0);
            $table->unsignedSmallInteger('ai_messages')->default(0);
            $table->unsignedSmallInteger('speaking')->default(0);
            $table->unsignedSmallInteger('perfect_lessons')->default(0);
            $table->unsignedSmallInteger('minutes')->default(0);
            $table->boolean('goal_met')->default(false);
            $table->boolean('freeze_used')->default(false);
            $table->unique(['user_id', 'date']);
        });

        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title');
            $table->string('description');
            $table->string('category', 30); // streak | xp | lessons | stories | words | speaking | social | league
            $table->string('metric', 40);
            $table->unsignedInteger('threshold');
            $table->string('tier', 12)->default('bronze'); // bronze | silver | gold | legend
            $table->string('icon', 40)->default('star');
            $table->unsignedInteger('reward_gems')->default(0);
            $table->string('reward_item_key')->nullable();
            $table->boolean('is_hidden')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('user_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('achievement_id')->constrained()->cascadeOnDelete();
            $table->timestamp('unlocked_at');
            $table->timestamp('seen_at')->nullable();
            $table->unique(['user_id', 'achievement_id']);
        });

        Schema::create('quests', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title');
            $table->string('metric', 30); // xp | lessons | stories | reviews | ai_messages | speaking | perfect_lessons
            $table->unsignedInteger('target');
            $table->string('period', 10)->default('daily'); // daily | weekly
            $table->unsignedInteger('reward_gems')->default(10);
            $table->unsignedInteger('reward_xp')->default(0);
            $table->string('reward_item_key')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('user_quests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('quest_id')->constrained()->cascadeOnDelete();
            $table->string('period_key', 12);
            $table->unsignedInteger('progress')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'quest_id', 'period_key']);
        });

        Schema::create('league_groups', function (Blueprint $table) {
            $table->id();
            $table->string('week_key', 10);
            $table->unsignedTinyInteger('tier');
            $table->boolean('is_closed')->default(false);
            $table->timestamps();
            $table->index(['week_key', 'tier']);
        });

        Schema::create('league_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('league_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('week_key', 10);
            $table->unsignedInteger('xp')->default(0);
            $table->unsignedSmallInteger('final_rank')->nullable();
            $table->string('result', 10)->nullable(); // promoted | demoted | stayed
            $table->timestamps();
            $table->unique(['user_id', 'week_key']);
        });
    }

    public function down(): void
    {
        foreach (['league_memberships', 'league_groups', 'user_quests', 'quests', 'user_achievements', 'achievements', 'daily_activities', 'xp_events'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
