import clsx from 'clsx'
import { badgeImg } from '@/lib/assets'
import { Img } from '@/components/ui/Img'

const TIERS = {
  bronze: { ring: '#D0874E', bg: '#FBEFE4', label: 'Bronz' },
  silver: { ring: '#9AA5B8', bg: '#F0F3F7', label: 'Gümüş' },
  gold: { ring: '#E8B21F', bg: '#FFF6DA', label: 'Altın' },
  legend: { ring: '#E8403A', bg: '#FFE8E6', label: 'Efsane' },
} as const

/**
 * A real 3D medal photographed per category; the tier is carried by the ring
 * colour and a small label so the same medal family reads bronze → legend.
 */
export function AchievementBadge({ tier, category, locked, progress = 0, size = 88, className }: { tier: keyof typeof TIERS; category?: string | null; locked?: boolean; progress?: number; size?: number; className?: string; icon?: string }) {
  const t = TIERS[tier] ?? TIERS.bronze
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <div className={clsx('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill={locked ? 'var(--paper-2)' : t.bg} stroke={locked ? 'var(--line)' : t.ring} strokeWidth="5" />
        {locked && progress > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-mint)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, progress)} ${c}`} />}
      </svg>
      <Img src={badgeImg(category ?? 'xp')} alt="" loading="lazy" className={clsx('relative size-[78%] object-contain drop-shadow-md transition', locked && 'opacity-40 grayscale')} />
    </div>
  )
}

export const tierLabel = (tier: string) => TIERS[tier as keyof typeof TIERS]?.label ?? tier
export const tierColor = (tier: string) => TIERS[tier as keyof typeof TIERS]?.ring ?? '#999'
