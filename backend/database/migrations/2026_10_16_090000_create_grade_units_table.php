<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * School-grade units (MEB English programme, grades 2 to 12). Each one gives a
 * learner of that grade the unit titles of their own coursebook on the path,
 * and a lesson with the unit's words and sentences inside the matching CEFR
 * unit (GradeUnitService keeps those lessons in sync).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_units', function (Blueprint $table) {
            $table->id();
            $table->string('track', 8);                       // g2 .. g12
            $table->unsignedSmallInteger('position')->default(0);
            $table->string('title', 120);                     // English, as in the coursebook
            $table->string('title_tr', 120)->nullable();
            $table->json('words');                            // [[en, tr], ...]
            $table->json('sentences')->nullable();            // [[en, tr], ...]
            $table->text('note')->nullable();                 // markdown, shown first in the unit guidebook
            $table->unsignedTinyInteger('slot')->nullable();  // CEFR unit number to sit in; null = spread evenly
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->index(['track', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_units');
    }
};
