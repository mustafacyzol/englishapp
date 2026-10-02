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
const EMPTY: Draft = { step: 'name', name: '', age: '', stage: '', grade: null, motivation: '', exam: '', examDate: '', interests: [], focus: '', level: 'A1', time: '', daily: 20, examOpt: false }

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
            <div className="space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
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
                      className={clsx('group relative flex items-center gap-3.5 rounded-2xl border-2 p-2.5 pr-3 text-left transition', on ? 'border-flame shadow-[0_0_0_4px_rgba(255,90,54,.14)]' : 'border-line hover:border-ink/25', i === STAGES.length - 1 && 'sm:col-span-2')}
                    >
                      <span className={clsx('size-14 shrink-0 overflow-hidden rounded-xl', a.tint)}><img src={img(`avatars/${a.art}.webp`)} alt="" className="size-full object-cover" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2"><span className="font-display text-lg font-black">{a.label}</span><span className="text-xs font-bold text-ink-soft">{a.range}</span></span>
                        <span className="block truncate text-[13px] text-ink-soft">{a.points.join(' · ')}</span>
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
                    <div className="flex flex-wrap gap-2">
                      {STAGES.find((x) => x.key === d.stage)!.grades.map((g) => (
                        <button key={g} onClick={() => up({ grade: g, age: ageFromStage(d.stage, g) })} aria-pressed={d.grade === g} className={clsx('h-11 min-w-14 rounded-xl border-2 px-3 font-display font-black transition', d.grade === g ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink/30')}>{g}. sınıf</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-center text-xs text-ink-soft">İlkokul ve 5-6. sınıf hesapları veli onayıyla açılır. Bunu sonradan Ayarlar’dan değiştirebilirsin.</p>
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
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
              <div className="sm:col-span-2">{nextBtn(canNext.focus)}</div>
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

          {key === 'hello' && (
            <div className="space-y-5">
              <div className="relative mx-auto w-56 sm:w-64">
                <span aria-hidden className="absolute inset-[12%] rounded-full bg-flame/10" />
                <HigoMotion className="relative w-full" />
              </div>
              <ul className="space-y-2.5">
                {['Her gün birkaç dakikalık, sana özel bir plan', 'Takıldığında Türkçe açıklama, azar yok', 'Hikâyeler, oyunlar ve Defne ile gerçek konuşmalar'].map((t, k) => (
                  <motion.li key={t} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + k * 0.12 }} className="flex items-center gap-3 rounded-2xl bg-paper-2 px-4 py-3 font-bold">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-white"><Check className="size-4" strokeWidth={3} /></span>{t}
                  </motion.li>
                ))}
              </ul>
              {nextBtn(true, 'Hadi tanışalım')}
            </div>
          )}

          {key === 'time' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
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

