<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\NoticeMail;
use App\Models\BlogPost;
use App\Models\ContactMessage;
use App\Support\Turnstile;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
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
        $post = BlogPost::query()->where('slug', $slug)->where('is_published', true)
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()))->firstOrFail();
        $post->increment('views');
        $related = BlogPost::query()->where('is_published', true)->where('published_at', '<=', now())->whereKeyNot($post->id)->latest('published_at')->limit(3)
            ->get(['slug', 'title', 'cover_image', 'category', 'reading_minutes', 'published_at']);

        return response()->json(['post' => $post, 'related' => $related]);
    }

    public function contact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'topic' => ['required', 'in:general,course,okul,corporate,support,partnership'],
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

    /**
     * "Okulunuz için teklif alın": a school applies from the Schools page. The
     * application is stored for the sales team and they get an e-mail at once.
     */
    public function schoolApply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_name' => ['required', 'string', 'min:3', 'max:160'],
            'city' => ['required', 'string', 'min:2', 'max:60'],
            'district' => ['nullable', 'string', 'max:60'],
            'school_type' => ['required', 'in:ilkokul,ortaokul,lise,kurs,diger'],
            'students' => ['required', 'integer', 'min:1', 'max:100000'],
            'grades' => ['nullable', 'array', 'max:12'],
            'grades.*' => ['integer', 'between:1,12'],
            'contact_name' => ['required', 'string', 'min:2', 'max:80'],
            'contact_role' => ['required', 'in:mudur,mudur_yrd,ogretmen,diger'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['required', 'string', 'min:10', 'max:30', 'regex:/^[0-9 +()-]+$/'],
            'interests' => ['nullable', 'array', 'max:6'],
            'interests.*' => ['in:lgs,ydt,konusma,odev,rapor,premium'],
            'message' => ['nullable', 'string', 'max:2000'],
            'kvkk' => ['accepted'],
            'captcha' => ['nullable', 'string'],
            'website' => ['prohibited'],
        ], [
            'kvkk.accepted' => 'Aydınlatma metnini onaylamalısınız.',
            'phone.regex' => 'Telefon numarası yalnızca rakam içermeli.',
        ]);

        if (! Turnstile::verify($data['captcha'] ?? null, $request->ip())) {
            throw ValidationException::withMessages(['captcha' => 'Robot doğrulaması başarısız.']);
        }

        $app = \App\Models\SchoolApplication::query()->create([
            'school_name' => strip_tags($data['school_name']),
            'city' => strip_tags($data['city']),
            'district' => isset($data['district']) ? strip_tags($data['district']) : null,
            'school_type' => $data['school_type'],
            'students' => $data['students'],
            'grades' => $data['grades'] ?? null,
            'contact_name' => strip_tags($data['contact_name']),
            'contact_role' => $data['contact_role'],
            'email' => strtolower($data['email']),
            'phone' => $data['phone'],
            'interests' => $data['interests'] ?? null,
            'message' => isset($data['message']) ? strip_tags($data['message']) : null,
            'ip' => $request->ip(),
        ]);

        Mail::to(config('dilgo.brand.support_email'))->queue(new NoticeMail(
            'Yeni okul başvurusu: '.$app->school_name,
            'Okullar sayfasından başvuru',
            [
                "{$app->school_name} ({$app->city}".($app->district ? " / {$app->district}" : '').") · {$app->school_type} · {$app->students} öğrenci",
                "İletişim: {$app->contact_name} ({$app->contact_role}) <{$app->email}> {$app->phone}",
                'İlgi: '.implode(', ', $app->interests ?? []),
                (string) $app->message,
            ],
            'Yönetim panelinde aç',
            config('dilgo.brand.frontend_url').'/admin/r/school-applications'
        ));

        return response()->json(['ok' => true, 'message' => 'Başvurunuz bize ulaştı. Okul ekibimiz en geç 1 iş günü içinde sizi arayacak.'], 201);
    }

    /**
     * Tips and updates by e-mail, double opt-in: the address only starts receiving
     * mail after the link in the confirmation e-mail is opened. The answer is the same
     * whether or not the address was already on the list, so it leaks nothing.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
            'source' => ['nullable', 'in:footer,blog,landing'],
            'website' => ['prohibited'],
        ]);
        $email = strtolower(trim($data['email']));
        $sub = NewsletterSubscriber::query()->firstOrNew(['email' => $email]);
        $fresh = ! $sub->exists || $sub->unsubscribed_at !== null || $sub->confirmed_at === null;
        if ($fresh) {
            $sub->fill(['source' => $data['source'] ?? 'footer', 'token' => Str::random(48), 'unsubscribed_at' => null, 'ip' => $request->ip()])->save();
            $base = config('dilgo.brand.frontend_url');
            Mail::to($email)->queue(new NoticeMail(
                config('dilgo.brand.name').' bültenine kaydını onayla',
                'Bir tık kaldı',
                ['Haftalık İngilizce ipuçları ve '.config('dilgo.brand.name').' yeniliklerini almak için adresini onayla.', 'Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.'],
                'Kaydımı onayla',
                $base.'/newsletter/confirm/'.$sub->token,
            ));
        }

        return response()->json(['ok' => true, 'message' => 'Onay bağlantısını e-postana gönderdik. Kutunu kontrol et.'], 202);
    }

    public function confirmSubscription(string $token): JsonResponse
    {
        $sub = NewsletterSubscriber::query()->where('token', $token)->firstOrFail();
        $sub->update(['confirmed_at' => $sub->confirmed_at ?? now(), 'unsubscribed_at' => null]);

        return response()->json(['ok' => true, 'message' => 'Kaydın onaylandı. İlk ipucu yakında kutunda!']);
    }

    public function unsubscribe(string $token): JsonResponse
    {
        $sub = NewsletterSubscriber::query()->where('token', $token)->firstOrFail();
        $sub->update(['unsubscribed_at' => now()]);

        return response()->json(['ok' => true, 'message' => 'Bültenden çıktın. Bir daha e-posta göndermeyeceğiz.']);
    }
}
