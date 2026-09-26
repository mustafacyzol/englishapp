<?php

namespace App\Notifications;

use App\Models\Institution;
use App\Models\InstitutionMember;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InstitutionInvite extends Notification
{
    public function __construct(public Institution $institution, public InstitutionMember $member) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim((string) config('dilgo.brand.frontend_url'), '/').'/davet/'.$this->member->invite_token;

        return (new MailMessage)
            ->subject("{$this->institution->name} seni DilGO'ya davet etti")
            ->greeting('Merhaba'.($this->member->name ? " {$this->member->name}" : '').'!')
            ->line("{$this->institution->name}, İngilizce çalışman için sana bir DilGO Premium koltuğu ayırdı.")
            ->line('Okuma, dinleme, konuşma ve yazma — dört beceri tek uygulamada, yapay zekâ koçun Defne ile.')
            ->action('Daveti kabul et', $url)
            ->line('Bu daveti beklemiyorsan e-postayı yok sayabilirsin.');
    }
}
