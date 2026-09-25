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
import { Modal, Spinner } from '@/components/ui/Misc'
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
        <img src={rewardImg('chest')} alt="" className="size-24 object-contain" />
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
      {data ? <Markdown source={data.guidebook ?? ''} /> : <Spinner />}
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
          <img src={unitImg(photoIndex)} alt="" loading="lazy" className="hidden w-40 object-cover sm:block" />
        </div>
      </div>
      <div className="relative flex flex-col items-center gap-6">
        {unit.lessons.map((l, i) => (
          <LessonNode key={l.id} lesson={l} offset={Math.sin(i * 1.1) * 80} color={color} />
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

  return (
    <div className="relative" style={{ transform: `translateX(${offset}px)` }}>
      {current && (
        <motion.div className="absolute -top-11 left-1/2 z-10 -translate-x-1/2" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <span className="relative block whitespace-nowrap rounded-xl border-2 border-line bg-card px-3 py-1.5 text-sm font-black uppercase tracking-wide shadow-hard" style={{ color }}>
            Başla
            <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-line bg-card" />
          </span>
        </motion.div>
      )}
      <button
        onClick={() => (locked ? toast('Önceki dersleri tamamlayınca açılır 🔒') : setOpen((o) => !o))}
        aria-label={lesson.title}
        className={clsx('relative grid size-[72px] place-items-center rounded-full transition-transform active:translate-y-[6px]', locked ? 'bg-line text-ink-soft' : 'text-white')}
        style={!locked ? { background: done ? '#ffc233' : color, boxShadow: `0 6px 0 0 ${done ? '#d99a00' : 'rgba(0,0,0,0.22)'}` } : { boxShadow: '0 6px 0 0 color-mix(in oklab, var(--line) 60%, #000 12%)' }}
      >
        {current && <span className="absolute -inset-2.5 rounded-full border-4 border-line" />}
        {locked ? <Lock className="size-7" /> : done ? <Check className="size-9" strokeWidth={3.5} /> : <Icon className="size-8" strokeWidth={2.5} />}
        {lesson.is_premium && <img src={rewardImg('crown')} alt="Premium" className="absolute -right-3 -top-3 size-8 object-contain" />}
      </button>
      {done && lesson.crowns > 1 && <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-butter px-2 text-[11px] font-black text-[#1f2433]">×{lesson.crowns}</span>}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} className="absolute left-1/2 top-24 z-20 w-72 -translate-x-1/2">
            <div className="ink-card p-4 text-left">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color }}>
                {lesson.kind === 'story' ? 'Hikaye' : lesson.kind === 'ai_talk' ? 'Ada ile konuşma' : lesson.kind === 'checkpoint' ? 'Kontrol noktası' : SKILL_LABEL[lesson.skill]}
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
