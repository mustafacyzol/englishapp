<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([ContentSeeder::class, GameSeeder::class, CourseSeeder::class, BlogSeeder::class, TestimonialSeeder::class]);

        if (! app()->isProduction()) {
            // Local demo accounts — production admins are created with `php artisan dilgo:admin`.
            $admin = User::query()->firstOrCreate(['email' => 'admin@dilgo.test'], ['name' => 'Demo Admin', 'password' => 'password1']);
            $admin->forceFill(['role' => 'super_admin', 'email_verified_at' => now(), 'onboarded' => true])->save();

            $learner = User::query()->firstOrCreate(['email' => 'ogrenci@dilgo.test'], ['name' => 'Zeynep Yılmaz', 'password' => 'password1', 'learning_goal' => 'career']);
            $learner->forceFill(['email_verified_at' => now(), 'onboarded' => true, 'xp_total' => 640, 'gems' => 820, 'streak_current' => 12, 'streak_longest' => 21, 'streak_last_date' => now('Europe/Istanbul')->subDay()->toDateString()])->save();
        }
    }
}
