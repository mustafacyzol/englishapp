import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { img } from '@/lib/assets'

export type HigoPose = 'wave' | 'cheer' | 'think' | 'point' | 'read' | 'thumbs' | 'music' | 'map' | 'walk' | 'scope' | 'nap'
export const higoImg = (pose: HigoPose) => img(`higo/${pose}.webp`)

/**
 * Higo, DilGO's mascot: a little speech bubble that learned to talk. He cheers
 * right answers, thinks along on hard ones and guides new learners. Changing the
 * pose springs him into the new one.
 */
export function Higo({ pose = 'wave', className = 'size-24', say, float = false, side = 'right' }: { pose?: HigoPose; className?: string; say?: string | null; float?: boolean; side?: 'left' | 'right' }) {
  return (
    <span className={clsx('relative inline-flex items-end gap-2', side === 'left' && 'flex-row-reverse')}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={pose}
          src={higoImg(pose)}
          alt="Higo"
          draggable={false}
          className={clsx('select-none object-contain drop-shadow-[0_10px_14px_rgba(160,40,10,.22)]', className)}
          initial={{ scale: 0.6, opacity: 0, y: 12, rotate: -6 }}
          animate={float ? { scale: 1, opacity: 1, y: [0, -6, 0], rotate: 0 } : { scale: 1, opacity: 1, y: 0, rotate: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={float ? { y: { repeat: Infinity, duration: 2.6, ease: 'easeInOut' }, default: { type: 'spring', stiffness: 360, damping: 18 } } : { type: 'spring', stiffness: 360, damping: 18 }}
        />
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {say && (
          <motion.span key={say} initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className={clsx('mb-[45%] max-w-[220px] rounded-2xl bg-card px-3 py-2 text-left text-sm font-bold leading-snug text-ink shadow-soft ring-1 ring-line', side === 'right' ? 'rounded-bl-md' : 'rounded-br-md')}>
            {say}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
