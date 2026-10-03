<?php

namespace Database\Seeders;

use App\Models\WordSet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Ready-made word sets: one per curriculum unit (by level), plus exam and topic
 * sets from data/word_sets.json. Re-running updates them in place by slug.
 */
class WordSetSeeder extends Seeder
{
    public function run(): void
    {
        $sets = [];
        foreach (['a1', 'a2', 'b1', 'b2'] as $file) {
            $c = json_decode(file_get_contents(database_path("data/curriculum/{$file}.json")), true, flags: JSON_THROW_ON_ERROR);
            foreach ($c['units'] as $i => $u) {
                $sentences = array_merge(array_column($u['vs'], 0), array_column($u['sp'], 0), $u['lt']);
                $sets[] = [
                    'slug' => "{$file}-".($i + 1), 'title' => strtoupper($file).' · '.$u['title'], 'description' => $u['desc'], 'level' => strtoupper($file),
                    'category' => 'level', 'exam' => null, 'cover' => $file,
                    'items' => array_map(fn ($p) => [$p[0], $p[1], collect($sentences)->first(fn ($s) => preg_match('/\b'.preg_quote($p[0], '/').'\b/i', $s))], $u['vocab']),
                ];
            }
        }
        $sets = array_merge($sets, json_decode(file_get_contents(database_path('data/word_sets.json')), true, flags: JSON_THROW_ON_ERROR));

        foreach ($sets as $s) {
            $set = WordSet::query()->updateOrCreate(['slug' => $s['slug']], [
                'user_id' => null, 'title' => $s['title'], 'description' => $s['description'] ?? null, 'level' => $s['level'] ?? null,
                'category' => $s['category'], 'exam' => $s['exam'] ?? null, 'cover' => $s['cover'], 'is_public' => true, 'words_count' => count($s['items']),
            ]);
            DB::table('word_set_items')->where('word_set_id', $set->id)->delete();
            DB::table('word_set_items')->insert(array_map(fn ($it, $k) => ['word_set_id' => $set->id, 'word' => $it[0], 'translation' => $it[1], 'example' => $it[2] ?? null, 'position' => $k], $s['items'], array_keys($s['items'])));
        }
    }
}
