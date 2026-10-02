import { Suspense, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Route transition: a short, calm cross-fade keyed by the parent on pathname (no
 * slide, so nothing ever seems to rise from the bottom). Each page sits in its own
 * Suspense boundary inside the layout, so opening a page that is still loading
 * keeps the header, menu and background in place instead of blanking the screen.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16, ease: 'easeOut' }}>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </motion.div>
  )
}

/** What a page shows for the split second its code is still arriving: quiet bars, never a blank screen. */
export function PageFallback() {
  return (
    <div aria-busy="true" aria-label="Yükleniyor" className="mx-auto w-full max-w-3xl animate-pulse space-y-4 py-4">
      <div className="h-8 w-2/5 rounded-xl bg-paper-2" />
      <div className="h-40 rounded-3xl bg-paper-2" />
      <div className="grid grid-cols-2 gap-4"><div className="h-28 rounded-3xl bg-paper-2" /><div className="h-28 rounded-3xl bg-paper-2" /></div>
    </div>
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
