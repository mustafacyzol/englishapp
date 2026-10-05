<?php

namespace App\Services;

use App\Models\AiConversation;
use App\Models\Lesson;
use App\Models\LessonMistake;
use App\Models\StoryRead;
use App\Models\User;
use App\Models\WordSet;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The stops on the path that are not a plain lesson, and the memory of mistakes.
 *
 *  - Story, word-set and Defne stops count as done only when the work was really
 *    done: the story finished with its questions answered, the unit's word set
 *    played with at least half right, a conversation of three or more turns.
 *  - Every question answered wrong in a lesson is remembered. The unit's
 *    "Hatalarını onar" stop serves the due ones first; a mistake is cleared after
 *    two right answers on different days, a new slip brings it straight back.
 */
class PathActivities
{
    /** Question types worth remembering (match and speaking drills are graded too loosely). */
    private const REMEMBER = ['choice', 'fill', 'listen_choice', 'dialogue', 'read', 'spot_error', 'sequence', 'translate', 'listen_type'];

    /** How many remembered mistakes one review stop serves, and its total length. */
    private const REVIEW_MISTAKES = 6;

    private const REVIEW_TOTAL = 8;

    /** Seconds a word-set game must take at the least before it can complete the stop. */
    private const MIN_GAME_SECONDS = 15;

    public function wordSet(Lesson $lesson): ?WordSet
    {
        $slug = $lesson->meta['set'] ?? null;

        return $slug ? WordSet::query()->where('slug', $slug)->first() : null;
    }

    /** The deck was handed out: the clock for the minimum playing time starts now. */
    public function deckServed(User $user, Lesson $lesson): void
    {
        Cache::put($this->deckKey($user, $lesson), now()->timestamp, now()->addHours(3));
    }

    /**
     * Throws a 422 with a plain reason when a story, word or Defne stop is
     * submitted without the work behind it.
     */
    public function verify(User $user, Lesson $lesson, array $answers): void
    {
        match ($lesson->kind) {
            'story' => abort_unless(
                $lesson->story_id && StoryRead::query()->where('user_id', $user->id)->where('story_id', $lesson->story_id)->whereNotNull('completed_at')->exists(),
                422, 'Önce hikâyeyi sonuna kadar oku ve sorularını yanıtla.'),
            'words' => $this->verifyWords($user, $lesson, $answers),
            'ai_talk' => abort_unless(
                AiConversation::query()->where('user_id', $user->id)->where('scenario_key', $lesson->scenario_key)
                    ->whereHas('messages', fn ($q) => $q->where('role', 'user'), '>=', 3)->exists(),
                422, 'Defne ile en az üç kez konuşunca bu durak tamamlanır.'),
            default => null,
        };
    }

    private function verifyWords(User $user, Lesson $lesson, array $answers): void
    {
        $started = Cache::get($this->deckKey($user, $lesson));
        $total = (int) ($answers['total'] ?? 0);
        $correct = min($total, (int) ($answers['correct'] ?? 0));
        abort_unless($started, 422, 'Bu durağı tamamlamak için kelime oyununu oyna.');
        abort_if(now()->timestamp - $started < self::MIN_GAME_SECONDS, 422, 'Oyunu bitirmeden durak tamamlanmaz.');
        abort_if($total < 4 || $total > 60, 422, 'Oyun sonucu geçersiz.');
        abort_if($correct / $total < 0.5, 422, 'Kelimelerin en az yarısını bilince bu durak tamamlanır. Bir tur daha dene!');
        Cache::forget($this->deckKey($user, $lesson));
        // the play counts for homework that assigned the same set
        if ($set = $this->wordSet($lesson)) {
            DB::table('word_set_plays')->insert(['user_id' => $user->id, 'word_set_id' => $set->id, 'game' => substr((string) ($answers['game'] ?? 'path'), 0, 20), 'correct' => $correct, 'total' => $total, 'created_at' => now()]);
        }
    }

    // ---- mistakes ---------------------------------------------------------

    /**
     * The exercises of a review stop: the learner's due mistakes first (oldest
     * and most missed), topped up with the unit's own review questions. The set
     * is kept for a few hours so the answers are graded against what was shown.
     */
    public function reviewSet(User $user, Lesson $lesson): array
    {
        $key = $this->reviewKey($user, $lesson);
        if ($kept = Cache::get($key)) {
            return $kept;
        }
        $due = LessonMistake::query()->with('lesson:id,title,exercises')
            ->where('user_id', $user->id)->whereNull('fixed_at')->where('due_at', '<=', now())
            ->orderByDesc('misses')->orderBy('due_at')->limit(self::REVIEW_MISTAKES * 2)->get();

        $exercises = [];
        $ids = [];
        foreach ($due as $m) {
            $ex = $m->lesson?->exercises[$m->ex_index] ?? null;
            if (! $ex || ! in_array($ex['type'] ?? '', self::REMEMBER, true)) {
                continue;
            }
            $exercises[] = $ex + ['review_of' => $m->lesson->title];
            $ids[] = $m->id;
            if (count($exercises) >= self::REVIEW_MISTAKES) {
                break;
            }
        }
        foreach (array_values($lesson->exercises ?? []) as $ex) {
            if (count($exercises) >= self::REVIEW_TOTAL) {
                break;
            }
            $exercises[] = $ex;
            $ids[] = null;
        }
        $set = ['exercises' => $exercises, 'ids' => $ids];
        Cache::put($key, $set, now()->addHours(6));

        return $set;
    }

    public function forgetReviewSet(User $user, Lesson $lesson): void
    {
        Cache::forget($this->reviewKey($user, $lesson));
    }

    /** Due mistakes waiting for the learner (shown on the review stops of the path). */
    public function dueCount(User $user): int
    {
        return LessonMistake::query()->where('user_id', $user->id)->whereNull('fixed_at')->where('due_at', '<=', now())->count();
    }

    /**
     * After a lesson is graded: wrong answers are remembered (or brought back),
     * right answers on remembered questions move them towards being cleared.
     *
     * @param  list<array>  $exercises  what was shown
     * @param  list<bool>  $results  graded results, same order
     * @param  list<int|null>  $mistakeIds  for a review stop, which mistake each exercise came from
     */
    public function remember(User $user, Lesson $lesson, array $exercises, array $results, array $mistakeIds = []): void
    {
        foreach ($results as $i => $ok) {
            $ex = $exercises[$i] ?? null;
            if (! $ex || ! in_array($ex['type'] ?? '', self::REMEMBER, true)) {
                continue;
            }
            // on a review stop only the served mistakes are tracked, not the filler questions
            if ($mistakeIds && empty($mistakeIds[$i])) {
                continue;
            }
            $m = isset($mistakeIds[$i]) && $mistakeIds[$i]
                ? LessonMistake::query()->where('user_id', $user->id)->find($mistakeIds[$i])
                : (isset($ex['review_of']) ? null : LessonMistake::query()->firstWhere(['user_id' => $user->id, 'lesson_id' => $lesson->id, 'ex_index' => $i]));
            if ($ok) {
                if ($m && ! $m->fixed_at) {
                    // the second right answer, on a later day than the first, clears it
                    $streak = $m->updated_at && $m->streak > 0 && $m->updated_at->isSameDay(now()) ? $m->streak : $m->streak + 1;
                    $m->update(['streak' => $streak, 'due_at' => now()->addDays($streak >= 2 ? 0 : 2), 'fixed_at' => $streak >= 2 ? now() : null]);
                }

                continue;
            }
            if ($m) {
                $m->update(['misses' => $m->misses + 1, 'streak' => 0, 'due_at' => now(), 'fixed_at' => null]);
            } elseif (! isset($ex['review_of'])) {
                LessonMistake::query()->create(['user_id' => $user->id, 'lesson_id' => $lesson->id, 'ex_index' => $i, 'skill' => $lesson->skill, 'due_at' => now()]);
            }
        }
    }

    private function deckKey(User $user, Lesson $lesson): string
    {
        return "path:deck:{$user->id}:{$lesson->id}";
    }

    private function reviewKey(User $user, Lesson $lesson): string
    {
        return "path:review:{$user->id}:{$lesson->id}";
    }
}
