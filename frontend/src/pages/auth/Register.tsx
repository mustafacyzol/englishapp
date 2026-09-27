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
import { SKILL, SKILLS } from '@/lib/skills'
import { EXAMS, FOCUS_TEXT, INTERESTS, MOTIVATIONS, PACES, STUDY_TIMES } from '@/lib/onboarding'
import { TUTOR } from '@/lib/tutor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Defne } from '@/components/game/Defne'
import { Img } from '@/components/ui/Img'
import { AuthShell } from './AuthShell'
import { Turnstile } from './Turnstile'
import { SocialButtons } from '@/components/auth/SocialButtons'
import { MobilePass, PassPanel } from './BoardingPass'

const LEVELS: { v: Cefr; t: string; d: string }[] = [
  { v: 'A1', t: 'Sıfırdan başlıyorum', d: 'Birkaç kelime biliyorum' },
  { v: 'A2', t: 'Temel cümleler kurabiliyorum', d: 'Kendimi tanıtır, sipariş veririm' },
  { v: 'B1', t: 'Günlük konuşmaları anlıyorum', d: 'Derdimi anlatırım ama takılırım' },
  { v: 'B2', t: 'Rahat konuşabiliyorum', d: 'Dizileri çoğunlukla anlıyorum' },
]
type StepKey = 'name' | 'age' | 'goal' | 'exam' | 'interests' | 'focus' | 'level' | 'time' | 'account'
const DRAFT = 'dilgo.onboarding'

interface Draft {
  step: StepKey
  name: string
  age: '' | 'kid' | 'teen' | 'adult'
  motivation: string
  exam: string
  examDate: string
  interests: string[]
  focus: SkillKey | ''
  level: Cefr
  time: string
  daily: number
}
const AGES = [
  { key: 'kid', label: 'Çocuk', range: '7-12 yaş', emoji: '🧒', bg: 'bg-butter/25', text: 'Oyun gibi dersler, yalnızca yaşıtlarla düello, veli onayıyla.' },
  { key: 'teen', label: 'Genç', range: '13-17 yaş', emoji: '🎧', bg: 'bg-sky/15', text: 'Okul, dizi, müzik ve oyun dünyasından içerik.' },
  { key: 'adult', label: 'Yetişkin', range: '18 yaş ve üzeri', emoji: '💼', bg: 'bg-flame/10', text: 'İş, seyahat ve sınav odaklı, doğal sohbetler.' },
] as const

const flowFor = (motivation: string): StepKey[] => ['name', 'age', 'goal', ...(motivation === 'exam' ? (['exam'] as const) : []), 'interests', 'focus', 'level', 'time', 'account']
const EMPTY: Draft = { step: 'name', name: '', age: '', motivation: '', exam: '', examDate: '', interests: [], focus: '', level: 'A1', time: '', daily: 20 }

export default function Register() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const invite = params.get('davet')
  const { user, signIn } = useAuth()
  const nav = useNavigate()
  const [d, setD] = useState<Draft>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', password_confirmation: '', referral_code: '', accept_terms: false, marketing_opt_in: false, parent_consent: false })
  const [captcha, setCaptcha] = useState('')
  const inv = useQuery({ queryKey: ['invite', invite], queryFn: () => get<{ institution: { name: string }; email: string }>(`/invites/${invite}`), enabled: !!invite, retry: false })
  const up = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))

  useEffect(() => {
    if (user) nav('/learn', { replace: true })
  }, [user, nav])

  // Restore the half-finished onboarding (e.g. after the level test) and any placement result.
  useEffect(() => {
    ;(async () => {
      if (code) await storage.set('dilgo.ref', code.toUpperCase())
      const ref = await storage.get('dilgo.ref')
      if (ref) setForm((f) => ({ ...f, referral_code: ref }))
      let draft = EMPTY
      try {
        const raw = await storage.get(DRAFT)
        if (raw) draft = { ...EMPTY, ...JSON.parse(raw) }
      } catch {
        /* corrupt draft */
      }
      const lvl = await storage.get('dilgo.placement')
      if (lvl) {
        draft = { ...draft, level: lvl as Cefr }
        setPlaced(true)
      }
      setD(draft)
      setLoaded(true)
    })()
  }, [code])
  useEffect(() => {
    if (loaded) void storage.set(DRAFT, JSON.stringify(d))
  }, [d, loaded])
  useEffect(() => {
    if (inv.data?.email) setForm((f) => ({ ...f, email: f.email || inv.data!.email }))
  }, [inv.data])

  const flow = useMemo(() => flowFor(d.motivation), [d.motivation])
  const step = Math.max(0, flow.indexOf(d.step))
  const key = flow[step]
  const total = flow.length

  const mot = MOTIVATIONS.find((m) => m.key === d.motivation)
  const pace = PACES.find((p) => p.xp === d.daily) ?? PACES[1]
  const slot = STUDY_TIMES.find((t) => t.key === d.time)
  const exam = EXAMS.find((e) => e.key === d.exam)
  const firstName = d.name.trim().split(' ')[0]
  // Near-term, honest milestones from the real curriculum (a unit is ~6 lessons of ~20 XP).
  const weeks = useMemo(() => Math.max(1, Math.ceil(120 / d.daily)), [d.daily])

  const payload = () => ({
    name: d.name.trim(),
    age_group: d.age || undefined,
    parent_consent: d.age === 'kid' ? form.parent_consent : undefined,
    learning_goal: mot?.goal,
    motivation: d.motivation || undefined,
    exam_target: d.motivation === 'exam' ? d.exam || undefined : undefined,
    exam_date: d.motivation === 'exam' && d.examDate ? d.examDate : undefined,
    interests: d.interests,
    focus_skill: d.focus || undefined,
    study_time: d.time || undefined,
    daily_goal_xp: d.daily,
    cefr_level: d.level,
    invite: invite || undefined,
    referral_code: form.referral_code || undefined,
  })

  const finish = async (token: string, u: Me, remember = true) => {
    await storage.remove('dilgo.ref')
    await storage.remove(DRAFT)
    await storage.remove('dilgo.placement')
    await signIn(token, u, remember)
    nav(u.email_verified ? '/learn' : '/verify-email', { replace: true })
  }

  const m = useMutation({
    mutationFn: () => post<{ token: string; user: Me }>('/auth/register', { ...form, ...payload(), captcha, device: Capacitor.getPlatform() }),
    onSuccess: ({ token, user }) => finish(token, user),
  })
  const err = m.error as ApiError | null
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    m.mutate()
  }
  const go = (i: number) => up({ step: flow[Math.min(total - 1, Math.max(0, i))] })
  const next = () => go(step + 1)
  // Single-choice questions move on by themselves after a short beat.
  const pick = (patch: Partial<Draft>) => () => {
    up(patch)
    const f = flowFor(patch.motivation ?? d.motivation)
    const nextStep = f[Math.min(f.length - 1, f.indexOf(d.step) + 1)]
    setTimeout(() => up({ step: nextStep }), 220)
  }

  const who = firstName ? `${firstName}, ` : ''
  const Q: Record<StepKey, { title: ReactNode; sub: string }> = {
    age: { title: `${who}kaç yaşındasın?`, sub: 'Dersler, Defne’nin konuşma tarzı, rakiplerin ve ödüller yaşına göre ayarlanır.' },
    name: { title: 'Merhaba! Sana nasıl hitap edelim?', sub: `Ben ${TUTOR.name}, İngilizce koçun. Planını birlikte kuralım, 1 dakika sürer.` },
    goal: { title: `${who}İngilizce seni nereye götürsün?`, sub: 'Hedefin derslerdeki örnekleri ve senaryoları belirler.' },
    exam: { title: 'Hangi sınava hazırlanıyorsun?', sub: 'Okuma parçaları, soru tipleri ve Defne’nin geri bildirimleri bu sınava göre ayarlanır.' },
    interests: { title: 'Hangi konular seni heyecanlandırır?', sub: 'Hikâyeler ve Defne ile sohbetler bunlardan seçilir. Birden fazla seçebilirsin.' },
    focus: { title: 'En çok nerede zorlanıyorsun?', sub: 'Bu beceriye biraz daha ağırlık vereceğiz, ama dördünü de dengede tutacağız.' },
    level: { title: 'Şu an hangi seviyedesin?', sub: 'Tahmin etmen yeterli; ilk derslerde kendini ayarlar.' },
    time: { title: 'Ne zaman çalışacaksın?', sub: 'Saatini belirleyenlerin alışkanlığı sürdürme ihtimali çok daha yüksek.' },
    account: { title: firstName ? `Biniş kartın hazır, ${firstName}.` : 'Biniş kartın hazır.', sub: 'Hesabını oluştur ve ilk dersine başla. Ücretsiz, kredi kartı gerekmez.' },
  }
  const canNext: Record<StepKey, boolean> = { name: d.name.trim().length >= 2, age: !!d.age, goal: !!d.motivation, exam: !!d.exam, interests: d.interests.length > 0, focus: !!d.focus, level: true, time: !!d.time, account: true }

  return (
    <AuthShell
      wide
      banner={false}
      title={Q[key].title}
      subtitle={Q[key].sub}
      aside={<PassPanel name={d.name.trim()} age={d.age || undefined} mot={mot} exam={exam} interests={d.interests} focus={d.focus || null} level={d.level} slot={slot} pace={pace} weeks={weeks} step={key} />}
      footer={<>Zaten hesabın var mı? <Link to="/login" className="font-extrabold text-flame">Giriş yap</Link></>}
      lead={
        <div className="mb-7 flex items-center gap-3">
          <button onClick={() => go(step - 1)} aria-label="Geri" className={clsx('grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2', step === 0 && 'invisible')}>
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex flex-1 gap-1" aria-label={`Adım ${step + 1}/${total}`}>
            {flow.map((f, i) => (
              <span key={f} className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                <motion.span className="block h-full rounded-full bg-ink" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
              </span>
            ))}
          </div>
          <span className="w-10 text-right text-xs font-black tabular-nums text-ink-soft">{step + 1}/{total}</span>
        </div>
      }
    >
      {(inv.data || form.referral_code) && key === 'name' && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-line p-3 text-sm font-bold">
          {inv.data ? <Building2 className="size-5 shrink-0 text-sage" /> : <Gift className="size-5 shrink-0 text-butter-deep" />}
          {inv.data ? `${inv.data.institution.name} seni davet etti, Premium koltuğun hazır.` : 'Bir arkadaşın seni davet etti! E-postanı doğrulayınca 100 elmas senin.'}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -28, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
          {key === 'name' && (
            <form onSubmit={(e) => { e.preventDefault(); if (canNext.name) next() }} className="space-y-5">
              <div className="flex items-center gap-4 rounded-3xl bg-paper-2/70 p-4">
                <Defne className="size-14" />
                <p className="font-semibold text-ink-soft">“Adını bilirsem sohbetlerimiz çok daha doğal olur.”</p>
              </div>
              <Input label="Adın" autoComplete="given-name" value={d.name} onChange={(e) => up({ name: e.target.value })} autoFocus placeholder="ör. Deniz" maxLength={60} />
              <Button type="submit" block size="lg" disabled={!canNext.name} icon={<ArrowRight className="size-5" />}>Devam</Button>
            </form>
          )}

          {key === 'age' && (
            <div className="grid gap-3 sm:grid-cols-3">
              {AGES.map((a) => (
                <button key={a.key} onClick={pick({ age: a.key, ...(a.key === 'kid' && d.motivation === 'exam' ? { motivation: '' } : {}) })} aria-pressed={d.age === a.key} className={clsx('press relative flex flex-col items-start gap-3 rounded-3xl border-2 p-4 text-left transition', d.age === a.key ? 'border-ink shadow-[0_4px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}>
                  <span className={clsx('grid size-12 place-items-center rounded-2xl text-2xl', a.bg)} aria-hidden>{a.emoji}</span>
                  <span>
                    <span className="block font-display text-xl font-black">{a.label}</span>
                    <span className="block text-sm font-bold text-ink-soft">{a.range}</span>
                  </span>
                  <span className="text-sm text-ink-soft">{a.text}</span>
                  {d.age === a.key && <Tick />}
                </button>
              ))}
            </div>
          )}

          {key === 'goal' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MOTIVATIONS.filter((o) => !(d.age === 'kid' && o.key === 'exam')).map((o) => (
                <PhotoCard key={o.key} photo={o.photo} title={o.label} text={o.text} selected={d.motivation === o.key} onClick={pick({ motivation: o.key })} />
              ))}
            </div>
          )}

          {key === 'exam' && (
            <div className="space-y-5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {EXAMS.map((e) => {
                  const on = d.exam === e.key
                  return (
                    <button key={e.key} onClick={() => up({ exam: e.key })} aria-pressed={on} className={clsx('press relative flex items-center gap-3.5 rounded-2xl border-2 p-3.5 text-left transition', on ? 'border-ink shadow-[0_3px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}>
                      <span className="grid h-12 min-w-16 place-items-center rounded-xl px-2 font-display text-[15px] font-black text-white" style={{ background: e.color }}>{e.name}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold leading-tight">{e.label}</span>
                        <span className="block text-xs font-semibold text-ink-soft">{e.text}</span>
                      </span>
                      {on && <Check className="size-5 shrink-0" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
              <Input label="Sınav tarihin (isteğe bağlı)" type="date" value={d.examDate} min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)} onChange={(e) => up({ examDate: e.target.value })} hint="Tarihi bilirsek geri sayım ve haftalık deneme planı çıkarırız." />
              <Button block size="lg" disabled={!canNext.exam} onClick={next} icon={<ArrowRight className="size-5" />}>{exam ? `${exam.name} rotasını kur` : 'Bir sınav seç'}</Button>
            </div>
          )}

          {key === 'interests' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {INTERESTS.map((o) => {
                  const on = d.interests.includes(o.key)
                  return <PhotoCard key={o.key} photo={o.photo} title={o.label} selected={on} compact multi onClick={() => up({ interests: on ? d.interests.filter((x) => x !== o.key) : [...d.interests, o.key] })} />
                })}
              </div>
              <Button block size="lg" disabled={!canNext.interests} onClick={next} icon={<ArrowRight className="size-5" />}>{d.interests.length ? `${d.interests.length} konu seçtim` : 'En az bir konu seç'}</Button>
            </div>
          )}

          {key === 'focus' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILLS.map((k) => {
                const S = SKILL[k]
                const on = d.focus === k
                return (
                  <button key={k} onClick={pick({ focus: k })} aria-pressed={on} className={clsx('press group relative overflow-hidden rounded-3xl border-2 text-left transition', on ? 'border-ink shadow-[0_4px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}>
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

          {key === 'level' && (
            <div className="space-y-3">
              {placed && <Alert tone="success">Seviye testinden: <b>{d.level}</b>. İstersen değiştirebilirsin.</Alert>}
              {LEVELS.map((l) => (
                <button key={l.v} onClick={pick({ level: l.v })} className={clsx('press flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition', d.level === l.v ? 'border-ink shadow-[0_3px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}>
                  <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl font-display font-black', d.level === l.v ? 'bg-ink text-paper' : 'bg-paper-2')}>{l.v}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{l.t}</span>
                    <span className="block text-sm text-ink-soft">{l.d}</span>
                  </span>
                  {d.level === l.v && <Check className="size-5" strokeWidth={3} />}
                </button>
              ))}
              <Link to="/placement?from=register" className="inline-flex items-center gap-1.5 pt-1 text-sm font-bold text-flame hover:underline">Emin değilim, 3 dakikalık seviye testine gir <ArrowRight className="size-4" /></Link>
            </div>
          )}

          {key === 'time' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STUDY_TIMES.map((o) => <PhotoCard key={o.key} photo={o.photo} title={o.label} text={o.text} selected={d.time === o.key} compact onClick={() => up({ time: o.key })} />)}
              </div>
              <div>
                <p className="mb-2 font-extrabold">Günde ne kadar?</p>
                <div className="grid grid-cols-4 gap-2 rounded-2xl bg-paper-2 p-1.5">
                  {PACES.map((p) => (
                    <button key={p.xp} onClick={() => up({ daily: p.xp })} className={clsx('rounded-xl px-2 py-2.5 text-center transition', d.daily === p.xp ? 'bg-card shadow-hard-sm' : 'text-ink-soft hover:text-ink')}>
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
              <Button block size="lg" disabled={!canNext.time} onClick={next} icon={<ArrowRight className="size-5" />}>Bu benim sözüm</Button>
            </div>
          )}

          {key === 'account' && (
            <div className="space-y-5">
              <MobilePass name={d.name.trim()} mot={mot?.label} exam={exam?.name} focus={d.focus || null} level={d.level} slot={slot?.label} minutes={pace.minutes} weeks={weeks} />
              {d.age === 'kid' && (
                <label className="flex gap-3 rounded-2xl bg-butter/15 p-3 text-sm">
                  <input type="checkbox" checked={form.parent_consent} onChange={set('parent_consent')} className="mt-0.5 size-5 accent-[#e8403a]" required />
                  <span><b>Veli onayı:</b> Ben bu çocuğun velisiyim, kaydını ben oluşturuyorum ve e-posta adresi bana ait.</span>
                </label>
              )}
              <SocialButtons onDone={finish} extra={payload()} />
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-ink-soft">
                <span className="h-0.5 flex-1 rounded bg-line" /> veya e-posta ile <span className="h-0.5 flex-1 rounded bg-line" />
              </div>
              <form onSubmit={submit} className="space-y-4">
                {err && <Alert tone="error">{err.first()}</Alert>}
                <Input label="E-posta" type="email" autoComplete="email" value={form.email} onChange={set('email')} required error={err?.errors.email?.[0] ?? err?.errors.name?.[0]} />
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
            </div>
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

