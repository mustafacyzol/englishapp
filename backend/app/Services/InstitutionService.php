<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Models\User;
use App\Notifications\InstitutionInvite;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * B2B seats: DilGO signs an agreement with a school / course / company and gives
 * it N seats. The institution invites learners by e-mail (or shares a join code);
 * each joined learner gets Premium for the contract period, and the institution's
 * managers follow their progress in the institution panel.
 */
class InstitutionService
{
    /**
     * @param  list<array{email:string,name?:string|null,class_name?:string|null}>  $rows
     * @return array{invited:int, skipped:list<string>}
     */
    public function invite(Institution $inst, array $rows, string $role = 'student', ?User $by = null): array
    {
        $invited = 0;
        $skipped = [];
        foreach ($rows as $row) {
            $email = strtolower(trim($row['email']));
            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $skipped[] = $email;

                continue;
            }
            $existing = $inst->members()->where('email', $email)->first();
            if ($existing && $existing->status !== 'removed') {
                $skipped[] = $email;

                continue;
            }
            if ($role === 'student' && $inst->seatsLeft() <= 0) {
                throw ValidationException::withMessages(['emails' => "Koltuk kotası doldu ({$inst->seats}). Daha fazla öğrenci için DilGO ile iletişime geçin."]);
            }
            $member = $existing ?? new InstitutionMember(['institution_id' => $inst->id, 'email' => $email]);
            $member->fill([
                'name' => $row['name'] ?? $member->name,
                'class_name' => $row['class_name'] ?? $member->class_name,
                'role' => $role,
                'status' => 'invited',
                'invite_token' => Str::random(40),
                'invited_at' => now(),
            ])->save();

            // Already has an account → attach straight away; otherwise e-mail an invite link.
            if ($user = User::query()->where('email', $email)->first()) {
                $this->activate($member, $user);
            } else {
                Notification::route('mail', $email)->notify(new InstitutionInvite($inst, $member));
            }
            $invited++;
        }
        Audit::log('institution.invite', $by, $inst, ['count' => $invited]);

        return ['invited' => $invited, 'skipped' => $skipped];
    }

    public function acceptToken(User $user, string $token): ?InstitutionMember
    {
        $member = InstitutionMember::query()->where('invite_token', $token)->where('status', 'invited')->first();
        if (! $member || ! $member->institution?->isCurrent()) {
            return null;
        }

        return $this->activate($member, $user);
    }

    public function joinByCode(User $user, string $code): InstitutionMember
    {
        $inst = Institution::query()->where('join_code', strtoupper(trim($code)))->first();
        if (! $inst || ! $inst->isCurrent()) {
            throw ValidationException::withMessages(['code' => 'Kod geçersiz ya da kurumun sözleşmesi aktif değil.']);
        }
        $member = $inst->members()->where('email', $user->email)->first();
        if (! $member || $member->status === 'removed') {
            if ($inst->seatsLeft() <= 0) {
                throw ValidationException::withMessages(['code' => 'Bu kurumun koltuk kotası dolu.']);
            }
            $member = $member ?? new InstitutionMember(['institution_id' => $inst->id, 'email' => $user->email]);
            $member->fill(['name' => $user->name, 'role' => 'student', 'status' => 'invited'])->save();
        }

        return $this->activate($member, $user);
    }

    public function activate(InstitutionMember $member, User $user): InstitutionMember
    {
        return DB::transaction(function () use ($member, $user) {
            $member->update(['user_id' => $user->id, 'status' => 'active', 'joined_at' => $member->joined_at ?? now(), 'invite_token' => null, 'name' => $member->name ?? $user->name]);
            $user->forceFill(['institution_id' => $member->institution_id])->save();

            return $member;
        });
    }

    public function remove(InstitutionMember $member): void
    {
        DB::transaction(function () use ($member) {
            if ($member->user_id) {
                User::query()->whereKey($member->user_id)->where('institution_id', $member->institution_id)->update(['institution_id' => null]);
            }
            $member->update(['status' => 'removed', 'invite_token' => null]);
        });
    }

    /** Overview + per-learner progress for the institution panel. */
    public function report(Institution $inst): array
    {
        $members = $inst->members()->where('status', '!=', 'removed')->with('user')->orderBy('class_name')->orderBy('name')->get();
        $game = app(GamificationService::class);
        $weekAgo = now()->subDays(7)->toDateString();

        $rows = $members->map(function (InstitutionMember $m) use ($game, $weekAgo) {
            $u = $m->user;
            $skills = $u ? collect($game->skillReport($u)['skills'])->mapWithKeys(fn ($s) => [$s['key'] => ['level' => $s['level'], 'xp' => $s['xp']]]) : null;

            return [
                'id' => $m->id,
                'name' => $m->name ?? $u?->name,
                'email' => $m->email,
                'class_name' => $m->class_name,
                'role' => $m->role,
                'status' => $m->status,
                'invited_at' => $m->invited_at?->toIso8601String(),
                'joined_at' => $m->joined_at?->toIso8601String(),
                'last_active_at' => $u?->last_active_at?->toIso8601String(),
                'cefr_level' => $u?->cefr_level,
                'xp_total' => $u?->xp_total ?? 0,
                'week_xp' => $u ? (int) $u->dailyActivities()->where('date', '>=', $weekAgo)->sum('xp') : 0,
                'streak' => $u ? $game->effectiveStreak($u) : 0,
                'lessons' => $u ? $u->lessonProgress()->whereNotNull('completed_at')->count() : 0,
                'skills' => $skills,
            ];
        });
        $students = $rows->where('role', 'student');
        $active = $students->filter(fn ($r) => $r['status'] === 'active');

        return [
            'institution' => $inst->only(['id', 'name', 'type', 'city', 'seats', 'join_code', 'starts_at', 'ends_at', 'is_active']) + [
                'seats_used' => $inst->seatsUsed(),
                'current' => $inst->isCurrent(),
            ],
            'summary' => [
                'students' => $students->count(),
                'active' => $active->count(),
                'invited' => $students->where('status', 'invited')->count(),
                'active_this_week' => $active->filter(fn ($r) => $r['week_xp'] > 0)->count(),
                'week_xp' => $active->sum('week_xp'),
                'avg_streak' => round($active->avg('streak') ?? 0, 1),
                'skills' => collect(['reading', 'listening', 'speaking', 'writing'])->mapWithKeys(fn ($s) => [$s => (int) $active->sum(fn ($r) => $r['skills'][$s]['xp'] ?? 0)]),
            ],
            'classes' => $students->pluck('class_name')->filter()->unique()->values(),
            'members' => $rows->values(),
        ];
    }
}
