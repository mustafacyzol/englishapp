<?php

namespace App\Notifications;

use App\Models\Achievement;
use Illuminate\Notifications\Notification;

class AchievementUnlocked extends Notification
{
    public function __construct(public Achievement $achievement) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'achievement',
            'title' => 'Yeni rozet: '.$this->achievement->title,
            'body' => $this->achievement->description,
            'icon' => $this->achievement->icon,
            'tier' => $this->achievement->tier,
            'link' => '/profile/achievements',
        ];
    }
}
