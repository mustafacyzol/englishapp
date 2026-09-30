<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Live arena: who has the arena open right now (a heartbeat), who is looking
 * for a rival, and the pairing of two duels played at the same time.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('arena_presence', function (Blueprint $t) {
            $t->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $t->string('status', 12)->default('idle'); // idle | searching | matched | playing
            $t->timestamp('last_seen_at')->index();
            $t->timestamp('searching_since')->nullable();
            $t->foreignId('matched_duel_id')->nullable()->constrained('duels')->nullOnDelete();
        });
        Schema::table('duels', function (Blueprint $t) {
            $t->string('match_id', 20)->nullable()->index();
            $t->json('live')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('duels', function (Blueprint $t) {
            $t->dropIndex(['match_id']);
            $t->dropColumn(['match_id', 'live']);
        });
        Schema::dropIfExists('arena_presence');
    }
};
