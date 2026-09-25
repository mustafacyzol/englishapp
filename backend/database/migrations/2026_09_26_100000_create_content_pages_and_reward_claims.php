<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('excerpt', 400)->nullable();
            $table->longText('body'); // markdown
            $table->string('cover_image')->nullable();
            $table->string('category', 40)->nullable()->index();
            $table->string('author_name', 80)->default('Bayrak Dil Okulları');
            $table->unsignedSmallInteger('reading_minutes')->default(4);
            $table->boolean('is_published')->default(true)->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->unsignedInteger('views')->default(0);
            $table->timestamps();
        });

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('email');
            $table->string('phone', 30)->nullable();
            $table->string('topic', 30)->default('general'); // general | course | corporate | support | partnership
            $table->text('message');
            $table->string('status', 12)->default('new')->index(); // new | replied | closed
            $table->text('admin_note')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
        });

        // One row per one-time reward (streak milestone, level reward...), so nothing is granted twice.
        Schema::create('reward_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('key', 60);
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['user_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reward_claims');
        Schema::dropIfExists('contact_messages');
        Schema::dropIfExists('blog_posts');
    }
};
