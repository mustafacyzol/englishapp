<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class LeagueResult extends Notification
{
    public function __construct(public int $rank, public string $result, public string $tierName, public int $gems) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $title = match ($this->result) {
            'promoted' => "Terfi! Artık {$this->tierName} Ligi'ndesin",
            'demoted' => "{$this->tierName} Ligi'ne düştün — bu hafta geri al!",
            default => "Haftayı {$this->rank}. sırada bitirdin",
        };

        return [
            'kind' => 'league',
            'title' => $title,
            'body' => $this->gems ? "Sıralama ödülün: {$this->gems} elmas." : 'Yeni hafta başladı, XP toplamaya devam!',
            'icon' => 'trophy',
            'link' => '/leagues',
        ];
    }
}
