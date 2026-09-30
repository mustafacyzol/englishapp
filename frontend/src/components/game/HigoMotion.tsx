import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import { img } from '@/lib/assets'

/**
 * WebKit (Safari, and every browser on iOS) plays VP9 but drops its alpha
 * channel, so there Higo comes as an animated WebP instead. Everywhere else the
 * VP9 film is a third of the size.
 */
const noAlphaVideo = () => {
  if (typeof navigator === 'undefined') return true
  const ua = navigator.userAgent
  return /iP(hone|ad|od)/.test(ua) || (/Safari\//.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua))
}

/**
 * Higo, really animated (hop, spin, wave) on a transparent background, so he
 * stands on whatever is behind him. Pauses when off screen; with reduced motion
 * he is a still picture.
 */
export function HigoMotion({ className, label = 'Higo el sallıyor' }: { className?: string; label?: string }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLVideoElement>(null)
  const [webp] = useState(noAlphaVideo)
  const poster = img('higo/anim/higo-hello-poster.webp')

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.1 })
    io.observe(v)
    return () => io.disconnect()
  }, [webp, reduced])

  if (reduced) return <img src={poster} alt={label} className={className} />
  if (webp) return <img src={img('higo/anim/higo-hello.webp')} alt={label} className={className} />
  return (
    <video ref={ref} className={clsx('pointer-events-none', className)} autoPlay muted loop playsInline preload="auto" poster={poster} aria-label={label}>
      <source src={img('higo/anim/higo-hello.webm')} type='video/webm; codecs="vp9"' />
    </video>
  )
}

/** The frames of Higo's day, drawn one by one as the page scrolls (see MeetHigoPro). */
export const HIGO_SEQ = { count: 81, src: (n: number) => img(`higo/anim/seq/${String(n + 1).padStart(2, '0')}.webp`), w: 560, h: 515 }
