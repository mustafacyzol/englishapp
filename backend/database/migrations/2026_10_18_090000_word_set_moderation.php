<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Moderation for shared word sets: learners report a public set, enough
     * reports hide it until a moderator looks, and a fingerprint of the word
     * list stops the same set being posted over and over.
     */
    public function up(): void
    {
        Schema::table('word_sets', function (Blueprint $t) {
            $t->string('content_hash', 40)->nullable()->after('copied_from_id');
            $t->unsignedInteger('reports_count')->default(0)->after('saves_count');
            $t->timestamp('hidden_at')->nullable()->after('is_public');
            $t->index(['user_id', 'content_hash']);
            $t->index(['is_public', 'hidden_at']);
        });
        Schema::create('word_set_reports', function (Blueprint $t) {
            $t->id();
            $t->foreignId('word_set_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('reason', 20); // spam | inappropriate | wrong | other
            $t->string('note', 300)->nullable();
            $t->timestamp('created_at')->nullable();
            $t->unique(['word_set_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('word_set_reports');
        Schema::table('word_sets', function (Blueprint $t) {
            $t->dropIndex(['user_id', 'content_hash']);
            $t->dropIndex(['is_public', 'hidden_at']);
            $t->dropColumn(['content_hash', 'reports_count', 'hidden_at']);
        });
    }
};
