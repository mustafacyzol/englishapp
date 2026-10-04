import { useQuery } from '@tanstack/react-query'
import { get } from './api'
import { img } from './assets'

export interface AvatarDef { key: string; label: string; tier: 'standard' | 'premium'; url?: string | null }

/** Bundled avatars. The live catalogue (with admin uploads) comes from GET /avatars. */
const BUILTIN: AvatarDef[] = [
  ...[['headphones', 'Müziksever'], ['afro', 'Ritim'], ['braids', 'Örgülü'], ['cap', 'Sokak'], ['buns', 'Topuzlu'], ['hoodie', 'Kapüşonlu'], ['glasses', 'Kod'], ['pinkbob', 'Pembe'], ['ponytail', 'Kampüs']].map(([key, label]) => ({ key, label, tier: 'standard' as const })),
  ...[['astronaut', 'Astronot'], ['wizard', 'Büyücü'], ['king', 'Kral'], ['pilot', 'Pilot'], ['scientist', 'Bilim insanı'], ['chef', 'Şef'], ['jazz', 'Cazcı'], ['detective', 'Dedektif'], ['explorer', 'Kaşif']].map(([key, label]) => ({ key, label, tier: 'premium' as const })),
]

/** Uploaded avatars by key, filled once the catalogue loads, so any screen can resolve them. */
const uploaded = new Map<string, string>()

export function useAvatarCatalog() {
  const q = useQuery({
    queryKey: ['avatars'],
    queryFn: () => get<{ data: AvatarDef[] }>('/avatars'),
    staleTime: 10 * 60_000,
  })
  const list = q.data?.data?.length ? q.data.data : BUILTIN
  list.forEach((a) => a.url && uploaded.set(a.key, a.url))
  return { standard: list.filter((a) => a.tier === 'standard'), premium: list.filter((a) => a.tier === 'premium') }
}

export const STANDARD_KEYS = BUILTIN.filter((a) => a.tier === 'standard').map((a) => a.key)

/**
 * Backdrops behind an avatar, picked in the profile studio. They travel with the
 * avatar value as "key@backdrop". Premium ones are quiet luxury: champagne gold,
 * obsidian with a gold hairline, aurora, rose gold, pearl, emerald.
 */
export const BACKDROPS: Record<string, { label: string; css: string; premium?: boolean; ring?: string }> = {
  cream: { label: 'Krem', css: 'linear-gradient(160deg,#fbf4e9,#f1e4cf)' },
  mint: { label: 'Nane', css: 'linear-gradient(160deg,#e3f5ec,#c9ead9)' },
  sky: { label: 'Gökyüzü', css: 'linear-gradient(160deg,#e6efff,#cddcfb)' },
  blush: { label: 'Pudra', css: 'linear-gradient(160deg,#fde9ee,#f6cfd9)' },
  lilac: { label: 'Leylak', css: 'linear-gradient(160deg,#efe9fd,#dccff7)' },
  sun: { label: 'Güneş', css: 'linear-gradient(160deg,#fff4d1,#ffe29a)' },
  peach: { label: 'Şeftali', css: 'linear-gradient(160deg,#ffece0,#fdd2b8)' },
  sage: { label: 'Adaçayı', css: 'linear-gradient(160deg,#e7efe2,#cfdfc5)' },
  sand: { label: 'Kum', css: 'linear-gradient(160deg,#f1ebe1,#ddd2c0)' },
  night: { label: 'Gece', css: 'linear-gradient(160deg,#2b3350,#1a2036)' },
  gold: { label: 'Şampanya', css: 'radial-gradient(120% 90% at 30% 15%,#fff6dc 0%,#f2d9a0 45%,#c99a4c 100%)', premium: true, ring: '#d9b46a' },
  obsidian: { label: 'Obsidyen', css: 'radial-gradient(120% 90% at 30% 10%,#3a3f55 0%,#1b1e2b 60%,#0e1018 100%)', premium: true, ring: '#d9b46a' },
  aurora: { label: 'Aurora', css: 'linear-gradient(150deg,#1f6f78 0%,#3c5fa6 50%,#7b4fb3 100%)', premium: true, ring: '#c8e7ff' },
  rosegold: { label: 'Rose gold', css: 'linear-gradient(150deg,#f7dcd2 0%,#e8b4a4 55%,#c98273 100%)', premium: true, ring: '#e9b9a4' },
  pearl: { label: 'İnci', css: 'radial-gradient(120% 90% at 30% 15%,#ffffff 0%,#eef0f6 50%,#d6dbe8 100%)', premium: true, ring: '#c9cfdd' },
  emerald: { label: 'Zümrüt', css: 'radial-gradient(120% 90% at 30% 15%,#3f9b7b 0%,#1f6b52 55%,#0f3d2f 100%)', premium: true, ring: '#d9b46a' },
}
const STANDARD_BG = ['cream', 'mint', 'sky', 'blush', 'lilac', 'sun', 'peach', 'sage', 'sand']

/** "glasses@mint" -> { key: 'glasses', bg: 'mint' }; without a backdrop a calm one is picked per avatar. */
export const parseAvatar = (value?: string | null) => {
  const [key = '', bg] = (value ?? '').split('@')
  const fallback = STANDARD_BG[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % STANDARD_BG.length]
  return { key, bg: bg && BACKDROPS[bg] ? bg : fallback, chosen: !!(bg && BACKDROPS[bg]) }
}
export const joinAvatar = (key: string, bg?: string | null) => (bg ? `${key}@${bg}` : key)

const BUILTIN_KEYS = new Set(BUILTIN.map((a) => a.key))
/** Built-in avatars are cut-outs drawn on the chosen backdrop; uploaded ones keep their own picture. */
export const avatarUrl = (value?: string | null, url?: string | null) => {
  if (url) return url
  const key = parseAvatar(value).key
  if (!key) return null
  return uploaded.get(key) ?? img(BUILTIN_KEYS.has(key) ? `avatars/cut/${key}.webp` : `avatars/${key}.webp`)
}
export const isCutout = (value?: string | null, url?: string | null) => !url && BUILTIN_KEYS.has(parseAvatar(value).key) && !uploaded.has(parseAvatar(value).key)

export const avatarLabel = (key?: string | null) => BUILTIN.find((a) => a.key === parseAvatar(key).key)?.label
