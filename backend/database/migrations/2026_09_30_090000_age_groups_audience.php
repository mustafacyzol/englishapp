<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // kid (7-12), teen (13-17), adult (18+): drives tone, content and which gifts can drop.
        Schema::table('users', function (Blueprint $t) {
            $t->string('age_group', 8)->nullable()->after('motivation');
        });
        // 'all' = suitable for every age, 'adult' = 18+ only (e.g. a café or cinema coupon).
        Schema::table('partner_offers', function (Blueprint $t) {
            $t->string('audience', 8)->default('all')->after('rarity');
        });
    }

    public function down(): void
    {
        Schema::table('partner_offers', fn (Blueprint $t) => $t->dropColumn('audience'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('age_group'));
    }
};
