<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/** A school, course or company that bought a block of DilGO seats for its learners. */
class Institution extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'starts_at' => 'date', 'ends_at' => 'date', 'seats' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (Institution $i) {
            $i->slug ??= Str::slug($i->name).'-'.Str::lower(Str::random(4));
            $i->join_code ??= self::generateCode();
        });
    }

    public static function generateCode(): string
    {
        do {
            $code = strtoupper(Str::random(3).'-'.random_int(1000, 9999));
        } while (self::query()->where('join_code', $code)->exists());

        return $code;
    }

    public function members(): HasMany
    {
        return $this->hasMany(InstitutionMember::class);
    }

    /** Active and inside its contract window. */
    public function isCurrent(): bool
    {
        return $this->is_active
            && (! $this->starts_at || $this->starts_at->isPast() || $this->starts_at->isToday())
            && (! $this->ends_at || $this->ends_at->endOfDay()->isFuture());
    }

    public function seatsUsed(): int
    {
        return $this->members()->where('role', 'student')->whereIn('status', ['invited', 'active'])->count();
    }

    public function seatsLeft(): int
    {
        return max(0, $this->seats - $this->seatsUsed());
    }
}
