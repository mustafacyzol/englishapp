<?php

namespace App\Notifications;

use App\Models\Assignment;
use Illuminate\Notifications\Notification;

/** A teacher gave the student's class new homework: it shows in their notifications. */
class AssignmentGiven extends Notification
{
    public function __construct(public Assignment $assignment, public string $teacher, public string $link) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $due = $this->assignment->due_at ? ' Son gün: '.$this->assignment->due_at->locale('tr')->translatedFormat('j F').'.' : '';

        return [
            'kind' => 'homework',
            'title' => "Yeni ödev: {$this->assignment->title}",
            'body' => trim("{$this->teacher} ödev verdi.".$due.($this->assignment->note ? ' '.$this->assignment->note : '')),
            'icon' => 'homework',
            'link' => $this->link,
        ];
    }
}
