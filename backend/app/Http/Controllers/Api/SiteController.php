<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\NoticeMail;
use App\Models\BlogPost;
use App\Models\ContactMessage;
use App\Support\Turnstile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/** Public marketing content: blog and contact form. */
class SiteController extends Controller
{
    public function blog(Request $request): JsonResponse
    {
        $posts = BlogPost::query()->where('is_published', true)->where('published_at', '<=', now())
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->latest('published_at')
            ->paginate(12, ['id', 'slug', 'title', 'excerpt', 'cover_image', 'category', 'author_name', 'reading_minutes', 'published_at']);

        return response()->json($posts);
    }

    public function post(string $slug): JsonResponse
    {
        $post = BlogPost::query()->where('slug', $slug)->where('is_published', true)->firstOrFail();
        $post->increment('views');
        $related = BlogPost::query()->where('is_published', true)->whereKeyNot($post->id)->latest('published_at')->limit(3)
            ->get(['slug', 'title', 'cover_image', 'category', 'reading_minutes', 'published_at']);

        return response()->json(['post' => $post, 'related' => $related]);
    }

    public function contact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'topic' => ['required', 'in:general,course,corporate,support,partnership'],
            'message' => ['required', 'string', 'min:10', 'max:3000'],
            'kvkk' => ['accepted'],
            'captcha' => ['nullable', 'string'],
            'website' => ['prohibited'],
        ], ['kvkk.accepted' => 'Aydınlatma metnini onaylamalısın.']);

        if (! Turnstile::verify($data['captcha'] ?? null, $request->ip())) {
            throw ValidationException::withMessages(['captcha' => 'Robot doğrulaması başarısız.']);
        }

        $msg = ContactMessage::query()->create([
            'name' => strip_tags($data['name']),
            'email' => strtolower($data['email']),
            'phone' => $data['phone'] ?? null,
            'topic' => $data['topic'],
            'message' => strip_tags($data['message']),
            'ip' => $request->ip(),
        ]);

        Mail::to(config('dilgo.brand.support_email'))->queue(new NoticeMail(
            'Yeni iletişim mesajı: '.$msg->name,
            'Web sitesinden yeni mesaj',
            ["Konu: {$msg->topic}", "Gönderen: {$msg->name} <{$msg->email}> {$msg->phone}", $msg->message],
            'Yönetim panelinde aç',
            config('dilgo.brand.frontend_url').'/admin/r/contact-messages'
        ));

        return response()->json(['ok' => true, 'message' => 'Mesajın bize ulaştı. En geç 1 iş günü içinde dönüş yapacağız.'], 201);
    }
}
