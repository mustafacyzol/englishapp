<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('duels', function (Blueprint $table) {
            // Rivals are matched by league, so each duel remembers the rival's league.
            $table->unsignedTinyInteger('ghost_tier')->default(0)->after('ghost_trophies');
        });
    }

    public function down(): void
    {
        Schema::table('duels', fn (Blueprint $table) => $table->dropColumn('ghost_tier'));
    }
};
