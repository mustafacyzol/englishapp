/**
 * Inventory card with a physical 3D flip on activation — built on the spring-flip
 * technique from 21st.dev "Neo-Brutalist Kinetic Deck", tuned for DilGO rarities.
 */
import { motion } from 'motion/react'
import clsx from 'clsx'
import type { UserItem } from '@/lib/types'
import { iconFor } from './icons'
import { dateTR } from '@/lib/format'

export const RARITY = {
  common: { bg: 'bg-card', band: 'bg-mint', label: 'Sıradan' },
  rare: { bg: 'bg-[#DCE6FF] dark:bg-[#2c3a74]', band: 'bg-sky', label: 'Nadir' },
  epic: { bg: 'bg-[#FFE0EC] dark:bg-[#5a2340]', band: 'bg-berry', label: 'Destansı' },
  legendary: { bg: 'bg-[#FFF1B8] dark:bg-[#5c4a12]', band: 'bg-flame', label: 'Efsanevi' },
} as const

const STATUS = { available: 'Kullanılabilir', active: 'Aktif', used: 'Kullanıldı', expired: 'Süresi doldu' }

export function RewardCard({ entry, flipped, back, onClick, rotate = 0 }: { entry: UserItem; flipped?: boolean; back?: React.ReactNode; onClick?: () => void; rotate?: number }) {
  const r = RARITY[entry.item.rarity] ?? RARITY.common
  const Icon = iconFor(entry.item.icon)
  const spent = entry.status === 'used' || entry.status === 'expired'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={!spent ? { y: -6, rotate: 0 } : undefined}
      initial={{ rotate }}
      animate={{ rotate }}
      className={clsx('relative h-64 w-full text-left [perspective:1100px]', spent && 'opacity-60')}
    >
      <motion.div className="relative size-full" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
        {/* front */}
        <div className={clsx('absolute inset-0 flex flex-col overflow-hidden rounded-[22px] border-[3px] border-line shadow-hard-lg', r.bg)} style={{ backfaceVisibility: 'hidden' }}>
          <div className={clsx('flex items-center justify-between border-b-[3px] border-line px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#1B1F3B]', r.band)}>
            <span>{r.label}</span>
            <span>{STATUS[entry.status]}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="grid size-16 place-items-center rounded-2xl border-[3px] border-line bg-card shadow-hard">
              <Icon className="size-8" strokeWidth={2.3} />
            </div>
            <h3 className="text-lg font-extrabold leading-tight">{entry.item.name}</h3>
            <p className="line-clamp-2 text-xs text-ink-soft">{entry.item.description}</p>
          </div>
          <div className="border-t-2 border-dashed border-line/40 px-4 py-2 font-mono text-[10px] uppercase text-ink-soft">
            {entry.code ? entry.code : entry.expires_at ? `Son: ${dateTR(entry.expires_at)}` : `Kaynak: ${entry.source}`}
          </div>
        </div>
        {/* back */}
        <div className={clsx('absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[22px] border-[3px] border-line p-5 text-center shadow-hard-lg', r.bg)} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {back}
        </div>
      </motion.div>
    </motion.button>
  )
}
