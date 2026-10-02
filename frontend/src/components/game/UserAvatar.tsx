import type { CSSProperties } from 'react'
import clsx from 'clsx'
import { STANDARD_KEYS, avatarUrl } from '@/lib/avatars'

/**
 * Profile frames sold in the shop. Each one is a coloured ring plus its own
 * ornament (laurels, flames, gems, clouds, neon, blossoms, a crown, sparkles),
 * so no two look alike.
 */
export const FRAMES: Record<string, { label: string; ring: string; glow?: string; spin?: boolean; note: string }> = {
  gold: { label: 'Altın Defne', ring: 'linear-gradient(135deg,#ffe27a,#f5a524 45%,#fff1b8 60%,#d98a0b)', note: 'Altın halka ve defne yaprakları' },
  flame: { label: 'Alev', ring: 'linear-gradient(135deg,#ffb020,#ff5a36 55%,#e0301a)', note: 'Yanıp sönen alev dilleri' },
  emerald: { label: 'Zümrüt', ring: 'linear-gradient(135deg,#7ae3b4,#22b573 55%,#0f8a55)', note: 'Halkada altı zümrüt taşı' },
  sky: { label: 'Gökyüzü', ring: 'linear-gradient(135deg,#bfe0ff,#2f7cf6 60%,#8f7cf8)', note: 'Bulutlar ve parlayan yıldız' },
  neon: { label: 'Neon', ring: 'linear-gradient(135deg,#b06bff,#3ad7ff)', glow: '0 0 14px rgba(120,120,255,.7)', note: 'Atan çift neon halka' },
  sakura: { label: 'Sakura', ring: 'linear-gradient(135deg,#ffe1ee,#ff7fb0 55%,#ffd1e4)', note: 'Kiraz çiçekleri' },
  royal: { label: 'Kraliyet', ring: 'linear-gradient(135deg,#1f2433,#3b4466 45%,#ffc233 46%,#ffc233 54%,#1f2433 55%)', note: 'Lacivert halka ve altın taç' },
  rainbow: { label: 'Gökkuşağı', ring: 'conic-gradient(from var(--a),#ff5a36,#ffc233,#22b573,#2f7cf6,#8f7cf8,#ff5a36)', spin: true, glow: '0 0 12px rgba(255,194,51,.45)', note: 'Dönen gökkuşağı ve pırıltılar' },
}

/** Each frame's own ornament, drawn inside the avatar's box so nothing is ever clipped. */
function FrameDecor({ kind }: { kind: string }) {
  const at = (deg: number, r = 46) => [50 + r * Math.cos((deg * Math.PI) / 180), 50 + r * Math.sin((deg * Math.PI) / 180)] as const
  switch (kind) {
    case 'gold':
      return (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          {[110, 128, 146, 164, 70, 52, 34, 16].map((d, i) => {
            const [x, y] = at(d, 45)
            return <ellipse key={i} cx={x} cy={y} rx="5.5" ry="2.6" fill={i < 4 ? '#e9a91c' : '#f5c242'} stroke="#a86f05" strokeWidth=".6" transform={`rotate(${d + (i < 4 ? 60 : -60)} ${x} ${y})`} />
          })}
        </svg>
      )
    case 'flame':
      return (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full animate-[flicker_1.6s_ease-in-out_infinite]" aria-hidden>
          {[-150, -120, -90, -60, -30].map((d, i) => {
            const [x, y] = at(d, 43)
            return <path key={i} d={`M${x - 4} ${y + 3} Q${x - 3} ${y - 6} ${x} ${y - 9} Q${x + 3} ${y - 6} ${x + 4} ${y + 3} Z`} fill={i % 2 ? '#ffc233' : '#ff7a2a'} transform={`rotate(${d + 90} ${x} ${y})`} />
          })}
        </svg>
      )
    case 'emerald':
      return (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          {[0, 60, 120, 180, 240, 300].map((d) => {
            const [x, y] = at(d - 90, 46.5)
            return <rect key={d} x={x - 3.4} y={y - 3.4} width="6.8" height="6.8" rx="1" fill="#2fe39a" stroke="#0b5e3b" strokeWidth=".8" transform={`rotate(45 ${x} ${y})`} />
          })}
        </svg>
      )
    case 'sky':
      return (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          <g fill="#fff" stroke="#9cc6ff" strokeWidth=".8">
            <path d="M14 86a6 6 0 0 1 5-9 7 7 0 0 1 13 1 5 5 0 0 1 2 9z" />
            <path d="M66 90a5 5 0 0 1 4-8 6 6 0 0 1 11 1 4 4 0 0 1 2 7z" />
          </g>
          <path d="M83 12l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#ffd34d" stroke="#d99a00" strokeWidth=".6" />
        </svg>
      )
    case 'neon':
      return <span aria-hidden className="pointer-events-none absolute inset-[3%] animate-[neon-pulse_1.8s_ease-in-out_infinite] rounded-[inherit] border-2 border-[#3ad7ff]/80" />
    case 'sakura':
      return (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          {[-130, -50, 40, 140].map((d) => {
            const [x, y] = at(d, 44)
            return (
              <g key={d} transform={`translate(${x} ${y})`}>
                {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-3.6" rx="2.6" ry="3.8" fill="#ffc2da" stroke="#ff7fb0" strokeWidth=".5" transform={`rotate(${r})`} />)}
                <circle r="1.6" fill="#ffd34d" />
              </g>
            )
          })}
        </svg>
      )
    case 'royal':
      return (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          <path d="M33 18 L37 4 L45 12 L50 1 L55 12 L63 4 L67 18 Z" fill="#ffc233" stroke="#a86f05" strokeWidth="1" strokeLinejoin="round" />
          <circle cx="50" cy="12" r="2" fill="#ef4e7b" />
        </svg>
      )
    case 'rainbow':
      return (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full animate-[twinkle_2.2s_ease-in-out_infinite]" aria-hidden>
          {[[12, 18], [88, 22], [84, 86]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 5} L${x + 1.4} ${y - 1.4} L${x + 5} ${y} L${x + 1.4} ${y + 1.4} L${x} ${y + 5} L${x - 1.4} ${y + 1.4} L${x - 5} ${y} L${x - 1.4} ${y - 1.4} Z`} fill="#fff" stroke="#ffc233" strokeWidth=".8" />)}
        </svg>
      )
    default:
      return null
  }
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
  // ring, picture and ornament all live inside the box: a framed avatar never spills out of its slot.
  // Frames are always round so every ornament sits exactly on its ring.
  return (
    <span className={clsx('relative block shrink-0 rounded-full', className)}>
      <span aria-hidden className={clsx('absolute inset-0 rounded-full', f.spin && 'animate-[spin-border_4s_linear_infinite]')} style={{ background: f.ring, boxShadow: f.glow } as CSSProperties} />
      <span className="absolute inset-[7%] overflow-hidden rounded-full bg-card"><img src={src} alt="" className="size-full object-cover" draggable={false} /></span>
      <FrameDecor kind={frame!} />
    </span>
  )
}
