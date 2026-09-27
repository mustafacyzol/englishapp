import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import { BookOpen, Check, Flame, Ghost, Lock, Mic, PenLine, Star, Timer, X } from 'lucide-react'
import { rewardImg } from '@/lib/assets'
import { TUTOR } from '@/lib/tutor'
import { Img } from '@/components/ui/Img'

/**
 * A phone frame with live, code-drawn app screens (not screenshots): they stay
 * crisp at any size, follow the theme and can animate. Each mock is a faithful
 * miniature of the real screen it stands for.
 */
export function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('relative aspect-[9/18.5] w-full rounded-[2.6rem] bg-[#11141c] p-[9px] shadow-[0_40px_80px_-30px_rgba(17,20,28,.55),0_0_0_1px_rgba(255,255,255,.06)_inset]', className)}>
      <div className="relative size-full overflow-hidden rounded-[2.1rem] bg-paper">
        <span aria-hidden className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-[#11141c]" />
        {children}
      </div>
    </div>
  )
}

/**
 * The phone drawn at its natural 300px width and scaled as a whole, so small
 * previews look like a real, shrunken screen instead of a cramped re-layout.
 */
export function ScaledPhone({ width, children, crop }: { width: number; children: ReactNode; crop?: number }) {
  const k = width / 300
  const h = (300 * 18.5) / 9
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width, height: crop ?? h * k }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: 300, transform: `scale(${k})` }}>
        <Phone>{children}</Phone>
      </div>
      {crop && <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />}
    </div>
  )
}

function Bar({ title, tone = 'text-ink' }: { title: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-9">
      <span className={clsx('font-display text-sm font-black', tone)}>{title}</span>
      <span className="flex items-center gap-2 text-[11px] font-black">
        <span className="flex items-center gap-0.5 text-flame"><Flame className="size-3.5" />13</span>
        <span className="flex items-center gap-0.5"><Img src={rewardImg('gems')} alt="" className="size-3.5" />355</span>
      </span>
    </div>
  )
}

/** Duolingo's strength: a clear daily path. */
export function PathMock() {
  const nodes = [
    { x: 0, done: true, icon: Check },
    { x: 34, done: true, icon: Check },
    { x: 10, done: false, current: true, icon: BookOpen },
    { x: -30, locked: true, icon: Lock },
    { x: -6, locked: true, icon: Star },
  ]
  return (
    <div className="flex h-full flex-col">
      <Bar title="Yol haritası" />
      <div className="mx-3 rounded-2xl bg-flame px-3 py-2.5 text-white">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/75">Ünite 1</p>
        <p className="font-display text-sm font-black">Merhaba Dünya</p>
      </div>
      <div className="relative flex-1">
        {nodes.map((n, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 16 }}
            className={clsx('absolute left-1/2 grid size-11 place-items-center rounded-full', n.locked ? 'bg-paper-2 text-ink-soft' : 'bg-flame text-white shadow-[0_4px_0_0_var(--color-flame-deep)]')}
            style={{ top: 18 + i * 58, marginLeft: -22 + n.x }}
          >
            {n.current && <motion.span className="absolute -inset-2 rounded-full ring-4 ring-flame/35" animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />}
            <n.icon className="size-5" strokeWidth={3} />
          </motion.span>
        ))}
        <span className="absolute left-1/2 top-[102px] ml-[-8px] -translate-y-full rounded-lg bg-ink px-2 py-1 text-[9px] font-black uppercase text-paper">Buradasın</span>
      </div>
    </div>
  )
}

/** Quizlet's strength: flashcards, here as swipeable cards. */
export function SwipeMock() {
  const reduced = useReducedMotion()
  const words = [['umbrella', 'şemsiye'], ['journey', 'yolculuk'], ['confident', 'kendinden emin'], ['borrow', 'ödünç almak']]
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setI((x) => (x + 1) % words.length), 1800)
    return () => clearInterval(t)
  }, [reduced, words.length])
  const dir = i % 2 ? -1 : 1
  return (
    <div className="flex h-full flex-col">
      <Bar title="Kelime pratiği" />
      <div className="flex justify-between px-5 text-[10px] font-black uppercase tracking-wider">
        <span className="text-berry">← Tekrar</span>
        <span className="text-mint-deep">Biliyorum →</span>
      </div>
      <div className="relative mx-5 mt-3 flex-1">
        <span className="absolute inset-x-3 top-3 bottom-8 rounded-3xl border-2 border-line bg-card" />
        <AnimatePresence mode="popLayout">
          <motion.div
            key={i}
            initial={{ scale: 0.92, y: 12, opacity: 0.6 }}
            animate={{ scale: 1, y: 0, opacity: 1, x: 0, rotate: 0 }}
            exit={{ x: dir * 260, rotate: dir * 18, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="absolute inset-0 bottom-10 flex flex-col items-center justify-center rounded-3xl border-2 border-line bg-card shadow-soft"
          >
            <p className="font-display text-2xl font-black">{words[i][0]}</p>
            <p className="mt-1 text-xs font-bold text-ink-soft">{words[i][1]}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mb-6 flex justify-center gap-4">
        <span className="grid size-11 place-items-center rounded-full border-2 border-berry/40 text-berry"><X className="size-5" strokeWidth={3} /></span>
        <span className="grid size-11 place-items-center rounded-full border-2 border-mint/40 text-mint-deep"><Check className="size-5" strokeWidth={3} /></span>
      </div>
    </div>
  )
}

/** Kahoot's strength: the live, timed race. */
export function DuelMock() {
  const reduced = useReducedMotion()
  const [t, setT] = useState(0)
  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setT((x) => (x + 1) % 60), 120)
    return () => clearInterval(id)
  }, [reduced])
  const share = 0.5 + Math.sin(t / 9) * 0.18
  return (
    <div className="arena-dark flex h-full flex-col bg-paper text-ink">
      <div className="px-4 pb-2 pt-9">
        <div className="flex items-end justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-widest text-flame">Sen</p><p className="font-display text-xl font-black tabular-nums">{Math.round(420 + share * 300)}</p></div>
          <span className="rounded-full bg-gradient-to-r from-flame to-butter px-2 py-0.5 text-[10px] font-black text-white">x1.75</span>
          <div className="text-right"><p className="text-[9px] font-black uppercase tracking-widest text-sky"><Ghost className="mr-0.5 inline size-3" />Gölge</p><p className="font-display text-xl font-black tabular-nums">{Math.round(420 + (1 - share) * 300)}</p></div>
        </div>
        <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-sky/70">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-flame to-[#ff7a4d] transition-[width] duration-150" style={{ width: `${share * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-xs font-black">Boşluğu doldur</span>
        <span className="flex items-center gap-1 rounded-full border-2 border-butter px-2 text-xs font-black tabular-nums"><Timer className="size-3" />{12 - (t % 12)}</span>
      </div>
      <p className="mx-4 mt-3 rounded-xl border-2 border-line bg-card px-3 py-2 text-sm font-bold">I would <u className="decoration-flame decoration-2">like</u> a sandwich.</p>
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
        {['like', 'likes', 'liking', 'liked'].map((o, k) => <span key={o} className={clsx('rounded-xl border-2 px-2 py-2', k === 0 ? 'border-mint bg-mint/15 text-mint' : 'border-line bg-card')}>{o}</span>)}
      </div>
    </div>
  )
}

/** The AI strength: a real conversation partner. */
export function DefneMock() {
  return (
    <div className="relative h-full bg-[#10131a] text-white">
      <Img src={TUTOR.portrait} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/80" />
      <p className="absolute left-4 top-9 flex items-center gap-1.5 rounded-full bg-sage/85 px-2 py-0.5 text-[10px] font-black">
        <span className="flex h-2.5 items-end gap-0.5">{[0, 1, 2].map((k) => <motion.span key={k} className="w-0.5 rounded bg-white" animate={{ height: ['30%', '100%', '40%'] }} transition={{ repeat: Infinity, duration: 0.6, delay: k * 0.15 }} />)}</span>
        Konuşuyor
      </p>
      <div className="absolute inset-x-3 bottom-20 rounded-2xl bg-black/45 p-3 backdrop-blur">
        <p className="text-sm font-bold leading-snug">Nice! What did you do at the weekend?</p>
        <p className="mt-1 text-[11px] text-white/70">Güzel! Hafta sonu ne yaptın?</p>
      </div>
      <div className="absolute inset-x-0 bottom-5 flex justify-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-flame"><Mic className="size-5" /></span>
        <span className="grid size-11 place-items-center rounded-full bg-white/15"><PenLine className="size-5" /></span>
      </div>
    </div>
  )
}

/** The Turkish strength: real exam formats with Turkish explanations. */
export function ExamMock() {
  return (
    <div className="flex h-full flex-col">
      <Bar title="YDS hazırlığı" />
      <div className="mx-3 flex items-end gap-4 rounded-2xl bg-gradient-to-br from-flame to-[#8f2a26] px-3 py-3 text-white">
        <div><p className="font-display text-3xl font-black leading-none">74</p><p className="text-[10px] font-bold text-white/80">gün kaldı</p></div>
        <div><p className="font-display text-xl font-black leading-none">%68</p><p className="text-[10px] font-bold text-white/80">isabet</p></div>
      </div>
      <p className="mx-3 mt-3 text-[10px] font-black uppercase tracking-widest text-lilac">Dilbilgisi · Soru 3/10</p>
      <p className="mx-3 mt-1 text-xs font-bold leading-snug">By the time the rescue team arrived, the fire ---- most of the building.</p>
      <div className="mx-3 mt-2 space-y-1.5 text-[11px] font-bold">
        {['has destroyed', 'had destroyed', 'destroys'].map((o, k) => (
          <p key={o} className={clsx('flex items-center gap-2 rounded-lg border-2 px-2 py-1.5', k === 1 ? 'border-mint bg-mint/12' : 'border-line bg-card')}><span className="grid size-4 place-items-center rounded bg-paper-2 text-[9px]">{'ABC'[k]}</span>{o}</p>
        ))}
      </div>
      <p className="mx-3 mt-2 rounded-lg bg-butter/20 px-2 py-1.5 text-[10px] leading-snug">"By the time + geçmiş zaman" yapısında önce biten eylem past perfect olur.</p>
    </div>
  )
}
