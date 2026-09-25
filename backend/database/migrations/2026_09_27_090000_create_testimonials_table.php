<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Learner quotes shown on the landing page. Editable from the admin panel so the
        // school publishes its own students' words rather than placeholder copy.
        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('role', 120)->nullable();   // "Üniversite öğrencisi", "Yazılımcı"
            $table->string('avatar')->nullable();
            $table->text('quote');
            $table->string('highlight', 120)->nullable(); // short pull-quote for the ticker
            $table->unsignedTinyInteger('rating')->default(5);
            $table->string('cefr_level', 2)->nullable();
            $table->unsignedSmallInteger('streak')->nullable();
            $table->boolean('is_published')->default(true)->index();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonials');
    }
};
