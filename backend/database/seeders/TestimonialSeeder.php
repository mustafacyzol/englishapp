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
                'quote' => 'Ada ile mülakat senaryosunu on kere çalıştım. Gerçek mülakatta ilk defa heyecanlanmadan konuştum. Hikâyelerden topladığım kelimeler de işime yaradı.'],
            ['name' => 'Mert K.', 'role' => 'Yazılım geliştirici', 'cefr_level' => 'B2', 'streak' => 210, 'highlight' => 'Toplantılarda artık susmuyorum.',
                'quote' => 'Günde 10 dakika ayırıyorum, o kadar. Altı ayın sonunda yabancı ekiple toplantılarda fikir söyleyebilir hale geldim. Seri bozulmasın diye her akşam açıyorum.'],
            ['name' => 'Ayşe D.', 'role' => 'Öğretmen', 'cefr_level' => 'A2', 'streak' => 45, 'highlight' => 'Hataları Türkçe açıklaması çok iyi.',
                'quote' => 'Başka uygulamalarda hatanın neden hata olduğunu anlamıyordum. Burada Türkçe açıklıyor ve "biz Türkler burada şunu yaparız" diyor. Fark buradan geliyor.'],
            ['name' => 'Burak Ç.', 'role' => 'Lise öğrencisi', 'cefr_level' => 'A2', 'streak' => 61, 'highlight' => 'Sınav notum 55’ten 84’e çıktı.',
                'quote' => 'Ders çalışmak gibi değil, oyun gibi. Lig sıralamasında arkadaşlarımı geçmek için her gün giriyorum. Not ortalamam da kendiliğinden yükseldi.'],
            ['name' => 'Zeynep Y.', 'role' => 'Hemşire', 'cefr_level' => 'B1', 'streak' => 123, 'highlight' => 'Vardiya aralarında 5 dakika yetiyor.',
                'quote' => 'Kursa gidecek vaktim yok. Vardiya arasında bir hikâye okuyup Ada ile iki cümle konuşuyorum. Kazandığım canlı ders kuponunu da şubede kullandım.'],
            ['name' => 'Emre T.', 'role' => 'İhracat uzmanı', 'cefr_level' => 'B2', 'streak' => 180, 'highlight' => 'Telefonda konuşmaktan korkmuyorum.',
                'quote' => 'En çok sesli sohbet işime yaradı. Telaffuzumu anında düzeltiyor. Müşterilerle telefonda konuşurken eskisi gibi donup kalmıyorum.'],
        ];

        foreach ($rows as $i => $row) {
            Testimonial::query()->updateOrCreate(
                ['name' => $row['name']],
                $row + ['rating' => 5, 'is_published' => true, 'position' => $i],
            );
        }
    }
}
