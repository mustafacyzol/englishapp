<?php

namespace App\Notifications;

use App\Mail\NoticeMail;
use Illuminate\Notifications\Notification;

/** Monday's short look back: what the week added up to, and one nudge for the next. */
class WeeklyReport extends Notification
{
    /** @param array{xp:int, days:int, lessons:int, stories:int, words:int, streak:int, best_day:?string} $week */
    public function __construct(public array $week) {}

    public function via(object $notifiable): array
    {
        return ($notifiable->preferences['email_weekly'] ?? true) ? ['database', 'mail'] : ['database'];
    }

    public function toMail(object $notifiable): NoticeMail
    {
        $w = $this->week;
        $lines = [
            "Geçen hafta {$w['days']} gün çalıştın ve {$w['xp']} XP topladın.",
            "{$w['lessons']} ders, {$w['stories']} hikâye ve {$w['words']} yeni kelime.",
            $w['streak'] > 0 ? "Serin {$w['streak']} günde. Bu hafta da bir gün bile atlamazsan yeni rekorun yakın." : 'Bu hafta küçük bir hedef koy: günde 5 dakika, 5 gün.',
        ];

        return (new NoticeMail('📈 Haftalık İngilizce karnen', "Haftan nasıl geçti, {$notifiable->name}?", $lines, 'Yeni haftaya başla', config('dilgo.brand.frontend_url').'/learn'))->to($notifiable->email);
    }

    public function toArray(object $notifiable): array
    {
        return ['kind' => 'report', 'title' => "Haftalık karnen: {$this->week['xp']} XP, {$this->week['days']} gün", 'body' => "{$this->week['lessons']} ders, {$this->week['stories']} hikâye, {$this->week['words']} yeni kelime.", 'icon' => 'chart', 'link' => '/profile'];
    }
}
