<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Subscription management from the profile: a learner can say their Premium
 * should end with the current period (with a reason), and ask for a refund
 * inside the 14-day window. Refunds stay an admin decision.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('status');
            $table->string('cancel_reason', 40)->nullable()->after('cancelled_at');
            $table->string('cancel_note', 500)->nullable()->after('cancel_reason');
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('refund_requested_at')->nullable()->after('paid_at');
            $table->string('refund_reason', 500)->nullable()->after('refund_requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', fn (Blueprint $t) => $t->dropColumn(['cancelled_at', 'cancel_reason', 'cancel_note']));
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['refund_requested_at', 'refund_reason']));
    }
};
