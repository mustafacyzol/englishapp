<?php

namespace App\Notifications;

use App\Mail\NoticeMail;
use Illuminate\Notifications\Notification;

/**
 * A learner who stopped coming back gets at most three short, friendly notes
 * (after 2, 5 and 14 quiet days), each with one small, concrete next step.
 * Never more, and never when they switched reminders off.
 */
class ComeBack extends Notification
{
    public const STAGES = [2 => 1, 5 => 2, 14 => 3];

    public function __construct(public int $stage, public string $nextTitle) {}

    public function via(object $notifiable): array
    {
        return ($notifiable->preferences['email_reminders'] ?? true) ? ['database', 'mail'] : ['database'];
    }

    private function copy(object $n): array
    {
        return match ($this->stage) {
            1 => ['👋 Higo seni bekliyor', "{$n->name}, kaldığın yerden devam edelim mi?", ["Sıradaki durağın hazır: “{$this->nextTitle}”.", 'Sadece 3 dakika sürer, hatırlaman için ilk soruyu kolay tuttuk.']],
            2 => ['🎧 5 dakikalık bir hikâye', 'Kısa bir mola iyi geldi mi?', ['Seviyene uygun kısa bir hikâye seni bekliyor. Dinle, bilmediğin kelimeye dokun, bitti.', 'Geri döndüğünde ilk ders için ekstra XP var.']],
            default => ['💬 Defne ile 2 dakika?', 'İngilizceni unutturmayalım', ['Bir kahve siparişi, bir tanışma, küçük bir sohbet: Defne ile konuşmak unuttuklarını hızla geri getirir.', 'Artık bu konuda e-posta göndermeyeceğiz; ne zaman istersen buradayız.']],
        };
    }

    public function toMail(object $notifiable): NoticeMail
    {
        [$subject, $title, $lines] = $this->copy($notifiable);
        $to = match ($this->stage) { 1 => '/learn', 2 => '/stories', default => '/ai' };

        return (new NoticeMail($subject, $title, $lines, 'Hemen başla', config('dilgo.brand.frontend_url').$to))->to($notifiable->email);
    }

    public function toArray(object $notifiable): array
    {
        [, $title, $lines] = $this->copy($notifiable);

        return ['kind' => 'comeback', 'title' => $title, 'body' => $lines[0], 'icon' => 'wave', 'link' => match ($this->stage) { 1 => '/learn', 2 => '/stories', default => '/ai' }];
    }
}
