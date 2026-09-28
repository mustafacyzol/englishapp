import { img } from './assets'

/** Profile avatars. Keys match backend config `dilgo.avatars`. */
export const AVATARS = {
  standard: [
    { key: 'fox', label: 'Tilki' },
    { key: 'headphones', label: 'Kulaklıklı' },
    { key: 'panda', label: 'Panda' },
    { key: 'beanie', label: 'Bereli' },
    { key: 'cat', label: 'Kedi' },
    { key: 'reader', label: 'Kitap kurdu' },
    { key: 'bear', label: 'Ayı' },
    { key: 'grandpa', label: 'Bilge' },
    { key: 'penguin', label: 'Penguen' },
  ],
  premium: [
    { key: 'astronaut', label: 'Astronot' },
    { key: 'wizard', label: 'Büyücü baykuş' },
    { key: 'lion', label: 'Aslan kral' },
    { key: 'neon', label: 'Neon' },
    { key: 'samurai', label: 'Samuray kedi' },
    { key: 'mermaid', label: 'Deniz kızı' },
    { key: 'dragon', label: 'Ejderha' },
    { key: 'jazz', label: 'Cazcı' },
    { key: 'phoenix', label: 'Anka' },
  ],
} as const

export const avatarUrl = (key?: string | null) => (key ? img(`avatars/${key}.webp`) : null)
export const isPremiumAvatar = (key?: string | null) => AVATARS.premium.some((a) => a.key === key)
