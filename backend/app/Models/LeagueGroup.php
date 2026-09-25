<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeagueGroup extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['is_closed' => 'boolean'];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(LeagueMembership::class);
    }
}
