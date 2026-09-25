import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, Gift } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { ApiError, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { storage } from '@/lib/storage'
import { GOALS } from '@/lib/format'
import type { Cefr, Me } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert, Progress } from '@/components/ui/Misc'
import { AuthShell } from './AuthShell'
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

  const titles = ['Neden İngilizce?', 'Günlük hedefin ne olsun?', 'Hesabını oluştur']
  return (
    <AuthShell
      title={titles[step]}
      subtitle={step === 2 ? 'Son adım! Ücretsiz, kredi kartı gerekmez.' : 'Yolunu sana göre hazırlayalım.'}
      footer={<>Zaten hesabın var mı? <Link to="/login" className="font-extrabold text-flame">Giriş yap</Link></>}
    >
      <div className="mb-6 flex items-center gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} aria-label="Geri" className="grid size-9 place-items-center rounded-xl border-2 border-line bg-card">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <Progress value={step + 1} max={3} color="bg-flame" className="flex-1" />
      </div>

      {form.referral_code && step === 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-line bg-butter p-3 text-sm font-bold text-[#1B1F3B] shadow-hard-sm">
          <Gift className="size-5 shrink-0" /> Bir arkadaşın seni davet etti! E-postanı doğrulayınca 100 elmas senin.
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.18 }}>
          {step === 0 && (
            <div className="grid gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => {
                    setGoal(g.key)
                    setStep(1)
                  }}
                  className={clsx('press ink-card flex items-center gap-4 p-4 text-left', goal === g.key && 'bg-butter text-[#1B1F3B]')}
                >
                  <span className="text-3xl">{g.emoji}</span>
                  <span>
                    <span className="block font-display text-lg font-extrabold">{g.label}</span>
                    <span className="block text-sm opacity-70">{g.text}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {DAILY.map((d) => (
                  <button key={d.xp} onClick={() => setDaily(d.xp)} className={clsx('press ink-card p-4 text-left', daily === d.xp && 'bg-flame text-white')}>
                    <span className="block font-display text-xl font-extrabold">{d.label}</span>
                    <span className="block text-sm opacity-80">{d.text} · {d.xp} XP</span>
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-2 font-bold">İngilizce seviyen {placed && <span className="text-mint-deep">(seviye testinden: {level})</span>}</p>
                <div className="grid gap-2">
                  {LEVELS.map((l) => (
                    <button key={l.v} onClick={() => setLevel(l.v)} className={clsx('flex items-center gap-3 rounded-2xl border-2 border-line px-4 py-3 text-left font-semibold', level === l.v ? 'bg-sky text-white shadow-hard-sm' : 'bg-card')}>
                      <span className="font-mono font-bold">{l.v}</span> {l.t}
                    </button>
                  ))}
                </div>
                <Link to="/placement" className="mt-3 inline-block text-sm font-bold text-flame">Emin değilim → 3 dakikalık seviye testi</Link>
              </div>
              <Button block size="lg" onClick={() => setStep(2)}>Devam</Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={submit} className="space-y-4">
              {err && <Alert tone="error">{err.first()}</Alert>}
              <Input label="Adın" autoComplete="name" value={form.name} onChange={set('name')} required error={err?.errors.name?.[0]} />
              <Input label="E-posta" type="email" autoComplete="email" value={form.email} onChange={set('email')} required error={err?.errors.email?.[0]} />
              <Input label="Şifre" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required hint="En az 8 karakter, harf ve rakam içermeli." error={err?.errors.password?.[0]} />
              <Input label="Şifre (tekrar)" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} required />
              <Input label="Davet kodu (isteğe bağlı)" value={form.referral_code} onChange={set('referral_code')} />
              {/* honeypot: hidden from humans */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <label className="flex gap-3 text-sm">
                <input type="checkbox" checked={form.accept_terms} onChange={set('accept_terms')} className="mt-0.5 size-5 accent-[#FF5A36]" required />
                <span>
                  <Link to="/terms" className="font-bold underline">Kullanım koşullarını</Link> ve <Link to="/privacy" className="font-bold underline">KVKK aydınlatma metnini</Link> okudum, kabul ediyorum.
                </span>
              </label>
              <label className="flex gap-3 text-sm">
                <input type="checkbox" checked={form.marketing_opt_in} onChange={set('marketing_opt_in')} className="mt-0.5 size-5 accent-[#FF5A36]" />
                <span>Kampanya ve öğrenme ipuçlarını e-postayla almak istiyorum.</span>
              </label>
              <Turnstile onToken={setCaptcha} />
              <Button type="submit" block size="lg" loading={m.isPending}>Hesabımı oluştur</Button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  )
}
