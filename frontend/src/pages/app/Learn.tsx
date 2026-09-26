import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { BookOpen, BookText, Check, ChevronDown, Dumbbell, Headphones, Lock, MessageCircle, Mic, PenLine, Star, Trophy } from 'lucide-react'
import { rewardImg, unitImg } from '@/lib/assets'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SKILL_LABEL } from '@/lib/format'
import { Markdown } from '@/lib/markdown'
import type { PathLesson, PathUnit } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Modal, SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

interface PathData {
  course: { id: number; title: string; cefr_level: string; color: string; description: string }
  units: PathUnit[]
}
interface CourseItem { id: number; title: string; cefr_level: string; color: string }

const SKILL_ICON = { reading: BookOpen, listening: Headphones, speaking: Mic, writing: PenLine, vocabulary: Star, grammar: BookText, mixed: Dumbbell }

export default function Learn() {
  const [courseId, setCourseId] = useState<number | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['path', courseId], queryFn: () => get<PathData>(`/path${courseId ? `/${courseId}` : ''}`) })
  const courses = useQuery({ queryKey: ['courses'], queryFn: () => get<{ data: CourseItem[] }>('/courses') })
  const [picker, setPicker] = useState(false)
  const [guide, setGuide] = useState<PathUnit | null>(null)

  if (isLoading || !data) return <SkeletonPage variant="path" />

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={() => setPicker(true)} className="press ink-card mb-8 flex w-full items-center gap-4 p-4 text-left">
        <span className="grid size-12 place-items-center rounded-2xl text-lg font-black text-white" style={{ background: data.course.color }}>
          {data.course.cefr_level}
        </span>
        <span className="flex-1">
          <span className="block text-xs font-extrabold uppercase tracking-widest text-ink-soft">Kurs</span>
          <span className="block text-xl font-black">{data.course.title}</span>
        </span>
        <ChevronDown className="size-5 text-ink-soft" />
      </button>

      {data.units.map((unit, ui) => (
        <UnitSection key={unit.id} unit={unit} index={ui} photoIndex={courseOffset(data.course.cefr_level) + ui} onGuide={() => setGuide(unit)} />
      ))}

      <div className="my-16 flex flex-col items-center gap-3 text-center">
        <Img src={rewardImg('chest')} alt="" className="size-24 object-contain" />
        <p className="text-xl font-black">Bu kursun sonu</p>
        <p className="max-w-xs text-sm text-ink-soft">Tüm üniteleri bitirince bir sonraki seviyeye geçebilirsin.</p>
      </div>

      <Modal open={picker} onClose={() => setPicker(false)}>
        <h2 className="mb-4 text-2xl font-extrabold">Kurs seç</h2>
        <div className="grid gap-3">
          {courses.data?.data.map((c) => (
            <button key={c.id} onClick={() => { setCourseId(c.id); setPicker(false) }} className={clsx('press flex items-center gap-3 rounded-2xl border-2 p-3 text-left shadow-hard', c.id === data.course.id ? 'border-sky bg-sky/10' : 'border-line bg-card')}>
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

const courseOffset = (lvl: string) => ({ A1: 0, A2: 3, B1: 5 } as Record<string, number>)[lvl] ?? 0

function UnitSection({ unit, index, photoIndex, onGuide }: { unit: PathUnit; index: number; photoIndex: number; onGuide: () => void }) {
  const color = unit.color ?? '#e8403a'
  const [openId, setOpenId] = useState<number | null>(null)
  return (
    <section className="mb-12">
      <div className="relative mb-10 overflow-hidden rounded-3xl text-white" style={{ background: color }}>
        <div className="flex items-stretch">
          <div className="flex-1 p-5 sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] opacity-85">Ünite {index + 1}</p>
            <h2 className="text-2xl leading-tight">{unit.title}</h2>
            <p className="mt-1 font-semibold opacity-90">{unit.description}</p>
            <div className="mt-4 flex items-center gap-3">
              {unit.has_guidebook && (
                <button onClick={onGuide} className="press flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-sm font-extrabold uppercase tracking-wide hover:bg-white/30">
                  <BookText className="size-4" /> Rehber
                </button>
              )}
              <div className="h-2.5 max-w-40 flex-1 overflow-hidden rounded-full bg-black/20"><div className="h-full rounded-full bg-white" style={{ width: `${unit.progress}%` }} /></div>
              <span className="text-sm font-black">%{unit.progress}</span>
            </div>
          </div>
          <Img src={unitImg(photoIndex)} alt="" loading="lazy" className="hidden w-40 object-cover sm:block" />
        </div>
      </div>
      {/* A meandering path — clearer than a Duolingo clone because each stop carries a
          readable label and a shape that matches what it is (lesson, story, chat, checkpoint). */}
      <div className="relative flex flex-col items-center gap-9 py-2">
        {unit.lessons.map((l, i) => (
          <LessonNode key={l.id} lesson={l} index={i} count={unit.lessons.length} color={color} openId={openId} setOpenId={setOpenId} />
        ))}
      </div>
    </section>
  )
}

const KIND_LABEL: Record<string, string> = { story: 'Hikâye', ai_talk: 'Defne ile konuşma', checkpoint: 'Kontrol noktası' }
// Curve amplitude: gentle S so the path reads as a route, never a rigid column.
const wave = (i: number) => Math.sin(i * 0.9) * 74

function LessonNode({ lesson, index, count, color, openId, setOpenId }: { lesson: PathLesson; index: number; count: number; color: string; openId: number | null; setOpenId: (v: number | null) => void }) {
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const locked = lesson.state === 'locked'
  const done = lesson.state === 'completed'
  const current = lesson.state === 'current'
  const open = openId === lesson.id
  const Icon = lesson.kind === 'story' ? BookOpen : lesson.kind === 'ai_talk' ? MessageCircle : lesson.kind === 'checkpoint' ? Trophy : SKILL_ICON[lesson.skill] ?? Star

  const startAi = useMutation({
    mutationFn: () => post<{ conversation: { id: number } }>('/ai/conversations', { mode: 'roleplay', scenario_key: lesson.scenario_key }),
    onSuccess: (r) => nav(`/ai/${r.conversation.id}?lesson=${lesson.id}`),
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const start = () => {
    if (lesson.premium_locked) return nav('/premium')
    if (lesson.kind === 'story' && lesson.story) return nav(`/stories/${lesson.story.slug}?lesson=${lesson.id}`)
    if (lesson.kind === 'ai_talk') return startAi.mutate()
    if (!user?.hearts.unlimited && (user?.hearts.hearts ?? 0) <= 0) return toast('Canın kalmadı! Pratik yaparak ya da mağazadan can kazanabilirsin.', 'error')
    nav(`/lesson/${lesson.id}`)
  }

  const x = wave(index)
  const nextX = wave(index + 1)
  // squircle for lessons, circle for milestones — shape signals kind before you read.
  const shape = lesson.kind === 'checkpoint' || lesson.kind === 'story' || lesson.kind === 'ai_talk' ? 'rounded-full' : 'rounded-[26px]'

  return (
    <div className="relative" style={{ transform: `translateX(${x}px)` }}>
      {/* connector to the next node — a soft neutral guide that runs behind labels */}
      {index < count - 1 && (
        <svg className="pointer-events-none absolute left-1/2 top-[76px] -z-10 h-[104px] overflow-visible" width="2" aria-hidden>
          <line x1="1" y1="0" x2={nextX - x + 1} y2="104" stroke="var(--line)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 12" />
        </svg>
      )}

      {current && (
        <motion.div className="absolute -top-12 left-1/2 z-20 -translate-x-1/2" initial={{ y: 4 }} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <span className="relative block whitespace-nowrap rounded-xl px-3.5 py-1.5 font-display text-sm font-black uppercase tracking-wide text-white shadow-soft" style={{ background: color }}>
            Başla
            <span className="absolute -bottom-[6px] left-1/2 size-3 -translate-x-1/2 rotate-45" style={{ background: color }} />
          </span>
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: Math.min(index, 6) * 0.04 }}
        onClick={() => (locked ? toast('Önceki dersleri tamamlayınca açılır 🔒') : setOpenId(open ? null : lesson.id))}
        aria-label={lesson.title}
        className={clsx('relative z-10 grid size-[76px] place-items-center transition-transform active:translate-y-[6px]', shape, locked ? 'bg-paper-2 text-ink-soft' : 'text-white')}
        style={!locked ? { background: done ? '#d99a00' : color, boxShadow: `0 7px 0 0 ${done ? '#a97700' : 'color-mix(in oklab, ' + color + ' 68%, #000)'}` } : { boxShadow: '0 7px 0 0 color-mix(in oklab, var(--line) 55%, #000 10%)' }}
      >
        {current && <span className="absolute -inset-2.5 animate-ping rounded-full opacity-30" style={{ border: `4px solid ${color}` }} />}
        {locked ? <Lock className="size-7" /> : done ? <Check className="size-9" strokeWidth={3.5} /> : <Icon className="size-8" strokeWidth={2.5} />}
        {lesson.is_premium && !done && <Img src={rewardImg('crown')} alt="Premium" className="absolute -right-3 -top-3 size-8 object-contain drop-shadow" />}
        {/* crowns earned, as pips */}
        {done && lesson.crowns > 0 && (
          <span className="absolute -bottom-2.5 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full bg-card px-1.5 py-0.5 shadow-hard-sm">
            {Array.from({ length: Math.min(3, lesson.crowns) }, (_, k) => <Img key={k} src={rewardImg('star')} alt="" className="size-3.5" />)}
          </span>
        )}
      </motion.button>

      {/* readable label under every node — an opaque chip so the guide line stays behind it */}
      <p className={clsx('relative z-10 mx-auto mt-3 w-max max-w-[150px] truncate rounded-full bg-paper px-2.5 py-0.5 text-center text-xs font-extrabold', locked ? 'text-ink-soft/70' : 'text-ink')}>{lesson.title}</p>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute left-1/2 top-[104px] z-30 w-72 -translate-x-1/2"
          >
            <div className="ink-card p-4 text-left shadow-soft">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color }}>
                {KIND_LABEL[lesson.kind] ?? SKILL_LABEL[lesson.skill]}
              </p>
              <h3 className="mb-1 text-xl leading-tight">{lesson.title}</h3>
              <p className="mb-4 text-sm text-ink-soft">{done ? `En iyi skor: %${lesson.best_score} · tekrar ederek taç kazan` : `+${lesson.xp_reward} XP`}</p>
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
