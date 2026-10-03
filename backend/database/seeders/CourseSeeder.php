<?php

namespace Database\Seeders;

use App\Models\AiScenario;
use App\Models\Course;
use App\Models\Story;
use Illuminate\Database\Seeder;

/**
 * The learning path, A1 to B2, built from database/data/curriculum/*.json.
 *
 * Each unit is a small, complete cycle that uses the whole product, not just
 * drills: words, grammar, a word game, listening and speaking, a story to read
 * and a conversation with Defne. The last unit of a level ends with the level
 * exam; passing every node of a level moves the learner up (PathService).
 *
 * The JSON keeps the raw material per unit (vocabulary, example sentences,
 * gap fills, a typical Turkish-speaker mistake, a dialogue, listening lines,
 * a story and a role-play); this seeder turns it into exercises, so content
 * editors work with sentences, not exercise schemas.
 */
class CourseSeeder extends Seeder
{
    private const LEVELS = ['a1', 'a2', 'b1', 'b2'];

    public function run(): void
    {
        foreach (self::LEVELS as $ci => $file) {
            $c = json_decode(file_get_contents(database_path("data/curriculum/{$file}.json")), true, flags: JSON_THROW_ON_ERROR);
            $course = Course::query()->updateOrCreate(['slug' => $c['slug']], [
                'title' => $c['title'], 'description' => $c['description'], 'cefr_level' => $c['cefr_level'], 'color' => $c['color'], 'position' => $ci,
            ]);
            $course->units()->delete();

            foreach ($c['units'] as $ui => $u) {
                $unit = $course->units()->create([
                    'title' => $u['title'], 'description' => $u['desc'], 'guidebook' => $u['guide'], 'color' => $u['color'], 'position' => $ui,
                ]);
                $storyId = $this->story($u['story'], $c['cefr_level']);
                $scenario = $this->scenario($u['talk']);
                $lessons = $this->lessons($u, $c['cefr_level'], $ui, $storyId, $scenario);
                if (! empty($u['checkpoint'])) {
                    $lessons[] = $this->checkpoint($c);
                }
                foreach ($lessons as $li => $l) {
                    $unit->lessons()->create($l + ['position' => $li]);
                }
            }
        }
    }

    /** The nine nodes of a unit, in path order. */
    private function lessons(array $u, string $level, int $ui, ?int $storyId, ?AiScenario $scenario): array
    {
        $v = $u['vocab'];
        $xp = ['A1' => 15, 'A2' => 18, 'B1' => 20, 'B2' => 22][$level] ?? 15;
        [$tr0, $tr1] = $u['tr'];
        [$lc0, $lc1] = $u['lc'];

        $words = [
            $this->match(array_slice($v, 0, 5)),
            $this->meaning($v, 5, $ui),
            $this->listen($lc0[0], $lc0[1]),
            $this->translate($u['vs'][0][1], $u['vs'][0][0], [$v[($ui + 3) % 10][0], $v[($ui + 6) % 10][0]]),
            $this->match(array_slice($v, 5, 5)),
            $this->reverse($v, 8, $ui),
            $this->speak($u['vs'][1][0], $u['vs'][1][1] ?? null),
            $this->type($u['vs'][2][0]),
        ];
        $grammar = [
            ...array_map(fn ($f) => $this->fill(...$f), $u['fill']),
            $this->translate(...$tr0),
            $this->spot(...$u['err']),
            $this->speak(...$u['sp'][0]),
        ];
        $listening = array_values(array_filter([
            $this->dialogue(...$u['dlg']),
            $this->listen($lc1[0], $lc1[1]),
            $this->type($u['lt'][0]),
            $this->speak(...$u['sp'][1]),
            $this->translate(...$tr1),
            isset($u['seq']) ? $this->sequence(...$u['seq']) : null,
            $this->type($u['lt'][1]),
            $this->speak(...$u['sp'][2]),
        ]));

        $story = $storyId ? Story::query()->find($storyId) : null;
        $reading = $this->reading($level, $ui);

        return array_values(array_filter([
            ['title' => 'Kelimeler', 'skill' => 'vocabulary', 'kind' => 'lesson', 'xp_reward' => $xp, 'exercises' => $words],
            ['title' => 'Dilbilgisi', 'skill' => 'grammar', 'kind' => 'lesson', 'xp_reward' => $xp, 'exercises' => $grammar],
            $reading ? ['title' => 'Okuma: '.$reading['title'], 'skill' => 'reading', 'kind' => 'lesson', 'xp_reward' => $xp, 'exercises' => $reading['exercises']] : null,
            ['title' => 'Kelime oyunu', 'skill' => 'vocabulary', 'kind' => 'words', 'xp_reward' => $xp, 'exercises' => [],
                'meta' => $this->wordGame($u)],
            ['title' => 'Dinle ve konuş', 'skill' => 'listening', 'kind' => 'lesson', 'xp_reward' => $xp, 'exercises' => $listening],
            ['title' => 'Telaffuz', 'skill' => 'speaking', 'kind' => 'lesson', 'xp_reward' => $xp, 'exercises' => $this->pronunciation($u)],
            $story ? ['title' => 'Oku: '.$story->title, 'skill' => 'reading', 'kind' => 'story', 'story_id' => $story->id, 'xp_reward' => $xp + 5, 'is_premium' => $story->is_premium, 'exercises' => []] : null,
            ['title' => 'Pratik', 'skill' => 'vocabulary', 'kind' => 'lesson', 'xp_reward' => $xp, 'exercises' => $this->review($v, $ui)],
            $scenario ? ['title' => 'Defne ile: '.$scenario->title, 'skill' => 'speaking', 'kind' => 'ai_talk', 'scenario_key' => $scenario->key, 'xp_reward' => $xp + 5, 'is_premium' => (bool) $scenario->is_premium, 'exercises' => []] : null,
        ]));
    }

    /** A short text in the unit's language with comprehension questions (curriculum/readings.json). */
    private function reading(string $level, int $ui): ?array
    {
        static $all = null;
        $all ??= json_decode(file_get_contents(database_path('data/curriculum/readings.json')), true, flags: JSON_THROW_ON_ERROR);
        $r = $all[$level][$ui] ?? null;
        if (! $r) {
            return null;
        }

        return ['title' => $r['title'], 'exercises' => array_map(fn ($q) => [
            'type' => 'read', 'title' => $r['title'], 'passage' => $r['text'], 'prompt' => $q[0], 'options' => $q[1], 'answer' => $q[2],
        ], $r['q'])];
    }

    /**
     * Pronunciation: three of the unit's single words, then three of its sentences,
     * each checked against what the learner says, with feedback on the sounds missed.
     */
    private function pronunciation(array $u): array
    {
        $single = array_values(array_filter($u['vocab'], fn ($p) => preg_match('/^[A-Za-z-]+$/', $p[0])));
        $words = array_slice($single, 0, 3);
        $sentences = array_slice(array_values(array_unique(array_merge([$u['vs'][0][0]], array_column($u['sp'], 0)))), 0, 3);

        return [
            ...array_map(fn ($p) => ['type' => 'pronounce', 'prompt' => 'Kelimeyi söyle', 'text' => $p[0], 'translation' => $p[1]], $words),
            ...array_map(fn ($t) => ['type' => 'pronounce', 'prompt' => 'Cümleyi söyle', 'text' => rtrim($t)], $sentences),
        ];
    }

    /** The unit's words once more, Duolingo style: pairs, listening and meaning, mixed. */
    private function review(array $v, int $seed): array
    {
        $listen = function (int $i) use ($v, $seed) {
            $opts = $this->shuffle([$v[$i][0], $v[($i + 3) % 10][0], $v[($i + 5) % 10][0], $v[($i + 7) % 10][0]], $seed + $i);

            return $this->listen($v[$i][0], $opts);
        };

        return [
            $this->match(array_slice($this->shuffle($v, $seed), 0, 5)),
            $listen(1),
            $this->meaning($v, 2, $seed + 1),
            $this->reverse($v, 4, $seed + 2),
            $listen(6),
            $this->type($v[9][0]),
            $this->match(array_slice($this->shuffle($v, $seed + 7), 0, 5)),
            $this->meaning($v, 0, $seed + 3),
        ];
    }

    /**
     * The word-game node: the unit's words with an example sentence taken from the
     * unit itself, and the game the unit asks for when its words suit it (letter
     * games need single words of the right length, the cloze game needs examples).
     */
    private function wordGame(array $u): array
    {
        $sentences = array_merge(array_column($u['vs'], 0), array_column($u['sp'], 0), $u['lt'], array_map(fn ($f) => str_replace('___', $f[1][$f[2]], $f[0]), $u['fill']));
        $words = array_map(function ($p) use ($sentences) {
            $example = collect($sentences)->first(fn ($x) => preg_match('/\b'.preg_quote($p[0], '/').'\b/i', $x));

            return array_filter(['word' => $p[0], 'translation' => $p[1], 'example' => $example]);
        }, $u['vocab']);
        $count = fn (string $re) => count(array_filter($words, fn ($w) => preg_match($re, $w['word'])));
        $game = $u['game'] ?? 'match';
        $fits = match ($game) {
            'scramble' => $count('/^[a-z]{3,11}$/i') >= 4,
            'kelimle' => $count('/^[a-z]{4,6}$/i') >= 3,
            'search' => $count('/^[a-z]{3,8}$/i') >= 4,
            'cloze' => count(array_filter($words, fn ($w) => isset($w['example']))) >= 4,
            default => true,
        };

        return ['game' => $fits ? $game : 'match', 'words' => $words];
    }

    /** The level exam: one item from every unit of the level, mixing all skills. */
    private function checkpoint(array $c): array
    {
        $ex = [];
        foreach ($c['units'] as $i => $u) {
            $ex[] = match ($i % 4) {
                0 => $this->fill(...$u['fill'][1]),
                1 => $this->spot(...$u['err']),
                2 => $this->listen($u['lc'][0][0], $u['lc'][0][1]),
                default => $this->translate(...$u['tr'][1]),
            };
        }
        $last = end($c['units']);
        $ex[] = $this->type($last['lt'][0]);
        $ex[] = $this->speak(...$last['sp'][2]);

        return ['title' => $c['cefr_level'].' seviye sınavı', 'skill' => 'mixed', 'kind' => 'checkpoint', 'xp_reward' => 50, 'exercises' => $ex];
    }

    // ---- content records --------------------------------------------------

    /** A story the unit reads: an existing slug, or a new one defined inline. */
    private function story(string|array $s, string $level): ?int
    {
        if (is_string($s)) {
            return Story::query()->where('slug', $s)->value('id');
        }
        $paragraphs = array_map(fn ($p) => ['en' => $p[0], 'tr' => $p[1]], $s['paragraphs']);
        $words = collect($paragraphs)->sum(fn ($p) => str_word_count($p['en']));

        return Story::query()->updateOrCreate(['slug' => $s['slug']], [
            'title' => $s['title'], 'title_tr' => $s['title_tr'], 'cefr_level' => $level, 'category' => $s['category'],
            'summary' => $s['summary'], 'paragraphs' => $paragraphs,
            'vocabulary' => array_map(fn ($w) => ['word' => $w[0], 'meaning' => $w[1], 'example' => $w[2]], $s['vocabulary']),
            'questions' => $s['questions'],
            'reading_minutes' => max(2, (int) ceil($words / 110)), 'word_count' => $words,
            // the stories on the path are part of the course: free for everyone
            'is_premium' => false,
            'cover_image' => '/img/stories/'.$s['slug'].'.webp',
            'published_at' => now()->subDays(40),
        ])->id;
    }

    /** The role-play for the Defne node: an existing key, or a new scenario. */
    private function scenario(string|array $t): ?AiScenario
    {
        if (is_string($t)) {
            return AiScenario::query()->where('key', $t)->first();
        }

        return AiScenario::query()->updateOrCreate(['key' => $t['key']], [
            'title' => $t['title'], 'emoji' => $t['emoji'], 'category' => $t['category'], 'cefr_min' => $t['cefr_min'],
            'description' => $t['description'], 'system_prompt' => $t['system_prompt'], 'opening_line' => $t['opening_line'],
            'goals' => $t['goals'], 'is_premium' => $t['is_premium'] ?? false, 'is_active' => true,
            'position' => AiScenario::query()->where('key', '!=', $t['key'])->max('position') + 1,
        ]);
    }

    // ---- exercise builders ------------------------------------------------

    /** A stable shuffle, so re-seeding gives the same lesson every time. */
    private function shuffle(array $items, int $seed): array
    {
        mt_srand($seed);
        shuffle($items);
        mt_srand();

        return $items;
    }

    private function match(array $pairs): array
    {
        return ['type' => 'match', 'prompt' => 'Eşleştir', 'pairs' => $pairs];
    }

    /** "What does X mean?": the right Turkish meaning among three others from the unit. */
    private function meaning(array $v, int $i, int $seed): array
    {
        $right = $v[$i][1];
        $opts = $this->shuffle([$right, $v[($i + 2) % 10][1], $v[($i + 4) % 10][1], $v[($i + 7) % 10][1]], $seed * 31 + $i);

        return ['type' => 'choice', 'prompt' => "\"{$v[$i][0]}\" ne demek?", 'options' => $opts, 'answer' => array_search($right, $opts, true), 'audio' => $v[$i][0]];
    }

    /** The other direction: pick the English word for a Turkish meaning. */
    private function reverse(array $v, int $i, int $seed): array
    {
        $right = $v[$i][0];
        $opts = $this->shuffle([$right, $v[($i + 3) % 10][0], $v[($i + 5) % 10][0], $v[($i + 9) % 10][0]], $seed * 17 + $i);

        return ['type' => 'choice', 'prompt' => "\"{$v[$i][1]}\" İngilizcede hangisi?", 'options' => $opts, 'answer' => array_search($right, $opts, true)];
    }

    private function listen(string $audio, array $options): array
    {
        return ['type' => 'listen_choice', 'prompt' => 'Ne duydun?', 'audio' => $audio, 'options' => $options, 'answer' => array_search($audio, $options, true)];
    }

    private function fill(string $sentence, array $options, int $answer, ?string $hint = null): array
    {
        return array_filter(['type' => 'fill', 'prompt' => $sentence, 'options' => $options, 'answer' => $answer, 'hint' => $hint], fn ($x) => $x !== null);
    }

    private function translate(string $source, string $answer, array $distractors = [], array $alternatives = []): array
    {
        $clean = rtrim($answer, '.?!');
        $tiles = $this->shuffle(array_merge(explode(' ', str_replace(',', '', $clean)), $distractors), crc32($source));

        return ['type' => 'translate', 'prompt' => $source, 'answer' => $clean, 'alternatives' => array_values(array_unique(array_map(fn ($a) => rtrim($a, '.?!'), $alternatives))), 'tiles' => $tiles];
    }

    private function type(string $audio): array
    {
        $clean = rtrim($audio, '.?!');

        return ['type' => 'listen_type', 'prompt' => 'Duyduğunu yaz', 'audio' => $clean, 'answer' => $clean];
    }

    private function speak(string $text, ?string $tr = null): array
    {
        return array_filter(['type' => 'speak', 'prompt' => 'Sesli söyle', 'text' => $text, 'translation' => $tr], fn ($x) => $x !== null);
    }

    /** "Hata avı": a slip Turkish speakers really make; tap the word, pick the fix, read why. */
    private function spot(string $sentence, int $errorIndex, array $options, int $answer, string $why): array
    {
        return [
            'type' => 'spot_error', 'prompt' => 'Bu cümle bir Türk öğrencinin ağzından çıktı. Hatalı kelimeyi bul.',
            'words' => explode(' ', $sentence), 'error_index' => $errorIndex, 'options' => $options, 'answer' => $answer, 'explanation_tr' => $why,
        ];
    }

    /** "Sahne": a real scene with the learner's line missing. */
    private function dialogue(string $prompt, ?string $scene, array $lines, array $options, int $answer, ?string $note = null): array
    {
        return array_filter(['type' => 'dialogue', 'prompt' => $prompt, 'scene' => $scene, 'lines' => $lines, 'options' => $options, 'answer' => $answer, 'note_tr' => $note], fn ($x) => $x !== null);
    }

    /** "Sıralama": steps given in the right order; the player shuffles them on screen. */
    private function sequence(string $prompt, array $items, ?string $note = null): array
    {
        return array_filter(['type' => 'sequence', 'prompt' => $prompt, 'items' => $items, 'answer' => range(0, count($items) - 1), 'note_tr' => $note], fn ($x) => $x !== null);
    }
}
