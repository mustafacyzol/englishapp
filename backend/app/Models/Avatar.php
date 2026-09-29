<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class Avatar extends Model
{
    protected $guarded = ['id'];

    protected $appends = ['url'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('avatars.catalog'));
        static::deleted(function (Avatar $a) {
            Cache::forget('avatars.catalog');
            if ($a->image_path) {
                Storage::disk('public')->delete($a->image_path);
            }
        });
    }

    /** Public URL of an uploaded image; bundled avatars resolve on the client. */
    public function url(): ?string
    {
        return $this->image_path ? Storage::disk('public')->url($this->image_path) : null;
    }

    public function getUrlAttribute(): ?string
    {
        return $this->url();
    }

    /** @return array<string, array{tier: string, label: string, url: ?string}> active avatars by key */
    public static function catalog(): array
    {
        return Cache::remember('avatars.catalog', 600, fn () => static::query()->where('is_active', true)->orderBy('position')->get()
            ->mapWithKeys(fn (Avatar $a) => [$a->key => ['tier' => $a->tier, 'label' => $a->label, 'url' => $a->url()]])->all());
    }

    /** @return list<string> */
    public static function standardKeys(): array
    {
        return array_keys(array_filter(static::catalog(), fn ($a) => $a['tier'] === 'standard'));
    }
}
