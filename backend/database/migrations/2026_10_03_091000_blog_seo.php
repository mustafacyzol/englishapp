<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->string('seo_title', 70)->nullable()->after('author_name');
            $table->string('seo_description', 170)->nullable()->after('seo_title');
            $table->json('tags')->nullable()->after('seo_description');
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropColumn(['seo_title', 'seo_description', 'tags']);
        });
    }
};
