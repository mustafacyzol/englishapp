import clsx from 'clsx'
import { iconFor } from './icons'

const TIERS = {
  bronze: { fill: '#E8955A', light: '#F6C29A', ring: '#A65A25', label: 'Bronz' },
  silver: { fill: '#AEB7C8', light: '#E3E8F2', ring: '#6D7892', label: 'Gümüş' },
  gold: { fill: '#FFC53D', light: '#FFE59A', ring: '#B7860B', label: 'Altın' },
  legend: { fill: '#FF5A36', light: '#FFB199', ring: '#1B1F3B', label: 'Efsane' },
} as const

/**
 * Hand-built SVG medal. Shape grows in drama with tier: bronze is a plain seal,
 * silver gains a scalloped rim, gold and legend add ribbon tails and a star.
 */
export function AchievementBadge({ tier, icon, locked, progress = 0, size = 88, className }: { tier: keyof typeof TIERS; icon: string; locked?: boolean; progress?: number; size?: number; className?: string }) {
  const t = TIERS[tier] ?? TIERS.bronze
  const Icon = iconFor(icon)
  const scallops = tier !== 'bronze'
  const ribbons = tier === 'gold' || tier === 'legend'
  const r = 30
  const circumference = 2 * Math.PI * 36

  const scallopPath = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    const x = 50 + Math.cos(a) * 36
    const y = 46 + Math.sin(a) * 36
    return `M ${x} ${y} m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0`
  }).join(' ')

  return (
    <div className={clsx('relative inline-block', locked && 'grayscale', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className={clsx(locked && 'opacity-45')} aria-hidden>
        {ribbons && (
          <g stroke="#1B1F3B" strokeWidth="2.5" strokeLinejoin="round">
            <path d="M34 70 L26 96 L38 90 L44 98 L50 74 Z" fill={tier === 'legend' ? '#3A6FF7' : '#FF5A36'} />
            <path d="M66 70 L74 96 L62 90 L56 98 L50 74 Z" fill={tier === 'legend' ? '#3A6FF7' : '#FF5A36'} />
          </g>
        )}
        <circle cx="53" cy="49" r="37" fill="#1B1F3B" />
        {scallops ? <path d={scallopPath} fill={t.fill} stroke="#1B1F3B" strokeWidth="2.5" /> : null}
        <circle cx="50" cy="46" r="36" fill={t.fill} stroke="#1B1F3B" strokeWidth="3" />
        <circle cx="50" cy="46" r={r - 4} fill={t.light} stroke={t.ring} strokeWidth="2" strokeDasharray={tier === 'bronze' ? '0' : '3 3'} />
        <path d="M30 34 Q 40 22 58 24" stroke="#fff" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" fill="none" />
        {tier === 'legend' && <path d="M50 4 l3 6 6 1 -4.5 4 1 6 -5.5-3 -5.5 3 1-6 -4.5-4 6-1z" fill="#FFD23F" stroke="#1B1F3B" strokeWidth="2" />}
        {locked && progress > 0 && (
          <circle cx="50" cy="46" r="36" fill="none" stroke="#2EC4A0" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${circumference * progress} ${circumference}`} transform="rotate(-90 50 46)" />
        )}
      </svg>
      <Icon className="absolute text-[#1B1F3B]" strokeWidth={2.4} style={{ width: size * 0.3, height: size * 0.3, left: size * 0.35, top: size * 0.31 }} />
    </div>
  )
}

export const tierLabel = (tier: string) => TIERS[tier as keyof typeof TIERS]?.label ?? tier
