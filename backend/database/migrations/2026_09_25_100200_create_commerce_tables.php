<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('tagline')->nullable();
            $table->string('interval', 12)->default('month'); // month | quarter | year | lifetime
            $table->unsignedInteger('duration_days');
            $table->decimal('price', 10, 2);
            $table->decimal('compare_at_price', 10, 2)->nullable();
            $table->string('currency', 3)->default('TRY');
            $table->json('features')->nullable();
            $table->string('badge')->nullable();
            $table->unsignedInteger('bonus_gems')->default(0);
            $table->unsignedSmallInteger('live_lesson_credits')->default(0); // Bayrak Dil Okulları live class vouchers
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('description')->nullable();
            $table->string('type', 10)->default('percent'); // percent | fixed
            $table->decimal('value', 10, 2);
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedSmallInteger('max_uses_per_user')->default(1);
            $table->unsignedInteger('used_count')->default(0);
            $table->decimal('min_amount', 10, 2)->nullable();
            $table->json('plan_ids')->nullable();
            $table->boolean('first_order_only')->default(false);
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete(); // personal / earned coupons
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->string('currency', 3)->default('TRY');
            $table->string('status', 15)->default('pending')->index(); // pending | paid | failed | refunded | cancelled
            $table->string('gateway', 20);
            $table->string('gateway_token')->nullable()->index();
            $table->string('gateway_ref')->nullable();
            $table->json('gateway_payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->decimal('discount', 10, 2);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source', 20)->default('purchase'); // purchase | redeem | reward | admin | referral
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('status', 12)->default('active'); // active | cancelled | expired
            $table->timestamps();
        });

        Schema::create('reward_items', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('description')->nullable();
            // streak_freeze | xp_boost | heart_refill | premium_days | gems | live_lesson | discount_coupon | avatar_frame | chest
            $table->string('type', 30);
            $table->json('value')->nullable();
            $table->unsignedInteger('price_gems')->nullable(); // null = not sold in shop
            $table->string('icon', 40)->default('gift');
            $table->string('rarity', 12)->default('common'); // common | rare | epic | legendary
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('user_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reward_item_id')->constrained()->cascadeOnDelete();
            $table->string('status', 12)->default('available')->index(); // available | active | used | expired
            $table->string('source', 20); // shop | achievement | quest | redeem | referral | league | admin | purchase | chest
            $table->string('code', 24)->nullable()->unique(); // for physical/partner vouchers
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('redeem_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('description')->nullable();
            $table->string('batch', 60)->nullable()->index();
            $table->string('type', 20); // premium_days | gems | item
            $table->unsignedInteger('amount')->default(0);
            $table->foreignId('reward_item_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('max_uses')->default(1);
            $table->unsignedInteger('used_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('redeem_code_uses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('redeem_code_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['redeem_code_id', 'user_id']);
        });

        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referrer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('referee_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('status', 12)->default('pending'); // pending | qualified | rewarded
            $table->timestamp('qualified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['referrals', 'redeem_code_uses', 'redeem_codes', 'user_items', 'reward_items', 'subscriptions', 'coupon_redemptions', 'orders', 'coupons', 'plans'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
