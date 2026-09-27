<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/** A partner gift is only worth something if it's found again: it goes to Kuponlarım and to notifications. */
class PartnerGiftWon extends Notification
{
    public function __construct(public string $partner, public string $offer, public string $expires) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['kind' => 'gift', 'title' => "{$this->partner} hediyen hazır", 'body' => "{$this->offer} · {$this->expires} tarihine kadar geçerli. Kodun Ödüller > Kuponlarım'da.", 'icon' => 'gift', 'link' => '/rewards#kuponlar'];
    }
}
