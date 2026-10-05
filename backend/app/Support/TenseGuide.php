<?php

namespace App\Support;

/**
 * The tenses chapter at the end of every unit guidebook.
 *
 * Each tense is introduced in one unit of the path (level + unit position).
 * The unit that introduces it gets a full page: what it is for, the
 * affirmative / negative / question forms and the time words that signal it,
 * named as Turkish school books name it (Geniş Zaman, Şimdiki Zaman, -di'li
 * Geçmiş...). Every guidebook then closes with the "tense map": all the tenses
 * met so far on one table, so the picture grows unit by unit.
 */
class TenseGuide
{
    private const ORDER = ['A1', 'A2', 'B1', 'B2'];

    /** [level, unit position, English name, school name, use, + form, - form, ? form, example, Turkish, signal words] */
    private const TENSES = [
        ['A1', 0, 'to be (am / is / are)', '"-dir" eki, olmak', 'Kim, ne, nerede ve nasıl olduğunu söyler.', 'I **am** / he **is** / they **are**', 'I am **not** / she **isn\'t**', '**Are** you ...? / **Is** he ...?', 'She **is** a teacher.', 'O bir öğretmen.', 'now, today, here'],
        ['A1', 3, 'Present Simple', 'Geniş Zaman', 'Alışkanlıklar, rutinler ve genel doğrular.', 'I **work** / he **works**', 'I **don\'t** work / she **doesn\'t** work', '**Do** you work? / **Does** he work?', 'He **gets up** at seven.', 'Yedide kalkar.', 'always, usually, often, every day'],
        ['A1', 7, 'Present Continuous', 'Şimdiki Zaman', 'Şu an ya da bu günlerde olan işler.', 'I **am reading** / she **is reading**', 'I\'m **not** reading / they **aren\'t** reading', '**Are** you reading? / **Is** it raining?', 'They **are playing** in the garden.', 'Bahçede oynuyorlar.', 'now, right now, at the moment, look!'],
        ['A2', 0, 'Past Simple', 'Görülen (-di\'li) Geçmiş Zaman', 'Geçmişte olup bitmiş işler.', 'I **worked** / she **went**', 'I **didn\'t** work / he **didn\'t** go', '**Did** you work? / **Did** she go?', 'We **visited** Ankara last year.', 'Geçen yıl Ankara\'yı ziyaret ettik.', 'yesterday, last week, ago, in 2020'],
        ['A2', 2, 'be going to', 'Gelecek Zaman (plan)', 'Önceden yapılmış planlar ve görünen sonuçlar.', 'I\'m **going to** visit / he\'s **going to** study', 'I\'m **not going to** ...', '**Are** you **going to** ...?', 'I\'m **going to** study medicine.', 'Tıp okuyacağım.', 'tomorrow, next week, this summer'],
        ['A2', 5, 'will', 'Gelecek Zaman (karar, tahmin)', 'O an verilen kararlar, sözler ve tahminler.', 'I **will** help / it**\'ll** rain', 'I **won\'t** forget', '**Will** you help me?', 'I\'**ll** carry your bag.', 'Çantanı ben taşırım.', 'I think, probably, maybe, soon'],
        ['A2', 6, 'Present Perfect', 'Yakın geçmiş, deneyim', 'Zamanı söylenmeyen deneyimler ve bugüne etkisi olan geçmiş.', 'I **have seen** / she **has been**', 'I **haven\'t** seen / he **hasn\'t** been', '**Have** you **ever** been ...?', 'I **have** never **been** to Van.', 'Van\'a hiç gitmedim.', 'ever, never, just, already, yet'],
        ['B1', 0, 'Present Perfect Continuous', 'Süregelen yakın geçmiş', 'Geçmişte başlayıp hâlâ süren işler (ne kadar süredir).', 'I **have been learning**', 'I **haven\'t been** sleeping well', '**How long have** you **been** waiting?', 'She **has been studying** for two hours.', 'İki saattir ders çalışıyor.', 'for, since, how long, all day'],
        ['B1', 1, 'Past Continuous', 'Şimdiki Zamanın Hikâyesi (-yordu)', 'Geçmişte bir anda sürmekte olan iş; çoğunlukla when / while ile.', 'I **was reading** / they **were playing**', 'I **wasn\'t** listening', '**Were** you sleeping?', 'I **was cooking** when you called.', 'Sen aradığında yemek yapıyordum.', 'when, while, at 8 pm yesterday'],
        ['B1', 1, 'used to', 'Geçmişteki alışkanlık (-erdi)', 'Eskiden olan ama artık olmayan alışkanlıklar ve durumlar.', 'I **used to** play', 'I **didn\'t use to** like', '**Did** you **use to** ...?', 'We **used to** live in a village.', 'Eskiden bir köyde yaşardık.', 'when I was a child, in the past'],
        ['B1', 5, 'Past Perfect', 'Miş\'li Geçmişin Hikâyesi (-mişti)', 'Geçmişteki bir olaydan daha önce olmuş iş.', 'I **had left**', 'I **hadn\'t** seen', '**Had** you **met** before?', 'The film **had started** when we arrived.', 'Vardığımızda film başlamıştı.', 'before, after, by the time, already'],
        ['B2', 3, 'Future Continuous', 'Gelecekte sürmekte olan iş', 'Gelecekteki bir anda devam ediyor olacak işler.', 'I **will be working**', 'I **won\'t be** using it', '**Will** you **be** coming?', 'This time tomorrow I **will be flying** to İzmir.', 'Yarın bu saatte İzmir\'e uçuyor olacağım.', 'this time tomorrow, at 9 tonight'],
        ['B2', 3, 'Future Perfect', 'Gelecekte tamamlanmış iş', 'Gelecekteki bir zamana kadar bitmiş olacak işler.', 'I **will have finished**', 'I **won\'t have** finished', '**Will** you **have** finished?', 'By June we **will have finished** the project.', 'Hazirana kadar projeyi bitirmiş olacağız.', 'by then, by 2030, by the time'],
    ];

    /** The chapter that closes a unit's guidebook: new tenses of the unit in full, then the map so far. */
    public static function chapter(string $level, int $position): string
    {
        $at = array_search($level, self::ORDER, true);
        if ($at === false) {
            return '';
        }
        $known = array_values(array_filter(self::TENSES, fn ($t) => [array_search($t[0], self::ORDER, true), $t[1]] <= [$at, $position]));
        if (! $known) {
            return '';
        }
        $md = '';
        foreach ($known as $t) {
            if ($t[0] === $level && $t[1] === $position) {
                $md .= self::page($t);
            }
        }
        $rows = implode("\n", array_map(fn ($t) => "| **{$t[2]}** · {$t[3]} | {$t[8]} |", $known));

        return $md."## Zaman haritan\nŞimdiye kadar öğrendiğin zamanlar, okulda geçtikleri adlarıyla. Her ünite bu tabloya yenisini ekler.\n\n| Zaman | Örnek |\n|---|---|\n{$rows}\n";
    }

    private static function page(array $t): string
    {
        return "## Zamanlar: {$t[2]}\n**{$t[3]}.** {$t[4]}\n\n| Cümle | Yapı |\n|---|---|\n| Olumlu | {$t[5]} |\n| Olumsuz | {$t[6]} |\n| Soru | {$t[7]} |\n\n"
            ."- Örnek: {$t[8]} *{$t[9]}*\n- İşaret kelimeleri: *{$t[10]}*\n\n";
    }
}
