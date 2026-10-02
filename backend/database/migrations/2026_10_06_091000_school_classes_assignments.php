<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Schools: named classes (7-A, 11-Fen) with their English teacher, and homework
 * that teachers give to a class. Lessons and stories complete themselves when the
 * student finishes them; other homework is ticked off by the student.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_classes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $t->string('name', 60);
            $t->unsignedTinyInteger('grade')->nullable();
            $t->foreignId('teacher_member_id')->nullable()->constrained('institution_members')->nullOnDelete();
            $t->timestamps();
            $t->unique(['institution_id', 'name']);
        });
        Schema::create('assignments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $t->string('class_name', 60)->nullable(); // null = the whole school / all of the teacher's classes
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->string('title', 160);
            $t->string('kind', 20); // lesson | story | practice | exam | ai | custom
            $t->string('target', 120)->nullable(); // lesson id, story slug or exam key
            $t->text('note')->nullable();
            $t->timestamp('due_at')->nullable();
            $t->timestamps();
            $t->index(['institution_id', 'class_name']);
        });
        Schema::create('assignment_completions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->timestamp('completed_at');
            $t->unique(['assignment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_completions');
        Schema::dropIfExists('assignments');
        Schema::dropIfExists('school_classes');
    }
};
