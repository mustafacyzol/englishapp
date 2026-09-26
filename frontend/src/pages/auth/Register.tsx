import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Building2, Check, Gift } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { storage } from '@/lib/storage'
import type { Cefr, Me, SkillKey } from '@/lib/types'
import { PHOTO } from '@/lib/assets'
import { SKILL, SKILLS } from '@/lib/skills'
import { FOCUS_TEXT, INTERESTS, MOTIVATIONS, PACES, STUDY_TIMES } from '@/lib/onboarding'
import { TUTOR } from '@/lib/tutor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Defne } from '@/components/game/Defne'
import { Img } from '@/components/ui/Img'
import { AuthShell } from './AuthShell'
import { Turnstile } from './Turnstile'

const LEVELS: { v: Cefr; t: string; d: string }[] = [
  { v: 'A1', t: 'Sıfırdan başlıyorum', d: 'Birkaç kelime biliyorum' },
  { v: 'A2', t: 'Temel cümleler kurabiliyorum', d: 'Kendimi tanıtır, sipariş veririm' },
  { v: 'B1', t: 'Günlük konuşmaları anlıyorum', d: 'Derdimi anlatırım ama takılırım' },
  { v: 'B2', t: 'Rahat konuşabiliyorum', d: 'Dizileri çoğunlukla anlıyorum' },
]
const NEXT: Record<string, string> = { A1: 'A2', A2: 'B1', B1: 'B2', B2: 'C1' }
const STEPS = 7

export default function Register() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const invite = params.get('davet')
  const { user, signIn } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [motivation, setMotivation] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [focus, setFocus] = useState<SkillKey | ''>('')
  const [level, setLevel] = useState<Cefr>('A1')
  const [placed, setPlaced] = useState(false)
  const [time, setTime] = useState('')
  const [daily, setDaily] = useState(20)
  const [form, setForm] = useState({ email: '', password: '', password_confirmation: '', referral_code: '', accept_terms: false, marketing_opt_in: false })
  const [captcha, setCaptcha] = useState('')
  const inv = useQuery({ queryKey: ['invite', invite], queryFn: () => get<{ institution: { name: string }; email: string }>(`/invites/${invite}`), enabled: !!invite, retry: false })

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
  useEffect(() => {
    if (inv.data?.email) setForm((f) => ({ ...f, email: f.email || inv.data!.email }))
  }, [inv.data])

  const mot = MOTIVATIONS.find((m) => m.key === motivation)
  const pace = PACES.find((p) => p.xp === daily)!
  const slot = STUDY_TIMES.find((t) => t.key === time)
  const firstName = name.trim().split(' ')[0]
  // Near-term, honest milestones from the real curriculum (a unit is ~6 lessons of ~20 XP).
  const weeks = useMemo(() => Math.max(1, Math.ceil(120 / daily)), [daily])

  const m = useMutation({
    mutationFn: () =>
      post<{ token: string; user: Me }>('/auth/register', {
        ...form,
        name: name.trim(),
        learning_goal: mot?.goal,
        motivation: motivation || undefined,
        interests,
        focus_skill: focus || undefined,
        study_time: time || undefined,
        daily_goal_xp: daily,
        cefr_level: level,
        invite: invite || undefined,
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
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  // Single-choice questions move on by themselves after a short beat.
  const pick = (fn: () => void) => () => {
    fn()
    setTimeout(next, 220)
  }

  const who = firstName ? `${firstName}, ` : ''
  const Q: { title: ReactNode; sub: string }[] = [
    { title: 'Merhaba! Sana nasıl hitap edelim?', sub: `Ben ${TUTOR.name}, İngilizce koçun. Planını birlikte kuralım — 1 dakika sürer.` },
    { title: `${who}İngilizce seni nereye götürsün?`, sub: 'Hedefin derslerdeki örnekleri ve senaryoları belirler.' },
    { title: 'Hangi konular seni heyecanlandırır?', sub: 'Hikâyeler ve Defne ile sohbetler bunlardan seçilir. Birden fazla seçebilirsin.' },
    { title: 'En çok nerede zorlanıyorsun?', sub: 'Bu beceriye biraz daha ağırlık vereceğiz — ama dördünü de dengede tutacağız.' },
    { title: 'Şu an hangi seviyedesin?', sub: 'Tahmin etmen yeterli; ilk derslerde kendini ayarlar.' },
    { title: 'Ne zaman çalışacaksın?', sub: 'Saatini belirleyenlerin alışkanlığı sürdürme ihtimali çok daha yüksek.' },
    { title: firstName ? `Planın hazır, ${firstName}.` : 'Planın hazır.', sub: 'Kaydet ve ilk dersine başla — ücretsiz, kredi kartı gerekmez.' },
  ]
  const canNext = [name.trim().length >= 2, !!motivation, interests.length > 0, !!focus, true, !!time, true][step]

  return (
    <AuthShell
      wide
      banner={false}
      title={Q[step].title}
      subtitle={Q[step].sub}
      aside={<PlanPanel name={firstName} mot={mot} interests={interests} focus={focus || null} level={level} slot={slot} pace={pace} weeks={weeks} step={step} />}
      footer={<>Zaten hesabın var mı? <Link to="/login" className="font-extrabold text-flame">Giriş yap</Link></>}
      lead={
        <>
      {/* progress + back */}
          <div className="mb-7 flex items-center gap-3">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} aria-label="Geri" className={clsx('grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2', step === 0 && 'invisible')}>
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex flex-1 gap-1" aria-label={`Adım ${step + 1}/${STEPS}`}>
              {Array.from({ length: STEPS }, (_, i) => (
                <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                  <motion.span className="block h-full rounded-full bg-ink" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
                </span>
              ))}
            </div>
            <span className="w-10 text-right text-xs font-black tabular-nums text-ink-soft">{step + 1}/{STEPS}</span>
          </div>
    
        </>
      }
    >
      {(inv.data || form.referral_code) && step === 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-line p-3 text-sm font-bold">
          {inv.data ? <Building2 className="size-5 shrink-0 text-sage" /> : <Gift className="size-5 shrink-0 text-butter-deep" />}
          {inv.data ? `${inv.data.institution.name} seni davet etti — Premium koltuğun hazır.` : 'Bir arkadaşın seni davet etti! E-postanı doğrulayınca 100 elmas senin.'}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -28, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
          {step === 0 && (
            <form onSubmit={(e) => { e.preventDefault(); if (canNext) next() }} className="space-y-5">
              <div className="flex items-center gap-4 rounded-3xl bg-paper-2/70 p-4">
                <Defne className="size-14" />
                <p className="font-semibold text-ink-soft">“Adını bilirsem sohbetlerimiz çok daha doğal olur.”</p>
              </div>
              <Input label="Adın" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="ör. Deniz" />
              <Button type="submit" block size="lg" disabled={!canNext} icon={<ArrowRight className="size-5" />}>Devam</Button>
            </form>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MOTIVATIONS.map((o) => (
                <PhotoCard key={o.key} photo={o.photo} title={o.label} text={o.text} selected={motivation === o.key} onClick={pick(() => setMotivation(o.key))} />
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {INTERESTS.map((o) => {
                  const on = interests.includes(o.key)
                  return <PhotoCard key={o.key} photo={o.photo} title={o.label} selected={on} compact multi onClick={() => setInterests((xs) => (on ? xs.filter((x) => x !== o.key) : [...xs, o.key]))} />
                })}
              </div>
              <Button block size="lg" disabled={!canNext} onClick={next} icon={<ArrowRight className="size-5" />}>{interests.length ? `${interests.length} konu seçtim` : 'En az bir konu seç'}</Button>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILLS.map((k) => {
                const S = SKILL[k]
                const on = focus === k
                return (
                  <button key={k} onClick={pick(() => setFocus(k))} aria-pressed={on} className={clsx('press group relative overflow-hidden rounded-3xl border-2 text-left transition', on ? 'border-ink shadow-[0_4px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}>
                    <div className="relative h-28 overflow-hidden">
                      <Img src={S.photo} alt="" className="photo transition duration-500 group-hover:scale-105" />
                      <span className={clsx('absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black text-white', S.bg)}><S.icon className="size-3.5" /> {S.label}</span>
                    </div>
                    <p className="p-4 font-bold leading-snug">{FOCUS_TEXT[k]}</p>
                    {on && <Tick />}
                  </button>
                )
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              {placed && <Alert tone="success">Seviye testinden: <b>{level}</b>. İstersen değiştirebilirsin.</Alert>}
              {LEVELS.map((l) => (
                <button key={l.v} onClick={pick(() => setLevel(l.v))} className={clsx('press flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition', level === l.v ? 'border-ink shadow-[0_3px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}>
                  <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl font-display font-black', level === l.v ? 'bg-ink text-paper' : 'bg-paper-2')}>{l.v}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{l.t}</span>
                    <span className="block text-sm text-ink-soft">{l.d}</span>
                  </span>
                  {level === l.v && <Check className="size-5" strokeWidth={3} />}
                </button>
              ))}
              <Link to="/placement" className="inline-block pt-1 text-sm font-bold text-flame">Emin değilim → 3 dakikalık seviye testi</Link>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STUDY_TIMES.map((o) => <PhotoCard key={o.key} photo={o.photo} title={o.label} text={o.text} selected={time === o.key} compact onClick={() => setTime(o.key)} />)}
              </div>
              <div>
                <p className="mb-2 font-extrabold">Günde ne kadar?</p>
                <div className="grid grid-cols-4 gap-2 rounded-2xl bg-paper-2 p-1.5">
                  {PACES.map((p) => (
                    <button key={p.xp} onClick={() => setDaily(p.xp)} className={clsx('rounded-xl px-2 py-2.5 text-center transition', daily === p.xp ? 'bg-card shadow-hard-sm' : 'text-ink-soft hover:text-ink')}>
                      <span className="block font-display text-lg font-black leading-none">{p.minutes} dk</span>
                      <span className="mt-1 block text-[11px] font-bold">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {slot && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border-2 border-dashed border-line p-4 text-center font-display text-lg font-black">
                  “Her gün {slot.label.toLocaleLowerCase('tr')}, {pace.minutes} dakika İngilizce.”
                </motion.p>
              )}
              <Button block size="lg" disabled={!canNext} onClick={next} icon={<ArrowRight className="size-5" />}>Bu benim sözüm</Button>
            </div>
          )}

          {step === 6 && (
            <form onSubmit={submit} className="space-y-4">
              <MobilePlan mot={mot?.label} focus={focus || null} level={level} slot={slot?.label} minutes={pace.minutes} weeks={weeks} />
              {err && <Alert tone="error">{err.first()}</Alert>}
              <Input label="E-posta" type="email" autoComplete="email" value={form.email} onChange={set('email')} required error={err?.errors.email?.[0] ?? err?.errors.name?.[0]} autoFocus />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Şifre" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required hint="En az 8 karakter, harf ve rakam." error={err?.errors.password?.[0]} />
                <Input label="Şifre (tekrar)" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} required />
              </div>
              {!invite && <Input label="Davet kodu (isteğe bağlı)" value={form.referral_code} onChange={set('referral_code')} />}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <label className="flex gap-3 text-sm">
                <input type="checkbox" checked={form.accept_terms} onChange={set('accept_terms')} className="mt-0.5 size-5 accent-[#e8403a]" required />
                <span><Link to="/terms" className="font-bold underline">Kullanım koşullarını</Link> ve <Link to="/privacy" className="font-bold underline">KVKK aydınlatma metnini</Link> okudum, kabul ediyorum.</span>
              </label>
              <label className="flex gap-3 text-sm">
                <input type="checkbox" checked={form.marketing_opt_in} onChange={set('marketing_opt_in')} className="mt-0.5 size-5 accent-[#e8403a]" />
                <span>Öğrenme ipuçlarını ve kampanyaları e-postayla almak istiyorum.</span>
              </label>
              <Turnstile onToken={setCaptcha} />
              <Button type="submit" block size="lg" loading={m.isPending}>{firstName ? `Hadi başlayalım, ${firstName}!` : 'Hesabımı oluştur'}</Button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  )
}

function Tick() {
  return <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-ink text-paper shadow-soft"><Check className="size-4" strokeWidth={3} /></span>
}

function PhotoCard({ photo, title, text, selected, onClick, compact, multi }: { photo: string; title: string; text?: string; selected: boolean; onClick: () => void; compact?: boolean; multi?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={clsx('press group relative overflow-hidden rounded-3xl border-2 text-left transition', selected ? 'border-ink shadow-[0_4px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}
    >
      <div className={clsx('relative overflow-hidden', compact ? 'aspect-square' : 'aspect-[4/3]')}>
        <Img src={photo} alt="" className={clsx('photo transition duration-500 group-hover:scale-105', multi && !selected && 'saturate-[.85]')} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-3 bottom-2.5 text-white">
          <p className="font-display font-black leading-tight">{title}</p>
          {text && <p className={clsx('text-xs text-white/80', compact && 'hidden sm:block')}>{text}</p>}
        </div>
      </div>
      {selected && <Tick />}
    </button>
  )
}

/** The left side: the learner's plan, filling in live as they answer, over the photo of their latest choice. */
function PlanPanel({ name, mot, interests, focus, level, slot, pace, weeks, step }: {
  name: string
  mot?: (typeof MOTIVATIONS)[number]
  interests: string[]
  focus: SkillKey | null
  level: Cefr
  slot?: (typeof STUDY_TIMES)[number]
  pace: (typeof PACES)[number]
  weeks: number
  step: number
}) {
  const lastInterest = INTERESTS.find((i) => i.key === interests[interests.length - 1])
  const photo = (step >= 5 && slot?.photo) || (step >= 3 && focus && SKILL[focus].photo) || (step >= 2 && lastInterest?.photo) || mot?.photo || PHOTO.hero
  return (
    <aside className="relative hidden overflow-hidden bg-[#10131a] lg:block">
      <AnimatePresence initial={false}>
        <motion.div key={photo} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
          <Img src={photo} alt="" className="photo" />
        </motion.div>
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/75" />
      <Link to="/" className="absolute left-10 top-10 z-10 rounded-2xl bg-white/95 px-4 py-2 text-[#1f2433] shadow-soft xl:left-14"><span className="font-display text-xl font-black">dil<span className="text-flame">go</span></span></Link>

      <div className="absolute inset-x-10 bottom-10 z-10 xl:inset-x-14">
        <div className="rounded-[28px] bg-card/95 p-6 text-ink shadow-soft backdrop-blur-md">
          <div className="mb-5 flex items-center gap-3">
            <Defne className="size-12" />
            <div>
              <p className="font-display text-lg font-black leading-tight">{name ? `${name} için plan` : 'Senin planın'}</p>
              <p className="text-sm text-ink-soft">{TUTOR.name} cevaplarına göre hazırlıyor</p>
            </div>
          </div>
          <ul className="space-y-3">
            <Row done={!!mot} label="Hedef">{mot ? mot.label : '—'}</Row>
            <Row done={interests.length > 0} label="Konular">
              {interests.length ? (
                <span className="flex flex-wrap gap-1">{interests.map((k) => <span key={k} className="rounded-md bg-paper-2 px-1.5 py-0.5 text-xs">{INTERESTS.find((i) => i.key === k)?.label}</span>)}</span>
              ) : '—'}
            </Row>
            <Row done={!!focus} label="Odak beceri">{focus ? <span className={SKILL[focus].text}>{SKILL[focus].label}</span> : '—'}</Row>
            <Row done={step > 4} label="Başlangıç">{step > 4 ? `${level} → ${NEXT[level] ?? 'C1'}` : '—'}</Row>
            <Row done={!!slot} label="Ritüel">{slot ? `Her gün ${slot.label.toLocaleLowerCase('tr')} · ${pace.minutes} dk` : '—'}</Row>
          </ul>
          <AnimatePresence>
            {step >= 5 && slot && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-mint/12 px-4 py-3 font-display font-black text-mint-deep">
                Bu tempoyla ilk üniteyi ~{weeks} günde bitirirsin · ayda {Math.round((pace.minutes * 30) / 60)} saat pratik
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  )
}

function Row({ label, done, children }: { label: string; done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className={clsx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full transition', done ? 'bg-mint text-white' : 'bg-paper-2')}>{done && <Check className="size-3.5" strokeWidth={3.5} />}</span>
      <span className="w-24 shrink-0 text-sm font-bold text-ink-soft">{label}</span>
      <span className="min-w-0 flex-1 text-sm font-extrabold">{children}</span>
    </li>
  )
}

/** The plan summary on phones, where the side panel is hidden. */
function MobilePlan({ mot, focus, level, slot, minutes, weeks }: { mot?: string; focus: SkillKey | null; level: Cefr; slot?: string; minutes: number; weeks: number }) {
  return (
    <div className="mb-2 rounded-3xl border-2 border-line p-4 lg:hidden">
      <div className="flex flex-wrap gap-1.5 text-xs font-extrabold">
        {mot && <span className="rounded-full bg-paper-2 px-2.5 py-1">{mot}</span>}
        {focus && <span className={clsx('rounded-full px-2.5 py-1', SKILL[focus].soft, SKILL[focus].text)}>Odak: {SKILL[focus].label}</span>}
        <span className="rounded-full bg-paper-2 px-2.5 py-1">{level} → {NEXT[level] ?? 'C1'}</span>
        {slot && <span className="rounded-full bg-paper-2 px-2.5 py-1">{slot} · {minutes} dk</span>}
      </div>
      <p className="mt-3 font-display font-black text-mint-deep">İlk ünite ~{weeks} günde · ayda {Math.round((minutes * 30) / 60)} saat pratik</p>
    </div>
  )
}
