<?php

namespace Database\Seeders;

use App\Models\Story;
use Illuminate\Database\Seeder;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $stories = json_decode(file_get_contents(database_path('data/stories.json')), true);
        foreach ($stories as $i => $s) {
            $s['word_count'] = collect($s['paragraphs'])->sum(fn ($p) => str_word_count($p['en']));
            $s['is_premium'] = in_array($s['cefr_level'], ['B1', 'B2'], true);
            $s['published_at'] = now()->subDays(count($stories) - $i);
            $s['cover_image'] = '/img/stories/'.$s['slug'].'.webp';
            Story::query()->updateOrCreate(['slug' => $s['slug']], $s);
        }
    }
}
