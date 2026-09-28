<?php

namespace Tests\Feature;

use App\Mail\NoticeMail;
use App\Models\NewsletterSubscriber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NewsletterTest extends TestCase
{
    use RefreshDatabase;

    public function test_double_opt_in_and_unsubscribe(): void
    {
        Mail::fake();
        $this->postJson('/api/v1/newsletter', ['email' => 'Ayse@Example.com'])->assertStatus(202);
        Mail::assertQueued(NoticeMail::class, 1);
        $sub = NewsletterSubscriber::query()->firstOrFail();
        $this->assertSame('ayse@example.com', $sub->email);
        $this->assertNull($sub->confirmed_at);

        // Same answer again, no duplicate row.
        $this->postJson('/api/v1/newsletter', ['email' => 'ayse@example.com'])->assertStatus(202);
        $this->assertSame(1, NewsletterSubscriber::query()->count());

        $this->postJson('/api/v1/newsletter/confirm/'.$sub->fresh()->token)->assertOk();
        $this->assertNotNull($sub->fresh()->confirmed_at);

        // A confirmed address does not get another confirmation mail.
        Mail::fake();
        $this->postJson('/api/v1/newsletter', ['email' => 'ayse@example.com'])->assertStatus(202);
        Mail::assertNothingQueued();

        $this->postJson('/api/v1/newsletter/unsubscribe/'.$sub->fresh()->token)->assertOk();
        $this->assertNotNull($sub->fresh()->unsubscribed_at);
        $this->postJson('/api/v1/newsletter/confirm/nope')->assertNotFound();
    }

    public function test_admin_sends_only_to_confirmed_subscribers(): void
    {
        Mail::fake();
        $admin = \App\Models\User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]);
        NewsletterSubscriber::query()->create(['email' => 'a@example.com', 'token' => 'ta', 'confirmed_at' => now()]);
        NewsletterSubscriber::query()->create(['email' => 'b@example.com', 'token' => 'tb']);
        NewsletterSubscriber::query()->create(['email' => 'c@example.com', 'token' => 'tc', 'confirmed_at' => now(), 'unsubscribed_at' => now()]);
        $token = $admin->createToken('admin-panel', ['user', 'admin'])->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/admin/newsletter/send', ['subject' => 'Haftanın ipucu', 'body' => "Merhaba!\n\nBugün phrasal verbs."])->assertOk()->assertJsonPath('sent', 1);
        Mail::assertQueued(NoticeMail::class, fn ($m) => $m->hasTo('a@example.com') && str_contains(implode(' ', $m->lines), '/newsletter/unsubscribe/ta'));
        Mail::assertNotQueued(NoticeMail::class, fn ($m) => $m->hasTo('b@example.com') || $m->hasTo('c@example.com'));
    }
}
