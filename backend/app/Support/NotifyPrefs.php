<?php

namespace App\Support;

/**
 * Which in-app notification groups a learner wants (Ayarlar > Bildirimler).
 * Every group is on until the learner turns it off.
 */
class NotifyPrefs
{
    public const GROUPS = ['achievements', 'homework', 'duel', 'league', 'gifts'];

    public static function allows(object $user, string $group): bool
    {
        return (bool) (($user->preferences['notify'] ?? [])[$group] ?? true);
    }

    /** The channels for an in-app notification of this group. */
    public static function via(object $user, string $group): array
    {
        return self::allows($user, $group) ? ['database'] : [];
    }
}
