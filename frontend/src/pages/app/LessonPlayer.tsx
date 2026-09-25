import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Check, Gem, Infinity as InfinityIcon, Keyboard, Mic, MicOff, Snail, Volume2, X } from 'lucide-react'
import { img, rewardImg } from '@/lib/assets'
import { Ada } from '@/components/game/Ada'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { canListen, listen, normalize, similarity, speak } from '@/lib/speech'
import { ensureMic, micHelpText, readMicState, type MicState } from '@/lib/mic'
import { sfx } from '@/lib/fx'
import type { Exercise, RewardSummary } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Modal, Spinner } from '@/components/ui/Misc'
import { useReward } from '@/components/game/RewardProvider'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

interface LessonData {
  lesson: { id: number; title: string; xp_reward: number; exercises: Exercise[] }
  hearts: { hearts: number; unlimited: boolean }
}
type Answer = number | string | boolean | number[] | null

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)

function isCorrect(ex: Exercise, v: Answer): boolean {
  switch (ex.type) {
    case 'choice':
    case 'fill':
    case 'listen_choice':
      return v === ex.answer
    case 'translate':
      return typeof v === 'string' && [ex.answer, ...(ex.alternatives ?? [])].some((a) => normalize(a) === normalize(v))
    case 'listen_type':
      return typeof v === 'string' && normalize(v) === normalize(ex.answer)
    case 'speak':
      return typeof v === 'string' && similarity(v, ex.text) >= 0.6
    case 'match':
      return v === true
    case 'spot_error':
      return v === `${ex.error_index}:${ex.answer}`
    case 'dialogue':
      return v === ex.answer
    case 'sequence':
      return Array.isArray(v) && v.length === ex.answer.length && v.every((x, i) => x === ex.answer[i])
  }
}

/** The sentence with the hunted mistake already put right. */
const fixedSentence = (ex: Extract<Exercise, { type: 'spot_error' }>) =>
  ex.words.map((w, i) => (i === ex.error_index ? ex.options[ex.answer] : w)).join(' ')

const correctText = (ex: Exercise) => {
  if (ex.type === 'spot_error') return fixedSentence(ex)
  if (ex.type === 'sequence') return ex.answer.map((i) => ex.items[i]).join(' → ')
  if ('options' in ex && typeof ex.answer === 'number') return ex.options[ex.answer]
  if (ex.type === 'translate' || ex.type === 'listen_type') return ex.answer
  if (ex.type === 'speak') return ex.text
  return ''
}

/** Each drill gets its own name, colour and kicker so a lesson feels like a set of scenes. */
const DRILL: Record<Exercise['type'], { label: string; title: string; accent: string; tint: string }> = {
  choice: { label: 'Seçim', title: 'Doğru seçeneği seç', accent: 'text-sky', tint: 'from-sky/10' },
  fill: { label: 'Boşluk', title: 'Boşluğu doldur', accent: 'text-sky', tint: 'from-sky/10' },
  listen_choice: { label: 'Kulak', title: 'Ne duydun?', accent: 'text-lilac', tint: 'from-lilac/12' },
  listen_type: { label: 'Dikte', title: 'Duyduğunu yaz', accent: 'text-lilac', tint: 'from-lilac/12' },
  translate: { label: 'Çeviri', title: 'Bu cümleyi çevir', accent: 'text-mint-deep', tint: 'from-mint/10' },
  speak: { label: 'Mikrofon', title: 'Bu cümleyi sesli söyle', accent: 'text-flame', tint: 'from-flame/10' },
  match: { label: 'Eşleştir', title: 'Eşleşen çiftleri bul', accent: 'text-butter-deep', tint: 'from-butter/14' },
  spot_error: { label: 'Hata avı', title: 'Bu cümlede bir hata var. Yakala.', accent: 'text-berry', tint: 'from-berry/12' },
  dialogue: { label: 'Sahne', title: 'Sıra sende. Ne dersin?', accent: 'text-flame', tint: 'from-flame/10' },
  sequence: { label: 'Sıralama', title: 'Doğru sıraya diz', accent: 'text-mint-deep', tint: 'from-mint/10' },
}

export default function LessonPlayer() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const showReward = useReward()
  const toast = useToast()
  const { data, error, isLoading } = useQuery({ queryKey: ['lesson', id], queryFn: () => get<LessonData>(`/lessons/${id}`), staleTime: Infinity })

  const [queue, setQueue] = useState<number[]>([])
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [value, setValue] = useState<Answer>(null)
  const [checked, setChecked] = useState<null | boolean>(null)
  const [hearts, setHearts] = useState(5)
  const [done, setDone] = useState(0)
  const [combo, setCombo] = useState(0)
  const [outOfHearts, setOutOfHearts] = useState(false)
  const [quit, setQuit] = useState(false)
  const started = useRef(Date.now())

  useEffect(() => {
    if (data) {
      setQueue(data.lesson.exercises.map((_, i) => i))
      setHearts(data.hearts.hearts)
    }
  }, [data])

  const complete = useMutation({
    mutationFn: () =>
      post<{ score: number; reward: RewardSummary; perfect: boolean }>(`/lessons/${id}/complete`, {
        answers: data!.lesson.exercises.map((_, i) => answers[i] ?? null),
        seconds: Math.round((Date.now() - started.current) / 1000),
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['path'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      showReward(r.reward, r.perfect ? 'Kusursuz ders!' : `Ders tamam · %${r.score}`)
      nav('/learn', { replace: true })
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })

  const refill = useMutation({
    mutationFn: () => post('/hearts/refill'),
    onSuccess: () => {
      setHearts(5)
      setOutOfHearts(false)
    },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })

  if (isLoading) return <Spinner />
  if (error) {
    const e = error as ApiError
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="ink-card max-w-sm p-8">
          <p className="mb-4 text-lg font-bold">{e.message}</p>
          <Button onClick={() => nav(e.status === 402 ? '/premium' : '/learn')}>{e.status === 402 ? "Premium'a bak" : 'Geri dön'}</Button>
        </div>
      </div>
    )
  }
  if (!data || !queue.length) return <Spinner />

  const exercises = data.lesson.exercises
  const total = exercises.length
  const current = queue[0]
  const ex = exercises[current]
  const unlimited = data.hearts.unlimited || !!user?.premium.active

  const check = () => {
    const ok = isCorrect(ex, value)
    setChecked(ok)
    // first attempt is what the server grades
    if (answers[current] === undefined) setAnswers((a) => ({ ...a, [current]: ex.type === 'speak' && ok ? ex.text : value }))
    setCombo((c) => (ok ? c + 1 : 0))
    if (ok) sfx.correct()
    else {
      sfx.wrong()
      if (!unlimited) setHearts((h) => Math.max(0, h - 1))
    }
  }

  const next = () => {
    const wasOk = checked
    setChecked(null)
    setValue(null)
    if (!wasOk && !unlimited && hearts <= 0) return setOutOfHearts(true)
    if (wasOk) setDone((d) => d + 1)
    const rest = queue.slice(1)
    const nextQueue = wasOk ? rest : [...rest, current] // mistakes come back at the end
    if (!nextQueue.length) return complete.mutate()
    setQueue(nextQueue)
  }

  const canCheck = value !== null && value !== '' && checked === null

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Each drill tints the stage, so the lesson reads as a set of scenes rather than a form. */}
      <motion.div
        key={ex.type}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={clsx('pointer-events-none fixed inset-x-0 top-0 h-[55vh] bg-gradient-to-b to-transparent', DRILL[ex.type].tint)}
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <header className="safe-top flex items-center gap-4 px-5 pt-5">
          <button onClick={() => setQuit(true)} aria-label="Dersten çık" className="text-ink-soft hover:text-ink">
            <X className="size-7" />
          </button>
          {/* A film strip: one segment per drill, so progress is countable at a glance. */}
          <div className="flex flex-1 gap-1" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.span
                  className={clsx('block h-full rounded-full', i < done ? 'bg-mint' : 'bg-flame')}
                  initial={false}
                  animate={{ width: i < done ? '100%' : i === done ? '35%' : '0%' }}
                  transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                />
              </span>
            ))}
          </div>
          <span className="flex items-center gap-1 text-lg font-black text-berry">
            <Img src={rewardImg('heart')} alt="" className="size-7" />
            {unlimited ? <InfinityIcon className="size-5" /> : hearts}
          </span>
        </header>

        <AnimatePresence>
          {combo >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-none absolute right-5 top-16 z-10 flex items-center gap-2 rounded-2xl bg-flame px-3 py-1.5 text-white shadow-soft"
            >
              <Img src={rewardImg('flame')} alt="" className="size-6" />
              <span className="font-display text-sm font-black">{combo} doğru üst üste!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 px-5 py-8">
          <AnimatePresence mode="wait">
            <motion.div key={`${current}-${queue.length}`} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} transition={{ duration: 0.2 }}>
              <ExerciseView ex={ex} value={value} setValue={setValue} locked={checked !== null} ttsRate={user?.preferences?.tts_rate} />
            </motion.div>
          </AnimatePresence>
        </main>

      <footer className={clsx('safe-bottom border-t-2 px-5 pb-4 pt-4 transition-colors', checked === null ? 'border-line' : checked ? 'border-transparent bg-mint/15' : 'border-transparent bg-berry/12')}>
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
          {checked !== null && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-1 items-center gap-3">
              <span className={clsx('grid size-12 place-items-center rounded-full text-white', checked ? 'bg-mint' : 'bg-berry')}>
                {checked ? <Check className="size-7" strokeWidth={3} /> : <X className="size-7" strokeWidth={3} />}
              </span>
              <div>
                <p className={clsx('text-2xl font-black', checked ? 'text-mint-deep' : 'text-berry')}>{checked ? ['Harika!', 'Süper!', 'Aynen böyle!', 'Mükemmel!'][done % 4] : 'Doğru cevap:'}</p>
                {!checked && <p className="text-lg font-bold text-berry">{correctText(ex)}</p>}
              </div>
            </motion.div>
          )}
          <div className="flex gap-3 sm:ml-auto">
            {checked === null && ex.type === 'speak' && (
              <Button variant="ghost" onClick={() => { setValue(ex.text); }}>Şu an konuşamıyorum</Button>
            )}
            {checked === null ? (
              <Button size="lg" className="flex-1 sm:w-48 sm:flex-none" disabled={!canCheck} onClick={check}>Kontrol et</Button>
            ) : (
              <Button size="lg" variant={checked ? 'success' : 'danger'} className="flex-1 sm:w-48 sm:flex-none" onClick={next} loading={complete.isPending} autoFocus>Devam</Button>
            )}
          </div>
        </div>
      </footer>
      </div>

      <Modal open={outOfHearts} onClose={() => nav('/learn')} dismissable={false}>
        <div className="text-center">
          <Img src={rewardImg('heart')} alt="" className="mx-auto mb-3 size-24 object-contain grayscale" />
          <h2 className="text-2xl font-extrabold">Canın bitti!</h2>
          <p className="mb-6 mt-2 text-ink-soft">Canlar her 30 dakikada bir yenilenir. Hemen devam etmek istersen elmasla doldurabilir ya da Premium ile sınırsız can alabilirsin.</p>
          <div className="grid gap-3">
            <Button variant="butter" loading={refill.isPending} onClick={() => refill.mutate()} icon={<Gem className="size-5" />}>Canları doldur · 350 elmas</Button>
            <Button onClick={() => nav('/premium')}>Sınırsız can · Premium</Button>
            <Button variant="ghost" onClick={() => nav('/learn')}>Dersten çık</Button>
          </div>
        </div>
      </Modal>
      <Modal open={quit} onClose={() => setQuit(false)}>
        <div className="text-center">
          <h2 className="text-2xl font-extrabold">Çıkmak istediğine emin misin?</h2>
          <p className="mb-6 mt-2 text-ink-soft">Bu dersteki ilerlemen kaybolacak.</p>
          <div className="grid gap-3">
            <Button onClick={() => setQuit(false)}>Devam et</Button>
            <Button variant="ghost" onClick={() => nav('/learn')}>Dersi bitir</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SpeakerButton({ text, rate, big }: { text: string; rate?: number; big?: boolean }) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={() => speak(text, { rate: rate ?? 0.95 })} className={clsx('press grid place-items-center rounded-2xl bg-sky text-white shadow-[0_4px_0_0_var(--color-sky-deep)]', big ? 'size-24' : 'size-14')} aria-label="Dinle">
        <Volume2 className={big ? 'size-11' : 'size-7'} />
      </button>
      <button type="button" onClick={() => speak(text, { rate: 0.6 })} className={clsx('press grid place-items-center self-end rounded-2xl border-2 border-line bg-card text-sky shadow-hard', big ? 'size-14' : 'size-10')} aria-label="Yavaş dinle">
        <Snail className={big ? 'size-7' : 'size-5'} />
      </button>
    </div>
  )
}

function ExerciseView({ ex, value, setValue, locked, ttsRate }: { ex: Exercise; value: Answer; setValue: (v: Answer) => void; locked: boolean; ttsRate?: number }) {
  useEffect(() => {
    if ('audio' in ex && ex.audio) setTimeout(() => speak(ex.audio!, { rate: ttsRate }), 250)
  }, [ex, ttsRate])

  const d = DRILL[ex.type]

  return (
    <div>
      <p className={clsx('mb-1.5 text-xs font-black uppercase tracking-[0.2em]', d.accent)}>{d.label}</p>
      <h1 className="mb-7 text-2xl font-extrabold sm:text-3xl">{d.title}</h1>
      {(ex.type === 'choice' || ex.type === 'fill' || ex.type === 'listen_choice') && (
        <>
          {ex.type === 'listen_choice' ? (
            <div className="mb-8"><SpeakerButton text={ex.audio} rate={ttsRate} big /></div>
          ) : (
            <div className="mb-8 flex items-center gap-3">
              {ex.type === 'choice' && ex.audio && <SpeakerButton text={ex.audio} rate={ttsRate} />}
              <p className="rounded-2xl border-2 border-line bg-card px-5 py-4 text-xl font-bold">
                {ex.prompt.split('___').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="mx-1 inline-block min-w-16 border-b-4 border-flame text-center text-flame">{typeof value === 'number' ? ex.options[value] : ' '}</span>}
                  </span>
                ))}
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {ex.options.map((o, i) => (
              <button key={i} disabled={locked} onClick={() => { sfx.tap(); setValue(i) }} className={clsx('press flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold', value === i ? 'border-sky bg-sky/10 text-sky shadow-[0_3px_0_0_var(--color-sky)]' : 'border-line bg-card shadow-hard hover:bg-paper-2')}>
                <span className="grid size-7 place-items-center rounded-lg border-2 border-current text-xs font-black opacity-70">{i + 1}</span>
                {o}
              </button>
            ))}
          </div>
        </>
      )}
      {ex.type === 'translate' && <TileBuilder ex={ex} value={value} setValue={setValue} locked={locked} />}
      {ex.type === 'listen_type' && (
        <div className="space-y-6">
          <SpeakerButton text={ex.audio} rate={ttsRate} big />
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => setValue(e.target.value)}
            disabled={locked}
            placeholder="İngilizce yaz…"
            autoFocus
            className="min-h-32 w-full rounded-2xl border-2 border-line bg-card p-4 text-lg font-semibold shadow-hard-sm focus:outline-none focus:ring-4 focus:ring-sky/25"
          />
        </div>
      )}
      {ex.type === 'speak' && <SpeakExercise ex={ex} setValue={setValue} locked={locked} value={value} ttsRate={ttsRate} />}
      {ex.type === 'match' && <MatchGame ex={ex} onDone={() => setValue(true)} />}
      {ex.type === 'spot_error' && <SpotError ex={ex} value={value} setValue={setValue} locked={locked} />}
      {ex.type === 'dialogue' && <DialogueScene ex={ex} value={value} setValue={setValue} locked={locked} ttsRate={ttsRate} />}
      {ex.type === 'sequence' && <SequenceTrack ex={ex} value={value} setValue={setValue} locked={locked} />}
    </div>
  )
}

/**
 * Hata Avı — a sentence carrying the kind of slip a Turkish speaker actually makes.
 * Tap the guilty word, then choose its replacement. The Turkish "why" lands with the result.
 */
function SpotError({ ex, value, setValue, locked }: { ex: Extract<Exercise, { type: 'spot_error' }>; value: Answer; setValue: (v: Answer) => void; locked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null)
  const chosen = typeof value === 'string' ? Number(value.split(':')[1]) : null

  const tapWord = (i: number) => {
    if (locked) return
    sfx.tap()
    setPicked(i)
    setValue(null)
  }

  return (
    <div>
      <p className="mb-6 text-ink-soft">{ex.prompt}</p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-3 rounded-2xl border-2 border-line bg-card p-5 text-2xl font-bold leading-relaxed">
        {ex.words.map((w, i) => (
          <button
            key={i}
            disabled={locked}
            onClick={() => tapWord(i)}
            className={clsx(
              'rounded-lg px-1.5 py-0.5 transition',
              picked === i ? 'bg-berry text-white' : 'hover:bg-paper-2',
              locked && i === ex.error_index && 'bg-mint/25 text-mint-deep',
            )}
          >
            {w}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {picked !== null && !locked && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <p className="mb-3 font-bold text-ink-soft">
              “<span className="text-berry">{ex.words[picked]}</span>” yerine ne gelmeli?
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {ex.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => { sfx.tap(); setValue(`${picked}:${i}`) }}
                  className={clsx('press rounded-2xl border-2 px-4 py-4 text-lg font-bold', chosen === i ? 'border-berry bg-berry/10 text-berry shadow-[0_3px_0_0_var(--color-berry)]' : 'border-line bg-card shadow-hard hover:bg-paper-2')}
                >
                  {o}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {locked && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex gap-3 rounded-2xl bg-butter/15 p-4">
          <Ada className="size-11 shrink-0" />
          <p className="text-[15px] leading-relaxed">{ex.explanation_tr}</p>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Sahne — a real scene from the scenario library with the learner's line missing.
 * Choosing a reply is a conversation decision, not a grammar gap-fill.
 */
function DialogueScene({ ex, value, setValue, locked, ttsRate }: { ex: Extract<Exercise, { type: 'dialogue' }>; value: Answer; setValue: (v: Answer) => void; locked: boolean; ttsRate?: number }) {
  return (
    <div>
      {ex.scene && (
        <div className="relative mb-6 h-36 overflow-hidden rounded-3xl">
          <Img src={img(`${ex.scene}.webp`)} alt="" className="photo" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <p className="absolute inset-x-5 bottom-3 font-display text-lg font-black text-white">{ex.prompt}</p>
        </div>
      )}
      {!ex.scene && <p className="mb-6 text-ink-soft">{ex.prompt}</p>}

      <div className="space-y-3">
        {ex.lines.map((l, i) => (
          <div key={i} className={clsx('flex gap-3', l.who === 'Sen' && 'flex-row-reverse')}>
            <span className={clsx('grid size-10 shrink-0 place-items-center rounded-2xl font-display text-sm font-black text-white', l.who === 'Sen' ? 'bg-flame' : 'bg-sky')}>{l.who[0]}</span>
            <div className={clsx('max-w-[80%] rounded-2xl px-4 py-3', l.who === 'Sen' ? 'bg-flame/10' : 'bg-paper-2')}>
              <p className="text-[11px] font-black uppercase tracking-widest text-ink-soft">{l.who}</p>
              <p className="text-lg font-semibold">{l.text}</p>
              {l.tr && <p className="mt-0.5 text-sm text-ink-soft">{l.tr}</p>}
              {!l.tr && (
                <button type="button" onClick={() => speak(l.text, { rate: ttsRate })} className="mt-1 text-ink-soft hover:text-sky" aria-label="Dinle">
                  <Volume2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex flex-row-reverse gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-flame font-display text-sm font-black text-white">S</span>
          <div className={clsx('min-h-14 min-w-[60%] rounded-2xl border-2 border-dashed px-4 py-3 text-lg font-semibold', typeof value === 'number' ? 'border-flame bg-flame/10' : 'border-line text-ink-soft')}>
            {typeof value === 'number' ? ex.options[value] : 'Cevabını seç…'}
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-3">
        {ex.options.map((o, i) => (
          <button
            key={i}
            disabled={locked}
            onClick={() => { sfx.tap(); setValue(i) }}
            className={clsx('press rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold', value === i ? 'border-flame bg-flame/10 text-flame shadow-[0_3px_0_0_var(--color-flame)]' : 'border-line bg-card shadow-hard hover:bg-paper-2')}
          >
            {o}
          </button>
        ))}
      </div>

      {locked && ex.note_tr && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex gap-3 rounded-2xl bg-butter/15 p-4">
          <Ada className="size-11 shrink-0" />
          <p className="text-[15px] leading-relaxed">{ex.note_tr}</p>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Sıralama — put the steps of a story or a real-life task in order. Tap to add a stop
 * to the track, tap again to take it off.
 */
function SequenceTrack({ ex, value, setValue, locked }: { ex: Extract<Exercise, { type: 'sequence' }>; value: Answer; setValue: (v: Answer) => void; locked: boolean }) {
  const order = Array.isArray(value) ? value : []
  const toggle = (i: number) => {
    if (locked) return
    sfx.tap()
    const next = order.includes(i) ? order.filter((x) => x !== i) : [...order, i]
    setValue(next.length === ex.items.length ? next : next.length ? next : null)
  }
  // Shown in a fresh random order each time, otherwise the answer is just the list order.
  const pool = useMemo(() => shuffle(ex.items.map((_, i) => i)), [ex])
  const left = pool.filter((i) => !order.includes(i))

  return (
    <div>
      <p className="mb-6 text-ink-soft">{ex.prompt}</p>

      <ol className="relative mb-7 space-y-2.5 pl-8">
        <span className="absolute bottom-3 left-[13px] top-3 w-0.5 rounded-full bg-line" />
        {order.map((idx, pos) => (
          <motion.li key={idx} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="relative">
            <span className="absolute -left-8 top-3 grid size-7 place-items-center rounded-full bg-mint font-display text-sm font-black text-white ring-4 ring-paper">{pos + 1}</span>
            <button disabled={locked} onClick={() => toggle(idx)} className="w-full rounded-2xl border-2 border-mint/40 bg-mint/10 px-4 py-3 text-left text-lg font-semibold">
              {ex.items[idx]}
            </button>
          </motion.li>
        ))}
        {order.length < ex.items.length && (
          <li className="relative">
            <span className="absolute -left-8 top-3 grid size-7 place-items-center rounded-full bg-paper-2 font-display text-sm font-black text-ink-soft ring-4 ring-paper">{order.length + 1}</span>
            <div className="rounded-2xl border-2 border-dashed border-line px-4 py-3 text-lg font-semibold text-ink-soft">Sıradaki adımı seç…</div>
          </li>
        )}
      </ol>

      <div className="grid gap-3">
        {left.map((i) => (
          <motion.button key={i} layout disabled={locked} onClick={() => toggle(i)} className="press rounded-2xl border-2 border-line bg-card px-4 py-3.5 text-left text-lg font-bold shadow-hard hover:bg-paper-2">
            {ex.items[i]}
          </motion.button>
        ))}
      </div>

      {locked && ex.note_tr && <p className="mt-6 rounded-2xl bg-butter/15 p-4 text-[15px]">{ex.note_tr}</p>}
    </div>
  )
}

function TileBuilder({ ex, value, setValue, locked }: { ex: Extract<Exercise, { type: 'translate' }>; value: Answer; setValue: (v: Answer) => void; locked: boolean }) {
  const tiles = useMemo(() => shuffle(ex.tiles.map((t, i) => ({ t, i }))), [ex])
  const [picked, setPicked] = useState<number[]>([])
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    if (!typing) setValue(picked.length ? picked.map((i) => ex.tiles[i]).join(' ') : null)
  }, [picked, typing, ex, setValue])

  return (
    <div>
      <div className="mb-6 flex items-start gap-3"><Ada className="size-14" /><p className="relative rounded-2xl border-2 border-line bg-card px-5 py-4 text-xl font-bold">{ex.prompt}</p></div>
      {typing ? (
        <textarea value={(value as string) ?? ''} onChange={(e) => setValue(e.target.value)} disabled={locked} autoFocus placeholder="İngilizce yaz…" className="min-h-32 w-full rounded-2xl border-2 border-line bg-card p-4 text-lg font-semibold shadow-hard-sm focus:outline-none" />
      ) : (
        <>
          <div className="mb-6 flex min-h-[4.5rem] flex-wrap content-start gap-2 border-b-2 border-dashed border-line/30 pb-3">
            {picked.map((i) => (
              <motion.button layoutId={`tile-${i}`} key={i} disabled={locked} onClick={() => setPicked((p) => p.filter((x) => x !== i))} className="rounded-xl border-2 border-line bg-card px-3 py-2 text-lg font-bold shadow-hard">
                {ex.tiles[i]}
              </motion.button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {tiles.map(({ t, i }) =>
              picked.includes(i) ? (
                <span key={i} className="rounded-xl bg-line px-3 py-2 text-lg font-bold text-transparent">{t}</span>
              ) : (
                <motion.button layoutId={`tile-${i}`} key={i} disabled={locked} onClick={() => { sfx.tap(); setPicked((p) => [...p, i]) }} className="press rounded-xl border-2 border-line bg-card px-3 py-2 text-lg font-bold shadow-hard">
                  {t}
                </motion.button>
              ),
            )}
          </div>
        </>
      )}
      <button onClick={() => { setTyping((t) => !t); setValue(null); setPicked([]) }} className="mt-6 flex items-center gap-2 text-sm font-bold text-ink-soft">
        <Keyboard className="size-4" /> {typing ? 'Kelime kutucuklarını kullan' : 'Klavyeyle yaz'}
      </button>
    </div>
  )
}

function SpeakExercise({ ex, setValue, locked, value, ttsRate }: { ex: Extract<Exercise, { type: 'speak' }>; setValue: (v: Answer) => void; locked: boolean; value: Answer; ttsRate?: number }) {
  const [listening, setListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [err, setErr] = useState('')
  const [mic, setMic] = useState<MicState>('unknown')
  const stop = useRef<() => void>(() => {})

  // Ask the moment the drill opens, so the system dialog is already answered by the
  // time the learner reaches for the button.
  useEffect(() => {
    let alive = true
    readMicState().then((s) => {
      if (!alive) return
      setMic(s)
      if (s !== 'granted' && s !== 'denied') ensureMic().then((r) => alive && setMic(r))
    })
    return () => {
      alive = false
      stop.current()
    }
  }, [ex])

  const toggle = async () => {
    if (listening) return stop.current()
    setErr('')
    setPartial('')
    const state = await ensureMic()
    setMic(state)
    if (state === 'denied') return
    setListening(true)
    stop.current = listen({
      onPartial: setPartial,
      onFinal: (t) => setValue(t),
      onError: (e) => {
        if (e === 'not-allowed') setMic('denied')
        else setErr(e === 'unsupported' ? 'Bu cihaz konuşma tanımayı desteklemiyor.' : 'Seni duyamadım, tekrar dene.')
      },
      onEnd: () => setListening(false),
    })
  }

  const words = ex.text.split(' ')
  const heard = new Set(normalize((value as string) ?? partial).split(' '))
  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <SpeakerButton text={ex.text} rate={ttsRate} />
        <div>
          <p className="text-2xl font-bold leading-snug">
            {words.map((w, i) => (
              <span key={i} className={clsx('mr-1.5', heard.has(normalize(w)) && 'text-mint-deep underline decoration-mint decoration-4 underline-offset-4')}>{w}</span>
            ))}
          </p>
          {ex.translation && <p className="mt-1 text-ink-soft">{ex.translation}</p>}
        </div>
      </div>

      {mic === 'denied' ? (
        <MicBlocked onRetry={async () => setMic(await ensureMic())} />
      ) : canListen() ? (
        <>
          <button
            disabled={locked}
            onClick={toggle}
            className={clsx(
              'press relative mx-auto flex w-full max-w-sm items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 py-6 text-lg font-black uppercase',
              listening ? 'border-flame bg-flame text-white shadow-[0_4px_0_0_var(--color-flame-deep)]' : 'border-line bg-card text-sky shadow-hard',
            )}
          >
            {listening && (
              <span aria-hidden className="absolute inset-0 -z-0">
                <span className="absolute inset-0 animate-ping rounded-2xl bg-white/20" />
              </span>
            )}
            {listening ? <><MicOff className="relative size-6" /> Dinliyorum… (bitir)</> : <><Mic className="size-6 text-flame" /> Konuşmak için dokun</>}
          </button>
          {mic === 'prompt' && <p className="mt-3 text-center text-sm font-semibold text-ink-soft">Tarayıcı mikrofon izni isteyecek — “İzin ver”e dokun.</p>}
        </>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-line/40 p-4 text-center text-sm text-ink-soft">Bu tarayıcı konuşma tanımayı desteklemiyor. Chrome ya da uygulamamızı kullan veya “Şu an konuşamıyorum”a bas.</p>
      )}

      {(partial || value) && <p className="mt-4 text-center font-semibold text-ink-soft">“{(value as string) || partial}”</p>}
      {err && <p className="mt-3 text-center font-bold text-berry">{err}</p>}
    </div>
  )
}

/** Shown when the site is blocked: says exactly where to turn the microphone back on. */
export function MicBlocked({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border-2 border-berry/30 bg-berry/8 p-5 text-center">
      <MicOff className="mx-auto mb-2 size-8 text-berry" />
      <p className="font-extrabold">Mikrofon izni kapalı</p>
      <p className="mt-1 text-sm text-ink-soft">{micHelpText()}</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Tekrar dene</Button>
    </div>
  )
}

function MatchGame({ ex, onDone }: { ex: Extract<Exercise, { type: 'match' }>; onDone: () => void }) {
  const left = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ t: p[0], i }))), [ex])
  const right = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ t: p[1], i }))), [ex])
  const [sel, setSel] = useState<{ side: 'l' | 'r'; i: number } | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [wrong, setWrong] = useState<number | null>(null)

  const pick = (side: 'l' | 'r', i: number, t: string) => {
    if (matched.includes(i)) return
    if (side === 'l') speak(t, { rate: 1 })
    if (!sel || sel.side === side) return setSel({ side, i })
    if (sel.i === i) {
      sfx.correct()
      const m = [...matched, i]
      setMatched(m)
      setSel(null)
      if (m.length === ex.pairs.length) onDone()
    } else {
      sfx.wrong()
      setWrong(i)
      setTimeout(() => setWrong(null), 400)
      setSel(null)
    }
  }

  const cell = (side: 'l' | 'r', it: { t: string; i: number }) => {
    const isSel = sel?.side === side && sel.i === it.i
    const isDone = matched.includes(it.i)
    return (
      <motion.button
        key={side + it.i}
        animate={wrong === it.i && !isDone ? { x: [0, -6, 6, 0] } : {}}
        onClick={() => pick(side, it.i, it.t)}
        disabled={isDone}
        className={clsx('press rounded-2xl border-2 px-3 py-4 text-lg font-bold', isDone ? 'border-transparent bg-paper-2 text-ink-soft/50' : isSel ? 'border-sky bg-sky/10 text-sky shadow-[0_3px_0_0_var(--color-sky)]' : 'border-line bg-card shadow-hard')}
      >
        {it.t}
      </motion.button>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-3">{left.map((it) => cell('l', it))}</div>
      <div className="grid gap-3">{right.map((it) => cell('r', it))}</div>
    </div>
  )
}
