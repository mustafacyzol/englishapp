import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, BookOpen, BookText, Check, ChevronDown, ClipboardCheck, Dumbbell, Flame, Gamepad2, Headphones, Lock, MapPin, MessageCircle, Mic, PenLine, Play, RotateCcw, School, Star, Trophy } from 'lucide-react'
import { rewardImg, unitImg } from '@/lib/assets'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SKILL_LABEL } from '@/lib/format'
import type { PathLesson, PathUnit, SkillKey } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Modal, SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'
import { higoImg, type HigoPose } from '@/components/game/Higo'
import { Guidebook } from '@/components/game/Guidebook'

type Access = 'review' | 'current' | 'locked'
interface PathData {
  course: { id: number; title: string; cefr_level: string; color: string; description: string; access?: Access }
  courses?: { id: number; title: string; cefr_level: string; access: Access }[]
  units: PathUnit[]
  track?: { key: 'grade' | 'exam' | 'general'; label: string; exam: string | null; grade: number | null; grade_track: string | null }
  /** remembered mistakes due on the review stops */
  mistakes_due?: number
}
/** How many remembered mistakes wait for the review stops (shown under them). */
const DueCtx = createContext<{ due: number; at: number | null }>({ due: 0, at: null })
interface CourseItem { id: number; title: string; cefr_level: string; color: string }
export interface PlanItem { skill: SkillKey; title: string; detail: string; to: string; minutes: number; done: boolean; focus: boolean; weakest: boolean }
interface Stats { total: number; done: number; pct: number; cur?: { l: PathLesson; u: PathUnit }; unitIndex: number; unitDone: number }

const SKILL_ICON = { reading: BookOpen, listening: Headphones, speaking: Mic, writing: PenLine, vocabulary: Star, grammar: BookText, mixed: Dumbbell }
const KIND_LABEL: Record<string, string> = { story: 'Hikâye ödevi', ai_talk: 'Defne ile konuşma', checkpoint: 'Seviye sınavı', words: 'Kelime seti ödevi', review: 'Kişisel tekrar', quiz: 'Ünite sınavı' }
/** Lessons that cost hearts when answered wrong. */
const HEART_KINDS = ['lesson', 'checkpoint', 'quiz', 'review']

/** Where a path node takes you (the AI talk is started from the node card). */
export const nodeHref = (l: PathLesson) => (l.kind === 'story' && l.story ? `/stories/${l.story.slug}?lesson=${l.id}` : l.kind === 'words' ? `/practice?game=${l.meta?.game ?? 'match'}&lesson=${l.id}` : l.kind === 'ai_talk' ? null : `/lesson/${l.id}`)

/** Horizontal offset of node i, a gentle S-curve so the path reads as a route. */
const wave = (i: number) => Math.round(Math.sin(i * 0.95) * 64)
const NODE = 72
const GAP = 44
const courseOffset = (lvl: string) => ({ A1: 0, A2: 3, B1: 5 } as Record<string, number>)[lvl] ?? 0

export default function Learn() {
  const [courseId, setCourseId] = useState<number | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['path', courseId], queryFn: () => get<PathData>(`/path${courseId ? `/${courseId}` : ''}`) })
  const dueAt = useMemo(() => {
    const open = (data?.units ?? []).flatMap((u) => u.lessons).filter((l) => l.kind === 'review' && l.state !== 'locked')
    return { due: data?.mistakes_due ?? 0, at: open.length ? open[open.length - 1].id : null }
  }, [data])
  const courses = useQuery({ queryKey: ['courses'], queryFn: () => get<{ data: CourseItem[] }>('/courses') })
  const [picker, setPicker] = useState(false)
  const [guide, setGuide] = useState<PathUnit | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const currentRef = useRef<HTMLDivElement | null>(null)
  const [currentVisible, setCurrentVisible] = useState(true)
  const [curAbove, setCurAbove] = useState(false)

  const stats = useMemo<Stats | null>(() => {
    if (!data) return null
    const all = data.units.flatMap((u) => u.lessons.map((l) => ({ l, u })))
    const done = all.filter((x) => x.l.state === 'completed').length
    const cur = all.find((x) => x.l.state === 'current')
    return {
      total: all.length,
      done,
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
      cur,
      unitIndex: cur ? data.units.findIndex((u) => u.id === cur.u.id) : -1,
      unitDone: cur ? cur.u.lessons.filter((l) => l.state === 'completed').length : 0,
    }
  }, [data])

  // Show a "back to where you are" button whenever the current stop scrolls out of view.
  useEffect(() => {
    const el = currentRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { setCurrentVisible(e.isIntersecting); setCurAbove(e.boundingClientRect.top < 0) }, { rootMargin: '-80px 0px -80px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [data])

  // An open stop card closes on a tap anywhere else, and once the page has scrolled on:
  // it never rides along over the pinned "where you left off" bar.
  useEffect(() => {
    if (openId == null) return
    const opened = Date.now()
    let base: number | null = null
    const down = (e: PointerEvent) => { if (!(e.target as Element | null)?.closest?.(`[data-node="${openId}"]`)) setOpenId(null) }
    const scroll = () => {
      if (Date.now() - opened < 700) return // the card scrolling itself into view
      base ??= window.scrollY
      if (Math.abs(window.scrollY - base) > 120) setOpenId(null)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null) }
    document.addEventListener('pointerdown', down)
    window.addEventListener('scroll', scroll, { passive: true })
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('scroll', scroll); document.removeEventListener('keydown', key) }
  }, [openId])

  if (isLoading || !data || !stats) return <SkeletonPage variant="path" />
  const jump = () => currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <div className="mx-auto max-w-2xl">
      {/* The "where you left off" bar stays pinned under the header instead of popping in:
          when your stop scrolls away it simply shows which way it is. */}
      <div className="sticky top-[66px] z-[25] -mx-1 px-1 pb-2 pt-2">
        <ContinueCard data={data} stats={stats} onJump={jump} onPick={() => setPicker(true)} away={!currentVisible ? (curAbove ? 'up' : 'down') : null} />
      </div>

      <div className="mt-8">
        {data.units.map((unit, ui) => (
          <div key={unit.id}>
            <DueCtx.Provider value={dueAt}><UnitSection unit={unit} index={ui} photoIndex={courseOffset(data.course.cefr_level) + ui} onGuide={() => setGuide(unit)} openId={openId} setOpenId={setOpenId} currentRef={currentRef} /></DueCtx.Provider>
          </div>
        ))}
      </div>


      <div className="my-16 flex flex-col items-center gap-3 text-center">
        <Img src={rewardImg('crown')} alt="" className={clsx('size-24 object-contain', stats.pct < 100 && 'opacity-50 grayscale')} />
        <p className="text-xl font-black">{data.course.title} bitiş çizgisi</p>
        <p className="max-w-xs text-sm text-ink-soft">{stats.total - stats.done > 0 ? `${stats.total - stats.done} durak kaldı. Her gün bir adım yeter.` : 'Bu kursu bitirdin! Bir üst seviyeye geçmeye hazırsın.'}</p>
      </div>


      <Modal open={picker} onClose={() => setPicker(false)}>
        <h2 className="text-2xl font-extrabold">Seviyeler</h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Kendi seviyende ilerlersin, alttakileri istediğin zaman tekrar edebilirsin. Üst seviye, seviyeni bitirince ya da seviye testiyle açılır.</p>
        <div className="grid gap-3">
          {(data.courses ?? courses.data?.data.map((c) => ({ ...c, access: 'current' as Access })) ?? []).map((c) => {
            const color = courses.data?.data.find((x) => x.id === c.id)?.color ?? '#999'
            const locked = c.access === 'locked'
            return (
              <button key={c.id} disabled={locked} onClick={() => { setCourseId(c.id); setPicker(false) }} className={clsx('flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition', c.id === data.course.id ? 'border-flame/50 bg-flame/5' : 'border-line bg-card', locked ? 'cursor-not-allowed opacity-60' : 'press hover:border-ink/25')}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl font-black text-white" style={{ background: locked ? 'var(--ink-soft)' : color }}>{locked ? <Lock className="size-5" /> : c.cefr_level}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-black">{c.title}</span>
                  <span className="block text-xs font-bold text-ink-soft">{c.access === 'current' ? 'Senin seviyen' : c.access === 'review' ? 'Tekrar için açık' : 'Seviyeni bitirince açılır'}</span>
                </span>
              </button>
            )
          })}
        </div>
        <Link to="/placement" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-paper-2 p-3 text-sm font-extrabold hover:bg-ink/[0.06]">Seviyemi yeniden ölç: seviye testi</Link>
      </Modal>

      <Guidebook unit={guide ? { id: guide.id, title: guide.title, color: guide.color ?? undefined, description: guide.description } : null} onClose={() => setGuide(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ Resume */

function ContinueCard({ data, stats, onJump, onPick, away }: { data: PathData; stats: Stats; onJump: () => void; onPick: () => void; away: 'up' | 'down' | null }) {
  const nav = useNavigate()
  const cur = stats.cur
  const unit = cur?.u
  const unitColor = unit?.color ?? data.course.color
  const R = 15
  const C = 2 * Math.PI * R
  const go = () => { const href = cur ? nodeHref(cur.l) : null; if (href) nav(href); else onJump() }
  return (
    <section className="flex items-center gap-3 rounded-2xl border-2 border-line bg-card/95 p-2.5 pr-3 shadow-[0_8px_24px_-16px_rgba(31,36,51,.35)] backdrop-blur sm:gap-4 sm:p-3 sm:pr-4">
      <button onClick={onPick} title="Kurs değiştir" className="flex shrink-0 items-center gap-1 rounded-xl py-1 pl-1 pr-1.5 hover:bg-paper-2">
        <span className="grid size-10 place-items-center rounded-xl text-sm font-black text-white" style={{ background: data.course.color }}>{data.course.cefr_level}</span>
        <ChevronDown className="size-4 text-ink-soft" />
      </button>

      {cur && unit ? (
        <button onClick={onJump} className="min-w-0 flex-1 text-left" title="Yolda göster">
          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-flame">
            {away ? (away === 'up' ? <ArrowUp className="size-3" strokeWidth={3} /> : <ArrowDown className="size-3" strokeWidth={3} />) : <MapPin className="size-3" />}
            {away ? 'Kaldığın yere git' : 'Kaldığın yer'}
          </span>
          <span className="block truncate font-display text-[17px] font-black leading-tight">{cur.l.title}</span>
          <span className="mt-1 flex items-center gap-2">
            <span className="flex gap-0.5" aria-hidden>
              {unit.lessons.map((l) => (
                <span key={l.id} className={clsx('h-1.5 w-4 rounded-full sm:w-5', l.state !== 'completed' && l.state !== 'current' && 'bg-ink/15 dark:bg-white/20')} style={l.state === 'completed' ? { background: unitColor } : l.state === 'current' ? { background: `color-mix(in oklab, ${unitColor} 40%, transparent)` } : undefined} />
              ))}
            </span>
            <span className="truncate text-xs font-bold text-ink-soft">Ünite {stats.unitIndex + 1} · {stats.unitDone}/{unit.lessons.length}</span>
          </span>
        </button>
      ) : (
        <p className="min-w-0 flex-1 truncate font-display font-black">{data.course.title} tamamlandı</p>
      )}

      <div className="relative hidden size-10 shrink-0 sm:block" title={`Kurs ilerlemesi: ${stats.done}/${stats.total}`}>
        <svg viewBox="0 0 36 36" className="size-10 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r={R} fill="none" stroke="var(--paper-2)" strokeWidth="4" />
          <motion.circle cx="18" cy="18" r={R} fill="none" stroke={data.course.color} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - stats.pct / 100) }} transition={{ duration: 1 }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[10px] font-black tabular-nums">%{stats.pct}</span>
      </div>

      {cur ? (
        <button onClick={go} className="press flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-flame px-3.5 font-display text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_3px_0_0_var(--color-flame-deep)] sm:px-4">
          <Play className="size-4 fill-current" /> <span className="hidden min-[400px]:inline">Devam</span>
        </button>
      ) : (
        <Button size="sm" onClick={onPick}>Sonraki kurs</Button>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------- Path */

/**
 * Higo walks the road with you: he sits in the free space beside the trail, on
 * the side the stop's label doesn't use, in a different pose each time.
 */
const SIDE_POSES: HigoPose[] = ['skate', 'books', 'kite', 'map', 'tea', 'dance', 'balloon', 'scope', 'read', 'walk', 'thumbs', 'nap']

function SideHigo({ pose, x, y, side }: { pose: HigoPose; x: number; y: number; side: 'left' | 'right' }) {
  // Positioned by a plain wrapper: the entrance animation lives on the inner element, so it can
  // never overwrite the offset (that is what used to drop Higo into the middle of the trail).
  // He sits on the outer side of a far-swinging stop, where no label goes, and shrinks to the room left.
  const gap = Math.abs(x) + NODE / 2 + 18
  const pos: React.CSSProperties = side === 'right'
    ? { left: `calc(50% + ${gap}px)`, width: `min(96px, calc(50% - ${gap}px))` }
    : { right: `calc(50% + ${gap}px)`, width: `min(96px, calc(50% - ${gap}px))` }
  return (
    <div aria-hidden className="pointer-events-none absolute z-[5]" style={{ top: y, ...pos }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 12 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        className={clsx('flex flex-col', side === 'right' ? 'items-start' : 'items-end')}
      >
        <motion.img src={higoImg(pose)} alt="" className="w-full max-w-[96px] drop-shadow-[0_10px_12px_rgba(31,36,51,.22)]" style={{ transform: side === 'left' ? 'scaleX(-1)' : undefined }} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }} />
      </motion.div>
    </div>
  )
}

function UnitSection({ unit, index, photoIndex, onGuide, openId, setOpenId, currentRef }: { unit: PathUnit; index: number; photoIndex: number; onGuide: () => void; openId: number | null; setOpenId: (v: number | null) => void; currentRef: MutableRefObject<HTMLDivElement | null> }) {
  const color = unit.color ?? '#e8403a'
  const done = unit.progress >= 100
  const count = unit.lessons.length
  // Path geometry: node centres, then a smooth curve between each pair.
  const pts = unit.lessons.map((_, i) => ({ x: wave(i), y: i * (NODE + GAP) + NODE / 2 }))
  const endY = count * (NODE + GAP) + 30
  const lastDone = unit.lessons.reduce((acc, l, i) => (l.state === 'completed' ? i : acc), -1)
  // one Higo by a far-swinging stop in the middle of the unit, a second one on long units
  const swing = pts.map((p, i) => ({ i, d: Math.abs(p.x) })).filter((p) => p.d >= 50)
  // one Higo per third of a long unit (two on shorter ones), each in a different pose
  const parts = count >= 9 ? 3 : count >= 5 ? 2 : 1
  const picks = Array.from({ length: parts }, (_, k) => swing.find((p) => p.i >= Math.floor((k * count) / parts) && p.i < Math.floor(((k + 1) * count) / parts)))
  const higoSpots = picks.filter((p, k, a): p is { i: number; d: number } => !!p && a.findIndex((q) => q?.i === p.i) === k).map((p, k) => ({ i: p.i, pose: SIDE_POSES[(index * 3 + k) % SIDE_POSES.length] }))
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => `M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`

  return (
    <section className="mb-14">
      <div className="relative mb-10 overflow-hidden rounded-3xl text-white" style={{ background: color }}>
        <div className="flex items-stretch">
          <div className="min-w-0 flex-1 p-5 sm:p-6">
            <p className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] opacity-85">Ünite {index + 1} {done && <span className="rounded bg-white/25 px-1.5 py-0.5 tracking-normal">Tamamlandı</span>}</p>
            {unit.grade && <p className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-black/15 px-2.5 py-0.5 text-[11px] font-extrabold" title="Ders kitabındaki ünite">{unit.grade.label}{unit.grade.title_tr ? ` · ${unit.grade.title_tr}` : ''}</p>}
            <h2 className="text-2xl leading-tight">{unit.title}</h2>
            <p className="mt-1 font-semibold opacity-90">{unit.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {unit.has_guidebook && (
                <button onClick={onGuide} className="press flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-sm font-extrabold uppercase tracking-wide hover:bg-white/30">
                  <BookText className="size-4" /> Rehber
                </button>
              )}
              <div className="flex min-w-32 flex-1 items-center gap-2">
                <div className="h-2.5 max-w-44 flex-1 overflow-hidden rounded-full bg-black/20"><div className="h-full rounded-full bg-white" style={{ width: `${unit.progress}%` }} /></div>
                <span className="text-sm font-black tabular-nums">%{unit.progress}</span>
              </div>
            </div>
          </div>
          <Img src={unitImg(photoIndex)} alt="" loading="lazy" className="hidden w-40 object-cover sm:block" />
        </div>
      </div>

      <div className="relative" style={{ height: endY + 64 }}>
        {/* the trail: the walked part in the unit colour, the road ahead a quiet dotted guide */}
        <svg className="pointer-events-none absolute left-1/2 top-0 overflow-visible" width="1" height={endY} aria-hidden>
          {pts.slice(0, -1).map((p, i) => {
            const walked = i < lastDone
            return <path key={i} d={seg(p, pts[i + 1])} fill="none" stroke={walked ? color : 'var(--line)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={walked ? undefined : '0.5 13'} />
          })}
          {pts.length > 0 && <path d={seg(pts[pts.length - 1], { x: 0, y: endY })} fill="none" stroke={done ? color : 'var(--line)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={done ? undefined : '0.5 13'} />}
        </svg>

        {unit.lessons.map((l, i) => (
          <LessonNode key={l.id} lesson={l} index={i} x={pts[i].x} y={pts[i].y - NODE / 2} color={color} open={openId === l.id} setOpenId={setOpenId} nodeRef={l.state === 'current' ? currentRef : undefined} />
        ))}

        {/* Higo beside the trail: by the stops that swing furthest out, on their free side */}
        {higoSpots.map(({ i, pose }) => (
          <SideHigo key={i} pose={pose} x={pts[i].x} y={pts[i].y - NODE / 2 - 10} side={pts[i].x > 0 ? 'right' : 'left'} />
        ))}

        {/* unit trophy, the visible finish line of this unit */}
        <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center" style={{ top: endY - 34 }}>
          <span className={clsx('grid size-[68px] place-items-center rounded-full border-4 bg-card', done ? 'border-butter' : 'border-line')}>
            <Img src={rewardImg('trophy')} alt="" className={clsx('size-11 object-contain', !done && 'opacity-50 grayscale')} />
          </span>
          <span className={clsx('mt-2 rounded-full px-2.5 py-0.5 text-xs font-extrabold', done ? 'bg-butter/25 text-butter-deep' : 'bg-paper-2 text-ink-soft')}>Ünite {index + 1} kupası</span>
        </div>
      </div>
    </section>
  )
}

function LessonNode({ lesson, index, x, y, color, open, setOpenId, nodeRef }: { lesson: PathLesson; index: number; x: number; y: number; color: string; open: boolean; setOpenId: (v: number | null) => void; nodeRef?: MutableRefObject<HTMLDivElement | null> }) {
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const popRef = useRef<HTMLDivElement>(null)
  const locked = lesson.state === 'locked'
  const done = lesson.state === 'completed'
  const current = lesson.state === 'current'
  // open: reachable (the start of a topic, or opened by the placement test) but not where you are
  const ajar = lesson.state === 'open'
  const Icon = lesson.kind === 'story' ? BookOpen : lesson.kind === 'ai_talk' ? MessageCircle : lesson.kind === 'checkpoint' ? Trophy : lesson.kind === 'quiz' ? ClipboardCheck : lesson.kind === 'words' ? Gamepad2 : lesson.kind === 'review' ? RotateCcw : lesson.meta?.track ? School : SKILL_ICON[lesson.skill] ?? Star
  const size = current ? NODE + 12 : NODE
  // Labels sit on the open side of the curve, so they never collide with the trail.
  const labelLeft = x > 8
  const kind = lesson.meta?.track ? 'Sınıfının ünitesi' : KIND_LABEL[lesson.kind] ?? SKILL_LABEL[lesson.skill]
  const dueCtx = useContext(DueCtx)
  // the waiting mistakes are pointed out on one stop only: the furthest review stop you can open
  const due = dueCtx.at === lesson.id ? dueCtx.due : 0

  const startAi = useMutation({
    mutationFn: () => post<{ conversation: { id: number } }>('/ai/conversations', { mode: 'roleplay', scenario_key: lesson.scenario_key }),
    onSuccess: (r) => nav(`/ai/${r.conversation.id}?lesson=${lesson.id}&call=1`),
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const start = () => {
    if (lesson.premium_locked) return nav('/premium')
    if (lesson.kind === 'ai_talk') return startAi.mutate()
    if (HEART_KINDS.includes(lesson.kind) && !user?.hearts.unlimited && (user?.hearts.hearts ?? 0) <= 0) return toast('Canın kalmadı! Pratik yaparak ya da mağazadan can kazanabilirsin.', 'error')
    nav(nodeHref(lesson)!)
  }

  // Keep the opened card in view, it can open near the bottom of the screen.
  useEffect(() => {
    if (open) setTimeout(() => popRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
  }, [open])

  const base = locked ? 'color-mix(in oklab, var(--line) 70%, #000 12%)' : `color-mix(in oklab, ${color} 66%, #000)`

  return (
    // The open node is lifted above its siblings (its card is never painted over by later stops)
    // but stays under the pinned continue bar (z-25), so scrolling slides the card beneath it.
    <div ref={nodeRef} data-node={lesson.id} data-tour={current ? 'here' : undefined} className={clsx('absolute left-1/2', open ? 'z-[24]' : current ? 'z-20' : 'z-10')} style={{ top: y - (current ? 6 : 0), transform: `translateX(calc(-50% + ${x}px))`, width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        {current && (
          // where you are: a slowly turning dashed orbit centred on the button face, a soft glow, Higo perched on top
          <span aria-hidden className="pointer-events-none absolute -inset-[14px] translate-y-[3px]">
            <motion.span className="absolute inset-1 rounded-full" style={{ background: `radial-gradient(circle, color-mix(in oklab, ${color} 30%, transparent) 40%, transparent 72%)` }} animate={{ opacity: [0.55, 1, 0.55] }} transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }} />
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full origin-center animate-[spin_16s_linear_infinite] [transform-box:fill-box]">
              <circle cx="50" cy="50" r="48" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" pathLength={100} strokeDasharray="2.5 2.5" opacity=".85" />
            </svg>
          </span>
        )}
      <motion.button
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: Math.min(index, 6) * 0.03 }}
        onClick={() => (locked ? toast('Bir konunun ortasına atlanamaz. Önceki dersi bitir ya da ünitenin ilk dersinden başla.') : setOpenId(open ? null : lesson.id))}
        aria-label={`${lesson.title}${locked ? ' (kilitli)' : done ? ' (tamamlandı)' : ''}`}
        aria-expanded={open}
        className={clsx('relative grid place-items-center rounded-full transition-transform active:translate-y-[5px]', locked ? 'text-ink-soft' : ajar ? '' : 'text-white')}
        style={{ width: size, height: size, background: locked ? 'var(--paper-2)' : ajar ? 'var(--card)' : color, color: ajar ? color : undefined, boxShadow: ajar ? `inset 0 0 0 4px ${color}, 0 6px 0 0 ${base}` : `0 6px 0 0 ${base}` }}
      >
        {done && <span className="absolute inset-1.5 rounded-full border-2 border-white/35" />}
        {locked ? <Lock className="size-6" /> : done ? <Check className="size-8" strokeWidth={3.5} /> : <Icon className={current ? 'size-9' : 'size-7'} strokeWidth={2.5} />}
        {lesson.is_premium && !done && <Img src={rewardImg('crown')} alt="Premium" className="absolute -right-2 -top-2 size-7 object-contain drop-shadow" />}
        {done && lesson.crowns > 0 && (
          <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full bg-card px-1.5 py-0.5 shadow-hard-sm">
            {Array.from({ length: Math.min(3, lesson.crowns) }, (_, k) => <Img key={k} src={rewardImg('star')} alt="" className="size-3" />)}
          </span>
        )}
      </motion.button>
      </div>

      <p className={clsx('absolute top-1/2 w-max max-w-[118px] -translate-y-1/2 text-xs font-extrabold leading-tight sm:max-w-[168px] sm:text-[13px]', labelLeft ? 'right-[calc(100%+14px)] text-right' : 'left-[calc(100%+14px)]', locked ? 'text-ink-soft/70' : 'text-ink')}>
        <span className="block text-[10px] font-black uppercase tracking-wider" style={{ color: locked ? undefined : color }}>{current ? 'Kaldığın yer' : ajar ? 'Buradan başlayabilirsin' : kind}</span>
        {lesson.title}
        {lesson.kind === 'review' && due > 0 && !locked && <span className="mt-0.5 block text-[11px] font-black text-berry">{due} hata seni bekliyor</span>}
      </p>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute top-[calc(100%+16px)] z-50 w-[min(288px,calc(100vw-40px))]"
            // centred on the path rather than on the offset node, so it never runs off-screen
            style={{ left: `calc(50% - ${x}px)`, translate: '-50% 0' }}
          >
            <div className="rounded-2xl border-2 border-line bg-card p-4 text-left shadow-soft">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color }}>{kind}</p>
              <h3 className="mb-1 text-xl leading-tight">{lesson.title}</h3>
              <p className="mb-4 flex items-center gap-2 text-sm text-ink-soft">
                {done ? <>En iyi skor %{lesson.best_score} · tekrar et, yıldız topla</> : <><Flame className="size-4 text-flame" /> +{lesson.xp_reward} XP</>}
              </p>
              <Button block onClick={start} loading={startAi.isPending} variant={lesson.premium_locked ? 'butter' : done ? 'secondary' : 'primary'}>
                {lesson.premium_locked ? 'Premium ile aç' : done ? 'Tekrar et' : 'Başla'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
