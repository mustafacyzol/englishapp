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

export const avatarUrl = (key?: string | null, url?: string | null) => url ?? (key ? uploaded.get(key) ?? img(`avatars/${key}.webp`) : null)

export const avatarLabel = (key?: string | null) => BUILTIN.find((a) => a.key === key)?.label
