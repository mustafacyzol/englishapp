import { useEffect, useRef, useState } from 'react'
import { useReducedMotion, type MotionValue } from 'motion/react'
import clsx from 'clsx'
import { img } from '@/lib/assets'

/**
 * Higo's animations ship as numbered transparent WebP frames (cut out with a
 * matting model, so the edges are clean) and are drawn on a canvas. This plays
 * the same everywhere: no animated-WebP blending (which ghosted the character on
 * iPhones) and no VP9-alpha support gaps. Frames are decoded off the main thread
 * with createImageBitmap, and drawing only happens when the frame changes.
 */
export interface Sequence { dir: string; count: number; w: number; h: number; fps: number; pingpong?: boolean }

export const HIGO_HELLO: Sequence = { dir: 'higo/anim/hello', count: 76, w: 560, h: 560, fps: 15 }
export const HIGO_DAY: Sequence = { dir: 'higo/anim/day', count: 81, w: 680, h: 632, fps: 8 }
/** The same frames as a calm idle loop at a natural speed, played forwards and back so it never jumps. */
export const HIGO_DAY_LOOP: Sequence = { ...HIGO_DAY, fps: 15, pingpong: true }

const frameUrl = (s: Sequence, i: number) => img(`${s.dir}/${String(i + 1).padStart(2, '0')}.webp`)

type Frame = ImageBitmap | HTMLImageElement

async function decode(url: string): Promise<Frame> {
  if (typeof createImageBitmap === 'function') {
    const blob = await fetch(url).then((r) => r.blob())
    return createImageBitmap(blob)
  }
  const im = new Image()
  im.src = url
  await im.decode()
  return im
}

/** Loads every frame once per sequence and shares them between players. */
const cache = new Map<string, Promise<Frame>[]>()
function load(s: Sequence) {
  let list = cache.get(s.dir)
  if (!list) {
    // frame 0 first (it is the poster), then the rest in order
    list = Array.from({ length: s.count }, (_, i) => decode(frameUrl(s, i)))
    cache.set(s.dir, list)
  }
  return list
}

/**
 * A transparent frame-by-frame animation. Without `progress` it loops at the
 * sequence's fps while on screen; with `progress` (0..1) it follows that value,
 * e.g. the page scroll.
 */
export function FrameSequence({ seq, progress, className, label }: { seq: Sequence; progress?: MotionValue<number>; className?: string; label: string }) {
  const reduced = useReducedMotion()
  const canvas = useRef<HTMLCanvasElement>(null)
  const frames = useRef<(Frame | null)[]>([])
  const shown = useRef(-1)
  const [ready, setReady] = useState(false)

  const draw = (want: number) => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    // nearest decoded frame, so a slow connection never shows a gap
    let i = want
    if (!frames.current[i]) {
      for (let d = 1; d < seq.count; d++) {
        if (frames.current[want - d]) { i = want - d; break }
        if (frames.current[want + d]) { i = want + d; break }
      }
    }
    const f = frames.current[i]
    if (!f || i === shown.current) return
    shown.current = i
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(f, 0, 0, c.width, c.height)
  }

  useEffect(() => {
    let live = true
    frames.current = new Array(seq.count).fill(null)
    shown.current = -1
    load(seq).forEach((p, i) => p.then((f) => {
      if (!live) return
      frames.current[i] = f
      if (i === 0) { setReady(true); draw(progress ? Math.round(progress.get() * (seq.count - 1)) : 0) }
    }).catch(() => {}))
    return () => { live = false }
  }, [seq]) // eslint-disable-line react-hooks/exhaustive-deps

  // scroll-driven
  useEffect(() => {
    if (!progress) return
    let raf = 0
    const unsub = progress.on('change', (v) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => draw(Math.round(Math.min(1, Math.max(0, v)) * (seq.count - 1))))
    })
    return () => { unsub(); cancelAnimationFrame(raf) }
  }, [progress, seq]) // eslint-disable-line react-hooks/exhaustive-deps

  // looping, only while visible and the tab is open
  useEffect(() => {
    if (progress || reduced || !ready) return
    const c = canvas.current
    if (!c) return
    let raf = 0
    let on = false
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now
      const n = Math.floor(((now - start) / 1000) * seq.fps)
      const span = seq.count * 2 - 2
      draw(seq.pingpong ? seq.count - 1 - Math.abs((n % span) - (seq.count - 1)) : n % seq.count)
      raf = requestAnimationFrame(tick)
    }
    const play = (v: boolean) => {
      if (v === on) return
      on = v
      if (v) { start = 0; raf = requestAnimationFrame(tick) } else cancelAnimationFrame(raf)
    }
    const io = new IntersectionObserver(([e]) => play(e.isIntersecting && !document.hidden), { threshold: 0.05 })
    io.observe(c)
    const vis = () => play(!document.hidden && c.getBoundingClientRect().bottom > 0)
    document.addEventListener('visibilitychange', vis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); cancelAnimationFrame(raf) }
  }, [progress, reduced, ready, seq]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={clsx('relative block', className)} style={{ aspectRatio: `${seq.w} / ${seq.h}` }}>
      {!ready && <img src={frameUrl(seq, 0)} alt="" aria-hidden className="absolute inset-0 size-full object-contain" />}
      <canvas ref={canvas} width={seq.w} height={seq.h} role="img" aria-label={label} className="relative size-full" />
    </span>
  )
}

/** Higo waving hello on a transparent background. */
export function HigoMotion({ className, label = 'Higo el sallıyor' }: { className?: string; label?: string }) {
  return <FrameSequence seq={HIGO_HELLO} className={className} label={label} />
}
