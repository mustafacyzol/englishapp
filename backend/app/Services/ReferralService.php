<?php

namespace App\Services;

use App\Models\Referral;
use App\Models\User;
use App\Support\Settings;

class ReferralService
{
    /** Invites a referrer is paid for per day; more still count, without gems. */
    public const DAILY_REFERRER_REWARDS = 5;

    public function __construct(private readonly RewardService $rewards) {}

    public function attach(User $referee, ?string $code): void
    {
        if (! $code) {
            return;
        }
        $referrer = User::query()->where('referral_code', strtoupper(trim($code)))->first();
        if (! $referrer || $referrer->id === $referee->id) {
            return;
        }
        $referee->forceFill(['referred_by_id' => $referrer->id])->save();
        Referral::query()->firstOrCreate(['referee_id' => $referee->id], ['referrer_id' => $referrer->id]);
    }

    /** Friend verified e-mail → both sides get gems. */
    public function onVerified(User $referee): void
    {
        $referral = Referral::query()->where('referee_id', $referee->id)->where('status', 'pending')->first();
        if (! $referral) {
            return;
        }
        // one atomic step, so a repeated verification can never pay twice
        $won = Referral::query()->whereKey($referral->id)->where('status', 'pending')->update(['status' => 'qualified', 'qualified_at' => now()]);
        if (! $won) {
            return;
        }
        $referee->increment('gems', (int) Settings::get('referral.referee_gems'));
        // the inviter's gems are capped per day, so throwaway accounts cannot farm them
        $today = Referral::query()->where('referrer_id', $referral->referrer_id)->where('qualified_at', '>=', now()->startOfDay())->count();
        if ($today <= self::DAILY_REFERRER_REWARDS) {
            $referral->referrer->increment('gems', (int) Settings::get('referral.referrer_gems'));
        }
        app(GamificationService::class)->checkAchievements($referral->referrer->fresh());
    }

    /** Friend made the first purchase → inviter gets premium days. */
    public function onFirstPurchase(User $referee): void
    {
        $referral = Referral::query()->where('referee_id', $referee->id)->where('status', 'qualified')->first();
        if (! $referral) {
            return;
        }
        if (! Referral::query()->whereKey($referral->id)->where('status', 'qualified')->update(['status' => 'rewarded'])) {
            return;
        }
        $days = (int) Settings::get('referral.referrer_premium_days');
        if ($days > 0) {
            $this->rewards->grant($referral->referrer, 'premium_7d', 'referral', ['from' => $referee->username]);
        }
    }
}
