import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Route transition: an enter-only fade + lift, keyed by the parent on pathname.
 * No exit/"wait" phase on purpose — fast tab switching could otherwise leave the
 * previous page stuck on screen while its exit animation was interrupted.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Scroll reveal for marketing sections. Starts slightly transparent, never fully hidden. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0.001, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
