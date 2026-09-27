<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('exam_target', 16)->nullable()->after('motivation');
            $t->date('exam_date')->nullable()->after('exam_target');
            $t->string('google_id', 64)->nullable()->unique()->after('email');
            $t->string('apple_id', 64)->nullable()->unique()->after('google_id');
        });

        Schema::table('institutions', function (Blueprint $t) {
            $t->string('logo_url', 500)->nullable();
            $t->string('brand_color', 9)->nullable();
        });

        // Partner brands whose gifts and coupons can drop from the mystery chest.
        Schema::create('partners', function (Blueprint $t) {
            $t->id();
            $t->string('name', 80);
            $t->string('slug', 80)->unique();
            $t->string('logo_url', 500)->nullable();
            $t->string('website', 300)->nullable();
            $t->string('description', 300)->nullable();
            $t->string('color', 9)->nullable();
            $t->boolean('is_active')->default(true);
            $t->unsignedInteger('position')->default(0);
            $t->timestamps();
        });

        Schema::create('partner_offers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $t->string('title', 120);
            $t->string('description', 300)->nullable();
            $t->string('terms', 500)->nullable();
            $t->string('code_prefix', 12)->default('DG');
            $t->string('rarity', 16)->default('rare');
            $t->unsignedInteger('weight')->default(1);
            $t->unsignedInteger('stock')->nullable(); // null = unlimited
            $t->unsignedInteger('awarded')->default(0);
            $t->unsignedSmallInteger('valid_days')->default(30);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        // Turkish exam track (YDS, YÖKDİL, YDT) and international exams (IELTS, TOEFL).
        Schema::create('exam_questions', function (Blueprint $t) {
            $t->id();
            $t->json('exams');
            $t->string('section', 32)->index();
            $t->string('cefr', 2)->default('B2');
            $t->text('passage')->nullable();
            $t->text('prompt');
            $t->json('options');
            $t->unsignedTinyInteger('answer');
            $t->text('explanation')->nullable();
            $t->unsignedInteger('position')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('exam_attempts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('exam_question_id')->constrained()->cascadeOnDelete();
            $t->string('exam', 16);
            $t->string('section', 32);
            $t->boolean('correct');
            $t->unsignedInteger('ms')->default(0);
            $t->timestamp('created_at')->nullable();
            $t->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_attempts');
        Schema::dropIfExists('exam_questions');
        Schema::dropIfExists('partner_offers');
        Schema::dropIfExists('partners');
        Schema::table('institutions', fn (Blueprint $t) => $t->dropColumn(['logo_url', 'brand_color']));
        Schema::table('users', function (Blueprint $t) {
            $t->dropUnique(['google_id']);
            $t->dropUnique(['apple_id']);
            $t->dropColumn(['exam_target', 'exam_date', 'google_id', 'apple_id']);
        });
    }
};
