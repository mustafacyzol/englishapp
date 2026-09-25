import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { BookOpen, BookText, Check, ChevronDown, ChevronRight, Dumbbell, Headphones, Lock, MessageCircle, Mic, PenLine, RotateCcw, Star, Trophy } from 'lucide-react'
import { rewardImg, unitImg } from '@/lib/assets'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SKILL_LABEL } from '@/lib/format'
import { Markdown } from '@/lib/markdown'
import type { PathLesson, PathUnit } from '@/lib/types'
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
      {/* A chapter spine: every lesson is a stop on the rail, with its own title,
          skill and reward visible — no guessing what a bare bubble hides. */}
      <ol className="relative ml-[26px] space-y-3 border-l-2 border-dashed border-line pl-7">
        {unit.lessons.map((l, i) => (
          <LessonRow key={l.id} lesson={l} color={color} index={i} />
        ))}
      </ol>
    </section>
  )
}

const KIND_LABEL: Record<string, string> = { story: 'Hikâye', ai_talk: 'Ada ile konuşma', checkpoint: 'Kontrol noktası' }

function LessonRow({ lesson, color, index }: { lesson: PathLesson; color: string; index: number }) {
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const locked = lesson.state === 'locked'
  const done = lesson.state === 'completed'
  const current = lesson.state === 'current'
  const Icon = lesson.kind === 'story' ? BookOpen : lesson.kind === 'ai_talk' ? MessageCircle : lesson.kind === 'checkpoint' ? Trophy : SKILL_ICON[lesson.skill] ?? Star

  const startAi = useMutation({
    mutationFn: () => post<{ conversation: { id: number } }>('/ai/conversations', { mode: 'roleplay', scenario_key: lesson.scenario_key }),
    onSuccess: (r) => nav(`/ai/${r.conversation.id}?lesson=${lesson.id}`),
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const start = () => {
    if (locked) return toast('Önceki dersleri tamamlayınca açılır.')
    if (lesson.premium_locked) return nav('/premium')
    if (lesson.kind === 'story' && lesson.story) return nav(`/stories/${lesson.story.slug}?lesson=${lesson.id}`)
    if (lesson.kind === 'ai_talk') return startAi.mutate()
    if (!user?.hearts.unlimited && (user?.hearts.hearts ?? 0) <= 0) return toast('Canın kalmadı! Pratik yaparak ya da mağazadan can kazanabilirsin.', 'error')
    nav(`/lesson/${lesson.id}`)
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: Math.min(index, 6) * 0.05, duration: 0.35 }}
      className="relative"
    >
      {/* the stop on the rail */}
      <span
        className={clsx(
          'absolute -left-[53px] top-4 grid size-[52px] place-items-center rounded-2xl ring-4 ring-paper transition',
          locked ? 'bg-paper-2 text-ink-soft' : 'text-white',
        )}
        style={!locked ? { background: done ? '#d99a00' : color } : undefined}
      >
        {locked ? <Lock className="size-6" /> : done ? <Check className="size-7" strokeWidth={3.5} /> : <Icon className="size-6" strokeWidth={2.6} />}
      </span>

      <button
        onClick={start}
        disabled={locked}
        className={clsx(
          'press w-full rounded-2xl border-2 p-4 text-left transition',
          current ? 'border-transparent bg-card shadow-soft ring-2' : done ? 'border-line bg-card/60' : locked ? 'cursor-not-allowed border-line/60 bg-paper-2/50' : 'border-line bg-card hover:bg-paper-2',
        )}
        style={current ? ({ '--tw-ring-color': color } as React.CSSProperties) : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: locked ? undefined : color }}>
              <span className={clsx(locked && 'text-ink-soft')}>{KIND_LABEL[lesson.kind] ?? SKILL_LABEL[lesson.skill]}</span>
            </p>
            <h3 className={clsx('truncate font-display text-lg font-black leading-tight', locked && 'text-ink-soft')}>{lesson.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-ink-soft">
              <span>+{lesson.xp_reward} XP</span>
              {done && <span className="text-mint-deep">En iyi %{lesson.best_score}</span>}
              {done && lesson.crowns > 0 && (
                <span className="flex items-center gap-1">
                  <Img src={rewardImg('star')} alt="" className="size-4" /> ×{lesson.crowns}
                </span>
              )}
              {lesson.is_premium && (
                <span className="flex items-center gap-1 text-butter-deep">
                  <Img src={rewardImg('crown')} alt="" className="size-4" /> Premium
                </span>
              )}
            </p>
          </div>

          {current ? (
            <span className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-wide text-white" style={{ background: color }}>
              {startAi.isPending ? '…' : 'Başla'}
            </span>
          ) : done ? (
            <RotateCcw className="size-5 shrink-0 text-ink-soft" />
          ) : locked ? null : (
            <ChevronRight className="size-5 shrink-0 text-ink-soft" />
          )}
        </div>
      </button>
    </motion.li>
  )
}
