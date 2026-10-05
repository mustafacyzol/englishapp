<?php

namespace App\Services;

use App\Support\Integrations;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Real English speech, made on the server so it never depends on the voices a
 * phone happens to have (a Turkish phone often has only a Turkish voice and reads
 * "apple" with Turkish sounds). Two voices:
 *  - defne: the AI tutor (ElevenLabs voice, falls back to the narrator)
 *  - narrator: words, lessons, stories (ElevenLabs, OpenAI or Google, whichever is set)
 * Every clip is cached on disk by provider, voice and text, so each one is paid for once.
 */
class SpeechService
{
    /** Which provider reads words and lessons, or null when none is configured. */
    public static function narratorProvider(): ?string
    {
        $want = (string) (Integrations::get('tts.narrator') ?: 'auto');
        if ($want === 'browser') {
            return null;
        }
        $has = [
            'elevenlabs' => filled(Integrations::get('tts.elevenlabs.key')),
            'openai' => filled(Integrations::get('tts.openai.key')),
            'google' => filled(Integrations::get('tts.google.key')),
        ];
        if ($want !== 'auto') {
            return ($has[$want] ?? false) ? $want : null;
        }
        // the cheaper, plain voices first for words; ElevenLabs if it is the only one
        foreach (['google', 'openai', 'elevenlabs'] as $p) {
            if ($has[$p]) {
                return $p;
            }
        }

        return null;
    }

    /** Server speech recognition is available (an OpenAI key is set), for browsers without their own. */
    public static function canTranscribe(): bool
    {
        return filled(Integrations::get('tts.openai.key'));
    }

    /**
     * What the learner said, from a short recording, in English. Used only when
     * the browser has no speech recognition of its own (some iOS and desktop
     * browsers). The clip is sent to the provider and not stored here.
     */
    public function transcribe(string $path, string $mime): ?string
    {
        if (! self::canTranscribe()) {
            return null;
        }
        $ext = match (true) { str_contains($mime, 'mp4'), str_contains($mime, 'm4a') => 'm4a', str_contains($mime, 'ogg') => 'ogg', str_contains($mime, 'wav') => 'wav', default => 'webm' };
        try {
            $res = Http::timeout(30)->withToken((string) Integrations::get('tts.openai.key'))
                ->attach('file', file_get_contents($path), "speech.{$ext}")
                ->post('https://api.openai.com/v1/audio/transcriptions', ['model' => (string) (Integrations::get('stt.openai.model') ?: 'gpt-4o-mini-transcribe'), 'language' => 'en', 'response_format' => 'json']);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Transcription failed', ['error' => $e->getMessage()]);

            return null;
        }

        return $res->successful() ? trim((string) $res->json('text')) : null;
    }

    /** MP3 bytes, or null when no provider is set or the provider failed. */
    public function synth(string $text, string $who = 'narrator'): ?string
    {
        $text = trim(preg_replace('/\s+/', ' ', strip_tags($text)));
        if ($text === '') {
            return null;
        }
        if ($who === 'defne' && filled(Integrations::get('tts.elevenlabs.key'))) {
            return $this->elevenlabs($text, (string) Integrations::get('tts.elevenlabs.voice_id'));
        }

        return match (self::narratorProvider()) {
            'google' => $this->google($text),
            'openai' => $this->openai($text),
            'elevenlabs' => $this->elevenlabs($text, (string) (Integrations::get('tts.elevenlabs.narrator_voice_id') ?: Integrations::get('tts.elevenlabs.voice_id'))),
            default => null,
        };
    }

    private function cached(string $key, \Closure $make): ?string
    {
        $disk = Storage::disk('local');
        $path = 'tts/'.sha1($key).'.mp3';
        if ($disk->exists($path)) {
            return $disk->get($path);
        }
        try {
            $bytes = $make();
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
        if ($bytes) {
            $disk->put($path, $bytes);
        }

        return $bytes ?: null;
    }

    private function elevenlabs(string $text, string $voice): ?string
    {
        $model = (string) Integrations::get('tts.elevenlabs.model');

        return $this->cached("el|$voice|$model|$text", function () use ($text, $voice, $model) {
            $res = Http::timeout(20)
                ->withHeaders(['xi-api-key' => Integrations::get('tts.elevenlabs.key'), 'Accept' => 'audio/mpeg'])
                ->post("https://api.elevenlabs.io/v1/text-to-speech/{$voice}?output_format=mp3_44100_64", [
                    'text' => $text,
                    'model_id' => $model,
                    'voice_settings' => ['stability' => (float) Integrations::get('tts.stability'), 'similarity_boost' => (float) Integrations::get('tts.similarity')],
                ]);

            return $this->ok($res, 'ElevenLabs') ? $res->body() : null;
        });
    }

    private function openai(string $text): ?string
    {
        $voice = (string) (Integrations::get('tts.openai.voice') ?: 'nova');
        $model = (string) (Integrations::get('tts.openai.model') ?: 'gpt-4o-mini-tts');

        return $this->cached("oa|$voice|$model|$text", function () use ($text, $voice, $model) {
            $res = Http::timeout(20)->withToken((string) Integrations::get('tts.openai.key'))
                ->post('https://api.openai.com/v1/audio/speech', ['model' => $model, 'voice' => $voice, 'input' => $text, 'response_format' => 'mp3']);

            return $this->ok($res, 'OpenAI') ? $res->body() : null;
        });
    }

    private function google(string $text): ?string
    {
        $voice = (string) (Integrations::get('tts.google.voice') ?: 'en-GB-Neural2-C');
        $lang = implode('-', array_slice(explode('-', $voice), 0, 2)) ?: 'en-GB';

        return $this->cached("gg|$voice|$text", function () use ($text, $voice, $lang) {
            $res = Http::timeout(20)->post('https://texttospeech.googleapis.com/v1/text:synthesize?key='.urlencode((string) Integrations::get('tts.google.key')), [
                'input' => ['text' => $text],
                'voice' => ['languageCode' => $lang, 'name' => $voice],
                'audioConfig' => ['audioEncoding' => 'MP3', 'speakingRate' => 0.95],
            ]);

            return $this->ok($res, 'Google') ? base64_decode((string) $res->json('audioContent')) : null;
        });
    }

    private function ok(\Illuminate\Http\Client\Response $res, string $who): bool
    {
        if (! $res->successful()) {
            report(new \RuntimeException("$who TTS failed: ".$res->status()));

            return false;
        }

        return true;
    }
}
