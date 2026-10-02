<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolClass extends Model
{
    protected $guarded = ['id'];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(InstitutionMember::class, 'teacher_member_id');
    }
}
