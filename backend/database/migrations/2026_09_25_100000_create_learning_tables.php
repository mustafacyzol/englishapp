<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('cefr_level', 2)->index();
            $table->string('color', 20)->default('#E4572E');
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });

        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('description')->nullable();
            $table->longText('guidebook')->nullable(); // Turkish grammar notes (markdown)
            $table->string('color', 20)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('skill', 20)->default('mixed'); // reading | listening | speaking | writing | vocabulary | grammar | mixed
            $table->string('kind', 20)->default('lesson'); // lesson | story | ai_talk | checkpoint
            $table->unsignedInteger('position')->default(0);
            $table->unsignedSmallInteger('xp_reward')->default(15);
            $table->boolean('is_premium')->default(false);
            $table->foreignId('story_id')->nullable();
            $table->string('scenario_key')->nullable();
            $table->json('exercises')->nullable();
            $table->timestamps();
        });

        Schema::create('lesson_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('best_score')->default(0);
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->unsignedTinyInteger('crowns')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'lesson_id']);
        });

        Schema::create('stories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('title_tr')->nullable();
            $table->text('summary')->nullable();
            $table->string('cefr_level', 2)->index();
            $table->string('category', 40)->nullable()->index();
            $table->string('cover_image')->nullable();
            $table->string('audio_url')->nullable();
            $table->unsignedSmallInteger('reading_minutes')->default(3);
            $table->unsignedInteger('word_count')->default(0);
            $table->json('paragraphs'); // [{en, tr, audio_start?, audio_end?}]
            $table->json('vocabulary')->nullable(); // [{word, meaning, example}]
            $table->json('questions')->nullable(); // [{q, options[], answer}]
            $table->boolean('is_premium')->default(false);
            $table->boolean('is_published')->default(true)->index();
            $table->unsignedInteger('reads_count')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('story_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('story_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->unsignedTinyInteger('quiz_score')->nullable();
            $table->boolean('bookmarked')->default(false);
            $table->unsignedTinyInteger('rating')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'story_id']);
        });

        Schema::create('user_words', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('word', 120);
            $table->string('translation')->nullable();
            $table->text('example')->nullable();
            $table->string('source', 30)->nullable(); // story | lesson | ai | manual
            $table->unsignedBigInteger('source_id')->nullable();
            // SM-2 spaced repetition
            $table->decimal('ease', 4, 2)->default(2.5);
            $table->unsignedSmallInteger('interval_days')->default(0);
            $table->unsignedSmallInteger('repetitions')->default(0);
            $table->timestamp('due_at')->nullable()->index();
            $table->timestamp('last_reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'word']);
        });

        Schema::create('ai_scenarios', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title');
            $table->string('description')->nullable();
            $table->string('emoji', 16)->nullable();
            $table->string('category', 30)->default('daily'); // daily | travel | career | exam | fun
            $table->string('cefr_min', 2)->default('A1');
            $table->text('system_prompt');
            $table->string('opening_line')->nullable();
            $table->json('goals')->nullable(); // mission checklist
            $table->boolean('is_premium')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('mode', 20)->default('chat'); // chat | roleplay | writing | speaking
            $table->string('scenario_key')->nullable();
            $table->string('title')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_conversation_id')->constrained()->cascadeOnDelete();
            $table->string('role', 12); // user | assistant
            $table->text('content');
            $table->json('feedback')->nullable(); // corrections, score, tips
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        foreach (['ai_messages', 'ai_conversations', 'ai_scenarios', 'user_words', 'story_reads', 'stories', 'lesson_progress', 'lessons', 'units', 'courses'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
