<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Models\User;
use App\Services\InstitutionService;
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
            $learner->forceFill(['email_verified_at' => now(), 'onboarded' => true, 'xp_total' => 640, 'gems' => 820, 'streak_current' => 12, 'streak_longest' => 21, 'streak_last_date' => now('Europe/Istanbul')->subDay()->toDateString(),
                'focus_skill' => 'speaking', 'interests' => ['travel', 'movies', 'tech'], 'study_time' => 'evening', 'motivation' => 'job', 'duel_trophies' => 310, 'duel_best' => 340])->save();

            // A demo partner school with a manager, so the institution panel (/kurum) has data.
            $school = Institution::query()->firstOrCreate(['name' => 'Demo Koleji'], ['type' => 'school', 'city' => 'İzmir', 'seats' => 40, 'starts_at' => now()->subMonth(), 'ends_at' => now()->addYear(), 'contact_email' => 'kurum@dilgo.test']);
            $manager = User::query()->firstOrCreate(['email' => 'kurum@dilgo.test'], ['name' => 'Demo Kurum Yöneticisi', 'password' => 'password1']);
            $manager->forceFill(['email_verified_at' => now(), 'onboarded' => true])->save();
            $service = app(InstitutionService::class);
            $service->activate(InstitutionMember::query()->firstOrCreate(['institution_id' => $school->id, 'email' => $manager->email], ['role' => 'manager', 'name' => $manager->name]), $manager);
            $service->activate(InstitutionMember::query()->firstOrCreate(['institution_id' => $school->id, 'email' => $learner->email], ['role' => 'student', 'name' => $learner->name, 'class_name' => '10-A']), $learner);
        }
    }
}
