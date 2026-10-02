<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Where the learner is in the Turkish school system (ilkokul .. üniversite) and which grade. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('school_stage', 16)->nullable()->after('age_group');
            $t->unsignedTinyInteger('grade')->nullable()->after('school_stage');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['school_stage', 'grade']));
    }
};
