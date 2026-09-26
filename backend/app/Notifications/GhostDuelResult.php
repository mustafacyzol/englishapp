<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/** Tells a learner what their ghost did while they were away — a reason to come back. */
class GhostDuelResult extends Notification
{
    public function __construct(public string $challenger, public string $outcome, public int $delta) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        [$title, $body] = match ($this->outcome) {
            'defended' => ["Gölgen kupanı korudu! +{$this->delta} kupa", "{$this->challenger} gölgene meydan okudu ve kaybetti."],
            'fell' => ["{$this->challenger} gölgeni yendi", 'Kupanı geri almak için bir rövanş düellosu başlat.'],
            default => ['Gölgen berabere kaldı', "{$this->challenger} ile puanlar eşit bitti."],
        };

        return ['kind' => 'duel', 'title' => $title, 'body' => $body, 'icon' => 'trophy', 'link' => '/duel'];
    }
}
