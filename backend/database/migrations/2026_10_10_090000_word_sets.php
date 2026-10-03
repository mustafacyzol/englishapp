<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Word sets: ready-made ones by level, exam and topic (user_id null), and the
     * learners' own. Sets can be public, saved by others, copied and extended,
     * played in every word game and assigned by teachers.
     */
    public function up(): void
    {
        Schema::create('word_sets', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $t->string('slug', 120)->nullable()->unique();
            $t->string('title', 120);
            $t->string('description', 300)->nullable();
            $t->string('level', 4)->nullable();      // A1..C1
            $t->string('category', 16)->default('topic'); // level | exam | topic | mine
            $t->string('exam', 16)->nullable();      // lgs, ydt, yds, yokdil, ielts, toefl
            $t->string('cover', 40)->nullable();
            $t->boolean('is_public')->default(false);
            $t->unsignedInteger('words_count')->default(0);
            $t->unsignedInteger('saves_count')->default(0);
            $t->foreignId('copied_from_id')->nullable()->constrained('word_sets')->nullOnDelete();
            $t->timestamps();
            $t->index(['category', 'level']);
            $t->index(['user_id', 'updated_at']);
        });
        Schema::create('word_set_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('word_set_id')->constrained()->cascadeOnDelete();
            $t->string('word', 80);
            $t->string('translation', 160);
            $t->string('example', 255)->nullable();
            $t->unsignedSmallInteger('position')->default(0);
            $t->index(['word_set_id', 'position']);
        });
        Schema::create('word_set_saves', function (Blueprint $t) {
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('word_set_id')->constrained()->cascadeOnDelete();
            $t->timestamp('created_at')->nullable();
            $t->primary(['user_id', 'word_set_id']);
        });
        Schema::create('word_set_plays', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('word_set_id')->constrained()->cascadeOnDelete();
            $t->string('game', 20);
            $t->unsignedSmallInteger('correct')->default(0);
            $t->unsignedSmallInteger('total')->default(0);
            $t->timestamp('created_at')->nullable();
            $t->index(['word_set_id', 'user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('word_set_plays');
        Schema::dropIfExists('word_set_saves');
        Schema::dropIfExists('word_set_items');
        Schema::dropIfExists('word_sets');
    }
};
