import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Check, Gift, Sparkles } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { ApiError, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { storage } from '@/lib/storage'
import { GOALS } from '@/lib/format'
import type { Cefr, Me } from '@/lib/types'
import { PHOTO, rewardImg } from '@/lib/assets'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Logo } from '@/components/game/Logo'
import { Ada } from '@/components/game/Ada'
import { Img } from '@/components/ui/Img'
import { ThemeButton } from '@/components/ui/ThemeToggle'
import { Turnstile } from './Turnstile'

const DAILY = [
  { xp: 10, label: 'Rahat', text: '5 dk / gün' },
  { xp: 20, label: 'Normal', text: '10 dk / gün' },
  { xp: 30, label: 'Ciddi', text: '15 dk / gün' },
  { xp: 50, label: 'Yoğun', text: '20+ dk / gün' },
]
const LEVELS: { v: Cefr; t: string }[] = [
  { v: 'A1', t: 'Yeni başlıyorum' },
  { v: 'A2', t: 'Temel cümleler kurabiliyorum' },
  { v: 'B1', t: 'Günlük konuşmaları anlıyorum' },
  { v: 'B2', t: 'Rahat konuşabiliyorum' },
]
const NEXT: Record<string, string> = { A1: 'A2', A2: 'B1', B1: 'B2', B2: 'C1' }

export default function Register() {
  const { code } = useParams()
  const { user, signIn } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState('')
  const [daily, setDaily] = useState(20)
  const [level, setLevel] = useState<Cefr>('A1')
  const [placed, setPlaced] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '', referral_code: '', accept_terms: false, marketing_opt_in: false })
  const [captcha, setCaptcha] = useState('')

  useEffect(() => {
    if (user) nav('/learn', { replace: true })
  }, [user, nav])
  useEffect(() => {
    ;(async () => {
      if (code) await storage.set('dilgo.ref', code.toUpperCase())
      const ref = await storage.get('dilgo.ref')
      if (ref) setForm((f) => ({ ...f, referral_code: ref }))
      const lvl = await storage.get('dilgo.placement')
      if (lvl) {
        setLevel(lvl as Cefr)
        setPlaced(true)
      }
    })()
  }, [code])

  const m = useMutation({
    mutationFn: () =>
      post<{ token: string; user: Me }>('/auth/register', {
        ...form,
        learning_goal: goal || undefined,
        daily_goal_xp: daily,
        cefr_level: level,
        captcha,
        device: Capacitor.getPlatform(),
      }),
    onSuccess: async ({ token, user }) => {
      await storage.remove('dilgo.ref')
      await signIn(token, user)
      nav('/verify-email', { replace: true })
    },
  })
  const err = m.error as ApiError | null
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    m.mutate()
  }

  const goalObj = GOALS.find((g) => g.key === goal)
  // Rough, honest estimate of weeks to the next CEFR level from the chosen pace.
  const weeks = useMemo(() => Math.max(6, Math.round(1800 / daily)), [daily])
  const dailyObj = DAILY.find((d) => d.xp === daily)!
  const firstName = form.name.trim().split(' ')[0]

  const titles = ['Neden İngilizce öğreniyorsun?', 'Seviyen ve hedefin', 'Hesabını oluştur']
  const subtitle = step === 2 ? 'Son adım — ücretsiz, kredi kartı gerekmez.' : 'Yolunu tamamen sana göre kuruyoruz.'

  return (
    <div className="grid min-h-dvh bg-card lg:grid-cols-[1fr_1.05fr]">
      {/* Live, personalised plan — it fills in as they answer, so the site feels theirs before signup. */}
      <PlanPreview goalObj={goalObj} level={level} daily={dailyObj} weeks={weeks} firstName={firstName} step={step} />

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden"><Logo small /></Link>
          <span className="hidden lg:block" />
          <ThemeButton />
        </div>

        <div className="mx-auto my-auto w-full max-w-md">
          {/* segmented progress */}
          <div className="mb-6 flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} aria-label="Geri" className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2">
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div className="flex flex-1 gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
                  <motion.span className="block h-full rounded-full bg-flame" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
                </span>
              ))}
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl">{titles[step]}</h1>
          <p className="mt-2 text-ink-soft">{subtitle}</p>

          {form.referral_code && step === 0 && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-butter/20 p-3 text-sm font-bold">
              <Gift className="size-5 shrink-0 text-butter-deep" /> Bir arkadaşın seni davet etti! E-postanı doğrulayınca 100 elmas senin.
            </div>
          )}

          <div className="mt-7">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ duration: 0.2 }}>
                {step === 0 && (
                  <div className="grid gap-3">
                    {GOALS.map((g) => (
                      <button
                        key={g.key}
                        onClick={() => { setGoal(g.key); setStep(1) }}
                        className={clsx('press group flex items-center gap-4 rounded-2xl border-2 p-4 text-left shadow-hard transition', goal === g.key ? 'border-sky bg-sky/10' : 'border-line bg-card hover:bg-paper-2')}
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-paper-2 text-2xl transition group-hover:scale-110">{g.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-lg font-black leading-tight">{g.label}</span>
                          <span className="block text-sm text-ink-soft">{g.text}</span>
                        </span>
                        <ArrowRight className="size-5 shrink-0 text-ink-soft transition group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <p className="mb-2 font-bold">İngilizce seviyen {placed && <span className="text-mint-deep">(seviye testinden: {level})</span>}</p>
                      <div className="grid gap-2">
                        {LEVELS.map((l) => (
                          <button key={l.v} onClick={() => setLevel(l.v)} className={clsx('press flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-bold transition', level === l.v ? 'border-sky bg-sky/10 text-sky' : 'border-line bg-card hover:bg-paper-2')}>
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-paper-2 font-mono text-sm">{l.v}</span> {l.t}
                            {level === l.v && <Check className="ml-auto size-5 text-sky" strokeWidth={3} />}
                          </button>
                        ))}
                      </div>
                      <Link to="/placement" className="mt-3 inline-block text-sm font-bold text-flame">Emin değilim → 3 dakikalık seviye testi</Link>
                    </div>
                    <div>
                      <p className="mb-2 font-bold">Günlük hedefin</p>
                      <div className="grid grid-cols-2 gap-3">
                        {DAILY.map((d) => (
                          <button key={d.xp} onClick={() => setDaily(d.xp)} className={clsx('press rounded-2xl border-2 p-4 text-left shadow-hard transition', daily === d.xp ? 'border-sky bg-sky/10' : 'border-line bg-card hover:bg-paper-2')}>
                            <span className="block text-lg font-black">{d.label}</span>
                            <span className="block text-sm text-ink-soft">{d.text} · {d.xp} XP</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button block size="lg" onClick={() => setStep(2)} icon={<ArrowRight className="size-5" />}>Devam</Button>
                  </div>
                )}

                {step === 2 && (
                  <form onSubmit={submit} className="space-y-4">
                    {err && <Alert tone="error">{err.first()}</Alert>}
                    <Input label="Adın" autoComplete="name" value={form.name} onChange={set('name')} required error={err?.errors.name?.[0]} autoFocus />
                    <Input label="E-posta" type="email" autoComplete="email" value={form.email} onChange={set('email')} required error={err?.errors.email?.[0]} />
                    <Input label="Şifre" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required hint="En az 8 karakter, harf ve rakam içermeli." error={err?.errors.password?.[0]} />
                    <Input label="Şifre (tekrar)" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} required />
                    <Input label="Davet kodu (isteğe bağlı)" value={form.referral_code} onChange={set('referral_code')} />
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                    <label className="flex gap-3 text-sm">
                      <input type="checkbox" checked={form.accept_terms} onChange={set('accept_terms')} className="mt-0.5 size-5 accent-[#e8403a]" required />
                      <span><Link to="/terms" className="font-bold underline">Kullanım koşullarını</Link> ve <Link to="/privacy" className="font-bold underline">KVKK aydınlatma metnini</Link> okudum, kabul ediyorum.</span>
                    </label>
                    <label className="flex gap-3 text-sm">
                      <input type="checkbox" checked={form.marketing_opt_in} onChange={set('marketing_opt_in')} className="mt-0.5 size-5 accent-[#e8403a]" />
                      <span>Kampanya ve öğrenme ipuçlarını e-postayla almak istiyorum.</span>
                    </label>
                    <Turnstile onToken={setCaptcha} />
                    <Button type="submit" block size="lg" loading={m.isPending}>{firstName ? `Hadi başlayalım, ${firstName}!` : 'Hesabımı oluştur'}</Button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="mt-8 text-center font-semibold text-ink-soft">Zaten hesabın var mı? <Link to="/login" className="font-extrabold text-flame">Giriş yap</Link></p>
        </div>
      </main>
    </div>
  )
}

function PlanPreview({ goalObj, level, daily, weeks, firstName, step }: { goalObj?: (typeof GOALS)[number]; level: Cefr; daily: (typeof DAILY)[number]; weeks: number; firstName: string; step: number }) {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-sky/12 via-paper to-flame/12 lg:flex lg:flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--line)_1.4px,transparent_1.4px)] [background-size:26px_26px]" />
      <span className="glow left-[-15%] top-[-10%] size-[420px] bg-sky/18" />
      <span className="glow bottom-[-12%] right-[-10%] size-[380px] bg-flame/16" />

      <Link to="/" className="relative z-10 m-10 w-max rounded-2xl bg-card/90 px-4 py-2 shadow-hard-sm backdrop-blur"><Logo small /></Link>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-12 pb-12">
        <div className="mb-6 flex items-center gap-3">
          <Ada className="size-14" online />
          <div>
            <p className="font-display text-lg font-black leading-tight">Ben Ada 👋</p>
            <p className="text-ink-soft">{firstName ? `Tanıştığımıza sevindim, ${firstName}!` : 'Öğretmenin olacağım.'}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-card/95 p-6 shadow-soft backdrop-blur">
          <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-flame">
            <Sparkles className="size-4" /> Senin planın
          </p>

          <ul className="space-y-3">
            <PlanRow label="Hedef" done={!!goalObj}>
              {goalObj ? <><span className="text-xl">{goalObj.emoji}</span> {goalObj.label}</> : 'Bir hedef seç'}
            </PlanRow>
            <PlanRow label="Başlangıç seviyesi" done={step >= 1}>
              <span className="rounded-lg bg-paper-2 px-2 py-0.5 font-mono text-sm">{level}</span>
            </PlanRow>
            <PlanRow label="Günlük tempo" done={step >= 1}>
              <Img src={rewardImg('flame')} alt="" className="size-5" /> {daily.text}
            </PlanRow>
          </ul>

          <AnimatePresence>
            {goalObj && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-5 overflow-hidden">
                <div className="rounded-2xl bg-mint/12 p-4 text-mint-deep">
                  <p className="text-sm font-bold">Bu tempoyla</p>
                  <p className="font-display text-xl font-black">~{weeks} haftada {NEXT[level] ?? 'ileri'} seviyeye</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center gap-4 opacity-90">
          <Img src={PHOTO.classroom} alt="" className="size-16 rounded-2xl object-cover" />
          <p className="text-sm font-semibold text-ink-soft">Kazandığın canlı ders kuponlarını gerçek Bayrak Dil Okulları öğretmenleriyle kullanırsın.</p>
        </div>
      </div>
    </aside>
  )
}

function PlanRow({ label, done, children }: { label: string; done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className={clsx('grid size-7 shrink-0 place-items-center rounded-full transition', done ? 'bg-mint text-white' : 'bg-paper-2 text-ink-soft')}>
        {done ? <Check className="size-4" strokeWidth={3} /> : <span className="size-2 rounded-full bg-current" />}
      </span>
      <span className="flex-1">
        <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</span>
        <span className="flex items-center gap-1.5 font-extrabold">{children}</span>
      </span>
    </li>
  )
}
