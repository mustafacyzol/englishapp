import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, Check, Eye, EyeOff, PenLine, RotateCcw, Sparkles, Target } from 'lucide-react'
import { ApiError, post } from '@/lib/api'
import { img, PHOTO } from '@/lib/assets'
import { TUTOR } from '@/lib/tutor'
import type { RewardSummary } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Misc'
import { Img } from '@/components/ui/Img'
import { Defne, DefnePose } from '@/components/game/Defne'
import { useReward } from '@/components/game/RewardProvider'
import { useAuth } from '@/lib/auth'

interface Mistake { original: string; fix: string; rule_tr: string; category: string }
interface Result {
  cefr_estimate: string
  score: number
  corrected_text: string
  mistakes: Mistake[]
  rubric?: { task: number; grammar: number; vocabulary: number; organisation: number }
  strengths_tr: string
  next_steps_tr: string
}
interface Task { key: string; title: string; prompt: string; photo: string; level: string; min: number; max: number; words: string[] }

/** Picture-led tasks: a scene, a clear brief, a word range and three words to try. */
const TASKS: Task[] = [
  { key: 'weekend', title: 'Hayalindeki hafta sonu', prompt: 'Describe your perfect weekend. Where are you, who is with you, what do you do?', photo: img('onboarding/morning.webp'), level: 'A2', min: 40, max: 90, words: ['relax', 'because', 'favourite'] },
  { key: 'hotel', title: 'Otele e-posta', prompt: 'Write an email to a hotel. Ask about breakfast times and parking.', photo: img('onboarding/travel.webp'), level: 'A2', min: 50, max: 100, words: ['Could you', 'available', 'Thank you'] },
  { key: 'food', title: 'Memleketinin yemeği', prompt: 'Describe a dish from your hometown and explain how to make it.', photo: img('onboarding/food.webp'), level: 'A2', min: 50, max: 110, words: ['ingredients', 'first', 'then'] },
  { key: 'film', title: 'Dizi ya da film yorumu', prompt: 'Write a short review of a film or series you love. Would you recommend it?', photo: img('onboarding/movies.webp'), level: 'B1', min: 70, max: 140, words: ['plot', 'character', 'recommend'] },
  { key: 'advice', title: 'Aldığın en iyi tavsiye', prompt: 'What is the best advice you have ever received? Why was it important?', photo: PHOTO.classroom, level: 'B1', min: 70, max: 140, words: ['advice', 'since then', 'realised'] },
  { key: 'social', title: 'Sosyal medya ve mutluluk', prompt: 'Does social media make people happier? Give two reasons and an example.', photo: img('onboarding/tech.webp'), level: 'B1', min: 90, max: 160, words: ['however', 'in my opinion', 'for example'] },
]
const CAT: Record<string, string> = { grammar: 'Dilbilgisi', vocabulary: 'Kelime', spelling: 'Yazım', word_order: 'Sözcük sırası', style: 'Üslup' }
const RUBRIC: [keyof NonNullable<Result['rubric']>, string][] = [['task', 'Görev'], ['grammar', 'Dilbilgisi'], ['vocabulary', 'Kelime'], ['organisation', 'Akış']]
const SCAN_STEPS = ['Dilbilgisine bakıyorum…', 'Kelime seçimlerini inceliyorum…', 'Cümle akışını değerlendiriyorum…', 'Notlarımı hazırlıyorum…']

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
/** A task suits you at your level or one step above — a stretch, not a wall. */
const suits = (task: string, mine?: string) => CEFR.indexOf(task) <= CEFR.indexOf(mine ?? 'A1') + 1
const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0)
const hasWord = (text: string, w: string) => text.toLowerCase().includes(w.toLowerCase())

export default function WritingLab() {
  const { user } = useAuth()
  const showReward = useReward()
  const [task, setTask] = useState<Task | null>(null)
  const [text, setText] = useState('')
  const [scanning, setScanning] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const m = useMutation({
    mutationFn: async () => {
      // A short, deliberate review beat so the feedback feels considered — never a blink.
      const [r] = await Promise.all([
        post<{ result: Result; reward: RewardSummary }>('/ai/writing', { text, task: task?.prompt, target_words: task?.words }),
        new Promise((res) => setTimeout(res, 2600)),
      ])
      return r
    },
    onMutate: () => setScanning(true),
    onSettled: () => setScanning(false),
    onSuccess: (r) => {
      setHistory((h) => [...h, r.result.score])
      showReward(r.reward, 'Yazın değerlendirildi!')
    },
  })
  const r = m.data?.result

  if (!task) return <TaskPicker onPick={(t) => setTask(t)} level={user?.cefr_level} />

  const words = countWords(text)
  const inRange = words >= task.min && words <= task.max
  const pct = Math.min(100, (words / task.max) * 100)

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => { setTask(null); m.reset() }} className="mb-4 flex items-center gap-1.5 text-sm font-extrabold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> Görevler</button>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ------------------------------------------------------ Editor */}
        <section className="overflow-hidden rounded-3xl border-2 border-line bg-card">
          <div className="relative h-36 overflow-hidden sm:h-44">
            <Img src={task.photo} alt="" className="photo" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-5 bottom-4 text-white">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/75">{task.level} · {task.min}–{task.max} kelime</p>
              <p className="font-display text-2xl font-black">{task.title}</p>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <p className="font-read text-lg leading-snug">{task.prompt}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-ink-soft"><Target className="size-3.5" /> Kullanmayı dene</span>
              {task.words.map((w) => {
                const used = hasWord(text, w)
                return (
                  <span key={w} className={clsx('flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-sm font-bold transition', used ? 'border-mint bg-mint/12 text-mint-deep' : 'border-line')}>
                    {used && <Check className="size-3.5" strokeWidth={3} />} {w}
                  </span>
                )
              })}
            </div>

            <div className="relative mt-5">
              {r && !scanning ? (
                <Annotated text={text} mistakes={r.mistakes} />
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={scanning}
                  placeholder="Write here in English…"
                  className="min-h-72 w-full resize-y rounded-2xl border-2 border-line bg-paper/60 p-5 font-read text-lg leading-relaxed [background-image:linear-gradient(transparent_calc(2em-1px),var(--line)_calc(2em-1px))] [background-size:100%_2em] [line-height:2em] focus:border-ink/30 focus:bg-card focus:outline-none"
                />
              )}
              <AnimatePresence>{scanning && <ScanOverlay />}</AnimatePresence>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
                <motion.div className={clsx('h-full rounded-full', words > task.max ? 'bg-berry' : inRange ? 'bg-mint' : 'bg-butter')} animate={{ width: `${pct}%` }} />
              </div>
              <span className={clsx('text-sm font-extrabold tabular-nums', inRange ? 'text-mint-deep' : 'text-ink-soft')}>{words} kelime</span>
            </div>

            {m.error && <div className="mt-3"><Alert tone="error">{(m.error as ApiError).first()}</Alert></div>}
            <div className="mt-4 flex flex-wrap gap-2">
              {r && !scanning ? (
                <Button onClick={() => m.reset()} variant="secondary" icon={<RotateCcw className="size-5" />}>Düzenle ve tekrar gönder</Button>
              ) : (
                <Button loading={scanning} disabled={text.trim().length < 20} onClick={() => m.mutate()} icon={<Sparkles className="size-5" />}>{TUTOR.name} incelesin</Button>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ Feedback */}
        <section>
          {scanning ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-3xl border-2 border-line bg-card p-8 text-center">
              <DefnePose pose="think" className="h-48" />
              <ScanSteps />
            </div>
          ) : !r ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-line p-8 text-center">
              <DefnePose pose="wave" className="h-44" />
              <p className="max-w-xs font-bold text-ink-soft">Yazını bitir, gönder. Seviyeni tahmin edip hataları metninin üstünde işaretleyeceğim — her birinin nedenini Türkçe anlatarak.</p>
            </div>
          ) : (
            <Feedback r={r} text={text} history={history} />
          )}
        </section>
      </div>
    </div>
  )
}

function TaskPicker({ onPick, level }: { onPick: (t: Task) => void; level?: string }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-ink-soft">Yazma becerisi</p>
          <h1 className="text-3xl sm:text-4xl">Yazma atölyesi</h1>
          <p className="mt-2 max-w-xl text-ink-soft">Bir sahne seç, yaz, gönder. {TUTOR.name} metnini okur, hataları tam yerinde işaretler ve nasıl daha iyi yazacağını gösterir.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-line bg-card p-3 pr-4">
          <Defne className="size-11" />
          <p className="text-sm font-bold">Seviyen <b>{level}</b> — işaretli görevler sana uygun.</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {TASKS.map((t, i) => (
          <motion.button key={t.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => onPick(t)} className="group overflow-hidden rounded-3xl border-2 border-line bg-card text-left transition hover:-translate-y-1 hover:shadow-soft">
            <div className="relative aspect-[16/10] overflow-hidden">
              <Img src={t.photo} alt="" className="photo transition duration-700 group-hover:scale-105" />
              <span className={clsx('absolute left-3 top-3 rounded-lg px-2 py-0.5 text-xs font-black', suits(t.level, level) ? 'bg-mint text-white' : 'bg-card/95')}>{t.level}</span>
            </div>
            <div className="p-5">
              <p className="text-lg font-black leading-tight">{t.title}</p>
              <p className="mt-1 line-clamp-2 font-read text-sm text-ink-soft">{t.prompt}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-extrabold text-ink-soft"><PenLine className="size-3.5" /> {t.min}–{t.max} kelime · {t.words.length} hedef kelime</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/** A scan line sweeps the page while Defne reads. */
function ScanOverlay() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-card/35">
      <motion.div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-sage/25 to-transparent" animate={{ top: ['-10%', '100%'] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}>
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-sage" />
      </motion.div>
    </motion.div>
  )
}

function ScanSteps() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(SCAN_STEPS.length - 1, x + 1)), 650)
    return () => clearInterval(t)
  }, [])
  return (
    <ul className="mt-5 space-y-2 text-left">
      {SCAN_STEPS.map((s, k) => (
        <li key={s} className={clsx('flex items-center gap-2 text-sm font-bold transition', k > i ? 'opacity-30' : k < i ? 'text-mint-deep' : 'text-ink')}>
          <span className={clsx('grid size-5 place-items-center rounded-full', k < i ? 'bg-mint text-white' : 'border-2 border-current')}>
            {k < i ? <Check className="size-3" strokeWidth={3.5} /> : k === i ? <span className="size-1.5 animate-ping rounded-full bg-current" /> : null}
          </span>
          {s}
        </li>
      ))}
    </ul>
  )
}

/** Splits the learner's own text around each mistake so it can be marked in place. */
function segments(text: string, mistakes: Mistake[]) {
  const out: { t: string; m?: Mistake; n?: number }[] = []
  let at = 0
  const lower = text.toLowerCase()
  mistakes.forEach((mk, n) => {
    const idx = lower.indexOf(mk.original.toLowerCase(), at)
    if (idx < 0 || !mk.original) return
    if (idx > at) out.push({ t: text.slice(at, idx) })
    out.push({ t: text.slice(idx, idx + mk.original.length), m: mk, n: n + 1 })
    at = idx + mk.original.length
  })
  out.push({ t: text.slice(at) })
  return out
}

function Annotated({ text, mistakes }: { text: string; mistakes: Mistake[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const segs = useMemo(() => segments(text, mistakes), [text, mistakes])
  return (
    <div className="min-h-72 whitespace-pre-wrap rounded-2xl border-2 border-line bg-paper/60 p-5 font-read text-lg leading-[2.1]">
      {segs.map((s, k) =>
        s.m ? (
          <span key={k} className="relative">
            <button onClick={() => setOpen(open === s.n ? null : s.n!)} className={clsx('rounded-md px-0.5 underline decoration-berry decoration-wavy decoration-2 underline-offset-4 transition', open === s.n ? 'bg-berry/15' : 'hover:bg-berry/10')}>
              {s.t}
              <sup className="ml-0.5 rounded bg-berry px-1 font-sans text-[10px] font-black text-white no-underline">{s.n}</sup>
            </button>
            <AnimatePresence>
              {open === s.n && (
                <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-0 top-full z-20 mt-1 block w-72 max-w-[80vw] rounded-2xl border-2 border-line bg-card p-3 font-sans text-sm leading-snug shadow-soft">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-ink-soft">{CAT[s.m.category] ?? s.m.category}</span>
                  <span className="block"><s className="text-berry">{s.m.original}</s> → <b className="text-mint-deep">{s.m.fix}</b></span>
                  <span className="mt-1 block text-ink-soft">{s.m.rule_tr}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        ) : (
          <span key={k}>{s.t}</span>
        ),
      )}
    </div>
  )
}

function Feedback({ r, text, history }: { r: Result; text: string; history: number[] }) {
  const [showFixed, setShowFixed] = useState(false)
  const prev = history.length > 1 ? history[history.length - 2] : null
  const R = 44
  const C = 2 * Math.PI * R
  const found = segments(text, r.mistakes).filter((s) => s.m).length
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-5 rounded-3xl border-2 border-line bg-card p-5">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--paper-2)" strokeWidth="9" />
            <motion.circle cx="50" cy="50" r={R} fill="none" stroke={r.score >= 80 ? 'var(--color-mint)' : r.score >= 60 ? 'var(--color-butter)' : 'var(--color-berry)'} strokeWidth="9" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - r.score / 100) }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center">
            <span><span className="block font-display text-3xl font-black leading-none">{r.score}</span><span className="text-[11px] font-bold text-ink-soft">/ 100</span></span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-ink-soft">Tahmini seviye</p>
          <p className="font-display text-4xl font-black">{r.cefr_estimate}</p>
          {prev !== null && <p className={clsx('mt-1 text-sm font-extrabold', r.score >= prev ? 'text-mint-deep' : 'text-berry')}>{r.score >= prev ? `+${r.score - prev}` : r.score - prev} puan, önceki denemene göre</p>}
          <p className="mt-1 text-sm text-ink-soft">{r.mistakes.length ? `${r.mistakes.length} düzeltme — ${found} tanesi metninde işaretli` : 'Hata bulunamadı!'}</p>
        </div>
      </div>

      {r.rubric && (
        <div className="grid grid-cols-2 gap-3 rounded-3xl border-2 border-line bg-card p-5">
          {RUBRIC.map(([k, label], i) => (
            <div key={k}>
              <div className="mb-1 flex justify-between text-sm font-bold"><span>{label}</span><span className="tabular-nums text-ink-soft">{r.rubric![k]}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-paper-2"><motion.div className="h-full rounded-full bg-ink" initial={{ width: 0 }} animate={{ width: `${r.rubric![k]}%` }} transition={{ duration: 0.8, delay: 0.1 * i }} /></div>
            </div>
          ))}
        </div>
      )}

      {r.mistakes.length > 0 && (
        <div className="rounded-3xl border-2 border-line bg-card p-5">
          <h3 className="mb-3 text-lg">Düzeltmeler</h3>
          <ol className="space-y-3">
            {r.mistakes.map((x, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-berry font-black text-white">{i + 1}</span>
                <span className="min-w-0">
                  <span className="mr-1.5 rounded bg-paper-2 px-1.5 text-[10px] font-extrabold uppercase">{CAT[x.category] ?? x.category}</span>
                  <s className="text-berry">{x.original}</s> → <b className="text-mint-deep">{x.fix}</b>
                  <span className="mt-0.5 block text-ink-soft">{x.rule_tr}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-3xl border-2 border-line bg-card p-5">
        <button onClick={() => setShowFixed((v) => !v)} className="flex w-full items-center justify-between text-left">
          <h3 className="text-lg">Düzeltilmiş hali</h3>
          <span className="flex items-center gap-1 text-sm font-extrabold text-ink-soft">{showFixed ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {showFixed ? 'Gizle' : 'Göster'}</span>
        </button>
        <AnimatePresence>{showFixed && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden font-read leading-relaxed">{r.corrected_text}</motion.p>}</AnimatePresence>
        {!showFixed && <p className="mt-1 text-sm text-ink-soft">Önce işaretli yerleri kendin düzeltmeyi dene — kalıcı öğrenme böyle olur.</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-mint/12 p-4 text-sm"><p className="mb-1 font-extrabold text-mint-deep">Güçlü yönlerin</p>{r.strengths_tr}</div>
        <div className="rounded-2xl bg-sky/10 p-4 text-sm"><p className="mb-1 font-extrabold text-sky">Sonraki adım</p>{r.next_steps_tr}</div>
      </div>
    </motion.div>
  )
}
