<?php

namespace Database\Seeders;

use App\Models\ExamQuestion;
use Illuminate\Database\Seeder;

/**
 * Original practice items in ÖSYM (YDS, YÖKDİL, YDT) and IELTS/TOEFL style.
 * Answers are written first in the data file and shuffled here with a fixed seed,
 * so the key is stable between installs but not always "A".
 */
class ExamSeeder extends Seeder
{
    public function run(): void
    {
        $items = json_decode(file_get_contents(database_path('data/exam.json')), true);
        mt_srand(2026);
        foreach ($items as $i => $q) {
            $options = $q['options'];
            $answer = $options[$q['answer']];
            if ($q['section'] !== 'irrelevant') {
                shuffle($options);
            }
            ExamQuestion::query()->updateOrCreate(['prompt' => $q['prompt'], 'section' => $q['section'], 'passage' => $q['passage'] ?? null], [
                'exams' => $q['exams'],
                'cefr' => $q['cefr'],
                'passage' => $q['passage'] ?? null,
                'options' => $options,
                'answer' => array_search($answer, $options, true),
                'explanation' => $q['explanation'],
                'position' => $i,
                'is_active' => true,
            ]);
        }
        mt_srand();
    }
}
