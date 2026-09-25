<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Story;
use Illuminate\Database\Seeder;

/**
 * Starter curriculum. Every lesson mixes the four skills: reading (choice/fill),
 * listening (listen_*), speaking (speak) and writing (translate / listen_type).
 */
class CourseSeeder extends Seeder
{
    // --- exercise helpers --------------------------------------------------
    private function ch(string $prompt, array $options, int $answer, ?string $audio = null): array
    {
        return array_filter(['type' => 'choice', 'prompt' => $prompt, 'options' => $options, 'answer' => $answer, 'audio' => $audio], fn ($v) => $v !== null);
    }

    private function fl(string $sentence, array $options, int $answer, ?string $hint = null): array
    {
        return array_filter(['type' => 'fill', 'prompt' => $sentence, 'options' => $options, 'answer' => $answer, 'hint' => $hint], fn ($v) => $v !== null);
    }

    private function lc(string $audio, array $options, int $answer): array
    {
        return ['type' => 'listen_choice', 'prompt' => 'Ne duydun?', 'audio' => $audio, 'options' => $options, 'answer' => $answer];
    }

    private function tr(string $source, string $answer, array $distractors = [], array $alternatives = []): array
    {
        $tiles = array_merge(explode(' ', rtrim($answer, '.?!')), $distractors);

        return ['type' => 'translate', 'prompt' => $source, 'answer' => $answer, 'alternatives' => $alternatives, 'tiles' => $tiles];
    }

    private function lt(string $audio): array
    {
        return ['type' => 'listen_type', 'prompt' => 'Duyduğunu yaz', 'audio' => $audio, 'answer' => $audio];
    }

    private function sp(string $text, ?string $tr = null): array
    {
        return array_filter(['type' => 'speak', 'prompt' => 'Sesli oku', 'text' => $text, 'translation' => $tr], fn ($v) => $v !== null);
    }

    private function mt(array $pairs): array
    {
        return ['type' => 'match', 'prompt' => 'Eşleştir', 'pairs' => $pairs];
    }

    /**
     * "Hata avı" — a sentence carrying a slip Turkish speakers really make. The learner
     * taps the guilty word, picks the fix and reads why it was wrong, in Turkish.
     */
    private function err(string $sentence, int $errorIndex, array $options, int $answer, string $why): array
    {
        return [
            'type' => 'spot_error',
            'prompt' => 'Bu cümle bir Türk öğrencinin ağzından çıktı. Hatalı kelimeyi bul.',
            'words' => explode(' ', $sentence),
            'error_index' => $errorIndex,
            'options' => $options,
            'answer' => $answer,
            'explanation_tr' => $why,
        ];
    }

    /** "Sahne" — a real scene with the learner's line missing. */
    private function dlg(string $prompt, ?string $scene, array $lines, array $options, int $answer, ?string $note = null): array
    {
        return array_filter([
            'type' => 'dialogue', 'prompt' => $prompt, 'scene' => $scene,
            'lines' => $lines, 'options' => $options, 'answer' => $answer, 'note_tr' => $note,
        ], fn ($v) => $v !== null);
    }

    /** "Sıralama" — steps given in the right order; the player shuffles them on screen. */
    private function seq(string $prompt, array $items, ?string $note = null): array
    {
        return array_filter([
            'type' => 'sequence', 'prompt' => $prompt, 'items' => $items,
            'answer' => range(0, count($items) - 1), 'note_tr' => $note,
        ], fn ($v) => $v !== null);
    }

    // -----------------------------------------------------------------------

    public function run(): void
    {
        $story = fn (string $slug) => Story::query()->where('slug', $slug)->value('id');

        $courses = [
            [
                'slug' => 'a1-baslangic', 'title' => 'A1 · İlk Adımlar', 'cefr_level' => 'A1', 'color' => '#FF5A36',
                'description' => 'Selamlaşmadan günlük rutine: İngilizcede ilk cümlelerini kur, ilk hikayeni oku, ilk sohbetini yap.',
                'units' => [
                    [
                        'title' => 'Merhaba Dünya', 'description' => 'Selamlaşma, tanışma ve "to be"', 'color' => '#FF5A36',
                        'guidebook' => "## \"to be\" fiili: am / is / are\n\nTürkçede \"-im, -sin, -dir\" ekleriyle yaptığımızı İngilizcede **am / is / are** yapar.\n\n| Özne | Fiil | Örnek |\n|---|---|---|\n| I | am | I am Ali. |\n| you / we / they | are | You are a student. |\n| he / she / it | is | She is a teacher. |\n\n**Türklerin sık yaptığı hata:** \"I am agree\" ❌ → \"I agree\" ✅. *agree* zaten bir fiil, yanına *am* gelmez.\n\n### Kısaltmalar\nKonuşmada hep kısaltırız: **I'm, you're, he's, she's, it's, we're, they're**.",
                        'lessons' => [
                            ['title' => 'Selamlaşma', 'skill' => 'vocabulary', 'exercises' => [
                                $this->mt([['hello', 'merhaba'], ['goodbye', 'hoşça kal'], ['please', 'lütfen'], ['thank you', 'teşekkürler'], ['sorry', 'özür dilerim']]),
                                $this->ch('"Good morning" ne demek?', ['İyi geceler', 'Günaydın', 'İyi akşamlar', 'Merhaba'], 1, 'Good morning'),
                                $this->lc('Nice to meet you', ['Nice to meet you', 'Nice to see you', 'Night to meet you'], 0),
                                $this->tr('Merhaba, benim adım Ali.', 'Hello my name is Ali', ['are', 'you', 'is'], ['Hello, my name is Ali', 'Hi my name is Ali']),
                                $this->sp('Nice to meet you.', 'Tanıştığıma memnun oldum.'),
                                $this->ch('Birine teşekkür ettiklerinde ne dersin?', ["You're welcome", 'Goodbye', 'Good night', 'Sorry'], 0),
                                $this->lt('How are you'),
                            ]],
                            ['title' => 'Ben kimim? (am / is / are)', 'skill' => 'grammar', 'exercises' => [
                                $this->fl('I ___ a student.', ['am', 'is', 'are'], 0, 'I → am'),
                                $this->fl('She ___ my sister.', ['am', 'is', 'are'], 1),
                                $this->fl('They ___ from Izmir.', ['am', 'is', 'are'], 2),
                                $this->tr('O bir öğretmen.', 'She is a teacher', ['am', 'are', 'an'], ["She's a teacher", 'He is a teacher', "He's a teacher"]),
                                $this->err('I am agree with you', 1, ['agree', 'am', 'agreeing'], 0, '"Agree" zaten bir fiil; Türkçedeki "katılıyorum" yapısına bakıp yanına "am" koymak en sık hatalardan biri. Doğrusu: I agree with you.'),
                                $this->sp("I'm happy to be here.", 'Burada olduğum için mutluyum.'),
                                $this->lc("We're friends", ["We're friends", 'Where friends', 'Were friends'], 0),
                            ]],
                            ['title' => 'Nerelisin?', 'skill' => 'listening', 'exercises' => [
                                $this->lc('Where are you from?', ['Where are you from?', 'Where do you live?', 'What are you doing?'], 0),
                                $this->ch('"I\'m from Turkey" cümlesinin anlamı?', ["Türkiye'ye gidiyorum", "Türkiye'denim", "Türkiye'yi seviyorum"], 1, "I'm from Turkey"),
                                $this->lt("I'm from Istanbul"),
                                $this->mt([['Turkey', 'Türkiye'], ['England', 'İngiltere'], ['Germany', 'Almanya'], ['Spain', 'İspanya']]),
                                $this->tr('Sen nerelisin?', 'Where are you from', ['is', 'do'], []),
                                $this->sp("I'm from Turkey. And you?", "Türkiye'denim. Ya sen?"),
                            ]],
                            ['title' => 'Hikaye: The Red Umbrella', 'skill' => 'reading', 'kind' => 'story', 'story' => 'the-red-umbrella', 'xp_reward' => 20],
                            ['title' => 'Ada ile tanış', 'skill' => 'speaking', 'kind' => 'ai_talk', 'scenario' => 'meet-a-new-friend', 'xp_reward' => 20],
                        ],
                    ],
                    [
                        'title' => 'Günlük Hayat', 'description' => 'Rutinler, yemek ve geniş zaman', 'color' => '#2EC4A0',
                        'guidebook' => "## Geniş zaman (Present Simple)\n\nAlışkanlıklar ve rutinler için kullanılır: *I drink tea every morning.*\n\n**he / she / it** ile fiile **-s** eklenir: *She drinks coffee.*\n\nOlumsuz: **don't / doesn't** + yalın fiil → *He doesn't like milk.* (doesn't likes ❌)\n\nSoru: **Do / Does** başa gelir → *Do you work here?*",
                        'lessons' => [
                            ['title' => 'Sabah rutini', 'skill' => 'grammar', 'exercises' => [
                                $this->fl('I ___ up at seven.', ['get', 'gets', 'getting'], 0),
                                $this->fl('He ___ to work by bus.', ['go', 'goes', 'going'], 1),
                                $this->fl('She ___ like coffee.', ["don't", "doesn't", 'isn\'t'], 1),
                                $this->tr('Her sabah çay içerim.', 'I drink tea every morning', ['drinks', 'the'], []),
                                $this->lc('He takes a shower', ['He takes a shower', 'He takes a flower', 'He takes the car'], 0),
                                $this->sp('I have breakfast at eight.', 'Sekizde kahvaltı yaparım.'),
                                $this->lt('She works in a bank'),
                            ]],
                            ['title' => 'Yemek & İçecek', 'skill' => 'vocabulary', 'exercises' => [
                                $this->dlg('Londra’da bir kafedesin. Sıra sende.', 'scenarios/order-at-a-cafe', [
                                    ['who' => 'Barista', 'text' => 'Hi there! What can I get for you today?'],
                                ], ['Give me one coffee.', "I'd like a coffee, please.", 'I want coffee now.'], 1,
                                    'Siparişte "I want" biraz sert durur, "Give me" ise emir gibidir. Kibar hâli: I’d like … , please.'),
                                $this->mt([['bread', 'ekmek'], ['cheese', 'peynir'], ['water', 'su'], ['egg', 'yumurta'], ['apple', 'elma']]),
                                $this->ch('Kafede ne dersin?', ['Can I have a tea, please?', 'Give tea.', 'I want tea now.'], 0),
                                $this->lc('A glass of water, please', ['A glass of water, please', 'A class of water, please', 'A glass of wine, please'], 0),
                                $this->tr('Bir kahve lütfen.', 'A coffee please', ['the', 'is'], ['A coffee, please', 'One coffee please', 'One coffee, please']),
                                $this->sp('Can I have the bill, please?', 'Hesabı alabilir miyim?'),
                                $this->fl('I would ___ a sandwich.', ['like', 'likes', 'liking'], 0),
                            ]],
                            ['title' => 'Sayılar ve saat', 'skill' => 'listening', 'exercises' => [
                                $this->lc('fifteen', ['fifty', 'fifteen', 'five'], 1),
                                $this->lc("It's half past three", ['3:30', '3:15', '2:30'], 0),
                                $this->ch('"quarter to nine" kaç?', ['9:15', '8:45', '9:45'], 1, 'quarter to nine'),
                                $this->lt('twenty one'),
                                $this->mt([['thirteen', '13'], ['thirty', '30'], ['forty', '40'], ['fourteen', '14']]),
                                $this->sp("It's seven o'clock.", 'Saat yedi.'),
                            ]],
                            ['title' => "Hikaye: Mia's First Day", 'skill' => 'reading', 'kind' => 'story', 'story' => 'mias-first-day-in-london', 'xp_reward' => 20],
                            ['title' => 'Kafede sipariş', 'skill' => 'speaking', 'kind' => 'ai_talk', 'scenario' => 'order-at-a-cafe', 'xp_reward' => 20],
                        ],
                    ],
                    [
                        'title' => 'Şehirde', 'description' => 'Yol tarifi, alışveriş ve "there is/are"', 'color' => '#3A6FF7',
                        'guidebook' => "## There is / There are\n\nBir yerde bir şeyin **var** olduğunu söyler.\n\n- Tekil: **There is** a bank near here.\n- Çoğul: **There are** two cafés on this street.\n\n## Yol tarifi\n**turn left** (sola dön) · **turn right** (sağa dön) · **go straight** (düz git) · **next to** (yanında) · **opposite** (karşısında)",
                        'lessons' => [
                            ['title' => 'Yol tarifi', 'skill' => 'listening', 'exercises' => [
                                $this->seq('Birine yol tarifi veriyorsun. Adımları doğru sıraya diz.', [
                                    'Go straight on for two hundred metres.',
                                    'Turn left at the traffic lights.',
                                    'Walk past the pharmacy.',
                                    'The station is on your right.',
                                ], 'İngilizcede yol tarifi hareket sırasına göre anlatılır; hedef en sona bırakılır.'),
                                $this->lc('Turn left at the bank', ['Turn left at the bank', 'Turn right at the bank', 'Turn left at the park'], 0),
                                $this->mt([['turn left', 'sola dön'], ['turn right', 'sağa dön'], ['go straight', 'düz git'], ['opposite', 'karşısında']]),
                                $this->fl('There ___ a pharmacy next to the school.', ['is', 'are', 'am'], 0),
                                $this->fl('There ___ three hotels in this street.', ['is', 'are', 'be'], 1),
                                $this->tr('Müze nerede?', 'Where is the museum', ['are', 'a'], ["Where's the museum"]),
                                $this->sp('Excuse me, how can I get to the station?', 'Affedersiniz, istasyona nasıl gidebilirim?'),
                            ]],
                            ['title' => 'Alışveriş', 'skill' => 'vocabulary', 'exercises' => [
                                $this->ch('"How much is it?" ne sorar?', ['Fiyat', 'Saat', 'Beden'], 0, 'How much is it?'),
                                $this->lc('Do you have this in medium?', ['Do you have this in medium?', 'Do you have this in red?', 'Do you have this for me?'], 0),
                                $this->mt([['cheap', 'ucuz'], ['expensive', 'pahalı'], ['size', 'beden'], ['receipt', 'fiş']]),
                                $this->tr('Bunu kartla ödeyebilir miyim?', 'Can I pay by card', ['with', 'the'], ['Can I pay with card', 'Can I pay by card for this']),
                                $this->sp("I'm just looking, thanks.", 'Sadece bakıyorum, teşekkürler.'),
                                $this->lt('It is too expensive'),
                            ]],
                            ['title' => 'Kontrol noktası: A1', 'skill' => 'mixed', 'kind' => 'checkpoint', 'xp_reward' => 40, 'exercises' => [
                                $this->fl('My parents ___ teachers.', ['is', 'are', 'am'], 1),
                                $this->fl('Kerem ___ football on Sundays.', ['play', 'plays', 'playing'], 1),
                                $this->lc('Where is the bus stop?', ['Where is the bus stop?', 'Where is the bookshop?', 'When is the bus?'], 0),
                                $this->tr('Kız kardeşim Ankara\'da yaşıyor.', 'My sister lives in Ankara', ['live', 'at'], []),
                                $this->err('She don\'t like fish', 1, ["doesn't", 'not', "isn't"], 0, 'He / she / it ile olumsuzda "doesn\'t" kullanılır; "don\'t" I, you, we, they içindir.'),
                                $this->sp('There is a café opposite the park.', 'Parkın karşısında bir kafe var.'),
                                $this->lt('Can I have the bill please'),
                                $this->mt([['always', 'her zaman'], ['never', 'asla'], ['often', 'sık sık'], ['sometimes', 'bazen']]),
                            ]],
                        ],
                    ],
                ],
            ],
            [
                'slug' => 'a2-yol-arkadasi', 'title' => 'A2 · Yol Arkadaşı', 'cefr_level' => 'A2', 'color' => '#2EC4A0',
                'description' => 'Geçmişi anlat, planlarını paylaş, iş hayatına ilk adımı at.',
                'units' => [
                    [
                        'title' => 'Dün ne yaptın?', 'description' => 'Past simple ile hikaye anlat', 'color' => '#2EC4A0',
                        'guidebook' => "## Geçmiş zaman (Past Simple)\n\nDüzenli fiiller **-ed** alır: *work → worked*.\nDüzensizler ezberlenir: *go → went, see → saw, have → had*.\n\nOlumsuz ve soruda **did** kullanılır ve fiil yalın kalır: *I didn't go* (didn't went ❌) · *Did you see it?*",
                        'lessons' => [
                            ['title' => 'Düzenli & düzensiz fiiller', 'skill' => 'grammar', 'exercises' => [
                                $this->mt([['go', 'went'], ['see', 'saw'], ['have', 'had'], ['buy', 'bought'], ['eat', 'ate']]),
                                $this->fl('We ___ a great film yesterday.', ['see', 'saw', 'seen'], 1),
                                $this->fl("I didn't ___ to the party.", ['go', 'went', 'gone'], 0),
                                $this->tr('Geçen yaz İtalya\'ya gittik.', 'We went to Italy last summer', ['go', 'in'], []),
                                $this->lc('Did you enjoy the concert?', ['Did you enjoy the concert?', 'Do you enjoy the concert?', 'Did you join the concert?'], 0),
                                $this->sp('I visited my grandparents last weekend.', 'Geçen hafta sonu büyükanne ve büyükbabamı ziyaret ettim.'),
                                $this->lt('She bought a new phone'),
                                $this->err('Yesterday I didn\'t went to school', 3, ['go', 'gone', 'going'], 0, '"didn\'t" zaten geçmişi taşır; yanındaki fiil yalın kalır. Doğrusu: I didn\'t go.'),
                                $this->seq('Dün akşamını anlat. Cümleleri olay sırasına diz.', [
                                    'I finished work at six.',
                                    'I met my friend at the metro station.',
                                    'We had dinner at a small restaurant.',
                                    'I got home just before midnight.',
                                ]),
                            ]],
                            ['title' => 'Hikaye: The Cat Who Loved Tea', 'skill' => 'reading', 'kind' => 'story', 'story' => 'the-cat-who-loved-tea', 'xp_reward' => 25],
                            ['title' => 'Hafta sonunu anlat', 'skill' => 'speaking', 'kind' => 'ai_talk', 'scenario' => 'weekend-story', 'xp_reward' => 25],
                        ],
                    ],
                    [
                        'title' => 'İş Hayatı', 'description' => 'Mülakat, e-posta ve kibar dil', 'color' => '#FFB400',
                        'guidebook' => "## Kibar İngilizce\n\nİş ortamında doğrudan emir yerine yumuşatıcılar kullanılır:\n\n- *Give me the report.* → **Could you send me the report, please?**\n- *I want a meeting.* → **Would it be possible to schedule a meeting?**\n\n**Türklerin sık hatası:** \"I will send you tomorrow\" → nesneyi unutma: **I'll send it to you tomorrow.**",
                        'lessons' => [
                            ['title' => 'Kibar talepler', 'skill' => 'writing', 'exercises' => [
                                $this->ch('En kibar olanı seç:', ['Send me the file.', 'Could you send me the file, please?', 'You send file.'], 1),
                                $this->fl('___ you help me with this?', ['Could', 'Should', 'Must'], 0),
                                $this->tr('Yarın size göndereceğim.', "I'll send it to you tomorrow", ['send', 'at'], ['I will send it to you tomorrow']),
                                $this->lc('I look forward to hearing from you', ['I look forward to hearing from you', 'I look forward to hear from you', 'I looked for hearing from you'], 0),
                                $this->sp('Would it be possible to reschedule our meeting?', 'Toplantımızı yeniden planlamak mümkün olur mu?'),
                                $this->lt('Thank you for your email'),
                            ]],
                            ['title' => 'Hikaye: The Interview at the Café', 'skill' => 'reading', 'kind' => 'story', 'story' => 'the-interview-at-the-cafe', 'xp_reward' => 25],
                            ['title' => 'Mülakat provası', 'skill' => 'speaking', 'kind' => 'ai_talk', 'scenario' => 'job-interview', 'xp_reward' => 30, 'premium' => true],
                        ],
                    ],
                ],
            ],
            [
                'slug' => 'b1-ozgur-konusma', 'title' => 'B1 · Özgürce Konuş', 'cefr_level' => 'B1', 'color' => '#3A6FF7',
                'description' => 'Deneyimlerini anlat, fikir savun, hikayelerin derinine in.',
                'units' => [
                    [
                        'title' => 'Deneyimler', 'description' => 'Present perfect ve hayat hikayeleri', 'color' => '#3A6FF7',
                        'guidebook' => "## Present Perfect\n\n**have/has + V3**: geçmişte başlayıp etkisi süren ya da zamanı belirtilmeyen deneyimler.\n\n- *I have visited Paris.* (ne zaman olduğu önemli değil)\n- *I visited Paris in 2020.* (zaman belli → past simple)\n\n**for** süre (for three years), **since** başlangıç noktası (since 2021).",
                        'lessons' => [
                            ['title' => 'Hiç ... yaptın mı?', 'skill' => 'grammar', 'exercises' => [
                                $this->fl('Have you ever ___ sushi?', ['eat', 'ate', 'eaten'], 2),
                                $this->fl("I've lived here ___ 2019.", ['for', 'since', 'from'], 1),
                                $this->fl("She's worked here ___ five years.", ['for', 'since', 'during'], 0),
                                $this->tr('Bu filmi üç kez izledim.', "I've watched this film three times", ['watch', 'did'], ['I have watched this film three times', "I've seen this film three times", 'I have seen this film three times']),
                                $this->lc("I've never been to Japan", ["I've never been to Japan", 'I never went to Japan', "I'd never been to Japan"], 0),
                                $this->sp("I've been learning English for two years.", 'İki yıldır İngilizce öğreniyorum.'),
                                $this->lt('Have you finished your homework'),
                            ]],
                            ['title' => "Hikaye: The Lighthouse Keeper's Letter", 'skill' => 'reading', 'kind' => 'story', 'story' => 'the-lighthouse-keepers-letter', 'xp_reward' => 30, 'premium' => true],
                            ['title' => 'Fikrini savun', 'skill' => 'speaking', 'kind' => 'ai_talk', 'scenario' => 'debate-club', 'xp_reward' => 30, 'premium' => true],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($courses as $ci => $c) {
            $course = Course::query()->updateOrCreate(['slug' => $c['slug']], [
                'title' => $c['title'], 'description' => $c['description'], 'cefr_level' => $c['cefr_level'], 'color' => $c['color'], 'position' => $ci,
            ]);
            $course->units()->delete();
            foreach ($c['units'] as $ui => $u) {
                $unit = $course->units()->create([
                    'title' => $u['title'], 'description' => $u['description'], 'guidebook' => $u['guidebook'], 'color' => $u['color'], 'position' => $ui,
                ]);
                foreach ($u['lessons'] as $li => $l) {
                    $unit->lessons()->create([
                        'title' => $l['title'],
                        'skill' => $l['skill'],
                        'kind' => $l['kind'] ?? 'lesson',
                        'position' => $li,
                        'xp_reward' => $l['xp_reward'] ?? 15,
                        'is_premium' => $l['premium'] ?? false,
                        'story_id' => isset($l['story']) ? $story($l['story']) : null,
                        'scenario_key' => $l['scenario'] ?? null,
                        'exercises' => $l['exercises'] ?? [],
                    ]);
                }
            }
        }
    }
}
