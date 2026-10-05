<?php

namespace Database\Seeders;

use App\Models\GradeUnit;
use App\Services\GradeUnitService;
use Illuminate\Database\Seeder;

/**
 * The MEB English units of grades 2 to 12 (database/data/grade_units.json):
 * the Türkiye Yüzyılı Maarif Modeli themes for the grades on the new
 * programme, the coursebook units for grades 4, 8 (LGS) and 12. Rows are
 * matched by grade and position; units an editor added after them are kept.
 */
class GradeUnitSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(file_get_contents(database_path('data/grade_units.json')), true, flags: JSON_THROW_ON_ERROR);
        foreach ($data as $track => $grade) {
            foreach ($grade['units'] as $i => $u) {
                GradeUnit::query()->updateOrCreate(['track' => $track, 'position' => $i], [
                    'title' => $u['title'], 'title_tr' => $u['tr'] ?? null, 'words' => $u['words'],
                    'sentences' => $u['sentences'] ?? [], 'note' => $u['note'] ?? null,
                ]);
            }
        }
        app(GradeUnitService::class)->sync();
    }
}
