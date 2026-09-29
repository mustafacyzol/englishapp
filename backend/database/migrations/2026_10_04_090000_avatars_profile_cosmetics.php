<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Retired keys and the avatar that takes their place. */
    private const RENAMED = ['beard' => 'glasses', 'granny' => 'pinkbob', 'hijab' => 'buns', 'grandpa' => 'afro'];

    public function up(): void
    {
        // The avatar catalogue lives in the database so admins can upload new ones.
        Schema::create('avatars', function (Blueprint $table) {
            $table->id();
            $table->string('key', 40)->unique();
            $table->string('label', 60);
            $table->string('tier', 12)->default('standard'); // standard | premium
            $table->string('image_path')->nullable();        // null = bundled /img/avatars/{key}.webp
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('bio', 120)->nullable()->after('avatar');
        });

        $now = now();
        $rows = [];
        foreach (config('dilgo.avatars.labels') as $tier => $list) {
            foreach ($list as $i => [$key, $label]) {
                $rows[] = ['key' => $key, 'label' => $label, 'tier' => $tier, 'position' => ($tier === 'premium' ? 100 : 0) + $i, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now];
            }
        }
        DB::table('avatars')->insert($rows);

        // Every account gets a picture: retired ones map to a close match, empty ones get one of the standard set.
        foreach (self::RENAMED as $old => $new) {
            DB::table('users')->where('avatar', $old)->update(['avatar' => $new]);
        }
        $standard = array_column(config('dilgo.avatars.labels.standard'), 0);
        DB::table('users')->whereNull('avatar')->orderBy('id')->select('id')->chunkById(500, function ($users) use ($standard) {
            foreach ($users as $u) {
                DB::table('users')->where('id', $u->id)->update(['avatar' => $standard[$u->id % count($standard)]]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('bio'));
        Schema::dropIfExists('avatars');
    }
};
