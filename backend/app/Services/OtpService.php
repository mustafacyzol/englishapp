<?php

namespace App\Services;

use App\Mail\OtpCodeMail;
use App\Models\EmailOtp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class OtpService
{
    public const PURPOSES = ['verify_email', 'reset_password', 'admin_login', 'delete_account'];

    /**
     * Create and email a one-time code. Returns seconds until the next resend is allowed.
     */
    public function send(string $email, string $purpose, ?User $user = null): int
    {
        $cooldown = config('dilgo.otp.resend_cooldown_seconds');
        $latest = EmailOtp::query()
            ->where('email', $email)->where('purpose', $purpose)
            ->latest('id')->first();

        if ($latest && $latest->created_at->diffInSeconds(now()) < $cooldown) {
            return (int) ($cooldown - $latest->created_at->diffInSeconds(now()));
        }

        // Invalidate previous open codes for this purpose.
        EmailOtp::query()->where('email', $email)->where('purpose', $purpose)
            ->whereNull('consumed_at')->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, 10 ** config('dilgo.otp.length') - 1), config('dilgo.otp.length'), '0', STR_PAD_LEFT);

        EmailOtp::query()->create([
            'email' => $email,
            'user_id' => $user?->id,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(config('dilgo.otp.ttl_minutes')),
            'ip' => request()?->ip(),
        ]);

        Mail::to($email)->send(new OtpCodeMail($code, $purpose, $user?->name));

        return $cooldown;
    }

    /**
     * Validate a code; consumes it on success. Throws a ValidationException on failure.
     */
    public function verify(string $email, string $purpose, string $code, string $field = 'code'): void
    {
        $otp = EmailOtp::query()
            ->where('email', $email)->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest('id')->first();

        if (! $otp || $otp->expires_at->isPast()) {
            throw ValidationException::withMessages([$field => 'Kodun süresi dolmuş. Lütfen yeni kod iste.']);
        }

        if ($otp->attempts >= config('dilgo.otp.max_attempts')) {
            $otp->update(['consumed_at' => now()]);
            throw ValidationException::withMessages([$field => 'Çok fazla hatalı deneme. Lütfen yeni kod iste.']);
        }

        if (! Hash::check(preg_replace('/\D/', '', $code), $otp->code_hash)) {
            $otp->increment('attempts');
            throw ValidationException::withMessages([$field => 'Kod hatalı.']);
        }

        $otp->update(['consumed_at' => now()]);
    }
}
