<?php

namespace App\Support;

use App\Models\RewardItem;
use Illuminate\Support\Facades\Cache;

/**
 * Frames and covers. The built-in ones ship with the app (config/dilgo.php);
 * admins can add more from the shop admin as reward items of type
 * `avatar_frame` / `profile_banner` with a value like
 * {"frame": "lotus", "image": "https://…/lotus.webp", "hole": 0.31} or
 * {"banner": "moda", "image": "https://…/moda.webp", "label": "Moda Sahili"},
 * and set the price there. Those images travel to the app in /config.
 */
class Cosmetics
{
    public static function custom(): array
    {
        return Cache::remember('cosmetics.custom', 300, function () {
            $rows = RewardItem::query()->whereIn('type', ['avatar_frame', 'profile_banner'])->get(['name', 'type', 'value']);
            $out = ['frames' => [], 'banners' => []];
            foreach ($rows as $r) {
                $v = (array) ($r->value ?? []);
                $key = $r->type === 'avatar_frame' ? ($v['frame'] ?? null) : ($v['banner'] ?? null);
                if (! $key || empty($v['image'])) {
                    continue;
                }
                $bucket = $r->type === 'avatar_frame' ? 'frames' : 'banners';
                $out[$bucket][$key] = array_filter([
                    'label' => $v['label'] ?? $r->name,
                    'image' => (string) $v['image'],
                    'hole' => isset($v['hole']) ? (float) $v['hole'] : null,
                    'pos' => $v['pos'] ?? null,
                ], fn ($x) => $x !== null);
            }

            return $out;
        });
    }

    public static function frameKeys(): array
    {
        return array_values(array_unique([...config('dilgo.cosmetics.frames'), ...array_keys(self::custom()['frames'])]));
    }

    public static function bannerKeys(): array
    {
        return array_values(array_unique([...config('dilgo.cosmetics.banners'), ...array_keys(self::custom()['banners'])]));
    }

    public static function forget(): void
    {
        Cache::forget('cosmetics.custom');
    }
}
