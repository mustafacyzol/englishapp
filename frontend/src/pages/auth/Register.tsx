import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { HigoMotion } from '@/components/game/HigoMotion'
import { ArrowLeft, ArrowRight, Building2, Check, Gift } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { storage } from '@/lib/storage'
import type { Cefr, Me, SkillKey } from '@/lib/types'
import { SKILL, SKILLS } from '@/lib/skills'
import { EXAMS, FOCUS_TEXT, INTERESTS, MOTIVATIONS, PACES, PLACEMENT_TOKEN, STAGES, STUDY_TIMES, ageFromStage, examsForStage } from '@/lib/onboarding'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Img } from '@/components/ui/Img'
import { AuthShell } from './AuthShell'
import { Turnstile } from './Turnstile'
import { SocialButtons } from '@/components/auth/SocialButtons'
import { MobilePass, PassPanel } from './PlanPanel'
import { higoImg } from '@/components/game/Higo'
import { img } from '@/lib/assets'
import { BRAND } from '@/lib/brand'

type StepKey = 'hello' | 'name' | 'age' | 'goal' | 'exam' | 'interests' | 'focus' | 'level' | 'time' | 'account'
const DRAFT = 'dilgo.onboarding'

interface Draft {
  step: StepKey
  name: string
  age: '' | 'kid' | 'teen' | 'adult'
  stage: string
  grade: number | null
  motivation: string
  exam: string
  examDate: string
  interests: string[]
  focus: SkillKey | ''
  level: Cefr
  time: string
  daily: number
  /** also preparing for an exam, whatever the main goal */
  examOpt: boolean
}

/** The exam step only appears for teens and adults who want it: exam as the goal, or ticked as an extra. */
// With a finished placement test the level step is skipped: the test result becomes the level.
const flowFor = (d: Pick<Draft, 'motivation' | 'examOpt' | 'age'>, placed = false): StepKey[] => ['hello', 'name', 'age', 'goal', ...(d.age !== 'kid' && (d.motivation === 'exam' || d.examOpt) ? (['exam'] as const) : []), 'interests', 'focus', ...(placed ? [] : (['level'] as const)), 'time', 'account']
const EMPTY: Draft = { step: 'hello', name: '', age: '', stage: '', grade: null, motivation: '', exam: '', examDate: '', interests: [], focus: '', level: 'A1', time: '', daily: 20, examOpt: false }

export default function Register() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const invite = params.get('davet')
  const { user, signIn } = useAuth()
  const nav = useNavigate()
  const [d, setD] = useState<Draft>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [placementToken, setPlacementToken] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '', password_confirmation: '', referral_code: '', accept_terms: false, marketing_opt_in: false, parent_consent: false })
  const [captcha, setCaptcha] = useState('')
  const [withEmail, setWithEmail] = useState(false)
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
      setPlacementToken(await storage.get(PLACEMENT_TOKEN))
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

  const flow = useMemo(() => flowFor(d, !!placementToken), [d.motivation, d.examOpt, d.age, placementToken]) // eslint-disable-line react-hooks/exhaustive-deps
  // back from the level test the level step leaves the flow: carry on right after it
  const at = flow.indexOf(d.step)
  const step = at >= 0 ? at : d.step === 'level' ? Math.max(0, flow.indexOf('time')) : 0
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
    school_stage: d.stage || undefined,
    grade: d.grade ?? undefined,
    parent_consent: d.age === 'kid' ? form.parent_consent : undefined,
    learning_goal: mot?.goal,
    motivation: d.motivation || undefined,
    exam_target: flow.includes('exam') ? d.exam || undefined : undefined,
    exam_date: flow.includes('exam') && d.examDate ? d.examDate : undefined,
    interests: d.interests,
    focus_skill: d.focus || undefined,
    study_time: d.time || undefined,
    daily_goal_xp: d.daily,
    cefr_level: placementToken ? undefined : d.level,
    placement_token: placementToken || undefined,
    invite: invite || undefined,
    referral_code: form.referral_code || undefined,
  })

  const finish = async (token: string, u: Me, remember = true) => {
    await storage.remove('dilgo.ref')
    await storage.remove(DRAFT)
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
  // Choices only select; moving on is always an explicit "Devam", so nobody skips a step by accident.
  const pick = (patch: Partial<Draft>) => () => up(patch)
  const nextBtn = (ok: boolean, label = 'Devam') => (
    <motion.div initial={false} animate={{ opacity: ok ? 1 : 0.55 }} className="pt-2">
      <Button block size="lg" disabled={!ok} onClick={next} icon={<ArrowRight className="size-5" />}>{label}</Button>
    </motion.div>
  )

  const who = firstName ? `${firstName}, ` : ''
  const Q: Record<StepKey, { title: ReactNode; sub: string }> = {
    hello: { title: 'Merhaba, ben Higo!', sub: 'İngilizce yolculuğunda yanında olacağım. Önce seni biraz tanıyalım; birkaç kısa soru, bir dakika.' },
    age: { title: `${who}şu an neredesin?`, sub: 'Okulundaki konulara ve sınavına göre plan kurarız. Hesabı kim kullanacaksa onu seç.' },
    name: { title: 'Merhaba! Sana nasıl hitap edelim?', sub: 'Birkaç soruyla planını kuralım, 1 dakika sürer.' },
    goal: { title: `${who}İngilizce seni nereye götürsün?`, sub: 'Hedefin derslerdeki örnekleri ve senaryoları belirler.' },
    exam: { title: 'Hangi sınava hazırlanıyorsun?', sub: 'Okuma parçaları, soru tipleri ve Defne’nin geri bildirimleri bu sınava göre ayarlanır.' },
    interests: { title: 'Hangi konular seni heyecanlandırır?', sub: 'Hikâyeler ve Defne ile sohbetler bunlardan seçilir. Birden fazla seçebilirsin.' },
    focus: { title: 'En çok nerede zorlanıyorsun?', sub: 'Bu beceriye biraz daha ağırlık vereceğiz, ama dördünü de dengede tutacağız.' },
    level: { title: 'Nereden başlayalım?', sub: 'Seviyeni tahmin etmene gerek yok. Kısa testle ölçeriz ya da en baştan başlarsın; ikisi de sonra değişebilir.' },
    time: { title: 'Ne zaman çalışacaksın?', sub: 'Saatini belirleyenlerin alışkanlığı sürdürme ihtimali çok daha yüksek.' },
    account: { title: firstName ? `Planın hazır, ${firstName}.` : 'Planın hazır.', sub: 'Hesabını oluştur ve ilk dersine başla. Ücretsiz, kredi kartı gerekmez.' },
  }
  const canNext: Record<StepKey, boolean> = { hello: true, name: d.name.trim().length >= 2, age: !!d.stage && (!(STAGES.find((x) => x.key === d.stage)?.grades.length) || !!d.grade), goal: !!d.motivation, exam: !!d.exam, interests: d.interests.length > 0, focus: !!d.focus, level: true, time: !!d.time, account: true }

  // The first screen is Higo alone, full screen; "Hadi tanışalım" splits it into the two panels.
  if (key === 'hello') return <HelloScreen onGo={next} />

  return (
    <AuthShell
      wide
      enter
      banner={false}
      title={Q[key].title}
      subtitle={Q[key].sub}
      aside={<PassPanel name={d.name.trim()} age={d.age || undefined} mot={mot} exam={exam} interests={d.interests} focus={d.focus || null} level={d.level} slot={slot} pace={pace} weeks={weeks} step={key} />}
      footer={<span className="hidden sm:inline">Zaten hesabın var mı? <Link to="/login" className="font-extrabold text-flame">Giriş yap</Link></span>}
      lead={
        <div className="mb-4 flex items-center gap-3 sm:mb-7 [@media(max-height:680px)]:mb-2">
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
              {/* on phones Higo greets here; on desktop he speaks from the side panel */}
              <div className="flex items-center gap-4 rounded-3xl bg-paper-2/70 p-4 lg:hidden">
                <img src={higoImg('wave')} alt="Higo" className="size-16 shrink-0 object-contain" />
                <p className="font-semibold text-ink-soft">“Ben Higo, {BRAND} rehberin. Adını yaz, planını sana özel kuralım.”</p>
              </div>
              <Input label="Adın" autoComplete="given-name" value={d.name} onChange={(e) => up({ name: e.target.value })} autoFocus placeholder="ör. Deniz" maxLength={60} />
              <Button type="submit" block size="lg" disabled={!canNext.name} icon={<ArrowRight className="size-5" />}>Devam</Button>
            </form>
          )}

          {key === 'age' && (
            <div className="space-y-4 [@media(max-height:680px)]:space-y-2.5">
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5 [@media(max-height:680px)]:gap-1.5">
                {STAGES.map((a, i) => {
                  const on = d.stage === a.key
                  return (
                    <motion.button
                      key={a.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => {
                        const grade = a.grades.length ? (on ? d.grade : null) : null
                        const age = ageFromStage(a.key, grade)
                        up({ stage: a.key, grade, age, ...(age === 'kid' ? { examOpt: false, ...(d.motivation === 'exam' ? { motivation: '' } : {}) } : {}), ...(a.exams[0] ? { exam: d.exam || a.exams[0] } : {}) })
                      }}
                      aria-pressed={on}
                      className={clsx('group relative flex min-w-0 items-center gap-3 rounded-2xl border-2 p-1.5 pr-3 text-left transition sm:gap-3.5 sm:p-2.5', on ? 'border-flame shadow-[0_0_0_4px_rgba(255,90,54,.14)]' : 'border-line hover:border-ink/25', i === STAGES.length - 1 && 'sm:col-span-2')}
                    >
                      <span className={clsx('size-10 shrink-0 overflow-hidden rounded-xl sm:size-14 [@media(max-height:680px)]:size-8', a.tint)}><img src={img(`avatars/${a.art}.webp`)} alt="" className="size-full object-cover" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2"><span className="font-display text-base font-black sm:text-lg">{a.label}</span><span className="text-xs font-bold text-ink-soft">{a.range}</span></span>
                        <span className="hidden truncate text-[13px] text-ink-soft sm:block">{a.points.join(' · ')}</span>
                      </span>
                      {on && <Tick />}
                    </motion.button>
                  )
                })}
              </div>
              <AnimatePresence initial={false}>
                {!!STAGES.find((x) => x.key === d.stage)?.grades.length && (
                  <motion.div key={d.stage} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <p className="mb-2 text-sm font-bold">Kaçıncı sınıftasın?</p>
                    <div className="grid grid-cols-4 gap-2">
                      {STAGES.find((x) => x.key === d.stage)!.grades.map((g) => (
                        <button key={g} onClick={() => up({ grade: g, age: ageFromStage(d.stage, g) })} aria-pressed={d.grade === g} className={clsx('h-11 rounded-xl border-2 px-1 font-display text-sm font-black transition sm:text-base', d.grade === g ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink/30')}>{g}. sınıf</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="hidden text-center text-xs text-ink-soft sm:block">İlkokul ve 5-6. sınıf hesapları veli onayıyla açılır.</p>
              {nextBtn(canNext.age)}
            </div>
          )}

          {key === 'goal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {MOTIVATIONS.filter((o) => !(d.age === 'kid' && o.key === 'exam')).map((o) => (
                  <PhotoCard key={o.key} photo={o.photo} title={o.label} text={o.text} selected={d.motivation === o.key} onClick={pick({ motivation: o.key })} />
                ))}
              </div>
              {nextBtn(canNext.goal, d.motivation === 'exam' ? 'Sınavımı seçeyim' : 'Devam')}
            </div>
          )}

          {key === 'exam' && (
            <div className="space-y-5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {examsForStage(d.stage).map((e) => {
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
              <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {INTERESTS.map((o) => {
                  const on = d.interests.includes(o.key)
                  return <PhotoCard key={o.key} photo={o.photo} title={o.label} selected={on} compact multi onClick={() => up({ interests: on ? d.interests.filter((x) => x !== o.key) : [...d.interests, o.key] })} />
                })}
              </div>
              <Button block size="lg" disabled={!canNext.interests} onClick={next} icon={<ArrowRight className="size-5" />}>{d.interests.length ? `${d.interests.length} konu seçtim` : 'En az bir konu seç'}</Button>
            </div>
          )}

          {key === 'focus' && (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {SKILLS.map((k) => {
                const S = SKILL[k]
                const on = d.focus === k
                return (
                  <button key={k} onClick={pick({ focus: k })} aria-pressed={on} className={clsx('press group relative overflow-hidden rounded-2xl border-2 text-left transition sm:rounded-3xl', on ? 'border-ink shadow-[0_4px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}>
                    <div className="relative h-20 overflow-hidden sm:h-28 [@media(max-height:680px)]:h-16">
                      <Img src={S.photo} alt="" className="photo transition duration-500 group-hover:scale-105" />
                      <span className={clsx('absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black text-white sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs', S.bg)}><S.icon className="size-3.5" /> {S.label}</span>
                    </div>
                    <p className="p-2.5 text-[13px] font-bold leading-snug sm:p-4 sm:text-base">{FOCUS_TEXT[k]}</p>
                    {on && <Tick small />}
                  </button>
                )
              })}
              <div className="col-span-2">{nextBtn(canNext.focus)}</div>
            </div>
          )}

          {key === 'level' && (
            <div className="space-y-3">
              <Link to="/placement?from=register" className="press flex w-full items-center gap-4 rounded-2xl border-2 border-ink px-4 py-4 text-left shadow-[0_3px_0_0_var(--ink)]">
                <Img src={higoImg('think')} alt="" className="size-14 shrink-0 object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-extrabold">Seviye testine gir <span className="rounded-full bg-flame px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Önerilen</span></span>
                  <span className="block text-sm text-ink-soft">10 dakika: seçmeli sorular, cümle kurma, dinleme. Sonuç hesabına kendiliğinden işlenir, yolun ona göre açılır.</span>
                </span>
                <ArrowRight className="size-5 shrink-0" />
              </Link>
              <button onClick={() => { up({ level: 'A1' }); next() }} className="press flex w-full items-center gap-4 rounded-2xl border-2 border-line px-4 py-4 text-left shadow-hard hover:border-ink/25">
                <Img src={higoImg('walk')} alt="" className="size-14 shrink-0 object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">En baştan başlıyorum</span>
                  <span className="block text-sm text-ink-soft">İlk dersten başla. İstediğin zaman seviye testine girip ileri atlayabilirsin.</span>
                </span>
              </button>
            </div>
          )}

          {key === 'time' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
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
            <div className="space-y-4 sm:space-y-5">
              {/* phones: plan + one-tap sign-up first; the e-mail form is its own short screen */}
              <div className={clsx('space-y-4 sm:space-y-5', withEmail && 'hidden sm:block')}>
                <MobilePass name={d.name.trim()} mot={mot?.label} exam={exam?.name} focus={d.focus || null} level={d.level} slot={slot?.label} minutes={pace.minutes} weeks={weeks} />
                {d.age === 'kid' && (
                  <label className="flex gap-3 rounded-2xl bg-butter/15 p-3 text-sm">
                    <input type="checkbox" checked={form.parent_consent} onChange={set('parent_consent')} className="mt-0.5 size-5 accent-[#e8403a]" required />
                    <span><b>Veli onayı:</b> Ben bu çocuğun velisiyim, kaydını ben oluşturuyorum ve e-posta adresi bana ait.</span>
                  </label>
                )}
                <SocialButtons onDone={finish} extra={payload()} />
                <Button block size="lg" variant="secondary" className="sm:hidden" onClick={() => setWithEmail(true)}>E-posta ile kayıt ol</Button>
                <div className="hidden items-center gap-3 text-xs font-black uppercase tracking-widest text-ink-soft sm:flex">
                  <span className="h-0.5 flex-1 rounded bg-line" /> veya e-posta ile <span className="h-0.5 flex-1 rounded bg-line" />
                </div>
              </div>
              <form onSubmit={submit} className={clsx('space-y-3 sm:block sm:space-y-4', !withEmail && 'hidden')}>
                {withEmail && <button type="button" onClick={() => setWithEmail(false)} className="flex items-center gap-1.5 text-sm font-bold text-ink-soft sm:hidden"><ArrowLeft className="size-4" /> Google veya Apple ile kayıt</button>}
                {err && <Alert tone="error">{err.first()}</Alert>}
                <Input label="E-posta" type="email" autoComplete="email" value={form.email} onChange={set('email')} required error={err?.errors.email?.[0] ?? err?.errors.name?.[0]} />
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <Input label="Şifre" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required hint={<span className="[@media(max-height:680px)]:hidden">En az 8 karakter, harf ve rakam.</span>} error={err?.errors.password?.[0]} />
                  <Input label="Şifre (tekrar)" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} required />
                </div>
                {!invite && <Input label="Davet kodu (isteğe bağlı)" value={form.referral_code} onChange={set('referral_code')} className="hidden sm:block" />}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <label className="flex gap-3 text-sm">
                  <input type="checkbox" checked={form.accept_terms} onChange={set('accept_terms')} className="mt-0.5 size-5 shrink-0 accent-[#e8403a]" required />
                  <span><Link to="/terms" className="font-bold underline">Kullanım koşullarını</Link> ve <Link to="/privacy" className="font-bold underline">KVKK aydınlatma metnini</Link> okudum, kabul ediyorum.</span>
                </label>
                <label className="flex gap-3 text-sm">
                  <input type="checkbox" checked={form.marketing_opt_in} onChange={set('marketing_opt_in')} className="mt-0.5 size-5 shrink-0 accent-[#e8403a]" />
                  <span>İpuçları ve kampanyalar e-postayla gelsin.</span>
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

function Tick({ small }: { small?: boolean }) {
  return <span className={clsx('absolute grid place-items-center rounded-full bg-ink text-paper shadow-soft', small ? 'right-1.5 top-1.5 size-5 sm:right-3 sm:top-3 sm:size-7' : 'right-3 top-3 size-7')}><Check className={small ? 'size-3 sm:size-4' : 'size-4'} strokeWidth={3} /></span>
}

function PhotoCard({ photo, title, text, selected, onClick, compact, multi }: { photo: string; title: string; text?: string; selected: boolean; onClick: () => void; compact?: boolean; multi?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={clsx('press group relative overflow-hidden border-2 text-left transition', compact ? 'rounded-2xl sm:rounded-3xl' : 'rounded-3xl', selected ? 'border-ink shadow-[0_4px_0_0_var(--ink)]' : 'border-line shadow-hard hover:border-ink/25')}
    >
      <div className={clsx('relative overflow-hidden', compact ? 'aspect-square' : 'aspect-[16/10] sm:aspect-[4/3]')}>
        <Img src={photo} alt="" className={clsx('photo transition duration-500 group-hover:scale-105', multi && !selected && 'saturate-[.85]')} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className={clsx('absolute text-white', compact ? 'inset-x-1.5 bottom-1.5 sm:inset-x-3 sm:bottom-2.5' : 'inset-x-3 bottom-2.5')}>
          <p className={clsx('font-display font-black leading-tight', compact && 'text-[11px] sm:text-base')}>{title}</p>
          {text && <p className={clsx('text-xs text-white/80', compact && 'hidden sm:block')}>{text}</p>}
        </div>
      </div>
      {selected && <Tick small={compact} />}
    </button>
  )
}

/**
 * The very first screen: no panels, just Higo. He drops in, words in both
 * languages float round him, three promises appear, and "Hadi tanışalım" opens
 * the curtain: the screen slides into the left panel and the questions come in.
 */
function HelloScreen({ onGo }: { onGo: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const words = [['Hello!', 'left-[8%] top-[18%]', 'bg-sky'], ['Merhaba!', 'right-[9%] top-[14%]', 'bg-flame'], ["Let's go!", 'left-[12%] bottom-[24%]', 'bg-mint'], ['Hadi!', 'right-[12%] bottom-[28%]', 'bg-butter !text-[#1f2433]']] as const
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-paper">
      <motion.div
        initial={false}
        animate={leaving ? { clipPath: 'inset(0 50% 0 0 round 0px)', opacity: 0.0 } : { clipPath: 'inset(0 0% 0 0 round 0px)', opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.65, 0, 0.35, 1] }}
        onAnimationComplete={() => leaving && onGo()}
        className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(60rem_40rem_at_50%_40%,color-mix(in_oklab,var(--color-flame)_16%,var(--paper)),var(--paper)_70%)] px-6 text-center"
      >
        {words.map(([w, pos, c], i) => (
          <motion.span key={w} aria-hidden initial={{ opacity: 0, scale: 0.4, y: 20 }} animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }} transition={{ opacity: { delay: 0.9 + i * 0.15 }, scale: { delay: 0.9 + i * 0.15, type: 'spring', stiffness: 300, damping: 14 }, y: { delay: 1.2 + i * 0.2, duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' } }}
            className={clsx('absolute hidden rounded-2xl px-4 py-2 font-display text-lg font-black text-white shadow-lg sm:block', pos, c)}>{w}</motion.span>
        ))}
        <motion.div
          initial={{ opacity: 0, y: '-60vh', scaleY: 1.15, scaleX: 0.9 }}
          animate={{ opacity: 1, y: ['-60vh', '2%', '-1%', '0%'], scaleY: [1.15, 0.86, 1.04, 1], scaleX: [0.9, 1.12, 0.97, 1] }}
          transition={{ duration: 1.1, times: [0, 0.55, 0.8, 1], ease: ['easeIn', 'easeOut', 'easeInOut'], opacity: { duration: 0.2 } }}
          className="relative w-[min(62vw,300px)] origin-bottom [@media(max-height:640px)]:w-[min(44vw,200px)]"
        >
          <span aria-hidden className="absolute inset-[14%] rounded-full bg-flame/15 blur-2xl" />
          <HigoMotion className="relative w-full" />
        </motion.div>
        <motion.span aria-hidden initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 0.7, 0], scale: [0.3, 1.5, 2] }} transition={{ delay: 0.6, duration: 0.8 }} className="-mt-6 h-6 w-48 rounded-[50%] border-2 border-flame/40" />
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.5 }} className="mt-2 font-display text-[clamp(2rem,6vw,3.4rem)] font-black leading-tight">Merhaba, ben Higo!</motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }} className="mt-2 max-w-sm text-lg text-ink-soft">Seni biraz tanıyalım, planını birlikte kuralım. Bir dakika sürer.</motion.p>
        <div className="mt-5 flex max-w-md flex-wrap justify-center gap-2">
          {['Sana özel plan', 'Türkçe açıklama', 'Hikâyeler ve oyunlar'].map((t, k) => (
            <motion.span key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35 + k * 0.1 }} className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-bold shadow-sm ring-1 ring-line">
              <Check className="size-4 text-mint-deep" strokeWidth={3} />{t}
            </motion.span>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }} className="mt-7 w-full max-w-xs">
          <Button block size="lg" onClick={() => setLeaving(true)} icon={<ArrowRight className="size-5" />}>Hadi tanışalım</Button>
          <p className="mt-4 text-sm font-semibold text-ink-soft">Zaten hesabın var mı? <Link to="/login" className="font-extrabold text-flame">Giriş yap</Link></p>
        </motion.div>
      </motion.div>
      <Link to="/" aria-label="Ana sayfa" className="absolute left-5 top-4 z-10 font-display text-xl font-black">dil<span className="text-flame">go</span></Link>
    </div>
  )
}

