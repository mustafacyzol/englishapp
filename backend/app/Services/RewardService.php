<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\PartnerOffer;
use App\Models\RewardItem;
use App\Models\Subscription;
use App\Models\User;
use App\Models\UserItem;
use App\Notifications\PartnerGiftWon;
use App\Support\Settings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Inventory ("Ödül Kasası"): every earned reward lands here as a card the user
 * activates when they want, a deliberate, satisfying moment instead of silent grants.
 */
class RewardService
{
    public function grant(User $user, RewardItem|string $item, string $source, array $meta = []): UserItem
    {
        $item = $item instanceof RewardItem ? $item : RewardItem::query()->where('key', $item)->firstOrFail();

        return UserItem::query()->create([
            'user_id' => $user->id,
            'reward_item_id' => $item->id,
            'status' => 'available',
            'source' => $source,
            'meta' => $meta ?: null,
        ]);
    }

    public function grantPremiumDays(User $user, int $days, string $source, ?int $planId = null, ?int $orderId = null): Subscription
    {
        $start = $user->isPremium() ? $user->premium_until : now();
        $end = $start->copy()->addDays($days);
        $user->forceFill(['premium_until' => $end])->save();

        return Subscription::query()->create([
            'user_id' => $user->id,
            'plan_id' => $planId,
            'order_id' => $orderId,
            'source' => $source,
            'starts_at' => $start,
            'ends_at' => $end,
            'status' => 'active',
        ]);
    }

    public function buy(User $user, RewardItem $item): UserItem
    {
        if (! $item->is_active || $item->price_gems === null) {
            throw ValidationException::withMessages(['item' => 'Bu ürün mağazada satılmıyor.']);
        }

        return DB::transaction(function () use ($user, $item) {
            $fresh = User::query()->lockForUpdate()->find($user->id);
            if ($item->type === 'streak_freeze') {
                $owned = UserItem::query()->where('user_id', $user->id)->where('status', 'available')->where('reward_item_id', $item->id)->count();
                if ($owned >= config('dilgo.gamification.streak_freeze_max')) {
                    throw ValidationException::withMessages(['item' => 'En fazla '.config('dilgo.gamification.streak_freeze_max').' seri dondurucu taşıyabilirsin.']);
                }
            }
            if ($fresh->gems < $item->price_gems) {
                throw ValidationException::withMessages(['item' => 'Yeterli elmasın yok.']);
            }
            $fresh->decrement('gems', $item->price_gems);

            return $this->grant($fresh, $item, 'shop');
        });
    }

    /** @return array{message:string, item:UserItem, extra?:array} */
    public function activate(User $user, UserItem $userItem): array
    {
        abort_unless($userItem->user_id === $user->id, 404);
        if ($userItem->status !== 'available') {
            throw ValidationException::withMessages(['item' => 'Bu kart zaten kullanılmış veya aktif.']);
        }
        $item = $userItem->item;
        $value = $item->value ?? [];

        return DB::transaction(function () use ($user, $userItem, $item, $value) {
            $extra = [];
            switch ($item->type) {
                case 'streak_freeze':
                    return ['message' => 'Seri dondurucu hazır bekliyor, bir gün kaçırırsan otomatik devreye girer.', 'item' => $userItem];

                case 'xp_boost':
                    $userItem->update(['status' => 'active', 'activated_at' => now(), 'expires_at' => now()->addMinutes($value['minutes'] ?? 15)]);
                    $message = ($value['multiplier'] ?? 2).'x XP '.($value['minutes'] ?? 15).' dakika boyunca aktif!';
                    break;

                case 'heart_refill':
                    $user->forceFill(['hearts' => User::MAX_HEARTS, 'hearts_updated_at' => now()])->save();
                    $userItem->update(['status' => 'used', 'activated_at' => now()]);
                    $message = 'Canların doldu!';
                    break;

                case 'premium_days':
                    $days = (int) ($value['days'] ?? 7);
                    $this->grantPremiumDays($user, $days, 'reward');
                    $userItem->update(['status' => 'used', 'activated_at' => now()]);
                    $message = "{$days} gün Premium hesabına tanımlandı!";
                    break;

                case 'gems':
                    $amount = (int) ($value['amount'] ?? 50);
                    $user->increment('gems', $amount);
                    $userItem->update(['status' => 'used', 'activated_at' => now()]);
                    $message = "{$amount} elmas eklendi!";
                    break;

                case 'live_lesson':
                    $code = 'BDO-'.strtoupper(Str::random(8));
                    $userItem->update(['status' => 'active', 'activated_at' => now(), 'code' => $code, 'expires_at' => now()->addDays($value['valid_days'] ?? 60)]);
                    $message = 'Canlı ders kuponun hazır! Bu kodu '.config('dilgo.brand.school').' danışmanına ilet.';
                    $extra = ['code' => $code];
                    break;

                case 'discount_coupon':
                    $coupon = Coupon::query()->create([
                        'code' => 'HEDIYE-'.strtoupper(Str::random(6)),
                        'description' => $item->name,
                        'type' => $value['type'] ?? 'percent',
                        'value' => $value['value'] ?? 20,
                        'max_uses' => 1,
                        'max_uses_per_user' => 1,
                        'owner_user_id' => $user->id,
                        'expires_at' => now()->addDays($value['valid_days'] ?? 30),
                    ]);
                    $userItem->update(['status' => 'used', 'activated_at' => now(), 'code' => $coupon->code]);
                    $message = 'İndirim kuponun oluşturuldu: '.$coupon->code;
                    $extra = ['code' => $coupon->code];
                    break;

                case 'avatar_frame':
                    $prefs = $user->preferences ?? [];
                    $prefs['frame'] = $value['frame'] ?? $item->key;
                    $user->forceFill(['preferences' => $prefs])->save();
                    $userItem->update(['status' => 'active', 'activated_at' => now()]);
                    $message = 'Yeni çerçeven profilinde!';
                    break;

                case 'partner_coupon':
                    return ['message' => 'Hediye kodun hazır: '.$userItem->code, 'item' => $userItem, 'extra' => ['code' => $userItem->code]];

                case 'chest':
                    $prize = $this->rollChest($value['pool'] ?? []);
                    $userItem->update(['status' => 'used', 'activated_at' => now()]);
                    [$message, $extra] = $this->award($user, $prize);
                    break;

                default:
                    throw ValidationException::withMessages(['item' => 'Bu kart türü aktif edilemiyor.']);
            }

            return ['message' => $message, 'item' => $userItem->fresh('item'), 'extra' => $extra];
        });
    }

    /**
     * Pays out one chest roll. Partner gifts draw a live offer (weighted, stock-aware)
     * and mint a personal single-use code; if no partner offer is left the roll falls
     * back to gems so a chest never opens empty.
     *
     * @return array{0:string, 1:array}
     */
    private function award(User $user, array $prize): array
    {
        if (($prize['type'] ?? null) === 'partner') {
            $won = Settings::get('features.chest_partners', true) ? $this->grantPartnerGift($user) : null;
            if ($won) {
                return ['Sandıktan iş ortağı hediyesi çıktı: '.$won->meta['offer'].'!', ['prize' => ['type' => 'partner', 'item' => $won->load('item')]]];
            }
            $prize = ['type' => 'gems', 'amount' => 200];
        }
        if (($prize['type'] ?? null) === 'gems') {
            $user->increment('gems', $prize['amount']);

            return ["Sandıktan {$prize['amount']} elmas çıktı!", ['prize' => $prize]];
        }
        $won = $this->grant($user, $prize['item'] ?? 'streak_freeze', 'chest');

        return ['Sandıktan çıktı: '.$won->item->name.'! Kasanda seni bekliyor.', ['prize' => ['type' => 'item', 'item' => $won->load('item')]]];
    }

    public function grantPartnerGift(User $user): ?UserItem
    {
        // Adult-only offers (café, cinema...) never drop for children or teenagers.
        $offers = PartnerOffer::query()->available()->with('partner')
            ->when($user->age_group !== 'adult', fn ($q) => $q->where('audience', 'all'))
            ->lockForUpdate()->get();
        $offer = $this->weighted($offers->all(), fn (PartnerOffer $o) => $o->weight);
        if (! $offer) {
            return null;
        }
        $offer->increment('awarded');
        $item = RewardItem::query()->firstOrCreate(['key' => 'partner_gift'], [
            'name' => 'İş ortağı hediyesi', 'description' => 'Anlaşmalı markalarımızdan hediye kuponu.', 'type' => 'partner_coupon', 'icon' => 'ticket', 'rarity' => 'epic', 'is_active' => true,
        ]);
        do {
            $code = strtoupper($offer->code_prefix).'-'.strtoupper(Str::random(8));
        } while (UserItem::query()->where('code', $code)->exists());

        $won = UserItem::query()->create([
            'user_id' => $user->id,
            'reward_item_id' => $item->id,
            'status' => 'active',
            'source' => 'chest',
            'code' => $code,
            'activated_at' => now(),
            'expires_at' => now()->addDays($offer->valid_days),
            'meta' => [
                'partner' => $offer->partner->name,
                'partner_logo' => $offer->partner->logo_url,
                'partner_url' => $offer->partner->website,
                'color' => $offer->partner->color,
                'offer' => $offer->title,
                'description' => $offer->description,
                'terms' => $offer->terms,
                'rarity' => $offer->rarity,
                'offer_id' => $offer->id,
            ],
        ]);
        $user->notify(new PartnerGiftWon($offer->partner->name, $offer->title, $won->expires_at->format('d.m.Y')));

        return $won;
    }

    /**
     * The published odds of a chest, as the learner sees them before opening.
     *
     * @return list<array{label:string, type:string, rarity:string, chance:float}>
     */
    public function odds(RewardItem $chest, ?User $user = null): array
    {
        $pool = $chest->value['pool'] ?? [];
        $total = max(1, array_sum(array_column($pool, 'weight')));
        $items = RewardItem::query()->whereIn('key', array_filter(array_column($pool, 'item')))->get()->keyBy('key');
        $partners = Settings::get('features.chest_partners', true)
            ? PartnerOffer::query()->available()->with('partner:id,name')->when($user && $user->age_group !== 'adult', fn ($q) => $q->where('audience', 'all'))->get()
            : collect();

        $out = [];
        foreach ($pool as $entry) {
            $type = $entry['type'];
            if ($type === 'partner' && $partners->isEmpty()) {
                $label = 'Elmas (yedek ödül)';
            } else {
                $label = match ($type) {
                    'gems' => ($entry['amount'] ?? 0).' elmas',
                    'partner' => 'İş ortağı hediyesi',
                    default => $items[$entry['item']]->name ?? $entry['item'],
                };
            }
            $out[] = [
                'label' => $label,
                'type' => $type,
                'rarity' => $type === 'partner' ? 'epic' : ($type === 'gems' ? 'common' : ($items[$entry['item']]->rarity ?? 'common')),
                'chance' => round($entry['weight'] * 100 / $total, 1),
                'partners' => $type === 'partner' ? $partners->map(fn ($o) => $o->partner->name.': '.$o->title)->values() : null,
            ];
        }

        return $out;
    }

    /** @param list<array{weight:int, type:string, amount?:int, item?:string}> $pool */
    private function rollChest(array $pool): array
    {
        if (! $pool) {
            return ['type' => 'gems', 'amount' => random_int(20, 80)];
        }

        return $this->weighted($pool, fn ($e) => (int) $e['weight']);
    }

    /** Cryptographically random weighted pick. */
    private function weighted(array $entries, callable $weight): mixed
    {
        $total = array_sum(array_map($weight, $entries));
        if ($total <= 0) {
            return null;
        }
        $roll = random_int(1, $total);
        foreach ($entries as $entry) {
            $roll -= $weight($entry);
            if ($roll <= 0) {
                return $entry;
            }
        }

        return end($entries);
    }
}
