import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, BookOpen, Clock, Headphones, Lock, PenLine, Trophy, Type, Volume2, X } from 'lucide-react'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Misc'
import { storage } from '@/lib/storage'
import { PLACEMENT_TOKEN } from '@/lib/onboarding'
import { canSpeak, speak } from '@/lib/speech'
import { higoImg } from '@/components/game/Higo'

type Skill = 'vocabulary' | 'grammar' | 'reading' | 'listening'
type Kind = 'choice' | 'order' | 'gap' | 'dictation'
interface Q { id: number; level: string; skill: Skill; type?: Kind; prompt: string; passage: string | null; say: string | null; options: string[]; tiles?: string[] | null }
type Given = number | string

const KIND: Record<Exclude<Kind, 'choice'>, string> = { order: 'Cümle kur', gap: 'Yazarak cevapla', dictation: 'Dinle ve yaz' }

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
  const [built, setBuilt] = useState<number[]>([])
  const [typed, setTyped] = useState('')
  const [answers, setAnswers] = useState<Record<number, Given>>({})
  const [checking, setChecking] = useState(false)
  const submit = useMutation({
    mutationFn: (a: Record<number, Given>) => post<{ token: string; answered: number; total: number }>('/placement', { answers: a }),
    onSuccess: async (r) => { await storage.set(PLACEMENT_TOKEN, r.token) },
  })

  if (isLoading || !data) return <Spinner />
  const qs = data.data
  const q = qs[i]

  const kind: Kind = q.type ?? 'choice'
  const ready = kind === 'choice' ? pick !== null : kind === 'order' ? built.length === (q.tiles?.length ?? 0) : typed.trim().length > 0
  const current = (): Given => (kind === 'choice' ? pick! : kind === 'order' ? built.map((t) => q.tiles![t]).join(' ') : typed.trim())
  const next = async (opt: Given) => {
    const a = { ...answers, [q.id]: opt }
    setAnswers(a)
    setPick(null)
    setBuilt([])
    setTyped('')
    if (i + 1 >= qs.length) return submit.mutate(a)
    // Adaptive: at the end of each band, ask whether it was passed. Someone who can't do the
    // easier band won't do the harder ones, so the test ends here instead of dragging on.
    if (qs[i + 1].level !== q.level) {
      setChecking(true)
      const band = Object.fromEntries(qs.filter((x) => x.level === q.level).map((x) => [x.id, a[x.id] ?? -1]))
      const r = await post<{ passed: boolean }>('/placement/band', { level: q.level, answers: band }).catch(() => ({ passed: true }))
      setChecking(false)
      if (!r.passed) return submit.mutate(a)
    }
    setI(i + 1)
  }

  if (!started) return <Intro total={qs.length} exit={exit} onStart={() => setStarted(true)} />
  if (submit.isPending || submit.isSuccess) return <Done pending={submit.isPending} signedIn={!!user} onGo={() => nav(user ? '/learn' : '/register?from=placement')} />

  const s = SKILL[q.skill] ?? SKILL.grammar
  const bandIndex = ['A1', 'A2', 'B1', 'B2', 'C1'].indexOf(q.level)
  return (
    // one fixed screen: progress on top, the task in the middle (scrolls only if a passage is long), answer bar pinned below
    <div className="mx-auto flex h-dvh max-w-2xl flex-col px-5 pt-4">
      <div className="mb-4 flex shrink-0 items-center gap-4 sm:mb-6">
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
        <motion.div key={q.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
          <div className="mb-4 flex items-center gap-2">
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider', s.tone)}><s.icon className="size-3.5" /> {s.label}</span>
            {kind !== 'choice' && <span className="rounded-full bg-flame/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-flame">{KIND[kind]}</span>}
            <span className="text-xs font-bold text-ink-soft">Bölüm {bandIndex + 1} / 5</span>
          </div>

          {q.passage && <div className="mb-4 rounded-2xl border-2 border-line bg-card p-4 text-[15px] leading-relaxed sm:text-[16px]">{q.passage}</div>}
          {q.say && <Listen text={q.say} key={q.id} hideText={kind === 'dictation'} />}

          <h1 className="mb-4 font-display text-[clamp(1.3rem,4.5vw,2rem)] font-black leading-snug sm:mb-6">{q.prompt}</h1>
          {kind === 'choice' && (
            <div className="grid gap-2.5" role="radiogroup">
              {q.options.map((o, oi) => (
                <button key={oi} role="radio" aria-checked={pick === oi} onClick={() => setPick(oi)} className={clsx('flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base font-bold transition sm:gap-4 sm:py-3.5 sm:text-[17px]', pick === oi ? 'border-ink bg-card shadow-[0_3px_0_0_var(--ink)]' : 'border-line bg-card hover:border-ink/30')}>
                  <span className={clsx('grid size-8 shrink-0 place-items-center rounded-lg font-mono text-sm font-black', pick === oi ? 'bg-ink text-paper' : 'bg-paper-2')}>{'ABCD'[oi]}</span>
                  {o}
                </button>
              ))}
            </div>
          )}
          {kind === 'order' && q.tiles && <Builder tiles={q.tiles} built={built} setBuilt={setBuilt} />}
          {(kind === 'gap' || kind === 'dictation') && (
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ready && next(current())}
              maxLength={200}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={kind === 'dictation' ? 'Duyduğunu buraya yaz' : 'Cevabını yaz'}
              aria-label="Cevabın"
              className="h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg font-bold outline-none transition placeholder:font-semibold placeholder:text-ink-soft/60 focus:border-ink"
            />
          )}

          </div>
          <div className="safe-bottom flex shrink-0 items-center justify-between gap-3 border-t-2 border-line py-3">
            <button className="text-sm font-bold text-ink-soft hover:text-ink" disabled={checking} onClick={() => next(-1)}>Bilmiyorum, geç</button>
            <Button onClick={() => ready && next(current())} disabled={!ready} loading={checking} className="min-w-40 gap-2">{i + 1 < qs.length ? 'Devam' : 'Testi bitir'} <ArrowRight className="size-4" /></Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Intro({ total, exit, onStart }: { total: number; exit: string; onStart: () => void }) {
  const parts: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening']
  return (
    <div className="mx-auto flex h-dvh max-w-xl flex-col px-5 pt-4">
      <Link to={exit} aria-label="Kapat" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><X className="size-6" /></Link>
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-3">
        <motion.img initial={{ scale: 0.6, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} src={higoImg('read')} alt="" className="mb-3 w-16 sm:w-24 [@media(max-height:620px)]:hidden" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-flame sm:text-sm">Seviye tespit sınavı</p>
        <h1 className="mt-1.5 font-display text-[clamp(1.7rem,6vw,2.8rem)] font-black leading-[1.05]">Nereden başlaman gerektiğini bulalım.</h1>
        <p className="mt-2.5 text-[15px] text-ink-soft sm:text-[17px]">Kolaydan zora en fazla {total} görev. Bir bölümü geçemezsen test orada biter. Bilmediğini geçebilirsin; “Bilmiyorum” demek sonucu daha doğru yapar.</p>

        <div className="mt-4 grid grid-cols-4 gap-1.5 sm:mt-6 sm:grid-cols-2 sm:gap-2.5">
          {parts.map((k) => {
            const s = SKILL[k]
            return <div key={k} className="flex flex-col items-center gap-1 rounded-2xl border-2 border-line bg-card p-2 text-center sm:flex-row sm:gap-3 sm:p-3 sm:text-left"><span className={clsx('grid size-8 place-items-center rounded-xl sm:size-10', s.tone)}><s.icon className="size-4 sm:size-5" /></span><span className="text-[11px] font-extrabold sm:text-base">{s.label}</span></div>
          })}
        </div>

        <ul className="mt-4 space-y-1.5 text-[13px] font-semibold text-ink-soft sm:mt-5 sm:space-y-2 sm:text-sm">
          <li className="flex items-center gap-2"><Clock className="size-4 shrink-0 text-flame" /> 3 ile 12 dakika arası</li>
          <li className="flex items-center gap-2"><Volume2 className="size-4 shrink-0 text-mint-deep" /> Dinleme soruları için sesin açık olsun</li>
          <li className="flex items-center gap-2"><Lock className="size-4 shrink-0 text-lilac" /> Sonucun hesabına işlenir, ders yolun ona göre açılır</li>
        </ul>
      </div>
      <div className="safe-bottom shrink-0 py-3">
        <Button block size="lg" className="gap-2" onClick={onStart}>Sınava başla <ArrowRight className="size-5" /></Button>
      </div>
    </div>
  )
}

/** Plays the listening line with the browser voice; two replays, then the text can be shown. */
function Listen({ text, hideText }: { text: string; hideText?: boolean }) {
  const [plays, setPlays] = useState(0)
  const [on, setOn] = useState(false)
  const [show, setShow] = useState(!canSpeak() && !hideText)
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
        {show ? <p className="mt-1 text-sm italic text-ink-soft">“{text}”</p> : hideText ? (!canSpeak() && <p className="mt-1 text-sm text-ink-soft">Tarayıcın ses çalamıyor. Bu soruyu geçebilirsin.</p>) : plays >= 2 && <button onClick={() => setShow(true)} className="mt-1 text-sm font-bold text-ink-soft underline">Metni göster</button>}
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
          <Button block size="lg" className="mt-7 gap-2" onClick={onGo}><Trophy className="size-5" /> {signedIn ? 'Sonucumu gör' : 'Hesap oluştur, sonucu gör'}</Button>
          {!signedIn && <p className="mt-3 text-sm text-ink-soft">Zaten hesabın var mı? <Link to="/login" className="font-bold text-flame">Giriş yap</Link>, sonuç hesabına eklenir.</p>}
        </motion.div>
      )}
    </div>
  )
}

/** Sentence building: tap the shuffled tiles in order; tap a placed tile to send it back. */
function Builder({ tiles, built, setBuilt }: { tiles: string[]; built: number[]; setBuilt: (b: number[]) => void }) {
  return (
    <div>
      <div className="flex min-h-[64px] flex-wrap content-start gap-2 border-b-2 border-dashed border-line pb-3" aria-label="Kurduğun cümle">
        {built.length === 0 && <span className="self-center text-sm font-semibold text-ink-soft">Kelimelere sırayla dokun</span>}
        {built.map((t, k) => (
          <motion.button layout key={t} onClick={() => setBuilt(built.filter((_, j) => j !== k))} className="rounded-xl border-2 border-ink bg-card px-3.5 py-2 text-[17px] font-bold shadow-[0_3px_0_0_var(--ink)]">
            {tiles[t]}
          </motion.button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {tiles.map((w, t) => {
          const used = built.includes(t)
          return (
            <button key={t} disabled={used} onClick={() => setBuilt([...built, t])} className={clsx('rounded-xl border-2 px-3.5 py-2 text-[17px] font-bold transition', used ? 'border-line bg-paper-2 text-transparent' : 'border-line bg-card hover:border-ink/40')}>
              {w}
            </button>
          )
        })}
      </div>
    </div>
  )
}
