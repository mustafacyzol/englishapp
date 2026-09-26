<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public const ROLES = ['user', 'editor', 'admin', 'super_admin'];

    public const MAX_HEARTS = 5;

    /** Mirror DB defaults so freshly created models behave the same as loaded ones. */
    protected $attributes = [
        'role' => 'user',
        'locale' => 'tr',
        'timezone' => 'Europe/Istanbul',
        'cefr_level' => 'A1',
        'daily_goal_xp' => 30,
        'onboarded' => false,
        'xp_total' => 0,
        'gems' => 50,
        'hearts' => 5,
        'streak_current' => 0,
        'streak_longest' => 0,
        'league_tier' => 0,
        'is_banned' => false,
        'failed_logins' => 0,
        'marketing_opt_in' => false,
    ];

    protected $fillable = [
        'name', 'username', 'email', 'password', 'avatar', 'locale', 'timezone',
        'cefr_level', 'learning_goal', 'daily_goal_xp', 'onboarded', 'marketing_opt_in', 'preferences',
        'focus_skill', 'interests', 'study_time', 'motivation',
    ];

    protected $hidden = [
        'password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
        'failed_logins', 'locked_until', 'last_login_ip', 'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'onboarded' => 'boolean',
            'marketing_opt_in' => 'boolean',
            'is_banned' => 'boolean',
            'preferences' => 'array',
            'interests' => 'array',
            'streak_last_date' => 'date',
            'premium_until' => 'datetime',
            'locked_until' => 'datetime',
            'hearts_updated_at' => 'datetime',
            'last_login_at' => 'datetime',
            'last_active_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            $user->referral_code ??= static::generateReferralCode();
            $user->username ??= static::generateUsername($user->name ?? 'learner');
        });
    }

    public static function generateReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
            $code = preg_replace('/[^A-Z0-9]/', 'X', $code);
        } while (static::withTrashed()->where('referral_code', $code)->exists());

        return $code;
    }

    public static function generateUsername(string $name): string
    {
        $base = Str::of(Str::ascii($name))->lower()->replaceMatches('/[^a-z0-9]+/', '')->limit(20, '')->value() ?: 'learner';
        $candidate = $base;
        while (static::withTrashed()->where('username', $candidate)->exists()) {
            $candidate = $base.random_int(100, 9999);
        }

        return $candidate;
    }

    // --- Roles -------------------------------------------------------------

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'super_admin'], true);
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['editor', 'admin', 'super_admin'], true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isPremium(): bool
    {
        if ($this->premium_until !== null && $this->premium_until->isFuture()) {
            return true;
        }

        // Students on an active institution seat get the full product.
        return $this->institution_id !== null && (bool) $this->institution?->isCurrent();
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function hasTwoFactor(): bool
    {
        return $this->two_factor_confirmed_at !== null && $this->two_factor_secret !== null;
    }

    public function level(): int
    {
        // Smooth curve: level n requires 50 * n^1.6 cumulative XP
        $level = 1;
        while ($this->xp_total >= (int) round(50 * pow($level, 1.6))) {
            $level++;
        }

        return $level;
    }

    public static function xpForLevel(int $level): int
    {
        return $level <= 1 ? 0 : (int) round(50 * pow($level - 1, 1.6));
    }

    // --- Relations ---------------------------------------------------------

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_by_id');
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(Referral::class, 'referrer_id');
    }

    public function lessonProgress(): HasMany
    {
        return $this->hasMany(LessonProgress::class);
    }

    public function storyReads(): HasMany
    {
        return $this->hasMany(StoryRead::class);
    }

    public function words(): HasMany
    {
        return $this->hasMany(UserWord::class);
    }

    public function xpEvents(): HasMany
    {
        return $this->hasMany(XpEvent::class);
    }

    public function dailyActivities(): HasMany
    {
        return $this->hasMany(DailyActivity::class);
    }

    public function userAchievements(): HasMany
    {
        return $this->hasMany(UserAchievement::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(UserItem::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function duels(): HasMany
    {
        return $this->hasMany(Duel::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(AiConversation::class);
    }
}
