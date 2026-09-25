<?php

namespace App\Services;

use App\Models\Referral;
use App\Models\User;
use App\Support\Settings;

class ReferralService
{
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
        $referral->update(['status' => 'qualified', 'qualified_at' => now()]);
        $referee->increment('gems', (int) Settings::get('referral.referee_gems'));
        $referral->referrer->increment('gems', (int) Settings::get('referral.referrer_gems'));
    }

    /** Friend made the first purchase → inviter gets premium days. */
    public function onFirstPurchase(User $referee): void
    {
        $referral = Referral::query()->where('referee_id', $referee->id)->where('status', 'qualified')->first();
        if (! $referral) {
            return;
        }
        $referral->update(['status' => 'rewarded']);
        $days = (int) Settings::get('referral.referrer_premium_days');
        if ($days > 0) {
            $this->rewards->grant($referral->referrer, 'premium_7d', 'referral', ['from' => $referee->username]);
        }
    }
}
