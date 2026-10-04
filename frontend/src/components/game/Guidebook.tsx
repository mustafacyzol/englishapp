import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { get } from '@/lib/api'
import { Markdown } from '@/lib/markdown'
import { higoImg, type HigoPose } from './Higo'

const PAPER = '#fffaf0'
const INK = '#2a2620'
const POSES: HigoPose[] = ['point', 'think', 'read', 'thumbs', 'scope', 'cheer']

/** One page of the guide: its markdown plus Higo's tips, which he says himself. */
interface Leaf { kind: 'cover' | 'page' | 'end'; body?: string; tips?: string[]; heading?: string }

function parse(src: string, title: string): Leaf[] {
  const text = src.trim()
  if (!text) return []
  const chunks = text.split(/\n-{3,}\n/).length > 1 ? text.split(/\n-{3,}\n/) : text.split(/\n(?=## )/)
  const pages: Leaf[] = chunks.map((c) => {
    const tips: string[] = []
    const body = c.split('\n').filter((l) => {
      const m = l.match(/^>\s*Higo'nun ipucu:\s*(.*)$/i)
      if (m) tips.push(m[1])
      return !m
    }).join('\n').trim()
    return { kind: 'page', body, tips, heading: body.match(/^## (.+)$/m)?.[1] }
  })
  return [{ kind: 'cover', heading: title }, ...pages, { kind: 'end' }]
}

/**
 * The unit guidebook as a real little book. A cover with Higo as your guide, a
 * contents list, pages that turn around the spine (two facing pages on wide
 * screens, one page and a swipe on phones) and Higo's tips spoken in his own
 * bubble at the foot of the page. Admins write plain markdown: "##" headings
 * (or "---" lines) start a new page and "> Higo'nun ipucu: …" becomes a tip.
 */
export function Guidebook({ unit, onClose, onStart }: { unit: { id: number; title: string; color?: string; description?: string } | null; onClose: () => void; onStart?: () => void }) {
  const { data } = useQuery({ queryKey: ['guide', unit?.id], queryFn: () => get<{ guidebook: string }>(`/units/${unit!.id}/guidebook`), enabled: !!unit })
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches)
  const [at, setAt] = useState(0)
  const [flip, setFlip] = useState<null | 1 | -1>(null)
  const color = unit?.color ?? '#e8403a'
  const leaves = useMemo(() => parse(data?.guidebook ?? '', unit?.title ?? ''), [data, unit?.title])
  const per = wide ? 2 : 1
  const spreads = Math.max(1, Math.ceil(leaves.length / per))

  useEffect(() => { setAt(0); setFlip(null) }, [unit?.id])
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const on = () => { setWide(mq.matches); setAt(0) }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    if (!unit) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') turn(1)
      if (e.key === 'ArrowLeft') turn(-1)
    }
    document.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = '' }
  })

  const turn = (d: 1 | -1) => {
    if (flip || at + d < 0 || at + d >= spreads) return
    setFlip(d)
  }
  const done = () => { setAt((a) => a + (flip ?? 0)); setFlip(null) }
  const leaf = (i: number) => (i >= 0 && i < leaves.length ? <Page leaf={leaves[i]} n={i} color={color} unit={unit} leaves={leaves} onStart={onStart ?? onClose} goTo={(p) => setAt(Math.floor(p / per))} /> : <div className="size-full" style={{ background: PAPER }} />)
  const swipe = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) turn(1)
    else if (info.offset.x > 60) turn(-1)
  }

  // indices of what is visible under the turning leaf
  const L = at * per
  const next = (at + (flip ?? 0)) * per

  return (
    <AnimatePresence>
      {unit && (
        <motion.div className="fixed inset-0 z-[80] flex flex-col bg-[#14110d]/80 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="safe-top flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
            <p className="min-w-0 truncate text-sm font-extrabold uppercase tracking-[0.18em] text-white/70">Ünite rehberi · <span className="text-white">{unit.title}</span></p>
            <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Rehberi kapat"><X className="size-5" /></button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-3 sm:px-6">
            {!data ? (
              <img src={higoImg('read')} alt="" className="w-28 animate-pulse" />
            ) : (
              <motion.div
                initial={{ y: 40, scale: 0.96, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                drag={wide ? false : 'x'}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={swipe}
                className="relative h-full max-h-[760px] w-full [perspective:2200px]"
                style={{ maxWidth: wide ? 1080 : 560 }}
              >
                {/* the book block: cover boards behind the pages */}
                <div className="absolute inset-0 translate-y-1.5 rounded-[18px]" style={{ background: `color-mix(in oklab, ${color} 55%, #3b2a1a)` }} />
                <div className="absolute inset-[6px] flex overflow-hidden rounded-[12px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]" style={{ background: PAPER, color: INK }}>
                  {wide ? (
                    <>
                      <div className="relative h-full w-1/2 overflow-hidden">{leaf(flip === -1 ? next : L)}<Spine side="left" /></div>
                      <div className="relative h-full w-1/2 overflow-hidden">{leaf(flip === 1 ? next + 1 : L + 1)}<Spine side="right" /></div>
                    </>
                  ) : (
                    <div className="relative h-full w-full overflow-hidden">{leaf(flip === 1 ? next : L)}</div>
                  )}
                </div>

                {/* the turning leaf */}
                {flip && (
                  <motion.div
                    key={`${at}-${flip}`}
                    className="absolute inset-y-[6px] [transform-style:preserve-3d]"
                    style={wide
                      ? { left: flip === 1 ? '50%' : 6, right: flip === 1 ? 6 : '50%', transformOrigin: flip === 1 ? 'left center' : 'right center' }
                      : { left: 6, right: 6, transformOrigin: 'left center' }}
                    initial={{ rotateY: wide ? 0 : flip === 1 ? 0 : -110 }}
                    animate={{ rotateY: wide ? (flip === 1 ? -180 : 180) : flip === 1 ? -110 : 0 }}
                    transition={{ duration: 0.75, ease: [0.45, 0.05, 0.25, 1] }}
                    onAnimationComplete={done}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-[10px] [backface-visibility:hidden]" style={{ background: PAPER, color: INK }}>
                      {wide ? leaf(flip === 1 ? L + 1 : L) : leaf(flip === 1 ? L : L - 1)}
                      <motion.div className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.35, 0.1] }} transition={{ duration: 0.75 }} style={{ background: flip === 1 ? 'linear-gradient(90deg, rgba(0,0,0,.25), transparent 40%)' : 'linear-gradient(270deg, rgba(0,0,0,.25), transparent 40%)' }} />
                    </div>
                    {wide && (
                      <div className="absolute inset-0 overflow-hidden rounded-[10px] [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ background: PAPER, color: INK }}>
                        {leaf(flip === 1 ? next : next + 1)}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {data && (
            <div className="safe-bottom flex items-center justify-center gap-4 px-4 pb-4 text-white">
              <button onClick={() => turn(-1)} disabled={at === 0} className="grid size-12 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-30" aria-label="Önceki sayfa"><ChevronLeft className="size-6" /></button>
              <div className="flex gap-1.5" aria-label={`Sayfa ${at + 1} / ${spreads}`}>
                {Array.from({ length: spreads }, (_, i) => <span key={i} className={clsx('h-1.5 rounded-full transition-all', i === at ? 'w-6 bg-white' : 'w-1.5 bg-white/35')} />)}
              </div>
              <button onClick={() => turn(1)} disabled={at >= spreads - 1} className="grid size-12 place-items-center rounded-full bg-white text-[#14110d] transition hover:scale-105 disabled:opacity-30" aria-label="Sonraki sayfa"><ChevronRight className="size-6" /></button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Spine({ side }: { side: 'left' | 'right' }) {
  return <span aria-hidden className={clsx('pointer-events-none absolute inset-y-0 w-10', side === 'left' ? 'right-0 bg-[linear-gradient(270deg,rgba(60,40,20,.18),transparent)]' : 'left-0 bg-[linear-gradient(90deg,rgba(60,40,20,.18),transparent)]')} />
}

function Page({ leaf, n, color, unit, leaves, onStart, goTo }: { leaf: Leaf; n: number; color: string; unit: { title: string; description?: string } | null; leaves: Leaf[]; onStart: () => void; goTo: (p: number) => void }) {
  if (leaf.kind === 'cover') {
    const contents = leaves.map((l, i) => ({ l, i })).filter((x) => x.l.kind === 'page')
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color }}>Ünite rehberi</p>
        <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">{leaf.heading}</h2>
        {unit?.description && <p className="mt-2 text-[15px] opacity-70">{unit.description}</p>}
        <div className="my-5 flex items-end gap-3">
          <motion.img src={higoImg('read')} alt="" className="w-24 shrink-0 drop-shadow sm:w-28" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} />
          <Bubble color={color}>Bu ünitede sana ben rehberlik edeceğim. Sayfaları çevir, ipuçlarımı oku, sonra derse hazırsın!</Bubble>
        </div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] opacity-50">İçindekiler</p>
        <ol className="space-y-1">
          {contents.map(({ l, i }, k) => (
            <li key={i}>
              <button onClick={() => goTo(i)} className="flex w-full items-baseline gap-2 rounded-lg px-1 py-1 text-left hover:bg-black/[.04]">
                <span className="font-mono text-xs opacity-50">{String(k + 1).padStart(2, '0')}</span>
                <span className="flex-1 font-bold">{l.heading ?? `Bölüm ${k + 1}`}</span>
                <span className="font-mono text-xs opacity-40">{i + 1}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (leaf.kind === 'end') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <motion.img src={higoImg('cheer')} alt="" className="w-32" initial={{ scale: 0.8 }} animate={{ scale: [0.95, 1.05, 0.95] }} transition={{ repeat: Infinity, duration: 2.4 }} />
        <h3 className="font-display text-2xl font-black">Rehberin sonu</h3>
        <p className="max-w-xs opacity-70">Konuyu gördün. Şimdi pratik zamanı: bilgiler kullandıkça kalıcı olur.</p>
        <button onClick={onStart} className="press mt-2 rounded-xl px-5 py-3 font-display font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_rgba(0,0,0,.25)]" style={{ background: color }}>Derse dön</button>
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-7 sm:px-9 [&_h3]:font-display [&_h3]:text-[1.6rem] [&_h3]:leading-tight [&_table]:bg-white/60 [&_td]:align-top [&_em]:text-[inherit] [&_em]:font-semibold [&_em]:italic [&_em]:opacity-80 [&_blockquote]:my-1 [&_blockquote]:border-l-[3px] [&_blockquote]:font-sans [&_blockquote]:text-[15px] [&_blockquote]:font-semibold [&_blockquote]:leading-snug [&_table]:text-[13.5px] sm:[&_table]:text-sm">
        <Markdown source={leaf.body ?? ''} />
        {!!leaf.tips?.length && (
          <div className="mt-5 space-y-3">
            {leaf.tips.map((t, i) => (
              <div key={i} className="flex items-end gap-2">
                <img src={higoImg(POSES[(n + i) % POSES.length])} alt="" className="w-14 shrink-0 drop-shadow" />
                <Bubble color={color}><span className="mb-0.5 block text-[10px] font-black uppercase tracking-[0.18em]" style={{ color }}>Higo'nun ipucu</span>{t}</Bubble>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="shrink-0 pb-3 text-center font-mono text-xs opacity-40">{n + 1}</p>
    </div>
  )
}

function Bubble({ children, color }: { children: ReactNode; color: string }) {
  return (
    <p className="relative rounded-2xl rounded-bl-md border-2 bg-white px-3.5 py-2.5 text-sm font-semibold leading-snug" style={{ borderColor: `color-mix(in oklab, ${color} 35%, transparent)` }}>
      {children}
    </p>
  )
}
