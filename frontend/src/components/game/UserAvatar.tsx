import clsx from 'clsx'
import { STANDARD_KEYS, avatarUrl } from '@/lib/avatars'
import { img } from '@/lib/assets'
import { customCosmetics } from '@/lib/cosmetics'

/**
 * Profile frames sold in the shop. Each is a rendered ring image (gold laurels,
 * flames, emeralds, clouds, neon, blossoms, a crown, a rainbow) laid over the
 * picture. `hole` is the measured inner radius as a share of the image width, so
 * the photo always sits exactly inside the ring and nothing spills out of the slot.
 */
export const FRAMES: Record<string, { label: string; note: string; hole: number; fx?: string }> = {
  gold: { label: 'Altın Defne', note: 'Altın halka ve defne yaprakları', hole: 0.322 },
  flame: { label: 'Alev', note: 'Alev dilleriyle sarılı halka', hole: 0.287, fx: 'animate-[flicker_1.8s_ease-in-out_infinite]' },
  emerald: { label: 'Zümrüt', note: 'Altı zümrüt taşlı gümüş halka', hole: 0.31 },
  sky: { label: 'Gökyüzü', note: 'Bulutlar ve parlayan yıldız', hole: 0.312 },
  neon: { label: 'Neon', note: 'Atan çift neon halka', hole: 0.351, fx: 'animate-[neon-pulse_2s_ease-in-out_infinite]' },
  sakura: { label: 'Sakura', note: 'Kiraz çiçekli pembe halka', hole: 0.338 },
  royal: { label: 'Kraliyet', note: 'Lacivert halka ve altın taç', hole: 0.255 },
  rainbow: { label: 'Gökkuşağı', note: 'Yanardöner halka ve pırıltılar', hole: 0.286, fx: 'animate-[hue_6s_linear_infinite]' },
}

export const frameImg = (key: string) => customCosmetics.frames[key]?.image ?? img(`frames/${key}.webp`)

/** A built-in frame, or one an admin added with its own image. */
export const frameOf = (key?: string | null) => {
  if (!key) return undefined
  if (FRAMES[key]) return FRAMES[key]
  const c = customCosmetics.frames[key]
  return c ? { label: c.label, note: '', hole: c.hole ?? 0.3 } : undefined
}

/** A stable standard avatar for anyone whose own is missing, so there is never a blank initial. */
export const fallbackAvatar = (seed: string) => STANDARD_KEYS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % STANDARD_KEYS.length]

/**
 * A learner's picture everywhere in the app (profile, leagues, arena): their avatar
 * inside the frame they wear. `rounded` sets the shape of both.
 */
export function UserAvatar({ name, avatar, avatarUrl: url, frame, className = 'size-10', rounded = 'rounded-full' }: { name?: string | null; avatar?: string | null; avatarUrl?: string | null; frame?: string | null; className?: string; rounded?: string }) {
  const src = avatarUrl(avatar || fallbackAvatar(name ?? '?'), url)!
  const f = frameOf(frame)
  const pic = <img src={src} alt="" className={clsx('size-full object-cover', rounded)} draggable={false} />
  if (!f) return <span className={clsx('relative block shrink-0 overflow-hidden bg-paper-2', rounded, className)}>{pic}</span>
  // The photo sits in the ring's measured hole, the ring image on top; both stay inside the box.
  const d = `${Math.min(92, (f.hole * 2 + 0.035) * 100)}%`
  return (
    <span className={clsx('relative block shrink-0', className)}>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-card" style={{ width: d, height: d }}>
        <img src={src} alt="" className="size-full object-cover" draggable={false} />
      </span>
      <img src={frameImg(frame!)} alt="" aria-hidden draggable={false} className={clsx('pointer-events-none absolute inset-0 size-full select-none object-contain', f.fx)} />
    </span>
  )
}
