import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

/** A piece of a page: some markdown, or one of Higo's tips (he says those himself). */
type Block = { kind: 'md'; src: string; group?: string; table?: boolean } | { kind: 'tip'; text: string }
/** One page of the book. Long sections flow on to the next page instead of scrolling. */
interface Leaf { kind: 'cover' | 'page' | 'end'; blocks?: Block[]; heading?: string; cont?: boolean; section?: number }
interface Section { heading?: string; blocks: Block[] }

/** Rows of a long table go in chunks (the header repeats), lists in a few items at a time. */
const TABLE_ROWS = 3
const LIST_ITEMS = 2

/**
 * Splits the guide into sections ("##" headings or "---" lines) and each section
 * into small blocks: paragraphs, table chunks, list chunks, dialogue lines, tips.
 * Small blocks are what lets a section break cleanly across pages.
 */
function parse(src: string): Section[] {
  const text = src.trim()
  if (!text) return []
  const chunks = text.split(/\n-{3,}\n/).length > 1 ? text.split(/\n-{3,}\n/) : text.split(/\n(?=## )/)
  return chunks.map((c) => {
    const lines = c.split('\n')
    const blocks: Block[] = []
    let heading: string | undefined
    let i = 0
    const take = (test: (l: string) => boolean) => { const out: string[] = []; while (i < lines.length && test(lines[i])) out.push(lines[i++]); return out }
    while (i < lines.length) {
      const l = lines[i]
      if (!l.trim()) { i++; continue }
      const tip = l.match(/^>\s*Higo'nun ipucu:\s*(.*)$/i)
      if (tip) { blocks.push({ kind: 'tip', text: tip[1] }); i++; continue }
      if (l.startsWith('## ')) { heading ??= l.slice(3).trim(); blocks.push({ kind: 'md', src: l }); i++; continue }
      if (l.startsWith('|')) {
        const rows = take((x) => x.startsWith('|'))
        const [head, sep, ...body] = rows
        const group = `t${i}`
        for (let k = 0; k < Math.max(1, body.length); k += TABLE_ROWS) blocks.push({ kind: 'md', group, table: true, src: [head, sep, ...body.slice(k, k + TABLE_ROWS)].join('\n') })
        continue
      }
      if (/^(- |\d+\. )/.test(l)) {
        const items = take((x) => /^(- |\d+\. )/.test(x))
        const group = `l${i}`
        for (let k = 0; k < items.length; k += LIST_ITEMS) blocks.push({ kind: 'md', group, src: items.slice(k, k + LIST_ITEMS).join('\n') })
        continue
      }
      if (l.startsWith('> ')) {
        const quote = take((x) => x.startsWith('> ') && !/^>\s*Higo'nun ipucu:/i.test(x))
        const group = `q${i}`
        for (let k = 0; k < quote.length; k += 2) blocks.push({ kind: 'md', group, src: quote.slice(k, k + 2).join('\n') })
        continue
      }
      blocks.push({ kind: 'md', src: take((x) => !!x.trim() && !/^(\||- |\d+\. |> |## )/.test(x)).join('\n') })
    }
    return { heading, blocks }
  })
}

/**
 * Packs the sections into pages of the measured height: blocks fill a page in
 * order and the first block that does not fit starts the next page, which
 * repeats the section title as "(devam)". A block taller than a whole page
 * still gets a page of its own.
 */
function paginate(sections: Section[], heights: number[][], avail: number, contH: number): Leaf[] {
  const leaves: Leaf[] = []
  sections.forEach((sec, si) => {
    let page: Block[] = []
    let used = 0
    let cont = false
    sec.blocks.forEach((b, bi) => {
      const h = heights[si]?.[bi] ?? 0
      if (page.length && used + h > avail) {
        leaves.push({ kind: 'page', blocks: page, heading: sec.heading, cont, section: si })
        page = []
        cont = true
        used = contH
      }
      // pieces of the same table or list that land on one page are joined back together
      const last = page[page.length - 1]
      if (last && last.kind === 'md' && b.kind === 'md' && b.group && last.group === b.group) {
        page[page.length - 1] = { ...last, src: last.src + '\n' + (b.table ? b.src.split('\n').slice(2).join('\n') : b.src) }
      } else page.push(b)
      used += h
    })
    if (page.length) leaves.push({ kind: 'page', blocks: page, heading: sec.heading, cont, section: si })
  })
  return leaves
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
  const sections = useMemo(() => parse(data?.guidebook ?? ''), [data])
  // every block is measured at the real page size, then packed into pages that never scroll
  const probe = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<{ heights: number[][]; avail: number; contH: number } | null>(null)
  useLayoutEffect(() => {
    const el = probe.current
    if (!el) return
    const measure = () => {
      const body = el.querySelector<HTMLElement>('[data-body]')
      if (!body) return
      const cs = getComputedStyle(body)
      const avail = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 10
      // a block's height is the distance to the next block's top, so shared margins count once
      const all = [...el.querySelectorAll<HTMLElement>('[data-b]')]
      const tops = all.map((b) => b.getBoundingClientRect().top)
      const end = el.querySelector<HTMLElement>('[data-end]')!.getBoundingClientRect().top
      const byKey = new Map(all.map((b, i) => [b.dataset.b!, (tops[i + 1] ?? end) - tops[i]]))
      const heights = sections.map((sec, si) => sec.blocks.map((_, bi) => Math.ceil(byKey.get(`${si}-${bi}`) ?? 0)))
      const cont = el.querySelector<HTMLElement>('[data-cont]')!
      const contH = Math.ceil(all[0] ? tops[0] - cont.getBoundingClientRect().top : cont.offsetHeight)
      setLayout((old) => (old && old.avail === avail && JSON.stringify(old.heights) === JSON.stringify(heights) ? old : { heights, avail, contH }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // web fonts change line heights once they arrive
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [sections, wide, unit?.id, !!data])
  const leaves = useMemo<Leaf[]>(() => (sections.length && layout ? [{ kind: 'cover', heading: unit?.title ?? '' }, ...paginate(sections, layout.heights, layout.avail, layout.contH), { kind: 'end' }] : []), [sections, layout, unit?.title])
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
                  {/* invisible copy of a page holding every block, only for measuring */}
                  <div ref={probe} aria-hidden className="pointer-events-none invisible absolute inset-y-0 left-0" style={{ width: wide ? '50%' : '100%' }}>
                    <PageFrame n={0}>
                      <div data-cont className="flow-root"><ContHeading text="Başlık" color={color} /></div>
                      {sections.map((sec, si) => sec.blocks.map((b, bi) => <div key={`${si}-${bi}`} data-b={`${si}-${bi}`}><BlockView block={b} n={si + bi} color={color} /></div>))}
                      <div data-end />
                    </PageFrame>
                  </div>
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
    const contents = leaves.map((l, i) => ({ l, i })).filter((x) => x.l.kind === 'page' && !x.l.cont)
    return (
      <div className="flex h-full flex-col overflow-hidden p-6 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color }}>Ünite rehberi</p>
        <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">{leaf.heading}</h2>
        {unit?.description && <p className="mt-2 text-[15px] opacity-70">{unit.description}</p>}
        <div className="my-5 flex items-end gap-3 [@media(max-height:760px)]:hidden">
          <motion.img src={higoImg('read')} alt="" className="w-24 shrink-0 drop-shadow sm:w-28" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} />
          <Bubble color={color}>Bu ünitede sana ben rehberlik edeceğim. Sayfaları çevir, ipuçlarımı oku, sonra derse hazırsın!</Bubble>
        </div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] opacity-50">İçindekiler</p>
        <ol className="space-y-0.5 [@media(max-height:760px)]:mt-3">
          {contents.map(({ l, i }, k) => (
            <li key={i}>
              <button onClick={() => goTo(i)} className="flex w-full items-baseline gap-2 rounded-lg px-1 py-1 text-left text-[15px] hover:bg-black/[.04] [@media(max-height:700px)]:py-0.5">
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
    <PageFrame n={n}>
      {leaf.cont && leaf.heading && <div className="flow-root"><ContHeading text={leaf.heading} color={color} /></div>}
      {leaf.blocks?.map((b, i) => <div key={i}><BlockView block={b} n={n + i} color={color} /></div>)}
    </PageFrame>
  )
}

/** The page shell: a fixed body that never scrolls, and the page number at the foot. */
function PageFrame({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div data-body className="min-h-0 flex-1 overflow-hidden px-6 pb-3 pt-7 sm:px-9 [&_h3]:font-display [&_h3]:text-[1.6rem] [&_h3]:leading-tight [&_table]:bg-white/60 [&_td]:align-top [&_em]:text-[inherit] [&_em]:font-semibold [&_em]:italic [&_em]:opacity-80 [&_blockquote]:my-1 [&_blockquote]:border-l-[3px] [&_blockquote]:font-sans [&_blockquote]:text-[15px] [&_blockquote]:font-semibold [&_blockquote]:leading-snug [&_table]:text-[13.5px] sm:[&_table]:text-sm">
        {children}
      </div>
      <p className="shrink-0 pb-3 text-center font-mono text-xs opacity-40">{n + 1}</p>
    </div>
  )
}

/** A page that carries on a section from the page before. */
function ContHeading({ text, color }: { text: string; color: string }) {
  return <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color }}>{text} · devam</p>
}

function BlockView({ block, n, color }: { block: Block; n: number; color: string }) {
  if (block.kind === 'tip') {
    return (
      <div className="mt-4 flex items-end gap-2">
        <img src={higoImg(POSES[n % POSES.length])} alt="" className="size-14 shrink-0 object-contain drop-shadow" />
        <Bubble color={color}><span className="mb-0.5 block text-[10px] font-black uppercase tracking-[0.18em]" style={{ color }}>Higo'nun ipucu</span><span className="block [&_p]:m-0 [&_p]:text-sm [&_p]:leading-snug"><Markdown source={block.text} /></span></Bubble>
      </div>
    )
  }
  return <Markdown source={block.src} />
}

function Bubble({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div className="relative rounded-2xl rounded-bl-md border-2 bg-white px-3.5 py-2.5 text-sm font-semibold leading-snug" style={{ borderColor: `color-mix(in oklab, ${color} 35%, transparent)` }}>
      {children}
    </div>
  )
}
