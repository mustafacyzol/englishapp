import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import clsx from 'clsx'
import { Check, Delete, Headphones, Lightbulb, RotateCcw, Undo2, Volume2, X, Zap } from 'lucide-react'
import { speak } from '@/lib/speech'
import { sfx } from '@/lib/fx'
import { Button } from '@/components/ui/Button'

export interface DeckWord { id: number | null; word: string; translation: string; example: string | null; interval_days: number }
/** One answer: which word, and whether the learner knew it. */
export interface Outcome { w: DeckWord; known: boolean }
export type Finish = (outcomes: Outcome[], score?: number) => void

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)

// ---------------------------------------------------------------------------
// Swipe cards: right = I know it, left = again. Tap to flip.
// ---------------------------------------------------------------------------
export function SwipeDeck({ deck, onFinish }: { deck: DeckWord[]; onFinish: Finish }) {
  const [i, setI] = useState(0)
  const [log, setLog] = useState<Outcome[]>([])
  const [flipped, setFlipped] = useState(false)
  const [exit, setExit] = useState<1 | -1>(1)

  const decide = useCallback(
    (known: boolean) => {
      const w = deck[i]
      if (!w) return
      setExit(known ? 1 : -1)
      known ? sfx.correct(0) : sfx.tap()
      const next = [...log, { w, known }]
      setLog(next)
      setFlipped(false)
      if (i + 1 >= deck.length) setTimeout(() => onFinish(next), 260)
      setI(i + 1)
    },
    [deck, i, log, onFinish],
  )
  const undo = () => {
    if (!i) return
    setLog((l) => l.slice(0, -1))
    setI(i - 1)
    setFlipped(false)
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide(true)
      if (e.key === 'ArrowLeft') decide(false)
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [decide])

  const known = log.filter((x) => x.known).length
  return (
    <div className="mx-auto max-w-md select-none">
      <div className="mb-5 flex items-center justify-between text-sm font-black">
        <span className="flex items-center gap-1.5 text-berry"><X className="size-4" strokeWidth={3} /> {log.length - known}</span>
        <span className="font-mono text-ink-soft">{Math.min(i + 1, deck.length)}/{deck.length}</span>
        <span className="flex items-center gap-1.5 text-mint-deep">{known} <Check className="size-4" strokeWidth={3} /></span>
      </div>

      <div className="relative h-[380px] sm:h-[400px]">
        {deck.slice(i, i + 3).reverse().map((w, k, arr) => {
          const depth = arr.length - 1 - k
          return depth === 0 ? (
            <TopCard key={`${i}-${w.word}`} w={w} flipped={flipped} onFlip={() => setFlipped((f) => !f)} onDecide={decide} exit={exit} />
          ) : (
            <motion.div key={`${i + depth}-${w.word}`} className="absolute inset-0 rounded-[32px] border-2 border-line bg-card shadow-hard" initial={false} animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: 1 - depth * 0.25 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} />
          )
        })}
      </div>

      <div className="mt-7 flex items-center justify-center gap-4">
        <button onClick={undo} disabled={!i} aria-label="Geri al" className="grid size-12 place-items-center rounded-full border-2 border-line bg-card text-ink-soft shadow-hard-sm transition hover:text-ink disabled:opacity-40"><Undo2 className="size-5" /></button>
        <button onClick={() => decide(false)} aria-label="Bilmiyorum" className="press grid size-16 place-items-center rounded-full border-2 border-berry/40 bg-card text-berry shadow-[0_4px_0_0_var(--color-berry-deep)] transition hover:bg-berry hover:text-white"><X className="size-8" strokeWidth={3} /></button>
        <button onClick={() => decide(true)} aria-label="Biliyorum" className="press grid size-16 place-items-center rounded-full border-2 border-mint/40 bg-card text-mint-deep shadow-[0_4px_0_0_var(--color-mint-deep)] transition hover:bg-mint hover:text-white"><Check className="size-8" strokeWidth={3} /></button>
        <button onClick={() => speak(deck[i]?.word ?? '')} aria-label="Dinle" className="grid size-12 place-items-center rounded-full border-2 border-line bg-card text-sky shadow-hard-sm"><Volume2 className="size-5" /></button>
      </div>
      <p className="mt-4 text-center text-xs font-bold text-ink-soft">Sağa kaydır: biliyorum · Sola kaydır: tekrar et · Dokun: çevir</p>
    </div>
  )
}

function TopCard({ w, flipped, onFlip, onDecide, exit }: { w: DeckWord; flipped: boolean; onFlip: () => void; onDecide: (known: boolean) => void; exit: 1 | -1 }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-16, 16])
  const yes = useTransform(x, [30, 120], [0, 1])
  const no = useTransform(x, [-120, -30], [1, 0])
  const tint = useTransform(x, [-160, 0, 160], ['rgba(239,78,123,.16)', 'rgba(0,0,0,0)', 'rgba(34,181,115,.16)'])
  const dragged = useRef(false)

  const end = (_: unknown, info: PanInfo) => {
    const swipe = Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 650
    if (swipe) onDecide(info.offset.x > 0)
    setTimeout(() => (dragged.current = false), 0)
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.9}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={end}
      initial={{ scale: 0.95, y: 14, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ x: exit * 520, rotate: exit * 24, opacity: 0, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onClick={() => !dragged.current && onFlip()}
    >
      <motion.div className="relative size-full [perspective:1200px]" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} style={{ transformStyle: 'preserve-3d' }}>
        {/* front */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[32px] border-2 border-line bg-card shadow-[0_18px_40px_-18px_rgba(31,36,51,.35)]" style={{ backfaceVisibility: 'hidden' }}>
          <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundColor: tint }} />
          <div className="flex items-center justify-between px-6 pt-5 text-[11px] font-black uppercase tracking-[0.18em] text-ink-soft">
            <span>{w.id ? (w.interval_days >= 3 ? 'Öğreniyorsun' : 'Tekrar zamanı') : 'Yeni kelime'}</span>
            <span>EN</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-display text-5xl font-black leading-tight sm:text-6xl">{w.word}</p>
            <button onClick={(e) => { e.stopPropagation(); speak(w.word) }} className="grid size-11 place-items-center rounded-full bg-sky/10 text-sky"><Volume2 className="size-5" /></button>
          </div>
          <p className="pb-6 text-center text-sm font-bold text-ink-soft">Anlamını hatırla, sonra çevir</p>
          <motion.span style={{ opacity: yes }} className="absolute left-5 top-14 rotate-[-12deg] rounded-xl border-4 border-mint px-3 py-1 font-display text-2xl font-black tracking-wider text-mint">BİLİYORUM</motion.span>
          <motion.span style={{ opacity: no }} className="absolute right-5 top-14 rotate-[12deg] rounded-xl border-4 border-berry px-3 py-1 font-display text-2xl font-black tracking-wider text-berry">TEKRAR</motion.span>
        </div>
        {/* back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[32px] border-2 border-butter-deep/30 bg-butter px-7 text-center text-[#1f2433] shadow-[0_18px_40px_-18px_rgba(31,36,51,.35)]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <span className="text-[11px] font-black uppercase tracking-[0.18em] opacity-60">Türkçesi</span>
          <p className="font-display text-4xl font-black leading-tight">{w.translation}</p>
          <p className="text-lg font-extrabold opacity-70">{w.word}</p>
          {w.example && <p className="font-read text-[17px] italic leading-relaxed">“{w.example}”</p>}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Speed match: pair English with Turkish against the clock.
// ---------------------------------------------------------------------------
export function SpeedMatch({ deck, onFinish }: { deck: DeckWord[]; onFinish: Finish }) {
  const TIME = 45
  const [pool] = useState(() => shuffle(deck))
  const [cursor, setCursor] = useState(5)
  const [board, setBoard] = useState(() => pool.slice(0, 5))
  const [left, setLeft] = useState(() => shuffle(pool.slice(0, 5).map((w) => w.word)))
  const [right, setRight] = useState(() => shuffle(pool.slice(0, 5).map((w) => w.translation)))
  const [pick, setPick] = useState<{ side: 'l' | 'r'; v: string } | null>(null)
  const [bad, setBad] = useState<string | null>(null)
  const [time, setTime] = useState(TIME)
  const [combo, setCombo] = useState(0)
  const [score, setScore] = useState(0)
  const log = useRef<Outcome[]>([])
  const missed = useRef(new Set<string>())
  const done = useRef(false)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    onFinish(log.current, score)
  }, [onFinish, score])

  useEffect(() => {
    if (time <= 0) return finish()
    const t = setTimeout(() => setTime((x) => x - 1), 1000)
    if (time <= 5) sfx.tick()
    return () => clearTimeout(t)
  }, [time, finish])

  const tryMatch = (side: 'l' | 'r', v: string) => {
    if (!pick || pick.side === side) return setPick({ side, v })
    const en = side === 'l' ? v : pick.v
    const tr = side === 'r' ? v : pick.v
    const w = board.find((b) => b.word === en)
    setPick(null)
    if (w && w.translation === tr) {
      const c = combo + 1
      setCombo(c)
      setScore((s) => s + 10 * Math.min(4, c))
      sfx.correct(c)
      log.current.push({ w, known: !missed.current.has(w.word) })
      // replace the matched pair with the next word from the pool
      const nxt = pool[cursor]
      setCursor((x) => x + 1)
      setBoard((b) => b.map((x) => (x.word === en ? nxt ?? x : x)).filter((x) => x !== undefined))
      setLeft((l) => (nxt ? l.map((x) => (x === en ? nxt.word : x)) : l.filter((x) => x !== en)))
      setRight((r) => (nxt ? r.map((x) => (x === tr ? nxt.translation : x)) : r.filter((x) => x !== tr)))
      if (!nxt && left.length <= 1) setTimeout(finish, 300)
    } else {
      setCombo(0)
      sfx.wrong()
      missed.current.add(en)
      setBad(v)
      setTimeout(() => setBad(null), 350)
    }
  }

  const tile = (side: 'l' | 'r', v: string) => (
    <motion.button
      layout
      key={`${side}-${v}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={bad === v ? { x: [0, -8, 8, -5, 0], scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
      onClick={() => tryMatch(side, v)}
      className={clsx('press min-h-14 rounded-2xl border-2 px-3 py-2 text-[15px] font-extrabold transition', pick?.side === side && pick.v === v ? 'border-sky bg-sky/10 text-sky' : bad === v ? 'border-berry bg-berry/10' : 'border-line bg-card shadow-hard-sm hover:border-ink/25')}
    >
      {v}
    </motion.button>
  )

  return (
    <div className="mx-auto max-w-xl">
      <GameBar time={time} total={TIME} score={score} combo={combo} />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2.5">{left.map((v) => tile('l', v))}</div>
        <div className="grid gap-2.5">{right.map((v) => tile('r', v))}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// True or false blitz: is this the right translation? 30 seconds.
// ---------------------------------------------------------------------------
export function TrueFalse({ deck, onFinish }: { deck: DeckWord[]; onFinish: Finish }) {
  const TIME = 30
  const rounds = useMemo(() => shuffle(deck).map((w) => {
    const real = Math.random() < 0.5
    const other = shuffle(deck.filter((x) => x.word !== w.word))[0]
    return { w, shown: real || !other ? w.translation : other.translation, real: real || !other }
  }), [deck])
  const [i, setI] = useState(0)
  const [time, setTime] = useState(TIME)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null)
  const log = useRef<Outcome[]>([])
  const done = useRef(false)
  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    onFinish(log.current, score)
  }, [onFinish, score])

  useEffect(() => {
    if (time <= 0) return finish()
    const t = setTimeout(() => setTime((x) => x - 1), 1000)
    if (time <= 5) sfx.tick()
    return () => clearTimeout(t)
  }, [time, finish])

  const answer = useCallback((yes: boolean) => {
    const r = rounds[i]
    if (!r) return
    const ok = yes === r.real
    const c = ok ? combo + 1 : 0
    setCombo(c)
    if (ok) setScore((s) => s + 10 * Math.min(4, c))
    ok ? sfx.correct(c) : sfx.wrong()
    setFlash(ok ? 'ok' : 'no')
    setTimeout(() => setFlash(null), 180)
    log.current.push({ w: r.w, known: ok })
    if (i + 1 >= rounds.length) return finish()
    setI(i + 1)
  }, [rounds, i, combo, finish])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') answer(true)
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'y') answer(false)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [answer])

  const r = rounds[i]
  return (
    <div className="mx-auto max-w-md">
      <GameBar time={time} total={TIME} score={score} combo={combo} />
      <AnimatePresence mode="popLayout">
        {r && (
          <motion.div key={i} initial={{ y: 30, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ duration: 0.16 }} className={clsx('rounded-[28px] border-2 p-8 text-center transition-colors', flash === 'ok' ? 'border-mint bg-mint/10' : flash === 'no' ? 'border-berry bg-berry/10' : 'border-line bg-card')}>
            <p className="font-display text-4xl font-black">{r.w.word}</p>
            <p className="my-3 text-sm font-black uppercase tracking-widest text-ink-soft">demek</p>
            <p className="font-display text-3xl font-black text-sky">{r.shown}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button size="lg" variant="danger" onClick={() => answer(false)} icon={<X className="size-6" strokeWidth={3} />}>Yanlış</Button>
        <Button size="lg" variant="success" onClick={() => answer(true)} icon={<Check className="size-6" strokeWidth={3} />}>Doğru</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Listen & type: hear it, spell it.
// ---------------------------------------------------------------------------
export function ListenType({ deck, onFinish }: { deck: DeckWord[]; onFinish: Finish }) {
  const words = useMemo(() => shuffle(deck).slice(0, 8), [deck])
  const [i, setI] = useState(0)
  const [value, setValue] = useState('')
  const [state, setState] = useState<'ask' | 'ok' | 'no'>('ask')
  const [hint, setHint] = useState(0)
  const log = useRef<Outcome[]>([])
  const input = useRef<HTMLInputElement>(null)
  const w = words[i]

  useEffect(() => {
    if (!w) return
    const t = setTimeout(() => speak(w.word, { rate: 0.85 }), 250)
    input.current?.focus()
    return () => clearTimeout(t)
  }, [w])

  const check = () => {
    if (state !== 'ask') return next()
    const ok = value.trim().toLowerCase() === w.word.toLowerCase()
    setState(ok ? 'ok' : 'no')
    ok ? sfx.correct(0) : sfx.wrong()
    log.current.push({ w, known: ok && hint < 2 })
  }
  const next = () => {
    if (i + 1 >= words.length) return onFinish(log.current)
    setI(i + 1)
    setValue('')
    setHint(0)
    setState('ask')
  }

  if (!w) return null
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="mb-6 font-mono text-sm font-bold text-ink-soft">{i + 1}/{words.length}</p>
      <button onClick={() => speak(w.word, { rate: 0.85 })} className="press mx-auto grid size-28 place-items-center rounded-full bg-sky text-white shadow-[0_6px_0_0_var(--color-sky-deep)]" aria-label="Tekrar dinle"><Headphones className="size-12" /></button>
      <p className="mt-4 text-ink-soft">İpucu: <b className="text-ink">{w.translation}</b></p>
      {hint > 0 && <p className="mt-1 font-mono text-lg font-bold tracking-[0.3em]">{w.word.split('').map((c, k) => (k < hint ? c : '_')).join('')}</p>}
      <form onSubmit={(e) => { e.preventDefault(); check() }} className="mt-6">
        <input ref={input} value={value} onChange={(e) => setValue(e.target.value)} disabled={state !== 'ask'} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Duyduğunu yaz" className={clsx('h-16 w-full rounded-2xl border-2 bg-card px-5 text-center font-display text-2xl font-black focus:outline-none', state === 'ok' ? 'border-mint' : state === 'no' ? 'border-berry' : 'border-line focus:border-sky')} />
        {state === 'no' && <p className="mt-3 font-bold text-berry">Doğrusu: {w.word}</p>}
        <div className="mt-5 flex gap-2">
          {state === 'ask' && <Button type="button" variant="secondary" onClick={() => setHint((h) => Math.min(w.word.length - 1, h + 1))} icon={<Lightbulb className="size-4" />}>Harf</Button>}
          <Button type="submit" block variant={state === 'ok' ? 'success' : state === 'no' ? 'danger' : 'primary'} disabled={state === 'ask' && !value.trim()}>{state === 'ask' ? 'Kontrol et' : 'Devam'}</Button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scramble: rebuild the word from its letters.
// ---------------------------------------------------------------------------
export function Scramble({ deck, onFinish }: { deck: DeckWord[]; onFinish: Finish }) {
  const words = useMemo(() => shuffle(deck.filter((w) => /^[a-z]+$/i.test(w.word) && w.word.length >= 3 && w.word.length <= 11)).slice(0, 8), [deck])
  const [i, setI] = useState(0)
  const w = words[i]
  const letters = useMemo(() => {
    if (!w) return []
    let s = shuffle(w.word.split('').map((c, k) => ({ c, k })))
    if (s.map((x) => x.c).join('') === w.word) s = s.reverse()
    return s
  }, [w])
  const [picked, setPicked] = useState<number[]>([])
  const [state, setState] = useState<'ask' | 'ok' | 'no'>('ask')
  const log = useRef<Outcome[]>([])

  useEffect(() => {
    if (!w || state !== 'ask' || picked.length !== w.word.length) return
    const guess = picked.map((k) => letters[k].c).join('')
    const ok = guess === w.word
    setState(ok ? 'ok' : 'no')
    ok ? sfx.correct(0) : sfx.wrong()
    if (ok) speak(w.word)
    log.current.push({ w, known: ok })
  }, [picked, w, letters, state])

  const next = () => {
    if (i + 1 >= words.length) return onFinish(log.current)
    setI(i + 1)
    setPicked([])
    setState('ask')
  }
  if (!w) return <p className="text-center text-ink-soft">Bu oyun için yeterli kelime yok.</p>

  return (
    <div className="mx-auto max-w-lg text-center">
      <p className="mb-2 font-mono text-sm font-bold text-ink-soft">{i + 1}/{words.length}</p>
      <p className="text-ink-soft">Türkçesi</p>
      <p className="font-display text-3xl font-black">{w.translation}</p>
      <div className="my-7 flex min-h-16 flex-wrap justify-center gap-2">
        {w.word.split('').map((_, k) => (
          <span key={k} className={clsx('grid size-12 place-items-center rounded-xl border-2 font-display text-2xl font-black uppercase sm:size-14', picked[k] !== undefined ? (state === 'ok' ? 'border-mint bg-mint/10' : state === 'no' ? 'border-berry bg-berry/10' : 'border-ink bg-card') : 'border-dashed border-line')}>
            {picked[k] !== undefined ? letters[picked[k]].c : ''}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {letters.map((l, k) => (
          <motion.button key={k} whileTap={{ scale: 0.9 }} disabled={picked.includes(k) || state !== 'ask'} onClick={() => { sfx.tap(); setPicked((p) => [...p, k]) }} className={clsx('grid size-12 place-items-center rounded-xl border-2 border-line bg-card font-display text-2xl font-black uppercase shadow-hard-sm transition sm:size-14', picked.includes(k) && 'opacity-20')}>
            {l.c}
          </motion.button>
        ))}
      </div>
      <div className="mt-7 flex justify-center gap-2">
        {state === 'ask' ? (
          <Button variant="secondary" onClick={() => setPicked((p) => p.slice(0, -1))} disabled={!picked.length} icon={<Delete className="size-4" />}>Sil</Button>
        ) : (
          <>
            {state === 'no' && <p className="mr-2 self-center font-bold text-berry">Doğrusu: {w.word}</p>}
            <Button onClick={next} variant={state === 'ok' ? 'success' : 'primary'}>Devam</Button>
          </>
        )}
      </div>
    </div>
  )
}

function GameBar({ time, total, score, combo }: { time: number; total: number; score: number; combo: number }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className={clsx('w-12 font-mono text-lg font-black tabular-nums', time <= 5 ? 'text-berry' : 'text-ink')}>{time}s</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper-2"><motion.div className={clsx('h-full rounded-full', time <= 5 ? 'bg-berry' : 'bg-sky')} animate={{ width: `${(time / total) * 100}%` }} transition={{ ease: 'linear', duration: 1 }} /></div>
      <AnimatePresence>{combo >= 2 && <motion.span key={combo} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="flex items-center gap-0.5 rounded-full bg-butter px-2 py-0.5 text-xs font-black text-[#1f2433]"><Zap className="size-3.5" />x{Math.min(4, combo)}</motion.span>}</AnimatePresence>
      <span className="w-16 text-right font-display text-xl font-black tabular-nums">{score}</span>
    </div>
  )
}

export function Restart({ onClick }: { onClick: () => void }) {
  return <Button variant="secondary" onClick={onClick} icon={<RotateCcw className="size-4" />}>Tekrar oyna</Button>
}
