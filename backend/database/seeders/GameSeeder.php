<?php

namespace Database\Seeders;

use App\Models\Achievement;
use App\Models\AiScenario;
use App\Models\Coupon;
use App\Models\Plan;
use App\Models\Quest;
use App\Models\RewardItem;
use Illuminate\Database\Seeder;

class GameSeeder extends Seeder
{
    public function run(): void
    {
        // ---- Reward items (shop + inventory cards) --------------------------
        $items = [
            ['key' => 'streak_freeze', 'name' => 'Seri Dondurucu', 'description' => 'Bir gün kaçırırsan serini otomatik korur.', 'type' => 'streak_freeze', 'price_gems' => 200, 'icon' => 'snowflake', 'rarity' => 'common'],
            ['key' => 'xp_boost_15', 'name' => '2x XP · 15 dk', 'description' => '15 dakika boyunca kazandığın XP ikiye katlanır.', 'type' => 'xp_boost', 'value' => ['multiplier' => 2, 'minutes' => 15], 'price_gems' => 150, 'icon' => 'bolt', 'rarity' => 'common'],
            ['key' => 'xp_boost_60', 'name' => '2x XP · 1 saat', 'description' => 'Tam bir saat çift XP. Lig haftasının son günü için ideal.', 'type' => 'xp_boost', 'value' => ['multiplier' => 2, 'minutes' => 60], 'price_gems' => 450, 'icon' => 'bolt', 'rarity' => 'rare'],
            ['key' => 'heart_refill', 'name' => 'Can Paketi', 'description' => 'Tüm canlarını anında doldurur.', 'type' => 'heart_refill', 'price_gems' => null, 'icon' => 'heart', 'rarity' => 'common'],
            ['key' => 'gems_100', 'name' => '100 Elmas', 'description' => 'Kasana 100 elmas ekler.', 'type' => 'gems', 'value' => ['amount' => 100], 'icon' => 'gem', 'rarity' => 'common'],
            ['key' => 'premium_3d', 'name' => '3 Gün Premium', 'description' => 'Tüm Premium özellikler 3 gün boyunca açık.', 'type' => 'premium_days', 'value' => ['days' => 3], 'icon' => 'crown', 'rarity' => 'rare'],
            ['key' => 'premium_7d', 'name' => '7 Gün Premium', 'description' => 'Tüm Premium özellikler 7 gün boyunca açık.', 'type' => 'premium_days', 'value' => ['days' => 7], 'icon' => 'crown', 'rarity' => 'epic'],
            ['key' => 'live_lesson', 'name' => 'Canlı Ders Kuponu', 'description' => 'Bayrak Dil Okulları eğitmeniyle 1 ücretsiz canlı ders (online veya şubede).', 'type' => 'live_lesson', 'value' => ['valid_days' => 60], 'icon' => 'school', 'rarity' => 'legendary'],
            ['key' => 'discount_20', 'name' => '%20 İndirim Kartı', 'description' => 'Premium paketlerde tek kullanımlık %20 indirim kuponu üretir.', 'type' => 'discount_coupon', 'value' => ['type' => 'percent', 'value' => 20, 'valid_days' => 30], 'icon' => 'ticket', 'rarity' => 'rare'],
            ['key' => 'discount_school_15', 'name' => 'Kurs İndirimi %15', 'description' => 'Bayrak Dil Okulları yüz yüze kurslarında %15 indirim.', 'type' => 'live_lesson', 'value' => ['valid_days' => 90, 'kind' => 'course_discount'], 'icon' => 'school', 'rarity' => 'epic'],
            ['key' => 'frame_gold', 'name' => 'Altın Çerçeve', 'description' => 'Profil fotoğrafına parıldayan altın çerçeve.', 'type' => 'avatar_frame', 'value' => ['frame' => 'gold'], 'price_gems' => 800, 'icon' => 'frame', 'rarity' => 'epic'],
            ['key' => 'mystery_chest', 'name' => 'Gizemli Sandık', 'description' => 'Elmas, XP takviyesi, seri dondurucu... ya da efsanevi bir kart!', 'type' => 'chest', 'price_gems' => 300, 'icon' => 'chest', 'rarity' => 'rare', 'value' => ['pool' => [
                ['weight' => 40, 'type' => 'gems', 'amount' => 150],
                ['weight' => 25, 'type' => 'item', 'item' => 'xp_boost_15'],
                ['weight' => 20, 'type' => 'item', 'item' => 'streak_freeze'],
                ['weight' => 10, 'type' => 'item', 'item' => 'premium_3d'],
                ['weight' => 4, 'type' => 'item', 'item' => 'discount_20'],
                ['weight' => 1, 'type' => 'item', 'item' => 'live_lesson'],
            ]]],
        ];
        foreach ($items as $i => $item) {
            RewardItem::query()->updateOrCreate(['key' => $item['key']], $item + ['position' => $i, 'value' => $item['value'] ?? null, 'price_gems' => $item['price_gems'] ?? null]);
        }

        // ---- Achievements (tiered badge families) ----------------------------
        $families = [
            ['streak', 'streak', 'flame', 'Ateş', 'günlük seri yap', [[3, 'bronze', 10], [7, 'bronze', 25], [30, 'silver', 100, 'streak_freeze'], [100, 'gold', 300, 'premium_7d'], [365, 'legend', 1000, 'live_lesson']]],
            ['xp', 'xp_total', 'bolt', 'Enerji', 'XP topla', [[100, 'bronze', 10], [1000, 'silver', 50], [5000, 'gold', 200], [20000, 'legend', 500]]],
            ['lessons', 'lessons_completed', 'path', 'Yolcu', 'ders tamamla', [[1, 'bronze', 5], [10, 'bronze', 20], [50, 'silver', 80], [150, 'gold', 250]]],
            ['stories', 'stories_read', 'book', 'Kitap Kurdu', 'hikaye bitir', [[1, 'bronze', 10], [5, 'silver', 40], [25, 'gold', 150, 'discount_20'], [100, 'legend', 500]]],
            ['words', 'words_saved', 'cards', 'Kelime Avcısı', 'kelime kaydet', [[10, 'bronze', 10], [100, 'silver', 60], [500, 'gold', 200]]],
            ['mastery', 'words_mastered', 'brain', 'Hafıza Ustası', 'kelimeyi uzun süreli hafızaya al', [[10, 'silver', 50], [100, 'gold', 250]]],
            ['speaking', 'speaking', 'mic', 'Bülbül', 'konuşma egzersizi yap', [[5, 'bronze', 15], [50, 'silver', 80], [250, 'gold', 250, 'live_lesson']]],
            ['ai', 'ai_messages', 'chat', 'Sohbet Kuşu', 'mesajla Defne ile konuş', [[10, 'bronze', 15], [100, 'silver', 80], [500, 'gold', 250]]],
            ['perfect', 'perfect_lessons', 'target', 'Keskin Nişancı', 'hatasız ders bitir', [[1, 'bronze', 10], [10, 'silver', 50], [50, 'gold', 200]]],
            ['social', 'referrals', 'users', 'Elçi', 'arkadaşını davet et', [[1, 'bronze', 50], [5, 'silver', 200, 'premium_7d'], [20, 'gold', 800, 'live_lesson']]],
            ['league', 'league_top3', 'trophy', 'Kürsü', 'kez ligde ilk 3\'e gir', [[1, 'silver', 50], [10, 'gold', 300]]],
            ['duel', 'duel_wins', 'swords', 'Düellocu', 'Gölge Düellosu kazan', [[1, 'bronze', 10], [10, 'silver', 60], [50, 'gold', 250, 'mystery_chest'], [200, 'legend', 800, 'live_lesson']]],
            ['balance', 'skills_balanced', 'compass', 'Dört Dörtlük', '. seviyeye dört becerinin hepsinde ulaş', [[2, 'bronze', 20], [5, 'silver', 100], [10, 'gold', 400, 'premium_7d']]],
        ];
        $roman = ['I', 'II', 'III', 'IV', 'V'];
        $pos = 0;
        foreach ($families as [$category, $metric, $icon, $name, $verb, $levels]) {
            foreach ($levels as $n => $lvl) {
                [$threshold, $tier, $gems] = $lvl;
                Achievement::query()->updateOrCreate(['key' => "{$category}_{$threshold}"], [
                    'title' => "{$name} {$roman[$n]}",
                    'description' => "{$threshold} {$verb}.",
                    'category' => $category,
                    'metric' => $metric,
                    'threshold' => $threshold,
                    'tier' => $tier,
                    'icon' => $icon,
                    'reward_gems' => $gems,
                    'reward_item_key' => $lvl[3] ?? null,
                    'position' => $pos++,
                ]);
            }
        }
        Achievement::query()->updateOrCreate(['key' => 'night_owl'], ['title' => 'Gece Kuşu', 'description' => 'Hedefini 30 gün tuttur.', 'category' => 'secret', 'metric' => 'goal_days', 'threshold' => 30, 'tier' => 'gold', 'icon' => 'moon', 'reward_gems' => 150, 'is_hidden' => true, 'position' => $pos++]);
        Achievement::query()->updateOrCreate(['key' => 'diamond_league'], ['title' => 'Elmas Efsane', 'description' => 'Elmas Ligi\'ne ulaş.', 'category' => 'secret', 'metric' => 'league_tier', 'threshold' => 9, 'tier' => 'legend', 'icon' => 'diamond', 'reward_gems' => 1000, 'reward_item_key' => 'live_lesson', 'is_hidden' => true, 'position' => $pos++]);

        // ---- Quests ---------------------------------------------------------
        $quests = [
            ['key' => 'daily_xp_30', 'title' => '30 XP kazan', 'metric' => 'xp', 'target' => 30, 'period' => 'daily', 'reward_gems' => 10],
            ['key' => 'daily_lessons_2', 'title' => '2 ders tamamla', 'metric' => 'lessons', 'target' => 2, 'period' => 'daily', 'reward_gems' => 15],
            ['key' => 'daily_speak_5', 'title' => '5 cümle sesli söyle', 'metric' => 'speaking', 'target' => 5, 'period' => 'daily', 'reward_gems' => 15],
            ['key' => 'daily_review_10', 'title' => '10 kelime tekrar et', 'metric' => 'reviews', 'target' => 10, 'period' => 'daily', 'reward_gems' => 10],
            ['key' => 'weekly_story_3', 'title' => '3 hikaye bitir', 'metric' => 'stories', 'target' => 3, 'period' => 'weekly', 'reward_gems' => 60, 'reward_item_key' => 'xp_boost_15'],
            ['key' => 'daily_duel', 'title' => 'Bir Gölge Düellosu yap', 'metric' => 'duels', 'target' => 1, 'period' => 'daily', 'reward_gems' => 15],
            ['key' => 'weekly_duel_wins_5', 'title' => '5 düello kazan', 'metric' => 'duel_wins', 'target' => 5, 'period' => 'weekly', 'reward_gems' => 70, 'reward_item_key' => 'mystery_chest'],
            ['key' => 'weekly_ai_20', 'title' => 'Defne ile 20 mesajlaş', 'metric' => 'ai_messages', 'target' => 20, 'period' => 'weekly', 'reward_gems' => 60],
            ['key' => 'weekly_perfect_5', 'title' => '5 hatasız ders', 'metric' => 'perfect_lessons', 'target' => 5, 'period' => 'weekly', 'reward_gems' => 80, 'reward_item_key' => 'mystery_chest'],
        ];
        foreach ($quests as $q) {
            Quest::query()->updateOrCreate(['key' => $q['key']], $q);
        }

        // ---- Plans ----------------------------------------------------------
        $plans = [
            ['slug' => 'monthly', 'name' => 'Aylık', 'tagline' => 'Esnek başla', 'interval' => 'month', 'duration_days' => 30, 'price' => 149, 'features' => ['Sınırsız can', 'Tüm hikayeler ve sesli okumalar', 'Günde 200 AI mesajı', 'Tüm rol yapma senaryoları', 'Reklamsız'], 'position' => 0],
            ['slug' => 'quarterly', 'name' => '3 Aylık', 'tagline' => 'Alışkanlık kur', 'interval' => 'quarter', 'duration_days' => 90, 'price' => 349, 'compare_at_price' => 447, 'features' => ['Aylık paketin tüm özellikleri', '500 bonus elmas', '1 canlı ders kuponu (Bayrak Dil Okulları)'], 'bonus_gems' => 500, 'live_lesson_credits' => 1, 'badge' => 'En popüler', 'is_featured' => true, 'position' => 1],
            ['slug' => 'yearly', 'name' => 'Yıllık', 'tagline' => 'Akıcılığa kadar', 'interval' => 'year', 'duration_days' => 365, 'price' => 999, 'compare_at_price' => 1788, 'features' => ['Tüm Premium özellikler', '2000 bonus elmas', '4 canlı ders kuponu', 'CEFR seviye sertifikası'], 'bonus_gems' => 2000, 'live_lesson_credits' => 4, 'badge' => '%44 tasarruf', 'position' => 2],
        ];
        foreach ($plans as $p) {
            Plan::query()->updateOrCreate(['slug' => $p['slug']], $p);
        }

        Coupon::query()->updateOrCreate(['code' => 'HOSGELDIN'], ['description' => 'İlk alışverişe %25 indirim', 'type' => 'percent', 'value' => 25, 'first_order_only' => true, 'max_uses_per_user' => 1]);

        // ---- AI role-play scenarios ------------------------------------------
        $scenarios = [
            ['key' => 'meet-a-new-friend', 'title' => 'Yeni biriyle tanış', 'emoji' => '👋', 'category' => 'daily', 'cefr_min' => 'A1', 'description' => 'Dil okulunun bahçesinde yeni bir öğrenciyle tanışıyorsun.',
                'system_prompt' => 'You are Sam, a friendly exchange student from Canada at a language school in Istanbul. You just met the learner in the school garden. Use very simple A1 English.',
                'opening_line' => "Hi there! I'm Sam. I'm new here. What's your name?", 'goals' => ['Adını söyle', 'Nereli olduğunu söyle', 'Sam\'e bir soru sor']],
            ['key' => 'order-at-a-cafe', 'title' => 'Kafede sipariş', 'emoji' => '☕', 'category' => 'travel', 'cefr_min' => 'A1', 'description' => 'Londra\'da bir kafedesin. Siparişini ver ve hesabı öde.',
                'system_prompt' => 'You are a barista at a busy café in London. Take the learner\'s order, suggest a pastry, ask "for here or to take away?" and tell them the price.',
                'opening_line' => 'Hiya! What can I get for you today?', 'goals' => ['İçecek sipariş et', 'Yiyecek bir şey sor ya da iste', 'Hesabı öde']],
            ['key' => 'weekend-story', 'title' => 'Hafta sonun nasıldı?', 'emoji' => '🎒', 'category' => 'daily', 'cefr_min' => 'A2', 'description' => 'İş arkadaşın hafta sonunu soruyor. Geçmiş zamanla anlat.',
                'system_prompt' => 'You are Jess, a curious coworker. It is Monday morning. Ask about the learner\'s weekend and encourage them to use the past simple. Share a short story about your own weekend too.',
                'opening_line' => 'Morning! How was your weekend? Did you do anything fun?', 'goals' => ['Geçmiş zamanla 3 cümle kur', 'Bir yer ya da etkinlik anlat', 'Jess\'e hafta sonunu sor']],
            ['key' => 'airport-check-in', 'title' => 'Havalimanında check-in', 'emoji' => '✈️', 'category' => 'travel', 'cefr_min' => 'A2', 'description' => 'Bagajın biraz ağır ve koltuk seçmek istiyorsun.',
                'system_prompt' => 'You are a check-in agent at Heathrow airport. The learner\'s bag is 2kg overweight. Ask for passport, destination, seat preference and handle the baggage issue politely.',
                'opening_line' => 'Good afternoon. Can I see your passport, please?', 'goals' => ['Pasaportunu ver ve gideceğin yeri söyle', 'Koltuk tercihi yap', 'Fazla bagaj sorununu çöz']],
            ['key' => 'doctor-visit', 'title' => 'Doktorda', 'emoji' => '🩺', 'category' => 'travel', 'cefr_min' => 'A2', 'description' => 'Yurt dışında hastalandın, belirtilerini anlat.',
                'system_prompt' => 'You are a calm GP doctor in Dublin. Ask about the learner\'s symptoms, how long they have had them and any allergies, then give simple advice.', 'is_premium' => true,
                'opening_line' => 'Hello, please have a seat. What seems to be the problem?', 'goals' => ['Belirtilerini anlat', 'Ne zamandır sürdüğünü söyle', 'Doktora bir soru sor']],
            ['key' => 'job-interview', 'title' => 'İş mülakatı', 'emoji' => '💼', 'category' => 'career', 'cefr_min' => 'B1', 'description' => 'Uluslararası bir şirkette ilk mülakatın.',
                'system_prompt' => 'You are Mr Carter, a hiring manager at an international tourism company. Run a realistic but friendly interview: ask about experience, strengths, a difficult situation, and why they want the job. Give the learner space to answer fully.', 'is_premium' => true,
                'opening_line' => 'Thanks for coming in. So, tell me a little about yourself.', 'goals' => ['Kendini tanıt', 'Bir güçlü yönünü örnekle anlat', 'Zor bir durumu nasıl çözdüğünü anlat', 'Şirkete bir soru sor']],
            ['key' => 'ielts-speaking', 'title' => 'IELTS Speaking Part 2', 'emoji' => '🎓', 'category' => 'exam', 'cefr_min' => 'B1', 'description' => 'Sınav formatında 2 dakikalık konuşma ve takip soruları.',
                'system_prompt' => 'You are an IELTS speaking examiner. Give the learner a Part 2 cue card topic, let them speak, then ask two Part 3 follow-up questions. At the end estimate a band score with one tip.', 'is_premium' => true,
                'opening_line' => "Now I'm going to give you a topic. Describe a place you visited that you would like to go back to. You should say where it is, when you went, what you did there, and explain why you'd like to return.", 'goals' => ['Konuyu en az 5 cümleyle anlat', 'Takip sorularına cevap ver', 'Bağlaçlar kullan (however, because, although)']],
            ['key' => 'debate-club', 'title' => 'Münazara kulübü', 'emoji' => '🎤', 'category' => 'fun', 'cefr_min' => 'B1', 'description' => '"Sosyal medya gençlere zarar mı veriyor?" Fikrini savun.',
                'system_prompt' => 'You are Priya, captain of a university debate club. Take the opposite side to whatever the learner argues about social media and young people. Challenge them respectfully and push for reasons and examples.', 'is_premium' => true,
                'opening_line' => 'Okay, today\'s motion: "Social media does more harm than good for teenagers." Which side are you on?', 'goals' => ['Tarafını seç ve bir sebep sun', 'Bir örnek ver', 'Karşı argümana cevap ver']],
        ];
        foreach ($scenarios as $i => $s) {
            AiScenario::query()->updateOrCreate(['key' => $s['key']], $s + ['position' => $i]);
        }
    }
}
