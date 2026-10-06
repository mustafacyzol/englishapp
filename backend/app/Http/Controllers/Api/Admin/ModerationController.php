<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WordSet;
use App\Models\WordSetReport;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * The queue of shared word sets that learners reported (or that reports took
 * down). A moderator restores a set, hides it, deletes it or stops its owner
 * from sharing again.
 */
class ModerationController extends Controller
{
    public function wordSets(Request $request): JsonResponse
    {
        $f = $request->validate(['status' => ['nullable', Rule::in(['open', 'hidden', 'all'])]]);
        $status = $f['status'] ?? 'open';
        $sets = WordSet::query()->whereNotNull('user_id')
            ->when($status === 'open', fn ($q) => $q->where('reports_count', '>', 0))
            ->when($status === 'hidden', fn ($q) => $q->whereNotNull('hidden_at'))
            ->when($status === 'all', fn ($q) => $q->where('is_public', true))
            ->with(['owner:id,name,username,email,preferences', 'items' => fn ($q) => $q->limit(12)])
            ->orderByRaw('CASE WHEN hidden_at IS NULL THEN 1 ELSE 0 END')->orderByDesc('reports_count')->orderByDesc('updated_at')
            ->limit(100)->get();
        $reports = WordSetReport::query()->whereIn('word_set_id', $sets->pluck('id'))->with('user:id,name,username')->latest('id')->get()->groupBy('word_set_id');

        return response()->json([
            'reasons' => WordSetReport::REASONS,
            'counts' => [
                'open' => WordSet::query()->whereNotNull('user_id')->where('reports_count', '>', 0)->count(),
                'hidden' => WordSet::query()->whereNotNull('hidden_at')->count(),
                'all' => WordSet::query()->whereNotNull('user_id')->where('is_public', true)->count(),
            ],
            'data' => $sets->map(fn (WordSet $s) => [
                'id' => $s->id, 'title' => $s->title, 'description' => $s->description, 'level' => $s->level, 'is_public' => $s->is_public,
                'hidden_at' => $s->hidden_at?->toIso8601String(), 'reports_count' => $s->reports_count, 'words_count' => $s->words_count, 'saves_count' => $s->saves_count,
                'owner' => $s->owner ? ['id' => $s->owner->id, 'name' => $s->owner->name, 'username' => $s->owner->username, 'email' => $s->owner->email, 'share_blocked' => ! empty($s->owner->preferences['share_blocked'])] : null,
                'items' => $s->items->map(fn ($i) => ['word' => $i->word, 'translation' => $i->translation]),
                'reports' => ($reports[$s->id] ?? collect())->take(20)->map(fn ($r) => ['reason' => $r->reason, 'note' => $r->note, 'by' => $r->user?->username, 'at' => $r->created_at?->toIso8601String()])->values(),
            ]),
        ]);
    }

    public function moderate(Request $request, WordSet $set): JsonResponse
    {
        abort_if($set->user_id === null, 422, 'Hazır setler buradan yönetilmez.');
        $action = $request->validate(['action' => ['required', Rule::in(['restore', 'hide', 'delete', 'block_sharing', 'allow_sharing'])]])['action'];
        $owner = $set->owner;
        match ($action) {
            // reports were wrong: show it again and start counting from zero
            'restore' => tap($set, function (WordSet $s) {
                $s->reports()->delete();
                $s->forceFill(['hidden_at' => null, 'reports_count' => 0])->save();
            }),
            'hide' => $set->forceFill(['hidden_at' => now()])->save(),
            'delete' => $set->delete(),
            'block_sharing', 'allow_sharing' => $this->sharing($owner, $action === 'block_sharing'),
        };
        Audit::log("word_set.{$action}", $request->user(), $action === 'delete' ? null : $set, ['set' => $set->id, 'owner' => $owner?->id]);

        return response()->json(['ok' => true]);
    }

    /** Stop (or allow again) an owner sharing sets; their shared sets go private. */
    private function sharing(?User $owner, bool $block): void
    {
        abort_unless($owner, 404);
        $owner->forceFill(['preferences' => array_merge($owner->preferences ?? [], ['share_blocked' => $block])])->save();
        if ($block) {
            WordSet::query()->where('user_id', $owner->id)->where('is_public', true)->update(['is_public' => false]);
        }
    }
}
