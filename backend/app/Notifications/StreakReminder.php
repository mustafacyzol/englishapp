<?php

namespace App\Notifications;

use App\Mail\NoticeMail;
use Illuminate\Notifications\Notification;

class StreakReminder extends Notification
{
    public function __construct(public int $streak) {}

    public function via(object $notifiable): array
    {
        $prefs = $notifiable->preferences ?? [];

        return ($prefs['email_reminders'] ?? true) ? ['database', 'mail'] : ['database'];
    }

    public function toMail(object $notifiable): NoticeMail
    {
        return (new NoticeMail(
            "🔥 {$this->streak} günlük serin tehlikede",
            "Serin bu gece bitiyor, {$notifiable->name}!",
            ['Sadece 3 dakikalık bir ders serini kurtarır. Bir hikaye oku, bir kelime tekrarı yap ya da AI öğretmenle kısa bir sohbet et.'],
            'Seriyi kurtar',
            config('dilgo.brand.frontend_url').'/learn'
        ))->to($notifiable->email);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'streak',
            'title' => "{$this->streak} günlük serin tehlikede!",
            'body' => 'Bugün en az bir ders tamamla.',
            'icon' => 'flame',
            'link' => '/learn',
        ];
    }
}
