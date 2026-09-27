<?php

namespace Database\Seeders;

use App\Models\Partner;
use Illuminate\Database\Seeder;

/**
 * Chest partners. The school is the real owner brand; the others are clearly
 * labelled sample partners for the admin to replace with signed agreements.
 */
class PartnerSeeder extends Seeder
{
    public function run(): void
    {
        $partners = [
            ['slug' => 'bayrak-dil', 'name' => config('dilgo.brand.school'), 'description' => 'Yüz yüze ve online İngilizce kursları.', 'color' => '#e8403a', 'offers' => [
                ['title' => 'Ücretsiz seviye görüşmesi', 'description' => 'Bir eğitmenle 20 dakikalık birebir konuşma ve seviye analizi.', 'code_prefix' => 'BDO', 'rarity' => 'epic', 'weight' => 3, 'valid_days' => 60],
                ['title' => 'Kurs kaydında %10 indirim', 'description' => 'Tüm yüz yüze grup kurslarında geçerli.', 'code_prefix' => 'BDO', 'rarity' => 'rare', 'weight' => 5, 'valid_days' => 90],
            ]],
            ['slug' => 'ornek-kitapci', 'name' => 'Kitapçı (örnek iş ortağı)', 'description' => 'Örnek kayıt: yönetim panelinden gerçek anlaşmayla değiştir.', 'color' => '#2f7cf6', 'offers' => [
                ['title' => 'İngilizce kitaplarda %15 indirim', 'description' => 'Graded reader ve roman seçkisinde tek kullanımlık.', 'code_prefix' => 'KTP', 'rarity' => 'rare', 'weight' => 6, 'stock' => 500, 'valid_days' => 45],
            ]],
            ['slug' => 'ornek-kahve', 'name' => 'Kahve dükkânı (örnek iş ortağı)', 'description' => 'Örnek kayıt: yönetim panelinden gerçek anlaşmayla değiştir.', 'color' => '#a0612d', 'offers' => [
                ['title' => 'Bir kahve bizden', 'audience' => 'adult', 'description' => 'Siparişini İngilizce ver, kahven hediye.', 'code_prefix' => 'KHV', 'rarity' => 'common', 'weight' => 10, 'stock' => 1000, 'valid_days' => 30],
            ]],
            ['slug' => 'ornek-sinema', 'name' => 'Sinema (örnek iş ortağı)', 'description' => 'Örnek kayıt: yönetim panelinden gerçek anlaşmayla değiştir.', 'color' => '#7a4bd8', 'offers' => [
                ['title' => 'Orijinal dilde film bileti 1+1', 'audience' => 'adult', 'description' => 'Altyazısız seanslarda ikinci bilet hediye.', 'code_prefix' => 'SNM', 'rarity' => 'epic', 'weight' => 4, 'stock' => 200, 'valid_days' => 30],
            ]],
        ];
        foreach ($partners as $i => $p) {
            $offers = $p['offers'];
            unset($p['offers']);
            $partner = Partner::query()->updateOrCreate(['slug' => $p['slug']], $p + ['position' => $i, 'is_active' => true]);
            foreach ($offers as $o) {
                $partner->offers()->updateOrCreate(['title' => $o['title']], $o + ['is_active' => true, 'terms' => 'Kod tek kullanımlıktır, nakde çevrilemez. Geçerlilik süresi kasanda yazar.']);
            }
        }
    }
}
