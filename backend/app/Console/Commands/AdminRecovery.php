<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Break-glass admin recovery over SSH (Hostinger hPanel → SSH access):
 *
 *   php artisan dilgo:admin you@school.com --create --name="Ad Soyad"
 *   php artisan dilgo:admin you@school.com --reset-password --reset-2fa --unlock
 *   php artisan dilgo:admin you@school.com --role=super_admin
 */
class AdminRecovery extends Command
{
    protected $signature = 'dilgo:admin {email}
        {--create : Create the account if it does not exist}
        {--name= : Display name when creating}
        {--role=super_admin : user|editor|admin|super_admin}
        {--reset-password : Generate a new random password}
        {--reset-2fa : Remove TOTP 2FA}
        {--unlock : Clear lockout/ban}';

    protected $description = 'Create or recover an administrator account (break-glass)';

    public function handle(): int
    {
        $email = strtolower($this->argument('email'));
        $role = $this->option('role');
        if (! in_array($role, User::ROLES, true)) {
            $this->error('Invalid role.');

            return self::FAILURE;
        }

        $user = User::withTrashed()->where('email', $email)->first();
        $password = null;

        if (! $user) {
            if (! $this->option('create')) {
                $this->error('User not found. Use --create to create it.');

                return self::FAILURE;
            }
            $password = Str::password(16, symbols: false);
            $user = User::query()->create([
                'name' => $this->option('name') ?: 'Yönetici',
                'email' => $email,
                'password' => $password,
            ]);
            $user->forceFill(['email_verified_at' => now(), 'onboarded' => true])->save();
        }

        if ($user->trashed()) {
            $user->restore();
        }

        $user->role = $role;
        if ($this->option('reset-password')) {
            $password = Str::password(16, symbols: false);
            $user->password = $password;
            $user->tokens()->delete();
        }
        if ($this->option('reset-2fa')) {
            $user->two_factor_secret = null;
            $user->two_factor_confirmed_at = null;
            $user->two_factor_recovery_codes = null;
        }
        if ($this->option('unlock')) {
            $user->failed_logins = 0;
            $user->locked_until = null;
            $user->is_banned = false;
        }
        $user->save();
        Audit::log('admin.recovery_cli', $user, $user, ['role' => $role]);

        $this->info("✔ {$user->email} is now {$role}.");
        if ($password) {
            $this->warn("Temporary password: {$password}");
            $this->line('Log in and change it immediately (Ayarlar → Güvenlik).');
        }

        return self::SUCCESS;
    }
}
