<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A finished placement test is kept under a random token. The level is not shown
 * on the spot: it is applied to the account after sign-up (or right away for a
 * signed-in learner) and revealed inside the app.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('placement_results', function (Blueprint $t) {
            $t->id();
            $t->string('token', 64)->unique();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('level', 2);
            $t->unsignedTinyInteger('score');
            $t->json('bands');
            $t->json('skills');
            $t->unsignedSmallInteger('answered');
            $t->timestamp('claimed_at')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_results');
    }
};
