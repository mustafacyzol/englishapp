import type { CSSProperties } from 'react'
import clsx from 'clsx'
import { Crown } from 'lucide-react'
import { STANDARD_KEYS, avatarUrl } from '@/lib/avatars'

/**
 * Profile frames sold in the shop. Each one is a ring drawn as a padded,
 * rounded background behind the picture, so it follows any avatar shape.
 */
export const FRAMES: Record<string, { label: string; ring: string; glow?: string; spin?: boolean; crown?: boolean }> = {
  gold: { label: 'Altın', ring: 'linear-gradient(135deg,#ffe27a,#f5a524 45%,#fff1b8 60%,#d98a0b)' },
  flame: { label: 'Alev', ring: 'linear-gradient(135deg,#ffb020,#ff5a36 55%,#e0301a)' },
  emerald: { label: 'Zümrüt', ring: 'linear-gradient(135deg,#7ae3b4,#22b573 55%,#0f8a55)' },
  sky: { label: 'Gökyüzü', ring: 'linear-gradient(135deg,#9cc6ff,#2f7cf6 55%,#8f7cf8)' },
  neon: { label: 'Neon', ring: 'linear-gradient(135deg,#b06bff,#3ad7ff)', glow: '0 0 14px rgba(120,120,255,.65)' },
  sakura: { label: 'Sakura', ring: 'linear-gradient(135deg,#ffd1e4,#ff7fb0 50%,#fff)' },
  royal: { label: 'Kraliyet', ring: 'linear-gradient(135deg,#1f2433,#3b4466 45%,#ffc233 46%,#ffc233 54%,#1f2433 55%)', crown: true },
  rainbow: { label: 'Gökkuşağı', ring: 'conic-gradient(from var(--a),#ff5a36,#ffc233,#22b573,#2f7cf6,#8f7cf8,#ff5a36)', spin: true, glow: '0 0 12px rgba(255,194,51,.45)' },
}

/** A stable standard avatar for anyone whose own is missing, so there is never a blank initial. */
export const fallbackAvatar = (seed: string) => STANDARD_KEYS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % STANDARD_KEYS.length]

/**
 * A learner's picture everywhere in the app (profile, leagues, arena): their avatar
 * inside the frame they wear. `rounded` sets the shape of both.
 */
export function UserAvatar({ name, avatar, avatarUrl: url, frame, className = 'size-10', rounded = 'rounded-full' }: { name?: string | null; avatar?: string | null; avatarUrl?: string | null; frame?: string | null; className?: string; rounded?: string }) {
  const src = avatarUrl(avatar || fallbackAvatar(name ?? '?'), url)!
  const f = frame ? FRAMES[frame] : undefined
  const pic = <img src={src} alt="" className={clsx('size-full object-cover', rounded)} draggable={false} />
  if (!f) return <span className={clsx('relative block shrink-0 overflow-hidden bg-paper-2', rounded, className)}>{pic}</span>
  return (
    <span className={clsx('relative block shrink-0', rounded, className)}>
      <span
        aria-hidden
        className={clsx('absolute -inset-[3px]', rounded, f.spin && 'animate-[spin-border_4s_linear_infinite]')}
        style={{ background: f.ring, boxShadow: f.glow } as CSSProperties}
      />
      <span className={clsx('absolute inset-[1px] overflow-hidden bg-card', rounded)}>{pic}</span>
      {f.crown && <Crown aria-hidden className="absolute -top-[30%] left-1/2 size-[45%] -translate-x-1/2 fill-butter text-butter-deep drop-shadow" />}
    </span>
  )
}
