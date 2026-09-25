import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { BookOpen, BookText, Check, ChevronDown, Crown, Dumbbell, Headphones, Lock, MessageCircleHeart, Mic, PenLine, Star, Trophy } from 'lucide-react'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SKILL_LABEL } from '@/lib/format'
import { Markdown } from '@/lib/markdown'
import type { PathLesson, PathUnit } from '@/lib/types'
import { Modal, Spinner, Sticker } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

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

  if (isLoading || !data) return <Spinner label="Yolun hazırlanıyor" />

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={() => setPicker(true)} className="press ink-card mb-8 flex w-full items-center gap-4 p-4 text-left">
        <span className="grid size-12 place-items-center rounded-2xl border-2 border-line font-display text-lg font-extrabold text-white" style={{ background: data.course.color }}>
          {data.course.cefr_level}
        </span>
        <span className="flex-1">
          <span className="block text-xs font-extrabold uppercase tracking-widest text-ink-soft">Kurs</span>
          <span className="block font-display text-xl font-extrabold">{data.course.title}</span>
        </span>
        <ChevronDown className="size-5" />
      </button>

      {data.units.map((unit, ui) => (
        <UnitSection key={unit.id} unit={unit} index={ui} onGuide={() => setGuide(unit)} />
      ))}

      <div className="my-16 flex flex-col items-center gap-3 text-center">
        <Trophy className="size-14 text-butter drop-shadow-[3px_3px_0_var(--ink)]" />
        <p className="font-display text-xl font-extrabold">Bu kursun sonu</p>
        <p className="max-w-xs text-sm text-ink-soft">Tüm üniteleri bitirince bir sonraki seviyeye geçebilirsin.</p>
      </div>

      <Modal open={picker} onClose={() => setPicker(false)}>
        <h2 className="mb-4 text-2xl font-extrabold">Kurs seç</h2>
        <div className="grid gap-3">
          {courses.data?.data.map((c) => (
            <button key={c.id} onClick={() => { setCourseId(c.id); setPicker(false) }} className={clsx('press ink-card flex items-center gap-3 p-3 text-left', c.id === data.course.id && 'ring-4 ring-flame/30')}>
              <span className="grid size-11 place-items-center rounded-xl border-2 border-line font-display font-extrabold text-white" style={{ background: c.color }}>{c.cefr_level}</span>
              <span className="font-display text-lg font-extrabold">{c.title}</span>
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
      <Sticker color="bg-butter">Rehber</Sticker>
      <h2 className="mb-4 mt-3 text-3xl font-extrabold">{unit?.title}</h2>
      {data ? <Markdown source={data.guidebook ?? ''} /> : <Spinner />}
    </Modal>
  )
}

function UnitSection({ unit, index, onGuide }: { unit: PathUnit; index: number; onGuide: () => void }) {
  const color = unit.color ?? '#FF5A36'
  return (
    <section className="mb-10">
      <div className="relative mb-10 overflow-hidden rounded-[22px] border-2 border-line p-5 text-white shadow-hard" style={{ background: color }}>
        <div className="pointer-events-none absolute -bottom-8 right-3 font-display text-[130px] font-extrabold leading-none text-[#1B1F3B] opacity-15">{index + 1}</div>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] opacity-80">Ünite {index + 1}</p>
        <h2 className="text-2xl font-extrabold">{unit.title}</h2>
        <p className="text-sm opacity-90">{unit.description}</p>
        <div className="mt-4 flex items-center gap-3">
          {unit.has_guidebook && (
            <button onClick={onGuide} className="press flex items-center gap-2 rounded-xl border-2 border-line bg-card px-3 py-1.5 text-sm font-extrabold text-ink shadow-hard-sm">
              <BookText className="size-4" /> Rehber
            </button>
          )}
          <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-line bg-white/30">
            <div className="h-full bg-white" style={{ width: `${unit.progress}%` }} />
          </div>
          <span className="font-mono text-xs font-bold">%{unit.progress}</span>
        </div>
      </div>
      <div className="relative flex flex-col items-center gap-7">
        {unit.lessons.map((l, i) => (
          <LessonNode key={l.id} lesson={l} offset={Math.sin(i * 1.1) * 88} color={color} />
        ))}
      </div>
    </section>
  )
}

function LessonNode({ lesson, offset, color }: { lesson: PathLesson; offset: number; color: string }) {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const locked = lesson.state === 'locked'
  const done = lesson.state === 'completed'
  const current = lesson.state === 'current'
  const Icon = lesson.kind === 'story' ? BookOpen : lesson.kind === 'ai_talk' ? MessageCircleHeart : lesson.kind === 'checkpoint' ? Trophy : SKILL_ICON[lesson.skill] ?? Star

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

  return (
    <div className="relative" style={{ transform: `translateX(${offset}px)` }}>
      {current && (
        <motion.div className="absolute -top-11 left-1/2 z-10 -translate-x-1/2" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <span className="relative block whitespace-nowrap rounded-xl border-2 border-line bg-card px-3 py-1 font-display text-sm font-extrabold uppercase text-flame shadow-hard-sm">
            Başla
            <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-line bg-card" />
          </span>
        </motion.div>
      )}
      <button
        onClick={() => (locked ? toast('Önceki dersleri tamamlayınca açılır 🔒') : setOpen((o) => !o))}
        aria-label={lesson.title}
        className={clsx('press relative grid size-[76px] place-items-center rounded-full border-[3px] border-line shadow-[0_7px_0_0_var(--ink)] active:!translate-y-[5px] active:!shadow-[0_2px_0_0_var(--ink)]', locked ? 'bg-paper-2 text-ink-soft' : 'text-white')}
        style={!locked ? { background: done ? '#FFD23F' : color } : undefined}
      >
        {current && <span className="absolute -inset-3 rounded-full border-[3px] border-dashed border-line/40 animate-[spin_12s_linear_infinite]" />}
        {locked ? <Lock className="size-7" /> : done ? <Check className="size-9 text-[#1B1F3B]" strokeWidth={3.5} /> : <Icon className="size-8" strokeWidth={2.5} />}
        {lesson.is_premium && <Crown className="absolute -right-1 -top-1 size-6 rounded-full border-2 border-line bg-butter p-0.5 text-[#1B1F3B]" />}
      </button>
      {done && lesson.crowns > 1 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-2 border-line bg-card px-1.5 font-mono text-[10px] font-bold">×{lesson.crowns}</span>}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} className="absolute left-1/2 top-24 z-20 w-72 -translate-x-1/2">
            <div className="ink-card p-4 text-left">
              <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color }}>
                {lesson.kind === 'story' ? 'Hikaye' : lesson.kind === 'ai_talk' ? 'Ada ile konuşma' : lesson.kind === 'checkpoint' ? 'Kontrol noktası' : SKILL_LABEL[lesson.skill]}
              </p>
              <h3 className="mb-1 text-xl font-extrabold leading-tight">{lesson.title}</h3>
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
