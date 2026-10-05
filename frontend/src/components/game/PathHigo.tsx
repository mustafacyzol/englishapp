import type { ReactNode } from 'react'
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'motion/react'
import { higoImg, type HigoPose } from './Higo'
import { HigoMotion } from './HigoMotion'

/**
 * Higo beside the trail, alive: every pose has its own small loop (the kite
 * sways on the wind, the balloon bobs, the skater glides, the dancer bounces)
 * and some carry a prop drawn in code: notes from the headphones, steam from
 * the tea, Zz while napping, a twinkle on the telescope. `wave` uses the real
 * hand-drawn waving frames. Everything holds still for reduced motion.
 */
type Act = { body: TargetAndTransition; t: Transition; extra?: ReactNode }

const loop = (duration: number, extra: Transition = {}): Transition => ({ repeat: Infinity, ease: 'easeInOut', duration, ...extra })

const Notes = () => (
  <span aria-hidden className="absolute -top-2 right-1">
    {['♪', '♫', '♪'].map((n, k) => (
      <motion.span key={k} className="absolute font-black text-lilac" style={{ fontSize: 14 + k * 3, right: k * 9 }} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: [-2, -26], x: [0, k % 2 ? 6 : -6] }} transition={loop(2.4, { delay: k * 0.8, ease: 'easeOut' })}>{n}</motion.span>
    ))}
  </span>
)

const Steam = () => (
  <span aria-hidden className="absolute left-[22%] top-[34%]">
    {[0, 1, 2].map((k) => (
      <motion.span key={k} className="absolute h-4 w-1.5 rounded-full bg-ink/20" style={{ left: k * 6 }} animate={{ opacity: [0, 0.8, 0], y: [0, -18], scaleY: [0.6, 1.2] }} transition={loop(2.2, { delay: k * 0.6, ease: 'easeOut' })} />
    ))}
  </span>
)

const Zzz = () => (
  <span aria-hidden className="absolute -top-1 right-2">
    {['z', 'Z', 'Z'].map((z, k) => (
      <motion.span key={k} className="absolute font-display font-black text-sky" style={{ fontSize: 11 + k * 4, right: k * 8 }} animate={{ opacity: [0, 1, 0], y: [0, -20 - k * 4] }} transition={loop(3, { delay: k * 0.9, ease: 'easeOut' })}>{z}</motion.span>
    ))}
  </span>
)

const Twinkle = () => (
  <motion.span aria-hidden className="absolute -right-1 top-1 text-base text-butter" animate={{ scale: [0.4, 1.2, 0.4], rotate: [0, 90, 180], opacity: [0, 1, 0] }} transition={loop(2.6)}>✦</motion.span>
)

const ACTS: Partial<Record<HigoPose, Act>> = {
  kite: { body: { rotate: [-4, 5, -4], y: [0, -4, 0] }, t: loop(3.6) },
  balloon: { body: { y: [0, -12, 0], rotate: [-2, 2, -2] }, t: loop(3.2) },
  skate: { body: { x: [-8, 8, -8], rotate: [-3, 3, -3] }, t: loop(2.8) },
  dance: { body: { y: [0, -9, 0, -5, 0], rotate: [-6, 6, -6] }, t: loop(1.6) },
  music: { body: { rotate: [-4, 4, -4], y: [0, -3, 0] }, t: loop(1.2), extra: <Notes /> },
  tea: { body: { y: [0, -2, 0] }, t: loop(3.4), extra: <Steam /> },
  nap: { body: { scaleY: [1, 0.97, 1], y: [0, 1.5, 0] }, t: loop(3.2), extra: <Zzz /> },
  scope: { body: { rotate: [-3, 2, -3] }, t: loop(4), extra: <Twinkle /> },
  books: { body: { y: [0, -5, 0], rotate: [0, -2, 0] }, t: loop(2.6) },
  read: { body: { rotate: [-2, 2, -2] }, t: loop(4.2) },
  map: { body: { rotate: [-3, 3, -3], x: [0, 3, 0] }, t: loop(3.8) },
  walk: { body: { x: [-5, 5, -5], y: [0, -4, 0, -4, 0] }, t: loop(2.2) },
  thumbs: { body: { rotate: [0, -6, 0], scale: [1, 1.05, 1] }, t: loop(2.4) },
}

export function PathHigo({ pose, flip }: { pose: HigoPose; flip?: boolean }) {
  const still = useReducedMotion()
  if (pose === 'wave') {
    return <span className="block w-full" style={{ transform: flip ? 'scaleX(-1)' : undefined }}><HigoMotion className="w-full" label="Higo el sallıyor" /></span>
  }
  const act = ACTS[pose] ?? { body: { y: [0, -5, 0] }, t: loop(3.4) }
  return (
    <span className="relative block w-full">
      <motion.img
        src={higoImg(pose)}
        alt=""
        className="w-full drop-shadow-[0_10px_12px_rgba(31,36,51,.22)]"
        style={{ scaleX: flip ? -1 : 1, transformOrigin: '50% 90%' }}
        animate={still ? undefined : act.body}
        transition={act.t}
      />
      {!still && act.extra}
      {/* a soft shadow that breathes with the jump */}
      <motion.span aria-hidden className="absolute -bottom-1 left-1/2 h-2 w-3/5 -translate-x-1/2 rounded-[50%] bg-ink/10 blur-[2px]" animate={still ? undefined : { scaleX: [1, 0.85, 1], opacity: [0.7, 0.45, 0.7] }} transition={act.t} />
    </span>
  )
}
