/**
 * Inventory card with a physical 3D flip on activation — built on the spring-flip
 * technique from 21st.dev "Neo-Brutalist Kinetic Deck", restyled for DilGO.
 */
import { motion } from 'motion/react'
import clsx from 'clsx'
import type { UserItem } from '@/lib/types'
import { rewardImg } from '@/lib/assets'
import { dateTR } from '@/lib/format'

export const RARITY = {
  common: { bg: 'bg-card', glow: 'from-mint/15', text: 'text-mint-deep', label: 'Sıradan' },
  rare: { bg: 'bg-card', glow: 'from-sky/20', text: 'text-sky', label: 'Nadir' },
  epic: { bg: 'bg-card', glow: 'from-berry/20', text: 'text-berry', label: 'Destansı' },
  legendary: { bg: 'bg-card', glow: 'from-butter/35', text: 'text-butter-deep', label: 'Efsanevi' },
} as const

const STATUS = { available: 'Hazır', active: 'Aktif', used: 'Kullanıldı', expired: 'Süresi doldu' }

export function RewardCard({ entry, flipped, back, onClick }: { entry: UserItem; flipped?: boolean; back?: React.ReactNode; onClick?: () => void; rotate?: number }) {
  const r = RARITY[entry.item.rarity] ?? RARITY.common
  const spent = entry.status === 'used' || entry.status === 'expired'

  return (
    <motion.div onClick={onClick} whileHover={!spent ? { y: -4 } : undefined} className={clsx('relative h-72 w-full [perspective:1100px]', spent && 'opacity-55')}>
      <motion.div className="relative size-full" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
        <div className={clsx('absolute inset-0 flex flex-col overflow-hidden rounded-3xl border-2 border-line shadow-hard', r.bg)} style={{ backfaceVisibility: 'hidden' }}>
          <div className={clsx('absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent', r.glow)} />
          <div className="relative flex items-center justify-between px-4 pt-4 text-[11px] font-extrabold uppercase tracking-widest">
            <span className={r.text}>{r.label}</span>
            <span className="rounded-full bg-paper-2 px-2 py-0.5 text-ink-soft">{STATUS[entry.status]}</span>
          </div>
          <div className="relative flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
            <img src={rewardImg(entry.item.icon)} alt="" className="size-24 object-contain drop-shadow-lg" />
            <h3 className="text-lg leading-tight">{entry.item.name}</h3>
            <p className="line-clamp-2 text-sm text-ink-soft">{entry.item.description}</p>
          </div>
          <div className="relative border-t-2 border-dashed border-line px-4 py-2.5 text-center text-xs font-bold text-ink-soft">
            {entry.code ? <span className="font-mono text-sm text-ink">{entry.code}</span> : entry.expires_at ? `Son gün: ${dateTR(entry.expires_at)}` : `Kazanıldı: ${dateTR(entry.created_at)}`}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-line bg-card p-6 text-center shadow-hard" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {back}
        </div>
      </motion.div>
    </motion.div>
  )
}
