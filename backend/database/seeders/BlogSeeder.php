<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use Illuminate\Database\Seeder;

class BlogSeeder extends Seeder
{
    public function run(): void
    {
        $posts = [
            [
                'slug' => 'her-gun-10-dakikada-ingilizce',
                'title' => 'Her gün 10 dakikada İngilizce: işe yarayan bir rutin',
                'category' => 'Öğrenme ipuçları',
                'cover_image' => '/img/blog/routine.webp',
                'reading_minutes' => 5,
                'excerpt' => 'Uzun ama seyrek çalışmak yerine kısa ve düzenli çalışmak neden daha etkili? Sınıflarımızda denediğimiz 10 dakikalık rutini paylaşıyoruz.',
                'body' => "## Neden kısa ve düzenli?\n\nBeynimiz yeni kelimeleri tekrar edildiğinde kalıcı hafızaya taşır. Haftada bir gün üç saat çalışmak yerine her gün 10 dakika çalışan öğrencilerimiz, üç ayın sonunda **iki kat daha fazla kelimeyi** hatırlıyor.\n\n## 10 dakikalık rutin\n\n- **2 dakika — tekrar:** Dünkü kelimeleri kelime kartlarıyla hızlıca tekrar et.\n- **4 dakika — oku ve dinle:** Seviyene uygun kısa bir hikayeyi önce dinle, sonra oku.\n- **3 dakika — konuş:** Hikayedeki iki cümleyi sesli tekrar et ya da Ada'ya hikayeyi anlat.\n- **1 dakika — yaz:** Bugün öğrendiğin bir kelimeyle kendi cümleni kur.\n\n## Seriyi bozmamak için\n\nGünlük hedefini gerçekçi seç. Yoğun bir gününde 5 dakikalık bir tekrar bile serini korur. Tatile çıkacaksan mağazadan bir **seri dondurucu** almayı unutma.\n\n> Küçük adımlar, her gün. Akıcılık böyle gelir.",
            ],
            [
                'slug' => 'turklerin-en-sik-yaptigi-7-ingilizce-hatasi',
                'title' => 'Türklerin en sık yaptığı 7 İngilizce hatası',
                'category' => 'Dilbilgisi',
                'cover_image' => '/img/blog/books.webp',
                'reading_minutes' => 6,
                'excerpt' => '"I am agree", "informations", "I will go to home"… Öğretmenlerimizin sınıfta en çok düzelttiği hataları ve doğrularını derledik.',
                'body' => "## 1. I am agree ❌ → I agree ✅\n\n*Agree* zaten bir fiil. Yanına *am/is/are* gelmez.\n\n## 2. informations ❌ → information ✅\n\n*Information*, *advice*, *furniture* gibi kelimeler sayılamaz; çoğul eki almaz.\n\n## 3. I will go to home ❌ → I will go home ✅\n\n*Home* yön bildirirken *to* almaz.\n\n## 4. I have 25 years old ❌ → I am 25 years old ✅\n\nYaş İngilizcede *to be* ile söylenir.\n\n## 5. He don't like ❌ → He doesn't like ✅\n\n*He / she / it* ile olumsuzda **doesn't** kullanılır.\n\n## 6. I am living in Izmir since 2019 ❌ → I have lived in Izmir since 2019 ✅\n\n*Since* ve *for* ile süregelen durumlar için present perfect kullanılır.\n\n## 7. Explain me ❌ → Explain to me ✅\n\n*Explain* fiili kişiyi doğrudan nesne olarak almaz.\n\nAda, sohbet ederken bu hataları yakalar ve Türkçe açıklar. Birkaç mesajla dene!",
            ],
            [
                'slug' => 'ielts-speaking-hazirlik-rehberi',
                'title' => 'IELTS Speaking için 4 haftalık hazırlık planı',
                'category' => 'Sınavlar',
                'cover_image' => '/img/scenarios/ielts-speaking.webp',
                'reading_minutes' => 7,
                'excerpt' => 'Speaking bölümünde band puanını yükseltmek için akıcılık, kelime çeşitliliği ve telaffuza haftalık odaklanan bir plan.',
                'body' => "## 1. hafta — Akıcılık\n\nHer gün Part 1 sorularına 2 dakika kesintisiz cevap ver. Mükemmel cümleler kurmaya çalışma, konuşmayı sürdür.\n\n## 2. hafta — Part 2 kartları\n\nDilGO'daki **IELTS Speaking Part 2** senaryosunda her gün bir kart çalış. 1 dakika not al, 2 dakika konuş.\n\n## 3. hafta — Kelime ve bağlaçlar\n\n*However, although, on the other hand, as a result* gibi bağlaçları bilinçli kullan. Ada'nın önerdiği yeni kelimeleri kelime defterine ekle.\n\n## 4. hafta — Deneme sınavları\n\nBayrak Dil Okulları'nda bir öğretmenimizle gerçek sınav formatında deneme yap. Canlı ders kuponunu burada kullanabilirsin.\n\n### Son ipucu\n\nSınav günü bilmediğin bir kelimeyle karşılaşırsan susma; *\"It's a kind of…\"* diyerek açıkla. Akıcılık, mükemmellikten daha çok puan getirir.",
            ],
            [
                'slug' => 'is-hayatinda-ingilizce-toplanti-ifadeleri',
                'title' => 'İş hayatında İngilizce: toplantıda işe yarayan 12 ifade',
                'category' => 'Kariyer',
                'cover_image' => '/img/blog/coworkers.webp',
                'reading_minutes' => 4,
                'excerpt' => 'Söz almak, fikir belirtmek, kibarca itiraz etmek… Toplantılarda kendini rahat ifade etmen için hazır kalıplar.',
                'body' => "## Söz almak\n\n- *Could I add something here?*\n- *If I may, I'd like to comment on that.*\n\n## Fikir belirtmek\n\n- *From my point of view, …*\n- *I'm fairly confident that …*\n\n## Kibarca itiraz etmek\n\n- *I see your point, but …*\n- *I'm not sure I completely agree.*\n\n## Netleştirmek\n\n- *Just to clarify, do you mean …?*\n- *Could you go over that again?*\n\n## Toplantıyı bitirmek\n\n- *Let's wrap up here.*\n- *I'll send a summary by email.*\n\nBu ifadeleri DilGO'daki **İş mülakatı** senaryosunda Ada ile pratik edebilirsin.",
            ],
        ];

        foreach ($posts as $i => $p) {
            BlogPost::query()->updateOrCreate(['slug' => $p['slug']], $p + ['published_at' => now()->subDays(3 + $i * 5)]);
        }
    }
}
