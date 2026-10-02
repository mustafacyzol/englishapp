<?php

namespace Database\Seeders;

use App\Models\Testimonial;
use Illuminate\Database\Seeder;

/**
 * Example learner quotes so the landing page is never empty on a fresh install.
 * Replace these with real student feedback from the admin panel before launch.
 */
class TestimonialSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['name' => 'Selin A.', 'role' => 'Üniversite öğrencisi', 'cefr_level' => 'B1', 'streak' => 96, 'highlight' => 'Erasmus mülakatımı İngilizce geçtim.',
                'quote' => 'Defne ile mülakat senaryosunu on kere çalıştım. Gerçek mülakatta ilk defa heyecanlanmadan konuştum. Hikâyelerden topladığım kelimeler de işime yaradı.'],
            ['name' => 'Mert K.', 'role' => 'Yazılım geliştirici', 'cefr_level' => 'B2', 'streak' => 210, 'highlight' => 'Toplantılarda artık susmuyorum.',
                'quote' => 'Günde 10 dakika ayırıyorum, o kadar. Altı ayın sonunda yabancı ekiple toplantılarda fikir söyleyebilir hale geldim. Seri bozulmasın diye her akşam açıyorum.'],
            ['name' => 'Ayşe D.', 'role' => 'Öğretmen', 'cefr_level' => 'A2', 'streak' => 45, 'highlight' => 'Hataları Türkçe açıklaması çok iyi.',
                'quote' => 'Başka uygulamalarda hatanın neden hata olduğunu anlamıyordum. Burada Türkçe açıklıyor ve "biz Türkler burada şunu yaparız" diyor. Fark buradan geliyor.'],
            ['name' => 'Burak Ç.', 'role' => 'Lise öğrencisi', 'cefr_level' => 'A2', 'streak' => 61, 'highlight' => 'Sınav notum 55’ten 84’e çıktı.',
                'quote' => 'Ders çalışmak gibi değil, oyun gibi. Lig sıralamasında arkadaşlarımı geçmek için her gün giriyorum. Not ortalamam da kendiliğinden yükseldi.'],
            ['name' => 'Zeynep Y.', 'role' => 'Hemşire', 'cefr_level' => 'B1', 'streak' => 123, 'highlight' => 'Vardiya aralarında 5 dakika yetiyor.',
                'quote' => 'Kursa gidecek vaktim yok. Vardiya arasında bir hikâye okuyup Defne ile iki cümle konuşuyorum. Kazandığım canlı ders kuponunu da şubede kullandım.'],
            ['name' => 'Emre T.', 'role' => 'İhracat uzmanı', 'cefr_level' => 'B2', 'streak' => 180, 'highlight' => 'Telefonda konuşmaktan korkmuyorum.',
                'quote' => 'En çok sesli sohbet işime yaradı. Telaffuzumu anında düzeltiyor. Müşterilerle telefonda konuşurken eskisi gibi donup kalmıyorum.'],
            ['name' => 'Gülay S.', 'role' => 'Veli · 3. sınıf', 'cefr_level' => 'A1', 'streak' => 38, 'avatar' => 'buns', 'highlight' => 'Kızım her akşam kendisi açıyor.',
                'quote' => 'Ekran süresinden korkuyordum, ama günlük hedef bitince uygulama kendisi "yarın görüşürüz" diyor. Kızım şarkılardaki kelimeleri evde kullanmaya başladı.'],
            ['name' => 'Hakan B.', 'role' => 'İngilizce öğretmeni · ortaokul', 'cefr_level' => 'C1', 'streak' => 74, 'avatar' => 'scientist', 'highlight' => 'Ödevi kimin yaptığını tek ekranda görüyorum.',
                'quote' => 'Sınıflara ödev verip kimin bitirdiğini panelden takip ediyorum. Dinleme ve konuşma pratiği derste vaktimizin yetmediği yeri tamamlıyor.'],
            ['name' => 'Ela N.', 'role' => '7. sınıf öğrencisi', 'cefr_level' => 'A2', 'streak' => 52, 'avatar' => 'ponytail', 'highlight' => 'Arkadaşlarımla düello yapıyoruz.',
                'quote' => 'Gölge Düellosu çok eğlenceli, arkadaşlarım yokken bile gölgeleriyle oynuyorum. İngilizce dersinde parmak kaldırmaya başladım.'],
            ['name' => 'Nihat A.', 'role' => 'Okul müdürü', 'cefr_level' => 'B1', 'streak' => 20, 'avatar' => 'glasses', 'highlight' => 'Bütün okulun İngilizcesi tek raporda.',
                'quote' => 'Hangi sınıf hangi beceride zorlanıyor, öğretmenlerimizle her ay rapordan bakıyoruz. Velilere de somut bir şey gösterebiliyoruz.'],
            ['name' => 'Can Ö.', 'role' => 'Hazırlık öğrencisi', 'cefr_level' => 'B1', 'streak' => 140, 'avatar' => 'headphones', 'highlight' => 'Muafiyeti ilk denemede geçtim.',
                'quote' => 'Akademik okuma parçaları ve yazma geri bildirimi sayesinde hazırlık muafiyet sınavını ilk denemede geçtim. Bir yıl kazandım.'],
            ['name' => 'Sevim K.', 'role' => 'Emekli öğretmen', 'cefr_level' => 'A2', 'streak' => 88, 'avatar' => 'glasses', 'highlight' => 'Torunlarımla İngilizce konuşuyorum.',
                'quote' => 'Yurt dışındaki torunlarımla birkaç cümle konuşabilmek istiyordum. Defne çok sabırlı, yanlış yapınca utandırmıyor.'],
            ['name' => 'Deniz P.', 'role' => '10. sınıf öğrencisi', 'cefr_level' => 'B1', 'streak' => 67, 'avatar' => 'cap', 'highlight' => 'Dizi izlerken altyazıyı kapattım.',
                'quote' => 'Hikâyeleri okurken bilmediğim kelimeye dokunuyorum, sonra oyunlarda tekrar karşıma çıkıyor. Artık sevdiğim diziyi altyazısız izliyorum.'],
            ['name' => 'Merve İ.', 'role' => 'Anne ve muhasebeci', 'cefr_level' => 'A2', 'streak' => 101, 'avatar' => 'braids', 'highlight' => 'Oğlumla birlikte öğreniyoruz.',
                'quote' => 'Akşamları oğlumla aynı anda çalışıyoruz, seri yarışı yapıyoruz. İş yerinde gelen e-postaları artık çeviri programı olmadan okuyorum.'],
        ];

        foreach ($rows as $i => $row) {
            Testimonial::query()->updateOrCreate(
                ['name' => $row['name']],
                $row + ['rating' => 5, 'is_published' => true, 'position' => $i],
            );
        }
    }
}
