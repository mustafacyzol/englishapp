import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Check, Gem, Heart, Infinity as InfinityIcon, Keyboard, Mic, MicOff, Snail, Volume2, X } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { canListen, listen, normalize, similarity, speak } from '@/lib/speech'
import { sfx } from '@/lib/fx'
import type { Exercise, RewardSummary } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Modal, Progress, Spinner } from '@/components/ui/Misc'
import { useReward } from '@/components/game/RewardProvider'
import { useToast } from '@/components/ui/Toast'

interface LessonData {
  lesson: { id: number; title: string; xp_reward: number; exercises: Exercise[] }
  hearts: { hearts: number; unlimited: boolean }
}
type Answer = number | string | boolean | null

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
  }
}

const correctText = (ex: Exercise) =>
  'options' in ex && typeof ex.answer === 'number' ? ex.options[ex.answer] : ex.type === 'translate' || ex.type === 'listen_type' ? ex.answer : ex.type === 'speak' ? ex.text : ''

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
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="safe-top flex items-center gap-4 px-5 pt-5">
        <button onClick={() => setQuit(true)} aria-label="Dersten çık" className="text-ink-soft hover:text-ink">
          <X className="size-7" />
        </button>
        <Progress value={done} max={total} color="bg-mint" tall className="flex-1" />
        <span className="flex items-center gap-1 font-display text-lg font-extrabold text-berry">
          <Heart className="size-6 fill-berry" />
          {unlimited ? <InfinityIcon className="size-5" /> : hearts}
        </span>
      </header>

      <main className="flex-1 px-5 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={`${current}-${queue.length}`} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} transition={{ duration: 0.2 }}>
            <ExerciseView ex={ex} value={value} setValue={setValue} locked={checked !== null} ttsRate={user?.preferences?.tts_rate} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className={clsx('safe-bottom border-t-2 px-5 pb-4 pt-4 transition-colors', checked === null ? 'border-line/15' : checked ? 'border-mint bg-mint/20' : 'border-berry bg-berry/15')}>
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
          {checked !== null && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-1 items-center gap-3">
              <span className={clsx('grid size-12 place-items-center rounded-full border-2 border-line', checked ? 'bg-mint' : 'bg-berry text-white')}>
                {checked ? <Check className="size-7" strokeWidth={3} /> : <X className="size-7" strokeWidth={3} />}
              </span>
              <div>
                <p className="font-display text-xl font-extrabold">{checked ? ['Harika!', 'Süper!', 'Aynen böyle!', 'Mükemmel!'][done % 4] : 'Doğru cevap:'}</p>
                {!checked && <p className="font-semibold">{correctText(ex)}</p>}
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

      <Modal open={outOfHearts} onClose={() => nav('/learn')} dismissable={false}>
        <div className="text-center">
          <Heart className="mx-auto mb-3 size-16 fill-berry/20 text-berry" />
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
      <button type="button" onClick={() => speak(text, { rate: rate ?? 0.95 })} className={clsx('press grid place-items-center rounded-2xl border-2 border-line bg-sky text-white shadow-hard', big ? 'size-24' : 'size-14')} aria-label="Dinle">
        <Volume2 className={big ? 'size-11' : 'size-7'} />
      </button>
      <button type="button" onClick={() => speak(text, { rate: 0.6 })} className={clsx('press grid place-items-center self-end rounded-2xl border-2 border-line bg-card shadow-hard-sm', big ? 'size-14' : 'size-10')} aria-label="Yavaş dinle">
        <Snail className={big ? 'size-7' : 'size-5'} />
      </button>
    </div>
  )
}

function ExerciseView({ ex, value, setValue, locked, ttsRate }: { ex: Exercise; value: Answer; setValue: (v: Answer) => void; locked: boolean; ttsRate?: number }) {
  useEffect(() => {
    if ('audio' in ex && ex.audio) setTimeout(() => speak(ex.audio!, { rate: ttsRate }), 250)
  }, [ex, ttsRate])

  const title = { choice: 'Doğru seçeneği seç', fill: 'Boşluğu doldur', listen_choice: 'Ne duydun?', translate: 'Bu cümleyi çevir', listen_type: 'Duyduğunu yaz', speak: 'Bu cümleyi sesli söyle', match: 'Eşleşen çiftleri bul' }[ex.type]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">{title}</h1>
      {(ex.type === 'choice' || ex.type === 'fill' || ex.type === 'listen_choice') && (
        <>
          {ex.type === 'listen_choice' ? (
            <div className="mb-8"><SpeakerButton text={ex.audio} rate={ttsRate} big /></div>
          ) : (
            <div className="mb-8 flex items-center gap-3">
              {ex.type === 'choice' && ex.audio && <SpeakerButton text={ex.audio} rate={ttsRate} />}
              <p className="rounded-2xl border-2 border-line bg-card px-5 py-4 text-xl font-bold shadow-hard-sm">
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
              <button key={i} disabled={locked} onClick={() => { sfx.tap(); setValue(i) }} className={clsx('press flex items-center gap-3 rounded-2xl border-2 border-line px-4 py-4 text-left text-lg font-bold shadow-hard', value === i ? 'bg-sky text-white' : 'bg-card hover:bg-paper-2')}>
                <span className="grid size-7 place-items-center rounded-lg border-2 border-current font-mono text-xs">{i + 1}</span>
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
      <p className="mb-6 rounded-2xl border-2 border-line bg-butter px-5 py-4 text-xl font-bold text-[#1B1F3B] shadow-hard-sm">{ex.prompt}</p>
      {typing ? (
        <textarea value={(value as string) ?? ''} onChange={(e) => setValue(e.target.value)} disabled={locked} autoFocus placeholder="İngilizce yaz…" className="min-h-32 w-full rounded-2xl border-2 border-line bg-card p-4 text-lg font-semibold shadow-hard-sm focus:outline-none" />
      ) : (
        <>
          <div className="mb-6 flex min-h-[4.5rem] flex-wrap content-start gap-2 border-b-2 border-dashed border-line/30 pb-3">
            {picked.map((i) => (
              <motion.button layoutId={`tile-${i}`} key={i} disabled={locked} onClick={() => setPicked((p) => p.filter((x) => x !== i))} className="rounded-xl border-2 border-line bg-card px-3 py-2 font-bold shadow-hard-sm">
                {ex.tiles[i]}
              </motion.button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {tiles.map(({ t, i }) =>
              picked.includes(i) ? (
                <span key={i} className="rounded-xl border-2 border-line/20 bg-paper-2 px-3 py-2 font-bold text-transparent">{t}</span>
              ) : (
                <motion.button layoutId={`tile-${i}`} key={i} disabled={locked} onClick={() => { sfx.tap(); setPicked((p) => [...p, i]) }} className="press rounded-xl border-2 border-line bg-card px-3 py-2 font-bold shadow-hard-sm">
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
  const stop = useRef<() => void>(() => {})

  const toggle = () => {
    if (listening) return stop.current()
    setErr('')
    setPartial('')
    setListening(true)
    stop.current = listen({
      onPartial: setPartial,
      onFinal: (t) => setValue(t),
      onError: (e) => setErr(e === 'not-allowed' ? 'Mikrofon izni gerekli.' : e === 'unsupported' ? 'Bu cihaz konuşma tanımayı desteklemiyor.' : 'Seni duyamadım, tekrar dene.'),
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
      {canListen() ? (
        <button disabled={locked} onClick={toggle} className={clsx('press mx-auto flex w-full max-w-sm items-center justify-center gap-3 rounded-2xl border-2 border-line py-6 font-display text-lg font-extrabold uppercase shadow-hard', listening ? 'bg-flame text-white' : 'bg-card')}>
          {listening ? <><MicOff className="size-6" /> Dinliyorum… (bitir)</> : <><Mic className="size-6 text-flame" /> Konuşmak için dokun</>}
        </button>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-line/40 p-4 text-center text-sm text-ink-soft">Bu tarayıcı konuşma tanımayı desteklemiyor. Chrome veya uygulamamızı kullan ya da “Şu an konuşamıyorum”a bas.</p>
      )}
      {(partial || value) && <p className="mt-4 text-center font-semibold text-ink-soft">“{(value as string) || partial}”</p>}
      {err && <p className="mt-3 text-center font-bold text-berry">{err}</p>}
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
        className={clsx('press rounded-2xl border-2 border-line px-3 py-4 text-lg font-bold shadow-hard-sm', isDone ? 'border-line/20 bg-mint/20 text-ink-soft shadow-none' : isSel ? 'bg-sky text-white' : 'bg-card')}
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
