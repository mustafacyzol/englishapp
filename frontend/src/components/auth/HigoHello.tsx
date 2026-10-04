import { motion, useReducedMotion } from 'motion/react'
import { img } from '@/lib/assets'

/**
 * Higo as a small round profile picture beside the sign-in heading. Once, his
 * hand comes out past the edge of the circle, waves and tucks back in; after
 * that he only blinks now and then.
 */
export function HigoHello({ className = 'size-14' }: { className?: string }) {
  const still = useReducedMotion()
  return (
    <div className={`relative shrink-0 ${className}`} aria-hidden>
      {/* the hand sits behind the circle, so it seems to reach out of it */}
      {!still && (
        <motion.img
          src={img('higo/hand.webp')}
          alt=""
          draggable={false}
          className="absolute right-[-26%] top-[4%] w-[36%] origin-[20%_95%]"
          initial={{ rotate: 75, x: '-60%', y: '25%', opacity: 0 }}
          animate={{
            rotate: [75, 0, -18, 14, -18, 10, 0, 75],
            x: ['-60%', '0%', '0%', '0%', '0%', '0%', '0%', '-60%'],
            y: ['25%', '0%', '0%', '0%', '0%', '0%', '0%', '25%'],
            opacity: [0, 1, 1, 1, 1, 1, 1, 0],
          }}
          transition={{ delay: 0.55, duration: 2.1, times: [0, 0.16, 0.3, 0.44, 0.58, 0.7, 0.82, 1], ease: 'easeInOut' }}
        />
      )}
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="relative block size-full overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff4ea,#ffd9c4)] shadow-[0_0_0_3px_var(--color-card),0_0_0_5px_rgba(255,90,54,.28)]"
      >
        <img src={img('higo/face.webp')} alt="" draggable={false} className="absolute inset-0 size-full scale-[1.08] object-cover object-top" />
        {!still && <img src={img('higo/face-blink.webp')} alt="" draggable={false} className="higo-blink absolute inset-0 size-full scale-[1.08] object-cover object-top opacity-0 animate-[higo-blink_5s_linear_2.8s_infinite]" />}
      </motion.span>
    </div>
  )
}
