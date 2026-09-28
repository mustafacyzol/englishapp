import { img } from './assets'

/** Profile avatars. Keys match backend config `dilgo.avatars`. */
export const AVATARS = {
  standard: [
    { key: 'headphones', label: 'Müziksever' },
    { key: 'beard', label: 'Gözlüklü' },
    { key: 'braids', label: 'Örgülü' },
    { key: 'cap', label: 'Kasketli' },
    { key: 'granny', label: 'Bilge' },
    { key: 'hoodie', label: 'Kapüşonlu' },
    { key: 'hijab', label: 'Başörtülü' },
    { key: 'grandpa', label: 'Deneyimli' },
    { key: 'ponytail', label: 'Öğrenci' },
  ],
  premium: [
    { key: 'astronaut', label: 'Astronot' },
    { key: 'wizard', label: 'Büyücü' },
    { key: 'king', label: 'Kral' },
    { key: 'pilot', label: 'Pilot' },
    { key: 'scientist', label: 'Bilim insanı' },
    { key: 'chef', label: 'Şef' },
    { key: 'jazz', label: 'Cazcı' },
    { key: 'detective', label: 'Dedektif' },
    { key: 'explorer', label: 'Kaşif' },
  ],
} as const

export const avatarUrl = (key?: string | null) => (key ? img(`avatars/${key}.webp`) : null)
export const isPremiumAvatar = (key?: string | null) => AVATARS.premium.some((a) => a.key === key)
