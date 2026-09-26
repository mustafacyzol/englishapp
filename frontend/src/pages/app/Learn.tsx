import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowDown, ArrowRight, BookOpen, BookText, Check, ChevronDown, Dumbbell, Flame, Headphones, Lock, MapPin, MessageCircle, Mic, PenLine, Play, Star, Trophy } from 'lucide-react'
import { rewardImg, unitImg } from '@/lib/assets'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SKILL_LABEL } from '@/lib/format'
import { Markdown } from '@/lib/markdown'
import { SKILL } from '@/lib/skills'
import type { PathLesson, PathUnit, SkillKey } from '@/lib/types'
import type { Dashboard } from '@/layouts/SideRail'
import { Button } from '@/components/ui/Button'
import { Modal, SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

interface PathData {
  course: { id: number; title: string; cefr_level: string; color: string; description: string }
  units: PathUnit[]
}
interface CourseItem { id: number; title: string; cefr_level: string; color: string }
export interface PlanItem { skill: SkillKey; title: string; detail: string; to: string; minutes: number; done: boolean; focus: boolean; weakest: boolean }
interface Stats { total: number; done: number; pct: number; cur?: { l: PathLesson; u: PathUnit }; unitIndex: number; unitDone: number }

const SKILL_ICON = { reading: BookOpen, listening: Headphones, speaking: Mic, writing: PenLine, vocabulary: Star, grammar: BookText, mixed: Dumbbell }
const KIND_LABEL: Record<string, string> = { story: 'Hikâye', ai_talk: 'Defne ile konuşma', checkpoint: 'Kontrol noktası' }

/** Horizontal offset of node i — a gentle S-curve so the path reads as a route. */
const wave = (i: number) => Math.round(Math.sin(i * 0.95) * 64)
const NODE = 72
const GAP = 44
const courseOffset = (lvl: string) => ({ A1: 0, A2: 3, B1: 5 } as Record<string, number>)[lvl] ?? 0

export default function Learn() {
  const [courseId, setCourseId] = useState<number | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['path', courseId], queryFn: () => get<PathData>(`/path${courseId ? `/${courseId}` : ''}`) })
  const courses = useQuery({ queryKey: ['courses'], queryFn: () => get<{ data: CourseItem[] }>('/courses') })
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard') })
  const [picker, setPicker] = useState(false)
  const [guide, setGuide] = useState<PathUnit | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const currentRef = useRef<HTMLDivElement | null>(null)
  const [currentVisible, setCurrentVisible] = useState(true)

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
    const io = new IntersectionObserver(([e]) => setCurrentVisible(e.isIntersecting), { rootMargin: '-80px 0px -80px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [data])

  if (isLoading || !data || !stats) return <SkeletonPage variant="path" />
  const jump = () => currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <div className="mx-auto max-w-2xl">
      <ContinueCard data={data} stats={stats} onJump={jump} onPick={() => setPicker(true)} />
      {dash.data && <TodayStrip dash={dash.data} />}

      <div className="mt-10">
        {data.units.map((unit, ui) => (
          <UnitSection key={unit.id} unit={unit} index={ui} photoIndex={courseOffset(data.course.cefr_level) + ui} onGuide={() => setGuide(unit)} openId={openId} setOpenId={setOpenId} currentRef={currentRef} />
        ))}
      </div>

      <div className="my-16 flex flex-col items-center gap-3 text-center">
        <Img src={rewardImg('crown')} alt="" className={clsx('size-24 object-contain', stats.pct < 100 && 'opacity-50 grayscale')} />
        <p className="text-xl font-black">{data.course.title} bitiş çizgisi</p>
        <p className="max-w-xs text-sm text-ink-soft">{stats.total - stats.done > 0 ? `${stats.total - stats.done} durak kaldı. Her gün bir adım yeter.` : 'Bu kursu bitirdin! Bir üst seviyeye geçmeye hazırsın.'}</p>
      </div>

      <AnimatePresence>
        {!currentVisible && stats.cur && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={jump}
            className="press fixed bottom-28 right-4 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-extrabold text-paper shadow-soft lg:bottom-8 lg:right-8 xl:right-[calc(20rem+4rem)]"
          >
            <MapPin className="size-4" /> Kaldığın yere dön
          </motion.button>
        )}
      </AnimatePresence>

      <Modal open={picker} onClose={() => setPicker(false)}>
        <h2 className="mb-4 text-2xl font-extrabold">Kurs seç</h2>
        <div className="grid gap-3">
          {courses.data?.data.map((c) => (
            <button key={c.id} onClick={() => { setCourseId(c.id); setPicker(false) }} className={clsx('press flex items-center gap-3 rounded-2xl border-2 p-3 text-left shadow-hard', c.id === data.course.id ? 'border-flame/50 bg-flame/5' : 'border-line bg-card')}>
              <span className="grid size-11 place-items-center rounded-xl font-black text-white" style={{ background: c.color }}>{c.cefr_level}</span>
              <span className="text-lg font-black">{c.title}</span>
            </button>
          ))}
        </div>
      </Modal>

      <GuidebookModal unit={guide} onClose={() => setGuide(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ Resume */

function ContinueCard({ data, stats, onJump, onPick }: { data: PathData; stats: Stats; onJump: () => void; onPick: () => void }) {
  const nav = useNavigate()
  const cur = stats.cur
  const unit = cur?.u
  const unitColor = unit?.color ?? data.course.color
  const R = 30
  const C = 2 * Math.PI * R
  const left = unit ? unit.lessons.length - stats.unitDone : 0
  return (
    <section className="overflow-hidden rounded-[28px] border-2 border-line bg-card">
      <div className="flex items-center gap-3 border-b-2 border-line px-4 py-3 sm:px-5">
        <button onClick={onPick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white" style={{ background: data.course.color }}>{data.course.cefr_level}</span>
          <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">Kursun</span>
            <span className="flex items-center gap-1 truncate font-display text-lg font-black">{data.course.title} <ChevronDown className="size-4 shrink-0 text-ink-soft" /></span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="font-display text-lg font-black tabular-nums">{stats.done}/{stats.total}</p>
            <p className="text-[11px] font-bold text-ink-soft">durak tamam</p>
          </div>
          <div className="relative size-14">
            <svg viewBox="0 0 72 72" className="size-14 -rotate-90" aria-hidden>
              <circle cx="36" cy="36" r={R} fill="none" stroke="var(--paper-2)" strokeWidth="8" />
              <motion.circle cx="36" cy="36" r={R} fill="none" stroke={data.course.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - stats.pct / 100) }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-display text-sm font-black tabular-nums" aria-label={`Kurs ilerlemesi yüzde ${stats.pct}`}>%{stats.pct}</span>
          </div>
        </div>
      </div>

      {cur && unit ? (
        <div className="grid sm:grid-cols-[1fr_200px]">
          <div className="p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-flame"><MapPin className="size-3.5" /> Kaldığın yer</p>
            <h2 className="mt-1.5 text-2xl leading-tight sm:text-3xl">{cur.l.title}</h2>
            <p className="mt-1 text-sm font-semibold text-ink-soft">Ünite {stats.unitIndex + 1} · {unit.title} — {stats.unitDone}/{unit.lessons.length} durak</p>
            {/* goal-gradient: this unit's stops, so the finish always looks close */}
            <div className="mt-4 flex gap-1" aria-hidden>
              {unit.lessons.map((l) => (
                <span
                  key={l.id}
                  className={clsx('h-2 flex-1 rounded-full', l.state === 'locked' && 'bg-paper-2', l.state === 'current' && 'animate-pulse')}
                  style={l.state === 'completed' ? { background: unitColor } : l.state === 'current' ? { background: `color-mix(in oklab, ${unitColor} 45%, transparent)` } : undefined}
                />
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-ink-soft">{left <= 1 ? 'Bu durak üniteyi bitiriyor!' : `Ünite kupasına ${left} durak`}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="lg" icon={<Play className="size-5 fill-current" />} onClick={() => (cur.l.kind === 'lesson' || cur.l.kind === 'checkpoint' ? nav(`/lesson/${cur.l.id}`) : onJump())}>Devam et</Button>
              <Button size="lg" variant="ghost" onClick={onJump} icon={<ArrowDown className="size-5" />}>Yolda göster</Button>
            </div>
          </div>
          <Img src={unitImg(courseOffset(data.course.cefr_level) + stats.unitIndex)} alt="" className="hidden h-full w-full object-cover sm:block" />
        </div>
      ) : (
        <div className="p-6 text-center">
          <Img src={rewardImg('trophy')} alt="" className="mx-auto size-20 object-contain" />
          <p className="mt-2 text-xl font-black">Bu kursu tamamladın!</p>
          <Button className="mt-4" onClick={onPick}>Sonraki kursu seç</Button>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------- Today */

function TodayStrip({ dash }: { dash: Dashboard }) {
  const { user } = useAuth()
  const plan = dash.plan ?? []
  const doneCount = plan.filter((p) => p.done).length
  const streak = user?.stats.streak ?? 0
  const left = Math.max(0, dash.today.goal - dash.today.xp)
  return (
    <section className="mt-6 space-y-4">
      {/* loss aversion, gently: only when there's a streak to protect and today isn't done yet */}
      {streak > 0 && !dash.today.goal_met && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-flame/25 bg-flame/6 px-4 py-3">
          <Img src={rewardImg('flame')} alt="" className="size-10 shrink-0 object-contain" />
          <p className="min-w-0 flex-1 text-sm font-bold">
            <span className="text-flame">{streak} günlük serin</span> bugün {left} XP bekliyor. Kısa bir ders yeter.
          </p>
        </div>
      )}

      {plan.length > 0 && (
        <div className="rounded-3xl border-2 border-line bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">Bugünün dört beceri planı</p>
              <p className="font-display text-lg font-black">{doneCount === plan.length ? 'Hepsi tamam — harikasın!' : `${doneCount}/${plan.length} tamam`}</p>
            </div>
            <div className="flex gap-1" aria-hidden>
              {plan.map((p) => <span key={p.skill} className={clsx('h-2 w-6 rounded-full', p.done ? SKILL[p.skill].bg : 'bg-paper-2')} />)}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {plan.map((p) => {
              const S = SKILL[p.skill]
              return (
                <Link key={p.skill} to={p.to} className={clsx('press group flex items-center gap-3 rounded-2xl border-2 p-3 transition', p.done ? 'border-transparent bg-paper-2/70' : 'border-line hover:border-ink/20')}>
                  <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl text-white', p.done ? 'bg-mint' : S.bg)}>
                    {p.done ? <Check className="size-6" strokeWidth={3} /> : <S.icon className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide">
                      <span className={S.text}>{S.label}</span>
                      {p.focus && !p.done && <span className="rounded bg-ink px-1 text-[9px] text-paper">odak</span>}
                      {p.weakest && !p.focus && !p.done && <span className="rounded bg-butter/40 px-1 text-[9px]">geride</span>}
                    </span>
                    <span className={clsx('block truncate font-bold leading-tight', p.done && 'text-ink-soft line-through')}>{p.title}</span>
                    <span className="block truncate text-xs text-ink-soft">{p.minutes} dk · {p.detail}</span>
                  </span>
                  {!p.done && <ArrowRight className="size-4 shrink-0 text-ink-soft transition group-hover:translate-x-0.5" />}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------- Path */

function GuidebookModal({ unit, onClose }: { unit: PathUnit | null; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['guide', unit?.id], queryFn: () => get<{ guidebook: string }>(`/units/${unit!.id}/guidebook`), enabled: !!unit })
  return (
    <Modal open={!!unit} onClose={onClose} className="sm:max-w-2xl">
      <p className="text-sm font-black uppercase tracking-widest text-flame">Ünite rehberi</p>
      <h2 className="mb-4 mt-1 text-3xl">{unit?.title}</h2>
      {data ? <Markdown source={data.guidebook ?? ''} /> : <SkeletonPage variant="path" />}
    </Modal>
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
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => `M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`

  return (
    <section className="mb-14">
      <div className="relative mb-10 overflow-hidden rounded-3xl text-white" style={{ background: color }}>
        <div className="flex items-stretch">
          <div className="min-w-0 flex-1 p-5 sm:p-6">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] opacity-85">Ünite {index + 1} {done && <span className="rounded bg-white/25 px-1.5 py-0.5 tracking-normal">Tamamlandı</span>}</p>
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

        {/* unit trophy — the visible finish line of this unit */}
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
  const Icon = lesson.kind === 'story' ? BookOpen : lesson.kind === 'ai_talk' ? MessageCircle : lesson.kind === 'checkpoint' ? Trophy : SKILL_ICON[lesson.skill] ?? Star
  const size = current ? NODE + 12 : NODE
  // Labels sit on the open side of the curve, so they never collide with the trail.
  const labelLeft = x > 8
  const kind = KIND_LABEL[lesson.kind] ?? SKILL_LABEL[lesson.skill]

  const startAi = useMutation({
    mutationFn: () => post<{ conversation: { id: number } }>('/ai/conversations', { mode: 'roleplay', scenario_key: lesson.scenario_key }),
    onSuccess: (r) => nav(`/ai/${r.conversation.id}?lesson=${lesson.id}&call=1`),
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const start = () => {
    if (lesson.premium_locked) return nav('/premium')
    if (lesson.kind === 'story' && lesson.story) return nav(`/stories/${lesson.story.slug}?lesson=${lesson.id}`)
    if (lesson.kind === 'ai_talk') return startAi.mutate()
    if (!user?.hearts.unlimited && (user?.hearts.hearts ?? 0) <= 0) return toast('Canın kalmadı! Pratik yaparak ya da mağazadan can kazanabilirsin.', 'error')
    nav(`/lesson/${lesson.id}`)
  }

  // Keep the opened card in view — it can open near the bottom of the screen.
  useEffect(() => {
    if (open) setTimeout(() => popRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
  }, [open])

  const base = locked ? 'color-mix(in oklab, var(--line) 70%, #000 12%)' : `color-mix(in oklab, ${color} 66%, #000)`

  return (
    // The open node is lifted above its siblings, so its card is never painted over by later stops.
    <div ref={nodeRef} className={clsx('absolute left-1/2', open ? 'z-40' : current ? 'z-20' : 'z-10')} style={{ top: y - (current ? 6 : 0), transform: `translateX(calc(-50% + ${x}px))`, width: size }}>
      {current && (
        <motion.span className="absolute -top-11 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          <span className="relative flex items-center gap-1.5 rounded-xl bg-ink px-3 py-1.5 text-xs font-black uppercase tracking-wide text-paper shadow-soft">
            <MapPin className="size-3.5" /> Buradasın
            <span className="absolute -bottom-[5px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-ink" />
          </span>
        </motion.span>
      )}

      <motion.button
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: Math.min(index, 6) * 0.03 }}
        onClick={() => (locked ? toast('Önceki durakları tamamlayınca açılır') : setOpenId(open ? null : lesson.id))}
        aria-label={`${lesson.title}${locked ? ' (kilitli)' : done ? ' (tamamlandı)' : ''}`}
        aria-expanded={open}
        className={clsx('relative grid place-items-center rounded-full transition-transform active:translate-y-[5px]', locked ? 'text-ink-soft' : 'text-white')}
        style={{ width: size, height: size, background: locked ? 'var(--paper-2)' : color, boxShadow: `0 6px 0 0 ${base}` }}
      >
        {current && <span className="absolute -inset-2 rounded-full border-4 opacity-40" style={{ borderColor: color }} />}
        {current && <span className="absolute -inset-2 animate-ping rounded-full border-4 opacity-20" style={{ borderColor: color }} />}
        {done && <span className="absolute inset-1.5 rounded-full border-2 border-white/35" />}
        {locked ? <Lock className="size-6" /> : done ? <Check className="size-8" strokeWidth={3.5} /> : <Icon className={current ? 'size-9' : 'size-7'} strokeWidth={2.5} />}
        {lesson.is_premium && !done && <Img src={rewardImg('crown')} alt="Premium" className="absolute -right-2 -top-2 size-7 object-contain drop-shadow" />}
        {done && lesson.crowns > 0 && (
          <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full bg-card px-1.5 py-0.5 shadow-hard-sm">
            {Array.from({ length: Math.min(3, lesson.crowns) }, (_, k) => <Img key={k} src={rewardImg('star')} alt="" className="size-3" />)}
          </span>
        )}
      </motion.button>

      <p className={clsx('absolute top-1/2 w-max max-w-[118px] -translate-y-1/2 text-xs font-extrabold leading-tight sm:max-w-[168px] sm:text-[13px]', labelLeft ? 'right-[calc(100%+14px)] text-right' : 'left-[calc(100%+14px)]', locked ? 'text-ink-soft/70' : 'text-ink')}>
        <span className="block text-[10px] font-black uppercase tracking-wider" style={{ color: locked ? undefined : color }}>{kind}</span>
        {lesson.title}
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
