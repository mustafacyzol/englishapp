<?php

namespace App\Services;

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\RateLimitException;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiScenario;
use App\Models\DailyActivity;
use App\Models\User;
use App\Support\Period;
use App\Support\Settings;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * "Ada" — the AI English teacher. Unlike generic chatbots she knows the learner's
 * CEFR level, goal and the exact words they saved while reading stories, and
 * recycles that vocabulary in conversation. Explanations are given in Turkish,
 * targeting the typical mistakes Turkish speakers make.
 */
class AiTutorService
{
    private const PERSONA = <<<'TXT'
You are Ada, a warm, witty English teacher working for Bayrak Dil Okulları, a Turkish language school.
You teach Turkish-speaking learners through the DilGO app.

Teaching principles:
- Speak English at the learner's CEFR level: short sentences and common words for A1-A2, richer language for B2+.
- Keep every reply short (1-4 sentences) and always end with a question or prompt that keeps the learner talking.
- Gently correct the learner's most important mistake only (grammar, word choice, word order). Do not nitpick punctuation or capitalisation.
- Write correction explanations in natural Turkish, referring to typical Turkish-speaker pitfalls (articles a/the, tenses, prepositions, word order, "I am agree" type errors) when relevant.
- Naturally reuse words from the learner's "recently saved words" list when it fits.
- Never switch fully to Turkish in the reply unless the learner is clearly stuck; then give one short Turkish hint and continue in English.
- Stay on safe, age-appropriate, educational topics. If asked about something unrelated to learning English, steer back politely.
TXT;

    private const CHAT_SCHEMA = [
        'type' => 'object',
        'properties' => [
            'reply' => ['type' => 'string', 'description' => 'Your spoken reply in English.'],
            'reply_tr' => ['type' => 'string', 'description' => 'Turkish translation of the reply (for the "show translation" button).'],
            'correction' => [
                'description' => 'The single most important correction of the learner\'s last message, or null if it was fine.',
                'anyOf' => [
                    [
                        'type' => 'object',
                        'properties' => [
                            'original' => ['type' => 'string'],
                            'corrected' => ['type' => 'string'],
                            'explanation_tr' => ['type' => 'string'],
                        ],
                        'required' => ['original', 'corrected', 'explanation_tr'],
                        'additionalProperties' => false,
                    ],
                    ['type' => 'null'],
                ],
            ],
            'new_words' => [
                'type' => 'array',
                'items' => [
                    'type' => 'object',
                    'properties' => ['word' => ['type' => 'string'], 'meaning_tr' => ['type' => 'string']],
                    'required' => ['word', 'meaning_tr'],
                    'additionalProperties' => false,
                ],
            ],
            'goals_completed' => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => 'Indexes of scenario goals the learner has achieved so far.'],
        ],
        'required' => ['reply', 'reply_tr', 'correction', 'new_words', 'goals_completed'],
        'additionalProperties' => false,
    ];

    private const WRITING_SCHEMA = [
        'type' => 'object',
        'properties' => [
            'cefr_estimate' => ['type' => 'string', 'enum' => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']],
            'score' => ['type' => 'integer', 'description' => '0-100 overall quality for the learner level'],
            'corrected_text' => ['type' => 'string'],
            'mistakes' => [
                'type' => 'array',
                'items' => [
                    'type' => 'object',
                    'properties' => [
                        'original' => ['type' => 'string'],
                        'fix' => ['type' => 'string'],
                        'rule_tr' => ['type' => 'string'],
                        'category' => ['type' => 'string', 'enum' => ['grammar', 'vocabulary', 'spelling', 'word_order', 'style']],
                    ],
                    'required' => ['original', 'fix', 'rule_tr', 'category'],
                    'additionalProperties' => false,
                ],
            ],
            'strengths_tr' => ['type' => 'string'],
            'next_steps_tr' => ['type' => 'string'],
        ],
        'required' => ['cefr_estimate', 'score', 'corrected_text', 'mistakes', 'strengths_tr', 'next_steps_tr'],
        'additionalProperties' => false,
    ];

    public function usageToday(User $user): array
    {
        $used = (int) DailyActivity::query()->where('user_id', $user->id)->where('date', Period::today())->value('ai_messages');
        $limit = (int) Settings::get($user->isPremium() ? 'ai.daily_limit_premium' : 'ai.daily_limit_free');

        return ['used' => $used, 'limit' => $limit, 'remaining' => max(0, $limit - $used)];
    }

    public function assertCanUse(User $user): void
    {
        if (! config('dilgo.ai.enabled') || blank(config('dilgo.ai.api_key'))) {
            throw new HttpException(503, 'AI öğretmen şu anda bakımda.');
        }
        if ($this->usageToday($user)['remaining'] <= 0) {
            throw new HttpException(429, $user->isPremium()
                ? 'Bugünkü AI mesaj limitine ulaştın. Yarın görüşürüz!'
                : 'Ücretsiz günlük AI limitin doldu. Premium ile her gün çok daha fazla pratik yap!');
        }
    }

    public function reply(AiConversation $conversation, string $text): AiMessage
    {
        $user = $conversation->user;
        $this->assertCanUse($user);

        AiMessage::query()->create(['ai_conversation_id' => $conversation->id, 'role' => 'user', 'content' => $text]);

        $history = $conversation->messages()->latest('id')->limit(config('dilgo.ai.history_messages'))->get()->reverse()->values();
        $messages = $history->map(fn (AiMessage $m) => ['role' => $m->role, 'content' => $m->content])->all();

        $scenario = $conversation->scenario_key ? AiScenario::query()->where('key', $conversation->scenario_key)->first() : null;
        $data = $this->call($this->systemPrompt($user, $scenario, $conversation->mode), $messages, self::CHAT_SCHEMA, $usage);

        $assistant = AiMessage::query()->create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $data['reply'] ?? '…',
            'feedback' => [
                'reply_tr' => $data['reply_tr'] ?? null,
                'correction' => $data['correction'] ?? null,
                'new_words' => $data['new_words'] ?? [],
                'goals_completed' => $data['goals_completed'] ?? [],
            ],
            'input_tokens' => $usage['input'] ?? 0,
            'output_tokens' => $usage['output'] ?? 0,
        ]);

        $meta = $conversation->meta ?? [];
        $meta['goals_completed'] = array_values(array_unique(array_merge($meta['goals_completed'] ?? [], $data['goals_completed'] ?? [])));
        $conversation->update(['meta' => $meta]);
        $conversation->touch();

        return $assistant;
    }

    public function checkWriting(User $user, string $text, ?string $task = null): array
    {
        $this->assertCanUse($user);
        $system = self::PERSONA."\n\nYou are now grading a piece of writing. Learner level: {$user->cefr_level}. "
            .'List at most 8 of the most useful mistakes. Keep corrected_text as close to the original as possible.';
        $prompt = ($task ? "Writing task: {$task}\n\n" : '')."Learner text:\n\"\"\"\n{$text}\n\"\"\"";

        return $this->call($system, [['role' => 'user', 'content' => $prompt]], self::WRITING_SCHEMA);
    }

    private function systemPrompt(User $user, ?AiScenario $scenario, string $mode): string
    {
        $goalLabel = [
            'travel' => 'travelling abroad', 'career' => 'career and business English', 'exam' => 'passing an English exam (YDS, IELTS, TOEFL)',
            'school' => 'school lessons', 'fun' => 'fun and culture',
        ][$user->learning_goal] ?? 'general English';

        $words = $user->words()->latest()->limit(15)->pluck('word')->implode(', ');

        $prompt = self::PERSONA."\n\nLearner profile:\n- Name: {$user->name}\n- CEFR level: {$user->cefr_level}\n- Goal: {$goalLabel}\n- Recently saved words: ".($words ?: 'none yet');

        if ($scenario) {
            $goals = collect($scenario->goals ?? [])->map(fn ($g, $i) => "  {$i}. {$g}")->implode("\n");
            $prompt .= "\n\nRole-play scenario \"{$scenario->title}\":\n{$scenario->system_prompt}\nStay in character. Learner mission goals:\n{$goals}";
        } elseif ($mode === 'speaking') {
            $prompt .= "\n\nThis is a spoken conversation: the learner's text comes from speech recognition, so ignore punctuation and capitalisation, and keep replies very short and easy to say aloud.";
        }

        return $prompt;
    }

    private function call(string $system, array $messages, array $schema, ?array &$usage = null): array
    {
        $client = new Client(apiKey: config('dilgo.ai.api_key'));

        try {
            $message = $client->messages->create(
                model: config('dilgo.ai.model'),
                maxTokens: config('dilgo.ai.max_tokens'),
                system: [['type' => 'text', 'text' => $system]],
                messages: $messages,
                outputConfig: [
                    'effort' => config('dilgo.ai.effort'),
                    'format' => ['type' => 'json_schema', 'schema' => $schema],
                ],
            );
        } catch (RateLimitException $e) {
            throw new HttpException(429, 'AI öğretmen şu anda çok yoğun, birkaç saniye sonra tekrar dene.', $e);
        } catch (AuthenticationException $e) {
            Log::critical('Anthropic API key rejected', ['error' => $e->getMessage()]);
            throw new HttpException(503, 'AI öğretmen şu anda bakımda.', $e);
        } catch (APIStatusException $e) {
            Log::error('Anthropic API error', ['type' => $e->type?->value, 'error' => $e->getMessage()]);
            throw new HttpException(502, 'AI öğretmene ulaşılamadı. Lütfen tekrar dene.', $e);
        } catch (APIConnectionException $e) {
            Log::error('Anthropic connection error', ['error' => $e->getMessage()]);
            throw new HttpException(502, 'AI öğretmene ulaşılamadı. Lütfen tekrar dene.', $e);
        }

        $usage = ['input' => $message->usage->inputTokens, 'output' => $message->usage->outputTokens];

        if ($message->stopReason === 'refusal') {
            return ['reply' => "Let's keep our chat about learning English. What would you like to practise?", 'reply_tr' => 'Sohbetimizi İngilizce öğrenmeye odaklayalım. Neyi pratik etmek istersin?', 'correction' => null, 'new_words' => [], 'goals_completed' => []];
        }

        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                $decoded = json_decode($block->text, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        throw new HttpException(502, 'AI yanıtı okunamadı. Lütfen tekrar dene.');
    }
}
