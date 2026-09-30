import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, BookOpen, Clock, Headphones, Lock, PenLine, Sparkles, Type, Volume2, X } from 'lucide-react'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Misc'
import { storage } from '@/lib/storage'
import { PLACEMENT_TOKEN } from '@/lib/onboarding'
import { canSpeak, speak } from '@/lib/speech'
import { higoImg } from '@/components/game/Higo'

type Skill = 'vocabulary' | 'grammar' | 'reading' | 'listening'
interface Q { id: number; level: string; skill: Skill; prompt: string; passage: string | null; say: string | null; options: string[] }

const SKILL: Record<Skill, { label: string; icon: typeof BookOpen; tone: string }> = {
  vocabulary: { label: 'Kelime', icon: Type, tone: 'text-sky bg-sky/10' },
  grammar: { label: 'Dilbilgisi', icon: PenLine, tone: 'text-lilac bg-lilac/12' },
  reading: { label: 'Okuma', icon: BookOpen, tone: 'text-butter-deep bg-butter/15' },
  listening: { label: 'Dinleme', icon: Headphones, tone: 'text-mint-deep bg-mint/12' },
}

/**
 * The placement test, built like a real exam: an intro that says what to
 * expect, one question per screen (vocabulary, grammar, reading, listening) in
 * rising difficulty, a deliberate "Devam" after each choice and no right/wrong
 * feedback. The level is never shown here: it goes to the account after sign-up
 * (or straight away when signed in) and is revealed inside the app.
 */
export default function Placement() {
  const { user } = useAuth()
  const nav = useNavigate()
  const fromRegister = useSearchParams()[0].get('from') === 'register'
  const exit = user ? '/learn' : fromRegister ? '/register' : '/'
  const { data, isLoading } = useQuery({ queryKey: ['placement'], queryFn: () => get<{ data: Q[] }>('/placement') })
  const [started, setStarted] = useState(false)
  const [i, setI] = useState(0)
  const [pick, setPick] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const submit = useMutation({
    mutationFn: (a: Record<number, number>) => post<{ token: string; answered: number; total: number }>('/placement', { answers: a }),
    onSuccess: async (r) => { await storage.set(PLACEMENT_TOKEN, r.token) },
  })

  if (isLoading || !data) return <Spinner />
  const qs = data.data
  const q = qs[i]

  const next = (opt: number) => {
    const a = { ...answers, [q.id]: opt }
    setAnswers(a)
    setPick(null)
    if (i + 1 < qs.length) setI(i + 1)
    else submit.mutate(a)
  }

  if (!started) return <Intro total={qs.length} exit={exit} onStart={() => setStarted(true)} />
  if (submit.isPending || submit.isSuccess) return <Done pending={submit.isPending} signedIn={!!user} onGo={() => nav(user ? '/learn' : '/register?from=placement')} />

  const s = SKILL[q.skill] ?? SKILL.grammar
  const bandIndex = ['A1', 'A2', 'B1', 'B2', 'C1'].indexOf(q.level)
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-5">
      <div className="mb-6 flex items-center gap-4">
        <Link to={exit} aria-label="Testten çık" className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><X className="size-6" /></Link>
        {/* five difficulty steps, filled as you go */}
        <div className="flex flex-1 gap-1.5" aria-label={`Soru ${i + 1} / ${qs.length}`}>
          {[0, 1, 2, 3, 4].map((b) => {
            const inBand = qs.filter((x) => ['A1', 'A2', 'B1', 'B2', 'C1'].indexOf(x.level) === b)
            const done = inBand.filter((x) => answers[x.id] !== undefined).length
            return (
              <span key={b} className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                <motion.span className="block h-full rounded-full bg-flame" animate={{ width: `${(done / Math.max(1, inBand.length)) * 100}%` }} transition={{ type: 'spring', stiffness: 160, damping: 22 }} />
              </span>
            )
          })}
        </div>
        <span className="font-mono text-sm font-bold tabular-nums text-ink-soft">{i + 1}/{qs.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col">
          <div className="mb-4 flex items-center gap-2">
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider', s.tone)}><s.icon className="size-3.5" /> {s.label}</span>
            <span className="text-xs font-bold text-ink-soft">Bölüm {bandIndex + 1} / 5</span>
          </div>

          {q.passage && <div className="mb-5 rounded-2xl border-2 border-line bg-card p-4 text-[16px] leading-relaxed">{q.passage}</div>}
          {q.say && <Listen text={q.say} key={q.id} />}

          <h1 className="mb-6 font-display text-[clamp(1.5rem,4.5vw,2rem)] font-black leading-snug">{q.prompt}</h1>
          <div className="grid gap-2.5" role="radiogroup">
            {q.options.map((o, oi) => (
              <button key={oi} role="radio" aria-checked={pick === oi} onClick={() => setPick(oi)} className={clsx('flex items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left text-[17px] font-bold transition', pick === oi ? 'border-ink bg-card shadow-[0_3px_0_0_var(--ink)]' : 'border-line bg-card hover:border-ink/30')}>
                <span className={clsx('grid size-8 shrink-0 place-items-center rounded-lg font-mono text-sm font-black', pick === oi ? 'bg-ink text-paper' : 'bg-paper-2')}>{'ABCD'[oi]}</span>
                {o}
              </button>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-8">
            <button className="text-sm font-bold text-ink-soft hover:text-ink" onClick={() => next(-1)}>Bilmiyorum, geç</button>
            <Button onClick={() => pick !== null && next(pick)} disabled={pick === null} className="min-w-40 gap-2">{i + 1 < qs.length ? 'Devam' : 'Testi bitir'} <ArrowRight className="size-4" /></Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Intro({ total, exit, onStart }: { total: number; exit: string; onStart: () => void }) {
  const parts: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening']
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-5">
      <Link to={exit} aria-label="Kapat" className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><X className="size-6" /></Link>
      <div className="my-auto py-8">
        <motion.img initial={{ scale: 0.6, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} src={higoImg('read')} alt="" className="mb-4 w-24" />
        <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Seviye tespit sınavı</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,6vw,2.8rem)] font-black leading-[1.05]">Nereden başlaman gerektiğini bulalım.</h1>
        <p className="mt-3 text-[17px] text-ink-soft">Kolaydan zora {total} soru. Bilmediğini geçebilirsin; tahmin etmek yerine “Bilmiyorum” demek sonucu daha doğru yapar.</p>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {parts.map((k) => {
            const s = SKILL[k]
            return <div key={k} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-card p-3"><span className={clsx('grid size-10 place-items-center rounded-xl', s.tone)}><s.icon className="size-5" /></span><span className="font-extrabold">{s.label}</span></div>
          })}
        </div>

        <ul className="mt-5 space-y-2 text-sm font-semibold text-ink-soft">
          <li className="flex items-center gap-2"><Clock className="size-4 text-flame" /> Yaklaşık 8-10 dakika</li>
          <li className="flex items-center gap-2"><Volume2 className="size-4 text-mint-deep" /> Dinleme soruları için sesin açık olsun</li>
          <li className="flex items-center gap-2"><Lock className="size-4 text-lilac" /> Sonucun hesabına işlenir ve ders yolun ona göre açılır</li>
        </ul>
        <Button block size="lg" className="mt-8 gap-2" onClick={onStart}>Sınava başla <ArrowRight className="size-5" /></Button>
      </div>
    </div>
  )
}

/** Plays the listening line with the browser voice; two replays, then the text can be shown. */
function Listen({ text }: { text: string }) {
  const [plays, setPlays] = useState(0)
  const [on, setOn] = useState(false)
  const [show, setShow] = useState(!canSpeak())
  const play = () => {
    setPlays((p) => p + 1)
    speak(text, { rate: 0.92, onStart: () => setOn(true), onEnd: () => setOn(false) })
  }
  useEffect(() => () => { if (canSpeak()) speechSynthesis.cancel() }, [])
  return (
    <div className="mb-5 flex items-center gap-4 rounded-2xl border-2 border-line bg-card p-4">
      <button onClick={play} disabled={plays >= 3} aria-label="Dinle" className={clsx('relative grid size-14 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40', on ? 'bg-mint-deep' : 'bg-mint')}>
        {on && <span className="absolute inset-0 animate-ping rounded-full bg-mint/40" />}
        <Volume2 className="relative size-6" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{plays === 0 ? 'Önce dinle' : on ? 'Dinliyorsun…' : `${3 - plays} dinleme hakkın kaldı`}</p>
        {show ? <p className="mt-1 text-sm italic text-ink-soft">“{text}”</p> : plays >= 2 && <button onClick={() => setShow(true)} className="mt-1 text-sm font-bold text-ink-soft underline">Metni göster</button>}
      </div>
    </div>
  )
}

function Done({ pending, signedIn, onGo }: { pending: boolean; signedIn: boolean; onGo: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <motion.img key={pending ? 'think' : 'cheer'} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: pending ? [0, -8, 0] : 0 }} transition={pending ? { y: { repeat: Infinity, duration: 1.2 } } : { type: 'spring', stiffness: 260, damping: 14 }} src={higoImg(pending ? 'think' : 'cheer')} alt="" className="w-32" />
      {pending ? (
        <p className="mt-6 font-display text-2xl font-black">Cevaplarını değerlendiriyoruz…</p>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-mint-deep">Sınav tamamlandı</p>
          <h1 className="mt-2 font-display text-3xl font-black leading-tight">{signedIn ? 'Sonucun hesabına işlendi.' : 'Sonucun hazır, seni bekliyor.'}</h1>
          <p className="mt-3 text-ink-soft">{signedIn ? 'Seviyeni ve dört becerideki durumunu yol haritanda görebilirsin.' : 'Ücretsiz hesabını oluştur; seviyeni, beceri raporunu ve sana göre hazırlanan yolu hemen göstereceğiz.'}</p>
          <Button block size="lg" className="mt-7 gap-2" onClick={onGo}><Sparkles className="size-5" /> {signedIn ? 'Sonucumu gör' : 'Hesap oluştur, sonucu gör'}</Button>
          {!signedIn && <p className="mt-3 text-sm text-ink-soft">Zaten hesabın var mı? <Link to="/login" className="font-bold text-flame">Giriş yap</Link>, sonuç hesabına eklenir.</p>}
        </motion.div>
      )}
    </div>
  )
}
