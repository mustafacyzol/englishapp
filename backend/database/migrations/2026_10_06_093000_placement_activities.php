<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Per-activity accuracy (choice, sentence building, typing, dictation) for each placement result. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('placement_results', function (Blueprint $table) {
            $table->json('activities')->nullable()->after('skills');
        });
    }

    public function down(): void
    {
        Schema::table('placement_results', fn (Blueprint $t) => $t->dropColumn('activities'));
    }
};
