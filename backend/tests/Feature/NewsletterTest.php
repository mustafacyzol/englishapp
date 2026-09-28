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
}
