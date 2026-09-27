<?php

namespace App\Support;

/**
 * The exams Turkish learners actually sit, with their real formats. ÖSYM exams
 * (YDS, YÖKDİL, YDT) share one multiple-choice style with five options; IELTS and
 * TOEFL are skill-based. Everything exam-aware in the app (practice sets, Defne's
 * prompts, the daily plan) reads from here.
 */
class Exams
{
    public const SECTIONS = [
        'vocabulary' => ['label' => 'Kelime bilgisi', 'hint' => 'Boşluğa en uygun kelime ya da deyim'],
        'grammar' => ['label' => 'Dilbilgisi', 'hint' => 'Zaman, bağlaç ve edat soruları'],
        'cloze' => ['label' => 'Cloze test', 'hint' => 'Paragraftaki boşlukları doldur'],
        'sentence_completion' => ['label' => 'Cümle tamamlama', 'hint' => 'Cümleyi anlamca ve yapıca tamamla'],
        'translation' => ['label' => 'Çeviri', 'hint' => 'İngilizce ve Türkçe arasında en doğru karşılık'],
        'reading' => ['label' => 'Okuma', 'hint' => 'Parçayı oku, soruları cevapla'],
        'dialogue' => ['label' => 'Diyalog tamamlama', 'hint' => 'Konuşmadaki boşluğa uygun cevap'],
        'paragraph' => ['label' => 'Paragraf tamamlama', 'hint' => 'Paragrafı anlamca tamamlayan cümle'],
        'irrelevant' => ['label' => 'Anlam bütünlüğünü bozan cümle', 'hint' => 'Akışa uymayan cümleyi bul'],
    ];

    public const EXAMS = [
        'yds' => [
            'name' => 'YDS', 'full' => 'Yabancı Dil Bilgisi Seviye Tespit Sınavı', 'by' => 'ÖSYM',
            'about' => 'Akademik kadro, kamu yabancı dil tazminatı ve lisansüstü başvuruları için. 80 soru, 180 dakika.',
            'questions' => 80, 'minutes' => 180, 'options' => 5,
            'sections' => ['vocabulary', 'grammar', 'cloze', 'sentence_completion', 'translation', 'reading', 'dialogue', 'paragraph', 'irrelevant'],
            'focus' => ['reading' => 50, 'writing' => 20, 'listening' => 15, 'speaking' => 15],
        ],
        'yokdil' => [
            'name' => 'YÖKDİL', 'full' => 'Yükseköğretim Kurumları Yabancı Dil Sınavı', 'by' => 'ÖSYM',
            'about' => 'Fen, sağlık ve sosyal bilimler alanlarında akademik metinler. 80 soru, 180 dakika.',
            'questions' => 80, 'minutes' => 180, 'options' => 5,
            'sections' => ['vocabulary', 'grammar', 'cloze', 'sentence_completion', 'translation', 'reading', 'paragraph', 'irrelevant'],
            'focus' => ['reading' => 55, 'writing' => 20, 'listening' => 10, 'speaking' => 15],
        ],
        'ydt' => [
            'name' => 'YKS-YDT', 'full' => 'Yabancı Dil Testi (üniversite sınavı)', 'by' => 'ÖSYM',
            'about' => 'Dil bölümlerine girişte. 80 soru, 120 dakika. Diyalog ve paragraf soruları ağırlıklı.',
            'questions' => 80, 'minutes' => 120, 'options' => 5,
            'sections' => ['vocabulary', 'grammar', 'cloze', 'sentence_completion', 'translation', 'reading', 'dialogue', 'paragraph', 'irrelevant'],
            'focus' => ['reading' => 45, 'writing' => 20, 'listening' => 15, 'speaking' => 20],
        ],
        'ielts' => [
            'name' => 'IELTS', 'full' => 'International English Language Testing System', 'by' => 'British Council / IDP',
            'about' => 'Yurt dışında eğitim ve göç için. Okuma, dinleme, yazma ve konuşma; 0 ile 9 arası band.',
            'questions' => 40, 'minutes' => 165, 'options' => 4,
            'sections' => ['vocabulary', 'grammar', 'reading', 'sentence_completion'],
            'focus' => ['reading' => 25, 'writing' => 25, 'listening' => 25, 'speaking' => 25],
        ],
        'toefl' => [
            'name' => 'TOEFL iBT', 'full' => 'Test of English as a Foreign Language', 'by' => 'ETS',
            'about' => 'ABD ve Kanada üniversiteleri için. Akademik okuma ve dinleme, entegre yazma ve konuşma.',
            'questions' => 40, 'minutes' => 120, 'options' => 4,
            'sections' => ['vocabulary', 'grammar', 'reading', 'sentence_completion'],
            'focus' => ['reading' => 25, 'writing' => 25, 'listening' => 25, 'speaking' => 25],
        ],
    ];

    public static function keys(): array
    {
        return array_keys(self::EXAMS);
    }

    public static function get(?string $key): ?array
    {
        return $key ? (self::EXAMS[$key] ?? null) : null;
    }

    /** One line Defne adds to every system prompt for an exam-track learner. */
    public static function tutorBrief(?string $key): ?string
    {
        $exam = self::get($key);
        if (! $exam) {
            return null;
        }
        if (in_array($key, ['yds', 'yokdil', 'ydt'], true)) {
            return "The learner is preparing for the {$exam['name']} ({$exam['full']}, run by ÖSYM in Turkey). It is a reading-heavy, five-option multiple-choice exam: vocabulary, grammar, cloze, sentence completion, EN-TR translation, reading passages and paragraph questions. Favour academic vocabulary, linkers (whereas, albeit, notwithstanding), tense and clause accuracy, and explain in short Turkish notes why distractors are wrong. Mention elimination tactics and time management when useful.";
        }

        return "The learner is preparing for {$exam['name']} ({$exam['full']}). Train all four skills in exam style: give band-style feedback (task response, coherence, lexical resource, grammar), suggest higher-band vocabulary, and keep answers timed and structured like the real test.";
    }
}
