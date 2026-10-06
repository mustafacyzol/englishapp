<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Defne AI as its own package: a plan sells Premium, Defne or both, a
     * learner holds each until its own date, and a subscription remembers
     * which one it granted (so a refund takes back the right days).
     */
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $t) {
            $t->string('tier', 12)->default('premium')->after('slug'); // premium | defne | plus
            $t->index(['tier', 'interval']);
        });
        Schema::table('users', function (Blueprint $t) {
            $t->timestamp('defne_until')->nullable()->after('premium_until');
        });
        Schema::table('subscriptions', function (Blueprint $t) {
            $t->string('tier', 12)->default('premium')->after('plan_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', fn (Blueprint $t) => $t->dropColumn('tier'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('defne_until'));
        Schema::table('plans', function (Blueprint $t) {
            $t->dropIndex(['tier', 'interval']);
            $t->dropColumn('tier');
        });
    }
};
