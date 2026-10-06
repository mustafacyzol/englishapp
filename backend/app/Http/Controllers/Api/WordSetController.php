<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserWord;
use App\Models\WordSet;
use App\Support\ContentGuard;
use App\Support\Quota;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Word sets ("kelime setleri"): browse ready-made sets by level, exam and topic,
 * build your own, save other people's public sets, copy one to extend it, add a
 * set to your word library and play any set in the word games.
 */
class WordSetController extends Controller
{
    public const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

    public const EXAMS = ['lgs', 'ydt', 'yds', 'yokdil', 'ielts', 'toefl'];

    public const COVERS = ['a1', 'a2', 'b1', 'b2', 'lgs', 'ydt', 'yds', 'ielts', 'travel', 'business', 'daily', 'school', 'science', 'nature', 'food', 'sport'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $f = $request->validate([
            'q' => ['nullable', 'string', 'max:60'],
            'level' => ['nullable', Rule::in(self::LEVELS)],
            'exam' => ['nullable', Rule::in(self::EXAMS)],
            'category' => ['nullable', Rule::in(['level', 'exam', 'topic', 'mine'])],
            'scope' => ['nullable', Rule::in(['explore', 'mine', 'saved'])],
        ]);
        $saved = DB::table('word_set_saves')->where('user_id', $user->id)->pluck('word_set_id')->all();
        $q = WordSet::query()->with('owner:id,name,username');
        $scope = $f['scope'] ?? 'explore';
        if ($scope === 'mine') {
            $q->where('user_id', $user->id);
        } elseif ($scope === 'saved') {
            $q->whereIn('id', $saved)->visibleTo($user);
        } else {
            $q->visibleTo($user);
        }
        $q->when($f['level'] ?? null, fn ($x, $v) => $x->where('level', $v))
            ->when($f['exam'] ?? null, fn ($x, $v) => $x->where('exam', $v))
            ->when($f['category'] ?? null, fn ($x, $v) => $x->where('category', $v))
            ->when($f['q'] ?? null, function ($x, $v) {
                $like = '%'.addcslashes($v, '%_\\').'%';
                $x->where(fn ($w) => $w->where('title', 'like', $like)->orWhere('description', 'like', $like)->orWhere('exam', mb_strtolower(trim($v)))
                    ->orWhereExists(fn ($s) => $s->from('word_set_items')->whereColumn('word_set_items.word_set_id', 'word_sets.id')->where(fn ($i) => $i->where('word', 'like', $like)->orWhere('translation', 'like', $like))));
            })
            // ready-made first (level order), then the most saved, then the newest
            ->orderByRaw('CASE WHEN user_id IS NULL THEN 0 ELSE 1 END')->orderBy('level')->orderByDesc('saves_count')->orderByDesc('id');

        return response()->json(['data' => $q->limit(120)->get()->map(fn (WordSet $s) => $this->card($s, $user->id, $saved))]);
    }

    public function show(Request $request, WordSet $set): JsonResponse
    {
        $user = $request->user();
        abort_unless($set->isVisibleTo($user), 404);
        $saved = DB::table('word_set_saves')->where('user_id', $user->id)->where('word_set_id', $set->id)->exists();
        $known = $user->words()->pluck('word')->map(fn ($w) => mb_strtolower($w))->flip();

        return response()->json(['data' => $this->card($set->load('owner:id,name,username'), $user->id, $saved ? [$set->id] : []) + [
            'items' => $set->items->map(fn ($i) => ['id' => $i->id, 'word' => $i->word, 'translation' => $i->translation, 'example' => $i->example, 'in_library' => $known->has(mb_strtolower($i->word))]),
            'plays' => DB::table('word_set_plays')->where('user_id', $user->id)->where('word_set_id', $set->id)->count(),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        // content first, so a refused share does not use up the day's quota
        $this->guardPublic($request->user(), $data);
        $hash = WordSet::hashOf(array_column($data['items'], 'word'));
        abort_if(WordSet::query()->where('user_id', $request->user()->id)->where('content_hash', $hash)->exists(), 422, 'Bu kelimelerle bir setin zaten var. Onu düzenleyebilirsin.');
        $this->guardNew($request->user());
        $set = WordSet::query()->create($this->fields($data) + ['user_id' => $request->user()->id, 'category' => 'mine']);
        $this->syncItems($set, $data['items']);

        return $this->show($request, $set->fresh());
    }

    public function update(Request $request, WordSet $set): JsonResponse
    {
        abort_unless($set->user_id === $request->user()->id, 403, 'Bu seti yalnızca sahibi düzenleyebilir. Kopyalayıp kendi setin yapabilirsin.');
        $data = $this->validated($request);
        Quota::take($request->user(), 'word-sets.edit', 120, 'hour', 'Setlerini çok sık düzenledin. Biraz sonra tekrar dene.');
        $this->guardPublic($request->user(), $data, $set);
        $set->update($this->fields($data));
        $this->syncItems($set, $data['items']);

        return $this->show($request, $set->fresh());
    }

    public function destroy(Request $request, WordSet $set): JsonResponse
    {
        abort_unless($set->user_id === $request->user()->id, 403);
        $set->delete();

        return response()->json(['ok' => true]);
    }

    public function save(Request $request, WordSet $set): JsonResponse
    {
        $user = $request->user();
        abort_unless($set->isVisibleTo($user), 404);
        Quota::take($user, 'word-sets.save', 120, 'hour', 'Çok hızlı kaydedip çıkarıyorsun. Biraz sonra tekrar dene.');
        $q = DB::table('word_set_saves')->where('user_id', $user->id)->where('word_set_id', $set->id);
        if ($q->exists()) {
            $q->delete();
            $set->decrement('saves_count');
            $saved = false;
        } else {
            DB::table('word_set_saves')->insert(['user_id' => $user->id, 'word_set_id' => $set->id, 'created_at' => now()]);
            $set->increment('saves_count');
            $saved = true;
        }

        return response()->json(['saved' => $saved, 'saves_count' => $set->fresh()->saves_count]);
    }

    /** Your own editable copy of any visible set, to add words on top. */
    public function copy(Request $request, WordSet $set): JsonResponse
    {
        $user = $request->user();
        abort_unless($set->isVisibleTo($user), 404);
        $this->guardNew($user);
        $copy = WordSet::query()->create([
            'user_id' => $user->id, 'title' => mb_substr($set->title, 0, 110).' (benim)', 'description' => $set->description, 'level' => $set->level,
            'exam' => $set->exam, 'cover' => $set->cover, 'category' => 'mine', 'is_public' => false, 'copied_from_id' => $set->id,
        ]);
        $this->syncItems($copy, $set->items->map(fn ($i) => $i->only(['word', 'translation', 'example']))->all());

        return $this->show($request, $copy->fresh());
    }

    /** Put every word of the set into the learner's notebook for spaced review. */
    public function learn(Request $request, WordSet $set): JsonResponse
    {
        $user = $request->user();
        abort_unless($set->isVisibleTo($user), 404);
        Quota::take($user, 'word-sets.learn', 30, 'hour', 'Bir saatte en fazla 30 seti deftere ekleyebilirsin.');
        $known = $user->words()->pluck('word')->map(fn ($w) => mb_strtolower($w))->flip();
        $room = max(0, (int) Settings::get('limits.notebook_size', 5000) - $known->count());
        abort_if($room === 0, 422, 'Kelime defterin dolu. Öğrendiğin kelimeleri silerek yer açabilirsin.');
        $added = 0;
        foreach ($set->items as $i) {
            if ($known->has(mb_strtolower($i->word)) || $added >= $room) {
                continue;
            }
            UserWord::query()->create(['user_id' => $user->id, 'word' => $i->word, 'translation' => $i->translation, 'example' => $i->example, 'due_at' => now()]);
            $added++;
        }

        return response()->json(['added' => $added, 'message' => $added ? "{$added} kelime kütüphanene eklendi." : 'Bu setin bütün kelimeleri zaten kütüphanende.']);
    }

    /** A finished game with this set: counts towards homework that assigned it. */
    public function played(Request $request, WordSet $set): JsonResponse
    {
        $user = $request->user();
        abort_unless($set->isVisibleTo($user), 404);
        Quota::take($user, 'word-sets.played', 120, 'hour', 'Çok fazla oyun sonucu gönderildi. Biraz sonra tekrar dene.');
        $d = $request->validate(['game' => ['required', 'string', 'max:20'], 'correct' => ['required', 'integer', 'min:0', 'max:200'], 'total' => ['required', 'integer', 'min:1', 'max:200']]);
        DB::table('word_set_plays')->insert(['user_id' => $user->id, 'word_set_id' => $set->id, 'game' => $d['game'], 'correct' => min($d['correct'], $d['total']), 'total' => $d['total'], 'created_at' => now()]);

        return response()->json(['ok' => true]);
    }

    /**
     * Report a shared set. One report per learner per set; enough reports from
     * different learners hide it until a moderator restores or removes it.
     */
    public function report(Request $request, WordSet $set): JsonResponse
    {
        $user = $request->user();
        abort_unless($set->isVisibleTo($user) && $set->user_id !== null && $set->user_id !== $user->id, 404);
        $data = $request->validate([
            'reason' => ['required', Rule::in(array_keys(\App\Models\WordSetReport::REASONS))],
            'note' => ['nullable', 'string', 'max:300'],
        ]);
        Quota::take($user, 'word-sets.report', 20, 'day', 'Bugün yeterince şikâyet gönderdin, teşekkürler. Ekibimiz inceliyor.');
        $new = \App\Models\WordSetReport::query()->firstOrCreate(['word_set_id' => $set->id, 'user_id' => $user->id], [
            'reason' => $data['reason'], 'note' => isset($data['note']) ? strip_tags($data['note']) : null, 'created_at' => now(),
        ])->wasRecentlyCreated;
        if ($new) {
            $set->increment('reports_count');
            // reports only count from accounts that could not have been made a minute ago
            $trusted = \App\Models\WordSetReport::query()->where('word_set_id', $set->id)
                ->whereHas('user', fn ($q) => $q->whereNotNull('email_verified_at')->where('created_at', '<', now()->subDay()))->count();
            if ($set->hidden_at === null && $trusted >= max(1, (int) Settings::get('moderation.report_hide', 3))) {
                $set->forceFill(['hidden_at' => now()])->save();
                \App\Support\Audit::log('word_set.auto_hidden', null, $set, ['reports' => $trusted]);
            }
        }

        return response()->json(['ok' => true, 'message' => 'Teşekkürler, ekibimiz inceleyecek.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:300'],
            'level' => ['nullable', Rule::in(self::LEVELS)],
            'exam' => ['nullable', Rule::in(self::EXAMS)],
            'cover' => ['nullable', Rule::in(self::COVERS)],
            'is_public' => ['boolean'],
            'items' => ['required', 'array', 'min:2', 'max:150'],
            'items.*.word' => ['required', 'string', 'max:80'],
            'items.*.translation' => ['required', 'string', 'max:160'],
            'items.*.example' => ['nullable', 'string', 'max:255'],
        ], ['items.min' => 'Bir sette en az 2 kelime olmalı.']);
    }

    /** A new set (or copy): a daily quota and a ceiling on how many one learner owns. */
    private function guardNew(User $user): void
    {
        $total = (int) Settings::get('limits.word_sets_total', 60);
        abort_if(WordSet::query()->where('user_id', $user->id)->count() >= $total, 422, "En fazla {$total} setin olabilir. Kullanmadıklarını silerek yer açabilirsin.");
        $perDay = (int) Settings::get('limits.word_sets_per_day', 20);
        Quota::take($user, 'word-sets.create', $perDay, 'day', "Bugün en fazla {$perDay} set oluşturabilir ya da kopyalayabilirsin.");
    }

    /**
     * Sharing is earned and checked: a verified account a day old, a cap on
     * public sets, and no links, contact details or blocked words in anything
     * other people will read.
     */
    private function guardPublic(User $user, array $data, ?WordSet $set = null): void
    {
        if (empty($data['is_public'])) {
            return;
        }
        abort_unless($user->email_verified_at && $user->created_at?->lt(now()->subDay()), 422, 'Setini paylaşabilmek için hesabının en az bir günlük ve doğrulanmış olması gerekir.');
        $cap = (int) Settings::get('limits.public_sets', 10);
        $public = WordSet::query()->where('user_id', $user->id)->where('is_public', true)->when($set, fn ($q) => $q->whereKeyNot($set->id))->count();
        abort_if($public >= $cap, 422, "En fazla {$cap} setini herkese açık paylaşabilirsin.");
        abort_if(! empty($user->preferences['share_blocked']), 403, 'Set paylaşımın bir moderatör tarafından kapatıldı. Setlerini gizli olarak kullanmaya devam edebilirsin.');
        // a shared set has to be a real word list: enough distinct words, real translations, no keyboard mashing
        $words = collect($data['items'])->map(fn ($i) => mb_strtolower(trim((string) ($i['word'] ?? ''))))->filter()->unique();
        abort_if($words->count() < 5, 422, 'Paylaşılan bir sette en az 5 farklı kelime olmalı.');
        $same = collect($data['items'])->filter(fn ($i) => mb_strtolower(trim((string) $i['word'])) === mb_strtolower(trim((string) $i['translation'])))->count();
        abort_if($same > count($data['items']) * 0.4, 422, 'Kelimelerin çoğunun çevirisi kendisiyle aynı. Türkçe karşılıklarını yazıp paylaşabilirsin.');
        $junk = $words->filter(fn ($w) => ! preg_match('/\p{L}/u', $w) || preg_match('/(.)\1{3,}/u', $w))->count();
        abort_if($junk > max(1, $words->count() * 0.2), 422, 'Sette kelime olmayan girdiler var. Düzeltip paylaşabilirsin.');
        // someone else's list re-posted as new: save theirs instead
        $hash = WordSet::hashOf($words->all());
        abort_if(WordSet::query()->where('content_hash', $hash)->where('is_public', true)->where('user_id', '!=', $user->id)->exists(), 422, 'Aynı kelimelerle paylaşılmış bir set zaten var. Onu kaydedebilir ya da kopyalayıp kendine göre değiştirebilirsin.');
        $text = implode("\n", [$data['title'], $data['description'] ?? '', ...array_map(fn ($i) => ($i['word'] ?? '').' '.($i['translation'] ?? '').' '.($i['example'] ?? ''), $data['items'])]);
        if ($why = ContentGuard::problem($text)) {
            abort(422, $why.' Setini gizli tutabilir ya da düzeltip paylaşabilirsin.');
        }
    }

    private function fields(array $d): array
    {
        return ['title' => strip_tags($d['title']), 'description' => isset($d['description']) ? strip_tags($d['description']) : null, 'level' => $d['level'] ?? null,
            'exam' => $d['exam'] ?? null, 'cover' => $d['cover'] ?? 'daily', 'is_public' => (bool) ($d['is_public'] ?? false)];
    }

    private function syncItems(WordSet $set, array $items): void
    {
        $seen = [];
        $rows = [];
        foreach (array_values($items) as $i) {
            $w = trim(strip_tags((string) $i['word']));
            $k = mb_strtolower($w);
            if ($w === '' || isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $rows[] = ['word_set_id' => $set->id, 'word' => $w, 'translation' => trim(strip_tags((string) $i['translation'])), 'example' => isset($i['example']) && $i['example'] !== '' ? trim(strip_tags((string) $i['example'])) : null, 'position' => count($rows)];
        }
        $set->items()->delete();
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('word_set_items')->insert($chunk);
        }
        $set->forceFill(['words_count' => count($rows), 'content_hash' => WordSet::hashOf(array_column($rows, 'word'))])->save();
    }

    private function card(WordSet $s, int $me, array $saved): array
    {
        return ['id' => $s->id, 'title' => $s->title, 'description' => $s->description, 'level' => $s->level, 'category' => $s->category, 'exam' => $s->exam,
            'cover' => $s->cover, 'is_public' => $s->is_public, 'words_count' => $s->words_count, 'saves_count' => $s->saves_count,
            'official' => $s->user_id === null, 'mine' => $s->user_id === $me, 'saved' => in_array($s->id, $saved, true),
            'owner' => $s->owner ? ['name' => $s->owner->name, 'username' => $s->owner->username] : null, 'updated_at' => $s->updated_at?->toIso8601String(),
            // the owner sees that a shared set was taken down; nobody else sees counts
            'hidden' => $s->user_id === $me && $s->hidden_at !== null];
    }
}
