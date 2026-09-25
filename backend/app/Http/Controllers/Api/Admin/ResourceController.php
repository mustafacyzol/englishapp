<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models;
use App\Support\Audit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * One generic, whitelisted CRUD endpoint for every content/commerce table the
 * admin panel manages. Adding a new manageable table = one entry in resources().
 */
class ResourceController extends Controller
{
    private function resources(?int $id = null): array
    {
        $cefr = 'in:A1,A2,B1,B2,C1,C2';

        return [
            'courses' => [
                'model' => Models\Course::class, 'search' => ['title', 'slug'], 'order' => 'position', 'role' => 'staff',
                'rules' => [
                    'slug' => ['required', 'alpha_dash', 'max:120', Rule::unique('courses')->ignore($id)],
                    'title' => ['required', 'string', 'max:190'],
                    'description' => ['nullable', 'string'],
                    'cefr_level' => ['required', $cefr],
                    'color' => ['nullable', 'string', 'max:20'],
                    'position' => ['integer'],
                    'is_published' => ['boolean'],
                ],
            ],
            'units' => [
                'model' => Models\Unit::class, 'search' => ['title'], 'order' => 'position', 'with' => ['course:id,title'], 'filters' => ['course_id'], 'role' => 'staff',
                'rules' => [
                    'course_id' => ['required', 'exists:courses,id'],
                    'title' => ['required', 'string', 'max:190'],
                    'description' => ['nullable', 'string', 'max:255'],
                    'guidebook' => ['nullable', 'string'],
                    'color' => ['nullable', 'string', 'max:20'],
                    'position' => ['integer'],
                ],
            ],
            'lessons' => [
                'model' => Models\Lesson::class, 'search' => ['title'], 'order' => 'position', 'with' => ['unit:id,title'], 'filters' => ['unit_id', 'skill', 'kind'], 'role' => 'staff',
                'rules' => [
                    'unit_id' => ['required', 'exists:units,id'],
                    'title' => ['required', 'string', 'max:190'],
                    'skill' => ['required', 'in:reading,listening,speaking,writing,vocabulary,grammar,mixed'],
                    'kind' => ['required', 'in:lesson,story,ai_talk,checkpoint'],
                    'position' => ['integer'],
                    'xp_reward' => ['integer', 'min:0', 'max:200'],
                    'is_premium' => ['boolean'],
                    'story_id' => ['nullable', 'exists:stories,id'],
                    'scenario_key' => ['nullable', 'exists:ai_scenarios,key'],
                    'exercises' => ['nullable', 'array'],
                    'exercises.*.type' => ['required', 'in:choice,fill,listen_choice,translate,listen_type,order,speak,match'],
                ],
            ],
            'stories' => [
                'model' => Models\Story::class, 'search' => ['title', 'title_tr', 'slug'], 'order' => '-id', 'filters' => ['cefr_level', 'category', 'is_premium', 'is_published'], 'role' => 'staff',
                'rules' => [
                    'slug' => ['required', 'alpha_dash', 'max:190', Rule::unique('stories')->ignore($id)],
                    'title' => ['required', 'string', 'max:190'],
                    'title_tr' => ['nullable', 'string', 'max:190'],
                    'summary' => ['nullable', 'string', 'max:1000'],
                    'cefr_level' => ['required', $cefr],
                    'category' => ['nullable', 'string', 'max:40'],
                    'cover_image' => ['nullable', 'string', 'max:500'],
                    'audio_url' => ['nullable', 'string', 'max:500'],
                    'reading_minutes' => ['integer', 'min:1', 'max:120'],
                    'paragraphs' => ['required', 'array', 'min:1'],
                    'paragraphs.*.en' => ['required', 'string'],
                    'paragraphs.*.tr' => ['nullable', 'string'],
                    'vocabulary' => ['nullable', 'array'],
                    'questions' => ['nullable', 'array'],
                    'is_premium' => ['boolean'],
                    'is_published' => ['boolean'],
                    'published_at' => ['nullable', 'date'],
                ],
                'before' => function (array $data) {
                    if (isset($data['paragraphs'])) {
                        $data['word_count'] = collect($data['paragraphs'])->sum(fn ($p) => str_word_count($p['en'] ?? ''));
                    }

                    return $data;
                },
            ],
            'scenarios' => [
                'model' => Models\AiScenario::class, 'search' => ['title', 'key'], 'order' => 'position', 'role' => 'staff',
                'rules' => [
                    'key' => ['required', 'alpha_dash', 'max:80', Rule::unique('ai_scenarios')->ignore($id)],
                    'title' => ['required', 'string', 'max:190'],
                    'description' => ['nullable', 'string', 'max:255'],
                    'emoji' => ['nullable', 'string', 'max:16'],
                    'category' => ['required', 'in:daily,travel,career,exam,fun'],
                    'cefr_min' => ['required', $cefr],
                    'system_prompt' => ['required', 'string', 'max:4000'],
                    'opening_line' => ['nullable', 'string', 'max:500'],
                    'goals' => ['nullable', 'array', 'max:6'],
                    'is_premium' => ['boolean'],
                    'is_active' => ['boolean'],
                    'position' => ['integer'],
                ],
            ],
            'achievements' => [
                'model' => Models\Achievement::class, 'search' => ['title', 'key'], 'order' => 'position', 'role' => 'admin',
                'rules' => [
                    'key' => ['required', 'alpha_dash', 'max:80', Rule::unique('achievements')->ignore($id)],
                    'title' => ['required', 'string', 'max:120'],
                    'description' => ['required', 'string', 'max:255'],
                    'category' => ['required', 'string', 'max:30'],
                    'metric' => ['required', 'in:xp_total,level,streak,lessons_completed,stories_read,words_saved,words_mastered,ai_messages,speaking,perfect_lessons,reviews,goal_days,referrals,league_top3,league_tier'],
                    'threshold' => ['required', 'integer', 'min:1'],
                    'tier' => ['required', 'in:bronze,silver,gold,legend'],
                    'icon' => ['required', 'string', 'max:40'],
                    'reward_gems' => ['integer', 'min:0'],
                    'reward_item_key' => ['nullable', 'exists:reward_items,key'],
                    'is_hidden' => ['boolean'],
                    'position' => ['integer'],
                ],
            ],
            'quests' => [
                'model' => Models\Quest::class, 'search' => ['title', 'key'], 'order' => 'id', 'role' => 'admin',
                'rules' => [
                    'key' => ['required', 'alpha_dash', 'max:80', Rule::unique('quests')->ignore($id)],
                    'title' => ['required', 'string', 'max:120'],
                    'metric' => ['required', 'in:xp,lessons,stories,reviews,ai_messages,speaking,perfect_lessons,minutes'],
                    'target' => ['required', 'integer', 'min:1'],
                    'period' => ['required', 'in:daily,weekly'],
                    'reward_gems' => ['integer', 'min:0'],
                    'reward_xp' => ['integer', 'min:0'],
                    'reward_item_key' => ['nullable', 'exists:reward_items,key'],
                    'is_active' => ['boolean'],
                ],
            ],
            'plans' => [
                'model' => Models\Plan::class, 'search' => ['name', 'slug'], 'order' => 'position', 'role' => 'admin',
                'rules' => [
                    'slug' => ['required', 'alpha_dash', 'max:80', Rule::unique('plans')->ignore($id)],
                    'name' => ['required', 'string', 'max:120'],
                    'tagline' => ['nullable', 'string', 'max:190'],
                    'interval' => ['required', 'in:month,quarter,year,lifetime'],
                    'duration_days' => ['required', 'integer', 'min:1'],
                    'price' => ['required', 'numeric', 'min:0'],
                    'compare_at_price' => ['nullable', 'numeric', 'min:0'],
                    'currency' => ['required', 'string', 'size:3'],
                    'features' => ['nullable', 'array'],
                    'badge' => ['nullable', 'string', 'max:60'],
                    'bonus_gems' => ['integer', 'min:0'],
                    'live_lesson_credits' => ['integer', 'min:0', 'max:50'],
                    'is_featured' => ['boolean'],
                    'is_active' => ['boolean'],
                    'position' => ['integer'],
                ],
            ],
            'blog-posts' => [
                'model' => Models\BlogPost::class, 'search' => ['title', 'slug'], 'order' => '-published_at', 'filters' => ['category', 'is_published'], 'role' => 'staff',
                'rules' => [
                    'slug' => ['required', 'alpha_dash', 'max:190', Rule::unique('blog_posts')->ignore($id)],
                    'title' => ['required', 'string', 'max:190'],
                    'excerpt' => ['nullable', 'string', 'max:400'],
                    'body' => ['required', 'string'],
                    'cover_image' => ['nullable', 'string', 'max:500'],
                    'category' => ['nullable', 'string', 'max:40'],
                    'author_name' => ['nullable', 'string', 'max:80'],
                    'reading_minutes' => ['integer', 'min:1', 'max:60'],
                    'is_published' => ['boolean'],
                    'published_at' => ['nullable', 'date'],
                ],
            ],
            'testimonials' => [
                'model' => Models\Testimonial::class, 'search' => ['name', 'quote'], 'order' => 'position', 'filters' => ['is_published'], 'role' => 'staff',
                'rules' => [
                    'name' => ['required', 'string', 'max:80'],
                    'role' => ['nullable', 'string', 'max:120'],
                    'avatar' => ['nullable', 'string', 'max:500'],
                    'quote' => ['required', 'string', 'max:600'],
                    'highlight' => ['nullable', 'string', 'max:120'],
                    'rating' => ['integer', 'between:1,5'],
                    'cefr_level' => ['nullable', 'in:A1,A2,B1,B2,C1,C2'],
                    'streak' => ['nullable', 'integer', 'min:0', 'max:5000'],
                    'is_published' => ['boolean'],
                    'position' => ['integer', 'min:0'],
                ],
            ],
            'contact-messages' => [
                'model' => Models\ContactMessage::class, 'search' => ['name', 'email', 'message'], 'order' => '-id', 'filters' => ['status', 'topic'], 'role' => 'staff',
                'rules' => [
                    'status' => ['required', 'in:new,replied,closed'],
                    'admin_note' => ['nullable', 'string', 'max:2000'],
                ],
            ],
            'coupons' => [
                'model' => Models\Coupon::class, 'search' => ['code', 'description'], 'order' => '-id', 'filters' => ['is_active'], 'role' => 'admin',
                'rules' => [
                    'code' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('coupons')->ignore($id)],
                    'description' => ['nullable', 'string', 'max:255'],
                    'type' => ['required', 'in:percent,fixed'],
                    'value' => ['required', 'numeric', 'min:0'],
                    'max_uses' => ['nullable', 'integer', 'min:1'],
                    'max_uses_per_user' => ['integer', 'min:1'],
                    'min_amount' => ['nullable', 'numeric', 'min:0'],
                    'plan_ids' => ['nullable', 'array'],
                    'first_order_only' => ['boolean'],
                    'starts_at' => ['nullable', 'date'],
                    'expires_at' => ['nullable', 'date'],
                    'is_active' => ['boolean'],
                ],
                'before' => fn (array $d) => isset($d['code']) ? ['code' => strtoupper($d['code'])] + $d : $d,
            ],
            'reward-items' => [
                'model' => Models\RewardItem::class, 'search' => ['name', 'key'], 'order' => 'position', 'filters' => ['type'], 'role' => 'admin',
                'rules' => [
                    'key' => ['required', 'alpha_dash', 'max:80', Rule::unique('reward_items')->ignore($id)],
                    'name' => ['required', 'string', 'max:120'],
                    'description' => ['nullable', 'string', 'max:255'],
                    'type' => ['required', 'in:streak_freeze,xp_boost,heart_refill,premium_days,gems,live_lesson,discount_coupon,avatar_frame,chest'],
                    'value' => ['nullable', 'array'],
                    'price_gems' => ['nullable', 'integer', 'min:0'],
                    'icon' => ['required', 'string', 'max:40'],
                    'rarity' => ['required', 'in:common,rare,epic,legendary'],
                    'is_active' => ['boolean'],
                    'position' => ['integer'],
                ],
            ],
            'redeem-codes' => [
                'model' => Models\RedeemCode::class, 'search' => ['code', 'batch', 'description'], 'order' => '-id', 'filters' => ['batch', 'type', 'is_active'], 'with' => ['item:id,name'], 'role' => 'admin',
                'rules' => [
                    'code' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('redeem_codes')->ignore($id)],
                    'description' => ['nullable', 'string', 'max:255'],
                    'batch' => ['nullable', 'string', 'max:60'],
                    'type' => ['required', 'in:premium_days,gems,item'],
                    'amount' => ['integer', 'min:0'],
                    'reward_item_id' => ['nullable', 'required_if:type,item', 'exists:reward_items,id'],
                    'max_uses' => ['integer', 'min:1'],
                    'expires_at' => ['nullable', 'date'],
                    'is_active' => ['boolean'],
                ],
                'before' => fn (array $d) => isset($d['code']) ? ['code' => strtoupper($d['code'])] + $d : $d,
            ],
        ];
    }

    private function config(string $resource, ?int $id = null): array
    {
        $cfg = $this->resources($id)[$resource] ?? abort(404, 'Unknown resource');
        $user = request()->user();
        abort_unless($cfg['role'] === 'staff' ? $user->isStaff() : $user->isAdmin(), 403);

        return $cfg;
    }

    public function index(Request $request, string $resource): JsonResponse
    {
        $cfg = $this->config($resource);
        /** @var Model $model */
        $q = $cfg['model']::query()->with($cfg['with'] ?? []);

        if ($s = $request->query('q')) {
            $q->where(fn ($w) => collect($cfg['search'])->each(fn ($f) => $w->orWhere($f, 'like', "%{$s}%")));
        }
        foreach ($cfg['filters'] ?? [] as $f) {
            if ($request->filled($f)) {
                $q->where($f, $request->query($f));
            }
        }
        $order = (string) $request->query('sort', $cfg['order']);
        $sortable = array_merge(['id', 'created_at', 'updated_at', ltrim($cfg['order'], '-')], $cfg['search']);
        if (! in_array(ltrim($order, '-'), $sortable, true)) {
            $order = $cfg['order'];
        }
        $q->orderBy(ltrim($order, '-'), str_starts_with($order, '-') ? 'desc' : 'asc');

        return response()->json($q->paginate(min(100, (int) $request->query('per_page', 25))));
    }

    public function show(string $resource, int $id): JsonResponse
    {
        $cfg = $this->config($resource, $id);

        return response()->json(['data' => $cfg['model']::query()->with($cfg['with'] ?? [])->findOrFail($id)]);
    }

    public function store(Request $request, string $resource): JsonResponse
    {
        $cfg = $this->config($resource);
        $data = $request->validate($cfg['rules']);
        $data = isset($cfg['before']) ? $cfg['before']($data) : $data;
        $record = $cfg['model']::query()->create($data);
        Audit::log("admin.{$resource}.created", $request->user(), $record);

        return response()->json(['data' => $record], 201);
    }

    public function update(Request $request, string $resource, int $id): JsonResponse
    {
        $cfg = $this->config($resource, $id);
        $record = $cfg['model']::query()->findOrFail($id);
        $rules = collect($cfg['rules'])->map(fn ($r) => array_merge(['sometimes'], $r))->all();
        $data = $request->validate($rules);
        $data = isset($cfg['before']) ? $cfg['before']($data) : $data;
        $record->update($data);
        Audit::log("admin.{$resource}.updated", $request->user(), $record, ['fields' => array_keys($data)]);

        return response()->json(['data' => $record->fresh()]);
    }

    public function destroy(Request $request, string $resource, int $id): JsonResponse
    {
        $cfg = $this->config($resource, $id);
        $record = $cfg['model']::query()->findOrFail($id);
        $record->delete();
        Audit::log("admin.{$resource}.deleted", $request->user(), null, ['id' => $id]);

        return response()->json(['ok' => true]);
    }

    /** Bulk-generate redeem codes (e.g. 500 codes for a school campaign). */
    public function generateCodes(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate([
            'count' => ['required', 'integer', 'min:1', 'max:2000'],
            'prefix' => ['nullable', 'string', 'max:10', 'regex:/^[A-Za-z0-9]+$/'],
            'batch' => ['required', 'string', 'max:60'],
            'type' => ['required', 'in:premium_days,gems,item'],
            'amount' => ['integer', 'min:0'],
            'reward_item_id' => ['nullable', 'required_if:type,item', 'exists:reward_items,id'],
            'max_uses' => ['integer', 'min:1'],
            'expires_at' => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $codes = [];
        $prefix = strtoupper($data['prefix'] ?? 'DG');
        while (count($codes) < $data['count']) {
            $code = $prefix.'-'.strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4));
            if (isset($codes[$code]) || Models\RedeemCode::query()->where('code', $code)->exists()) {
                continue;
            }
            $codes[$code] = [
                'code' => $code,
                'batch' => $data['batch'],
                'type' => $data['type'],
                'amount' => $data['amount'] ?? 0,
                'reward_item_id' => $data['reward_item_id'] ?? null,
                'max_uses' => $data['max_uses'] ?? 1,
                'expires_at' => $data['expires_at'] ?? null,
                'description' => $data['description'] ?? null,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        foreach (array_chunk(array_values($codes), 500) as $chunk) {
            Models\RedeemCode::query()->insert($chunk);
        }
        Audit::log('admin.redeem_codes.generated', $request->user(), null, ['batch' => $data['batch'], 'count' => $data['count']]);

        return response()->json(['codes' => array_keys($codes)], 201);
    }
}
