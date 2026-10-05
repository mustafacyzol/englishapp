<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The questions a learner got wrong on the path, kept until they are answered
 * right twice on later days. The "Hatalarını onar" stop of each unit serves the
 * ones that are due, so weak spots come back instead of being forgotten.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_mistakes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('ex_index');
            $table->string('skill', 20)->nullable();
            $table->unsignedSmallInteger('misses')->default(1);
            $table->unsignedTinyInteger('streak')->default(0);
            $table->timestamp('due_at')->nullable();
            $table->timestamp('fixed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'lesson_id', 'ex_index']);
            $table->index(['user_id', 'fixed_at', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_mistakes');
    }
};
