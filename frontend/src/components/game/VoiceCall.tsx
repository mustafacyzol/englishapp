import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Captions, CaptionsOff, Languages, Lightbulb, Mic, MicOff, PhoneOff, Repeat2 } from 'lucide-react'
import { TUTOR } from '@/lib/tutor'
import { canListen, listen, speak, stopSpeaking } from '@/lib/speech'
import { ensureMic } from '@/lib/mic'

export interface CallMsg {
  id: number
  role: 'user' | 'assistant'
  content: string
  feedback?: { reply_tr?: string; correction?: { original: string; corrected: string; explanation_tr: string } | null } | null
}

/** The recorded, truly lip-synced greeting that opens a free-talk call. */
const GREETING = "Hi! I'm Defne, your English coach. So, tell me — how was your day? Take your time, there's no rush. I'm listening, and we'll practise together, step by step."

/**
 * A FaceTime-style call with Defne. Two loops of the same 3D portrait — a
 * listening idle and a talking take — crossfade on the speech engine's start
 * and end events, so her mouth moves exactly while she speaks. Captions follow
 * the spoken word, and hands-free mode hands the turn back to you automatically.
 */
export function VoiceCall({
  title,
  messages,
  pending,
  rate = 0.95,
  greet,
  onSend,
  onClose,
  onMicBlocked,
}: {
  title: string
  messages: CallMsg[]
  pending: boolean
  rate?: number
  /** Play the recorded greeting instead of synthesising the opening line. */
  greet?: boolean
  onSend: (text: string) => void
  onClose: () => void
  onMicBlocked: () => void
}) {
  const idleRef = useRef<HTMLVideoElement>(null)
  const talkRef = useRef<HTMLVideoElement>(null)
  const stopListen = useRef<() => void>(() => {})
  const lastSpoken = useRef<number | null>(null)
  const [talking, setTalking] = useState(false)
  const [caption, setCaption] = useState({ text: '', upto: 0 })
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [captions, setCaptions] = useState(true)
  const [handsFree, setHandsFree] = useState(true)
  const [tr, setTr] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const handsFreeRef = useRef(handsFree)
  handsFreeRef.current = handsFree

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      clearInterval(t)
      html.style.overflow = prev
      stopSpeaking()
      stopListen.current()
    }
  }, [])

  const startTalkLoop = () => {
    const v = talkRef.current
    if (!v) return
    v.muted = true
    v.loop = true
    // Start somewhere in the take so repeated replies don't look identical.
    if (v.duration) v.currentTime = Math.random() * Math.max(0, v.duration - 3)
    void v.play().catch(() => {})
  }
  const stopTalkLoop = () => talkRef.current?.pause()

  const startListening = useCallback(async () => {
    if (!canListen()) return
    stopSpeaking()
    const state = await ensureMic()
    if (state === 'denied') {
      // Don't keep re-asking after every reply — fall back to tap-to-talk.
      setHandsFree(false)
      return onMicBlocked()
    }
    setHeard('')
    setListening(true)
    stopListen.current = listen({
      onPartial: setHeard,
      onFinal: (t) => {
        setHeard(t)
        onSend(t)
      },
      onError: (e) => {
        if (e === 'not-allowed') {
          setHandsFree(false)
          onMicBlocked()
        }
      },
      onEnd: () => setListening(false),
    })
  }, [onSend, onMicBlocked])

  const say = useCallback(
    (text: string) => {
      setCaption({ text, upto: 0 })
      speak(text, {
        rate,
        onStart: () => {
          setTalking(true)
          startTalkLoop()
        },
        onBoundary: (i) => setCaption((c) => ({ ...c, upto: i })),
        onEnd: () => {
          setTalking(false)
          stopTalkLoop()
          setCaption((c) => ({ ...c, upto: c.text.length }))
          if (handsFreeRef.current) setTimeout(() => void startListening(), 350)
        },
      })
    },
    [rate, startListening],
  )

  /** The opening: the recorded lip-synced greeting with its own voice, or synthesis as a fallback. */
  const playGreeting = useCallback(() => {
    const v = talkRef.current
    if (!v) return
    setCaption({ text: GREETING, upto: 0 })
    v.muted = false
    v.loop = false
    v.currentTime = 0
    setTalking(true)
    const words = GREETING.split(' ')
    const tick = () => {
      if (!v.duration) return
      const n = Math.round((v.currentTime / v.duration) * words.length)
      setCaption({ text: GREETING, upto: words.slice(0, n).join(' ').length })
    }
    v.ontimeupdate = tick
    v.onended = () => {
      v.ontimeupdate = null
      v.onended = null
      setTalking(false)
      setCaption({ text: GREETING, upto: GREETING.length })
      if (handsFreeRef.current) setTimeout(() => void startListening(), 350)
    }
    v.play().catch(() => {
      v.ontimeupdate = null
      v.onended = null
      setTalking(false)
      say(messages[messages.length - 1]?.content ?? GREETING)
    })
  }, [messages, say, startListening])

  // Speak each new reply from Defne once.
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || lastSpoken.current === last.id) return
    const first = lastSpoken.current === null
    lastSpoken.current = last.id
    const t = setTimeout(() => (first && greet ? playGreeting() : say(last.content)), first ? 700 : 150)
    return () => clearTimeout(t)
  }, [messages, greet, playGreeting, say])

  const hangUp = () => {
    stopSpeaking()
    stopListen.current()
    talkRef.current?.pause()
    onClose()
  }

  const lastDefne = [...messages].reverse().find((m) => m.role === 'assistant')
  const correction = lastDefne?.feedback?.correction
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const status = pending ? 'Düşünüyor…' : talking ? 'Konuşuyor' : listening ? 'Seni dinliyor' : 'Sıra sende'

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${TUTOR.name} ile sesli arama`}
      className="fixed inset-0 z-[60] flex flex-col bg-[#0e1117] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Blurred portrait as the room behind the call. */}
      <img src={TUTOR.portrait} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-25 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0e1117]/40 via-[#0e1117]/70 to-[#0e1117]" />

      <header className="safe-top relative z-10 flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-black">{TUTOR.name}</p>
          <p className="truncate text-xs font-bold text-white/60">{title}</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-mono text-sm tabular-nums backdrop-blur">
          <span className="size-2 rounded-full bg-mint" /> {mm}:{ss}
        </span>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-4">
        <div className="relative aspect-[3/4] h-full max-h-[min(62dvh,640px)] w-auto max-w-full overflow-hidden rounded-[32px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
          <video ref={idleRef} src={TUTOR.video.idle} poster={TUTOR.portrait} muted loop playsInline autoPlay preload="auto" className="absolute inset-0 size-full object-cover" />
          <video ref={talkRef} src={TUTOR.video.talk} poster={TUTOR.portrait} muted loop playsInline preload="auto" className={clsx('absolute inset-0 size-full object-cover transition-opacity duration-200', talking ? 'opacity-100' : 'opacity-0')} />
          <span className={clsx('absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold backdrop-blur', talking ? 'bg-sage/80' : listening ? 'bg-flame/80' : 'bg-black/40')}>
            {talking ? <Bars /> : listening ? <Mic className="size-3.5" /> : null}
            {status}
          </span>

          {/* The learner's own camera-less tile. */}
          <div className="absolute bottom-3 right-3 grid size-16 place-items-center rounded-2xl bg-black/45 ring-1 ring-white/15 backdrop-blur sm:size-20">
            <motion.span animate={listening ? { scale: [1, 1.18, 1] } : { scale: 1 }} transition={{ repeat: listening ? Infinity : 0, duration: 1.1 }} className={clsx('grid size-10 place-items-center rounded-full', listening ? 'bg-flame' : 'bg-white/15')}>
              <Mic className="size-5" />
            </motion.span>
          </div>
        </div>

        <div className="w-full max-w-xl space-y-2 text-center">
          <AnimatePresence mode="wait">
            {captions && caption.text && (
              <motion.p key={caption.text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-display text-lg font-extrabold leading-snug sm:text-xl">
                <span className="text-white">{caption.text.slice(0, caption.upto)}</span>
                <span className="text-white/45">{caption.text.slice(caption.upto)}</span>
              </motion.p>
            )}
          </AnimatePresence>
          {tr && lastDefne?.feedback?.reply_tr && <p className="text-sm italic text-white/60">{lastDefne.feedback.reply_tr}</p>}
          {(listening || pending) && heard && <p className="text-sm font-bold text-white/70">Sen: “{heard}”</p>}
          <AnimatePresence>
            {correction && !talking && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto w-fit max-w-full rounded-2xl bg-white/10 px-4 py-2.5 text-left text-sm backdrop-blur">
                <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-butter"><Lightbulb className="size-3.5" /> Küçük düzeltme</p>
                <p><s className="text-white/50">{correction.original}</s> → <b>{correction.corrected}</b></p>
                <p className="text-white/65">{correction.explanation_tr}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="safe-bottom relative z-10 px-4 pb-6">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <CallBtn label={captions ? 'Altyazı açık' : 'Altyazı kapalı'} onClick={() => setCaptions((c) => !c)}>{captions ? <Captions className="size-5" /> : <CaptionsOff className="size-5" />}</CallBtn>
          <CallBtn label="Türkçesi" active={tr} onClick={() => setTr((t) => !t)}><Languages className="size-5" /></CallBtn>
          <button
            onClick={() => (listening ? stopListen.current() : void startListening())}
            disabled={!canListen() || pending}
            aria-label={listening ? 'Dinlemeyi bitir' : 'Konuş'}
            className={clsx('grid size-[72px] place-items-center rounded-full text-white shadow-lg transition disabled:opacity-40', listening ? 'bg-flame' : 'bg-white/15 hover:bg-white/25')}
          >
            {listening ? <MicOff className="size-7" /> : <Mic className="size-7" />}
          </button>
          <CallBtn label={handsFree ? 'Otomatik sıra açık' : 'Otomatik sıra kapalı'} active={handsFree} onClick={() => setHandsFree((h) => !h)}><Repeat2 className="size-5" /></CallBtn>
          <button onClick={hangUp} aria-label="Aramayı bitir" className="grid size-14 place-items-center rounded-full bg-berry text-white shadow-lg transition hover:brightness-110">
            <PhoneOff className="size-6" />
          </button>
        </div>
        {!canListen() && <p className="mt-3 text-center text-xs text-white/60">Bu tarayıcı konuşma tanımayı desteklemiyor — Chrome veya Safari’de dene.</p>}
      </footer>
    </motion.div>
  )
}

function CallBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={clsx('grid size-12 place-items-center rounded-full transition', active ? 'bg-white text-[#0e1117]' : 'bg-white/10 text-white hover:bg-white/20')}>
      {children}
    </button>
  )
}

function Bars() {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="w-[3px] rounded-full bg-white" animate={{ height: ['30%', '100%', '45%'] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }} />
      ))}
    </span>
  )
}
