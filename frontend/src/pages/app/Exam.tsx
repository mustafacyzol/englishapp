import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, BookOpenText, CalendarClock, Check, Flame, Lightbulb, RotateCcw, Sparkles, Target, Timer, Trophy, X } from 'lucide-react'
import { get, patch, post, type ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { EXAMS } from '@/lib/onboarding'
import { celebrate, sfx } from '@/lib/fx'
import type { ExamKey, Me } from '@/lib/types'
import { TUTOR } from '@/lib/tutor'
import { Button } from '@/components/ui/Button'
import { PageHeader, Spinner } from '@/components/ui/Misc'
import { Img } from '@/components/ui/Img'
import { useToast } from '@/components/ui/Toast'

interface SectionStat { key: string; label: string; hint: string; answered: number; accuracy: number | null; questions: number }
interface Overview {
  target: ExamKey | null
  exam_date: string | null
  days_left: number | null
  stats: SectionStat[]
  total: { answered: number; accuracy: number | null; today: number }
  recommended: string | null
}
interface Question { id: number; section: string; section_label: string; cefr: string; passage: string | null; prompt: string; options: string[] }
interface PracticeSet { exam: ExamKey; section: string; seconds_per_question: number; questions: Question[] }
interface Graded { correct: boolean; answer: number; explanation: string | null; xp: number }

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Sınav modu: practice in the real format of the exam the learner is sitting
 * (ÖSYM's five-option style for YDS / YÖKDİL / YDT, skill items for IELTS and
 * TOEFL). Every answer is graded on the server and explained in Turkish.
 */
export default function Exam() {
  const { user } = useAuth()
  const [run, setRun] = useState<{ section: string; n: number } | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['exam'], queryFn: () => get<Overview>('/exam') })

  if (!user) return null
  // Exam practice is for teens and adults only.
  if (user.age_group === 'kid') return <Navigate to="/learn" replace />
  if (isLoading || !data) return <Spinner className="min-h-[50vh]" />
  if (!data.target) return <PickExam />
  if (run) return <Runner section={run.section} n={run.n} onExit={() => setRun(null)} />

  const exam = EXAMS.find((e) => e.key === data.target)!
  const weakest = data.stats.find((s) => s.key === data.recommended)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader kicker="Sınav modu" title={`${exam.name} hazırlığı`}>
        <ChangeExam current={data.target} />
      </PageHeader>

      {/* hero: countdown, accuracy, recommended set */}
      <section className="mb-8 grid gap-4 md:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
        <div className="relative overflow-hidden rounded-[28px] p-6 text-white shadow-soft" style={{ background: `linear-gradient(135deg, ${exam.color}, color-mix(in oklab, ${exam.color} 55%, #10131a))` }}>
          <div aria-hidden className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-16 right-16 size-40 rounded-full bg-white/5" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{exam.label}</p>
          <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
            {data.days_left !== null ? (
              <div>
                <p className="font-display text-6xl font-black leading-none tabular-nums">{data.days_left}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white/85"><CalendarClock className="size-4" /> gün kaldı</p>
              </div>
            ) : (
              <div>
                <p className="font-display text-3xl font-black leading-tight">Tarih belirle,</p>
                <p className="text-sm font-bold text-white/85">geri sayımı başlatalım.</p>
              </div>
            )}
            <div>
              <p className="font-display text-4xl font-black leading-none tabular-nums">{data.total.accuracy !== null && <span className="text-2xl">%</span>}{data.total.accuracy ?? '-'}</p>
              <p className="mt-1 text-sm font-bold text-white/85">isabet · {data.total.answered} soru</p>
            </div>
            <div>
              <p className="font-display text-4xl font-black leading-none tabular-nums">{data.total.today}</p>
              <p className="mt-1 text-sm font-bold text-white/85">bugün</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setRun({ section: 'mix', n: 10 })} icon={<Sparkles className="size-5" />}>Karma deneme · 10 soru</Button>
            <Button variant="ghost" className="!text-white hover:!bg-white/15" onClick={() => setRun({ section: 'mix', n: 20 })}>Uzun deneme · 20</Button>
          </div>
        </div>

        <div className="flex flex-col rounded-[28px] border-2 border-line bg-card p-5">
          <div className="flex items-start gap-3">
            <Img src={TUTOR.avatar} alt="" className="size-12 shrink-0 rounded-full bg-sage/15 object-cover" />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-ink-soft">{TUTOR.name}’nin önerisi</p>
              <p className="mt-1 font-display text-xl font-black leading-snug">{weakest ? weakest.accuracy !== null ? `${weakest.label} isabetin %${weakest.accuracy}. Bugün buna 10 dakika ver.` : `${weakest.label} bölümünü henüz denemedin, oradan başlayalım.` : 'Karma bir setle ısın.'}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-soft">Her sorudan sonra Türkçe çözüm gelir: doğru cevabın neden doğru, çeldiricilerin neden yanlış olduğu.</p>
          {weakest && <Button className="mt-auto self-start" onClick={() => setRun({ section: weakest.key, n: 8 })} icon={<Target className="size-5" />}>{weakest.label} seti</Button>}
        </div>
      </section>

      <h2 className="mb-3 text-xl font-extrabold">Bölümler</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.stats.map((s, i) => (
          <motion.button
            key={s.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setRun({ section: s.key, n: Math.min(8, s.questions) })}
            className={clsx('press group relative flex flex-col rounded-3xl border-2 bg-card p-4 text-left transition', s.key === data.recommended ? 'border-ink shadow-[0_4px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}
          >
            {s.key === data.recommended && <span className="absolute -top-2.5 right-4 rounded-full bg-butter px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1f2433]">Önerilen</span>}
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-black leading-tight">{s.label}</span>
              <ArrowRight className="size-5 shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </span>
            <span className="mt-0.5 text-sm text-ink-soft">{s.hint}</span>
            <span className="mt-4 flex items-center gap-3">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
                <span className="block h-full rounded-full" style={{ width: `${s.accuracy ?? 0}%`, background: (s.accuracy ?? 0) >= 70 ? 'var(--color-mint)' : (s.accuracy ?? 0) >= 45 ? 'var(--color-butter)' : 'var(--color-berry)' }} />
              </span>
              <span className="w-24 text-right text-xs font-black tabular-nums text-ink-soft">{s.accuracy !== null ? `%${s.accuracy} · ${s.answered}` : `${s.questions} soru`}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function useSaveExam() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (b: { exam_target: ExamKey | null; exam_date?: string | null }) => patch<{ user: Me }>('/account', b.exam_target ? { ...b, preferences: { exam_mode: true } } : b),
    onSuccess: (r) => {
      if (user) setUser(r.user)
      qc.invalidateQueries({ queryKey: ['exam'] })
    },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
}

function PickExam() {
  const save = useSaveExam()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker="Sınav modu" title="Hangi sınava hazırlanıyorsun?" />
      <p className="-mt-3 mb-6 text-ink-soft">Seçtiğin sınava göre soru tipleri, okuma parçaları ve Defne’nin geri bildirimleri ayarlanır. İstediğin zaman değiştirebilirsin.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {EXAMS.map((e) => (
          <button key={e.key} onClick={() => save.mutate({ exam_target: e.key })} className="press flex items-center gap-4 rounded-3xl border-2 border-line bg-card p-4 text-left shadow-hard transition hover:border-ink/25">
            <span className="grid h-14 min-w-20 place-items-center rounded-2xl px-2 font-display text-lg font-black text-white" style={{ background: e.color }}>{e.name}</span>
            <span>
              <span className="block font-extrabold">{e.label}</span>
              <span className="block text-sm text-ink-soft">{e.text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ChangeExam({ current }: { current: ExamKey }) {
  const [open, setOpen] = useState(false)
  const save = useSaveExam()
  const { user } = useAuth()
  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>Sınavı / tarihi değiştir</Button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-12 z-30 w-72 rounded-2xl border-2 border-line bg-card p-2 shadow-soft">
            {EXAMS.map((e) => (
              <button key={e.key} onClick={() => { save.mutate({ exam_target: e.key }); setOpen(false) }} className={clsx('flex w-full items-center gap-3 rounded-xl p-2 text-left text-sm font-bold hover:bg-paper-2', e.key === current && 'bg-paper-2')}>
                <span className="grid h-8 min-w-14 place-items-center rounded-lg px-1 text-xs font-black text-white" style={{ background: e.color }}>{e.name}</span>
                {e.label}
                {e.key === current && <Check className="ml-auto size-4" strokeWidth={3} />}
              </button>
            ))}
            <label className="mt-1 block border-t-2 border-line px-2 pb-1 pt-3 text-xs font-black uppercase tracking-widest text-ink-soft">
              Sınav tarihi
              <input type="date" defaultValue={user?.exam_date ?? ''} min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)} onChange={(e) => save.mutate({ exam_target: current, exam_date: e.target.value || null })} className="mt-1.5 block w-full rounded-xl border-2 border-line bg-paper-2 px-3 py-2 text-sm font-bold normal-case tracking-normal text-ink" />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Runner({ section, n, onExit }: { section: string; n: number; onExit: () => void }) {
  const qc = useQueryClient()
  const [seed, setSeed] = useState(0)
  const { data, isLoading } = useQuery({ queryKey: ['exam-set', section, n, seed], queryFn: () => get<PracticeSet>(`/exam/practice?section=${section}&n=${n}`), gcTime: 0, staleTime: Infinity })
  const [i, setI] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [graded, setGraded] = useState<Graded | null>(null)
  const [log, setLog] = useState<{ q: Question; choice: number | null; g: Graded; ms: number }[]>([])
  const [left, setLeft] = useState(0)
  const started = useRef(Date.now())
  const qs = data?.questions ?? []
  const q = qs[i]
  const done = !!data && i >= qs.length

  useEffect(() => {
    if (!data || !q) return
    started.current = Date.now()
    setLeft(data.seconds_per_question)
  }, [data, q])
  useEffect(() => {
    if (!q || graded) return
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000)
    return () => clearInterval(t)
  }, [q, graded])

  const answer = useMutation({
    mutationFn: (c: number | null) => post<Graded>('/exam/answer', { question_id: q.id, choice: c, ms: Date.now() - started.current, exam: data?.exam }),
    onSuccess: (g, c) => {
      setGraded(g)
      setLog((l) => [...l, { q, choice: c, g, ms: Date.now() - started.current }])
      if (g.correct) sfx.correct(log.filter((x) => x.g.correct).length >= 2 ? 3 : 0)
      else sfx.wrong()
    },
  })
  const pick = useCallback(
    (c: number) => {
      if (graded || answer.isPending) return
      setChoice(c)
      answer.mutate(c)
    },
    [graded, answer],
  )
  const next = useCallback(() => {
    setGraded(null)
    setChoice(null)
    setI((x) => x + 1)
  }, [])

  // Time's up: count it as blank.
  useEffect(() => {
    if (q && !graded && left === 0 && data && Date.now() - started.current > 1000) answer.mutate(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!q) return
      const k = e.key.toUpperCase()
      const idx = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : /^[1-6]$/.test(k) ? Number(k) - 1 : -1
      if (!graded && idx >= 0 && idx < q.options.length) pick(idx)
      if (graded && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [q, graded, pick, next])

  useEffect(() => {
    if (done) {
      qc.invalidateQueries({ queryKey: ['exam'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      const right = log.filter((x) => x.g.correct).length
      if (log.length && right / log.length >= 0.7) {
        sfx.complete()
        celebrate(right === log.length)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const total = qs.length
  const right = log.filter((x) => x.g.correct).length
  const secs = data?.seconds_per_question ?? 90

  if (isLoading || !data) return <Spinner className="min-h-[50vh]" />
  if (!total) return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="font-display text-2xl font-black">Bu bölümde şimdilik soru yok.</p>
      <Button className="mt-6" onClick={onExit}>Geri dön</Button>
    </div>
  )

  if (done) {
    const xp = log.reduce((a, x) => a + x.g.xp, 0)
    const mins = Math.max(1, Math.round(log.reduce((a, x) => a + x.ms, 0) / 60000))
    const pct = Math.round((right / total) * 100)
    return (
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[28px] border-2 border-line bg-card p-6 text-center shadow-soft sm:p-8">
          <Trophy className="mx-auto size-12 text-butter-deep" />
          <p className="mt-3 font-display text-5xl font-black tabular-nums">{right}/{total}</p>
          <p className="mt-1 text-ink-soft">%{pct} isabet · {mins} dk · +{xp} XP</p>
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {log.map((x, k) => <span key={k} className={clsx('grid size-8 place-items-center rounded-lg text-xs font-black text-white', x.g.correct ? 'bg-mint' : 'bg-berry')}>{k + 1}</span>)}
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button onClick={() => { setI(0); setLog([]); setSeed((s) => s + 1) }} icon={<RotateCcw className="size-5" />}>Yeni set</Button>
            <Button variant="secondary" onClick={onExit}>Bölümlere dön</Button>
          </div>
        </motion.div>
        {log.some((x) => !x.g.correct) && (
          <div className="mt-6 space-y-3">
            <h3 className="text-lg font-extrabold">Yanlışlarının çözümü</h3>
            {log.filter((x) => !x.g.correct).map((x) => (
              <div key={x.q.id} className="rounded-2xl border-2 border-line bg-card p-4">
                <p className="text-sm font-semibold">{x.q.prompt}</p>
                <p className="mt-2 text-sm"><span className="font-black text-mint-deep">Doğru: {LETTERS[x.g.answer]}) {x.q.options[x.g.answer]}</span>{x.choice !== null && <span className="ml-2 text-berry line-through">{LETTERS[x.choice]}) {x.q.options[x.choice]}</span>}</p>
                {x.g.explanation && <p className="mt-2 text-sm text-ink-soft">{x.g.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* top bar */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onExit} aria-label="Çık" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><X className="size-6" /></button>
        <div className="flex flex-1 gap-1">
          {qs.map((_, k) => <span key={k} className={clsx('h-2 flex-1 rounded-full transition', k < log.length ? (log[k].g.correct ? 'bg-mint' : 'bg-berry') : k === i ? 'bg-ink/40' : 'bg-paper-2')} />)}
        </div>
        <span className={clsx('flex w-20 items-center justify-end gap-1 font-mono text-sm font-bold tabular-nums', left <= 10 && !graded ? 'text-berry' : 'text-ink-soft')}><Timer className="size-4" /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
      </div>

      <div className={clsx('grid gap-5 [&>*]:min-w-0', q.passage && 'lg:grid-cols-2')}>
        {q.passage && (
          <aside className="rounded-3xl border-2 border-line bg-card p-5 lg:sticky lg:top-24 lg:max-h-[70vh] lg:overflow-y-auto">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-ink-soft"><BookOpenText className="size-4" /> Okuma parçası</p>
            <p className="whitespace-pre-line font-read text-[17px] leading-relaxed">{q.passage}</p>
          </aside>
        )}
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ink-soft">
            <span className="rounded-md bg-lilac/15 px-2 py-0.5 text-lilac">{q.section_label}</span> Soru {i + 1}/{total}
          </p>
          <p className={clsx('whitespace-pre-line font-read leading-relaxed', q.prompt.length > 160 ? 'text-lg' : 'text-xl sm:text-[22px]')}>{q.prompt}</p>

          <div className="mt-5 grid gap-2.5">
            {q.options.map((o, k) => {
              const isAns = graded && graded.answer === k
              const isWrongPick = graded && choice === k && !graded.correct
              return (
                <button
                  key={k}
                  onClick={() => pick(k)}
                  disabled={!!graded}
                  className={clsx(
                    'press flex items-start gap-3 rounded-2xl border-2 px-3.5 py-3 text-left font-semibold transition',
                    isAns ? 'border-mint bg-mint/12' : isWrongPick ? 'border-berry bg-berry/10' : choice === k ? 'border-ink' : 'border-line bg-card hover:border-ink/25',
                    graded && !isAns && !isWrongPick && 'opacity-60',
                  )}
                >
                  <span className={clsx('grid size-7 shrink-0 place-items-center rounded-lg text-sm font-black', isAns ? 'bg-mint text-white' : isWrongPick ? 'bg-berry text-white' : 'bg-paper-2')}>{isAns ? <Check className="size-4" strokeWidth={3.5} /> : isWrongPick ? <X className="size-4" strokeWidth={3.5} /> : LETTERS[k]}</span>
                  <span className="pt-0.5">{o}</span>
                </button>
              )
            })}
          </div>

          <AnimatePresence>
            {graded && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={clsx('mt-5 rounded-3xl border-2 p-4', graded.correct ? 'border-mint/50 bg-mint/10' : 'border-berry/40 bg-berry/8')}>
                <p className={clsx('flex items-center gap-2 font-display text-xl font-black', graded.correct ? 'text-mint-deep' : 'text-berry')}>
                  {graded.correct ? <><Flame className="size-5" /> Doğru!</> : choice === null ? 'Süre doldu' : `Doğru cevap ${LETTERS[graded.answer]}`}
                  {graded.xp > 0 && <span className="ml-auto rounded-full bg-card px-2.5 py-0.5 text-sm text-ink">+{graded.xp} XP</span>}
                </p>
                {graded.explanation && <p className="mt-2 flex gap-2 text-[15px] leading-relaxed"><Lightbulb className="mt-0.5 size-4 shrink-0 text-butter-deep" /> {graded.explanation}</p>}
                <Button className="mt-4" onClick={next} autoFocus icon={<ArrowRight className="size-5" />}>{i === total - 1 ? 'Sonucu gör' : 'Sonraki soru'}</Button>
              </motion.div>
            )}
          </AnimatePresence>
          {!graded && <p className="mt-4 text-xs font-bold text-ink-soft">İpucu: klavyeden A-E ile işaretle · soru başı {Math.round(secs / 60 * 10) / 10} dk</p>}
        </div>
      </div>
    </div>
  )
}
