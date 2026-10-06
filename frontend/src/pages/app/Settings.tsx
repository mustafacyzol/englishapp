import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Bell, Crown, GraduationCap, LogOut, Monitor, Moon, Palette, Shield, Smartphone, Sun, Target, Trash2, User } from 'lucide-react'
import { setTheme, useTheme } from '@/lib/theme'
import { img } from '@/lib/assets'
import { ApiError, del, get, patch, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dateTR, GOALS, tl } from '@/lib/format'
import { speak } from '@/lib/speech'
import type { Me, NotifyGroup } from '@/lib/types'
import { SubscriptionCard } from '@/components/game/Subscription'
import { EXAMS, INTERESTS, PACES, STAGES, STUDY_TIMES, examOn } from '@/lib/onboarding'
import { SKILL, SKILLS } from '@/lib/skills'
import { Button } from '@/components/ui/Button'
import { Input, Toggle } from '@/components/ui/Field'
import { Alert, Modal, PageHeader } from '@/components/ui/Misc'
import { OtpInput } from '@/components/ui/OtpInput'
import { useToast } from '@/components/ui/Toast'
import { LangSelect } from '@/components/ui/LangSelect'

function Section({ title, children, danger, hint }: { title: string; children: ReactNode; danger?: boolean; hint?: string }) {
  return (
    <section className={clsx('ink-card mb-5 p-5 sm:p-6', danger && 'border-berry/60')}>
      <h2 className="text-lg font-extrabold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Label({ children, note }: { children: ReactNode; note?: string }) {
  return <p className="mb-2 text-sm font-bold">{children} {note && <span className="font-normal text-ink-soft">{note}</span>}</p>
}

const pill = (on: boolean) => clsx('rounded-xl border-2 py-2 text-sm font-bold transition', on ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card hover:border-ink/25')

type Tab = 'hesap' | 'ogrenme' | 'sinav' | 'gorunum' | 'bildirim' | 'guvenlik' | 'abonelik'

const AGE = [
  { key: 'kid', label: 'Çocuk', text: '7-12 yaş', art: 'braids' },
  { key: 'teen', label: 'Genç', text: '13-17 yaş', art: 'cap' },
  { key: 'adult', label: 'Yetişkin', text: '18+', art: 'glasses' },
] as const

/**
 * Settings as a short list of sections, one open at a time: a side list on
 * desktop, a scrollable segment row on phones. Nothing scrolls on forever and
 * each section only shows what applies to this learner (exam mode never for children).
 */
export default function Settings() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const save = useMutation({
    mutationFn: (b: Partial<Me> | Record<string, unknown>) => patch<{ user: Me }>('/account', b),
    onSuccess: (r) => { setUser(r.user); toast('Kaydedildi ✓', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  if (!user) return null
  const kid = user.age_group === 'kid'
  const tabs: { key: Tab; label: string; text: string; icon: typeof User }[] = [
    { key: 'hesap', label: 'Hesap', text: 'Ad, yaş grubu, kurum', icon: User },
    { key: 'ogrenme', label: 'Öğrenme', text: 'Hedef, seviye, ilgi alanı', icon: GraduationCap },
    ...(kid ? [] : [{ key: 'sinav' as Tab, label: 'Sınav', text: examOn(user) ? 'Açık' : 'İsteğe bağlı', icon: Target }]),
    { key: 'gorunum', label: 'Görünüm', text: 'Tema, dil, okuma hızı', icon: Palette },
    { key: 'bildirim', label: 'Bildirim', text: 'Hatırlatma, e-posta', icon: Bell },
    { key: 'abonelik', label: 'Abonelik', text: user.premium.active ? 'Premium' : 'Ücretsiz', icon: Crown },
    { key: 'guvenlik', label: 'Güvenlik', text: 'Şifre, oturumlar', icon: Shield },
  ]
  const want = params.get('s') as Tab | null
  const tab: Tab = tabs.some((t) => t.key === want) ? want! : 'hesap'
  const go = (k: Tab) => setParams(k === 'hesap' ? {} : { s: k }, { replace: true })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Ayarlar" />
      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        {/* Phones: every section visible at once as a tile grid (nothing hidden off to the side). */}
        <nav aria-label="Ayar bölümleri" className="mb-5 grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:sticky lg:top-24 lg:mb-0 lg:flex lg:flex-col lg:gap-2 lg:self-start">
          {tabs.map((t) => {
            const on = t.key === tab
            return (
              <button key={t.key} onClick={() => go(t.key)} aria-current={on ? 'page' : undefined} className={clsx('relative flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 px-1.5 py-2 text-center transition lg:flex-row lg:gap-3 lg:border-0 lg:px-3.5 lg:py-3 lg:text-left', on ? 'border-ink text-on-inv' : 'border-line bg-card text-ink hover:bg-ink/[0.05] lg:bg-transparent')}>
                {on && <motion.span layoutId="set-tab" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-2xl bg-inv" />}
                <t.icon className="relative size-[18px] shrink-0" />
                <span className="relative min-w-0 max-w-full">
                  <span className="block truncate text-xs font-extrabold sm:text-sm">{t.label}</span>
                  <span className={clsx('hidden text-xs lg:block', on ? 'text-on-inv/70' : 'text-ink-soft')}>{t.text}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="min-w-0">
            {tab === 'hesap' && <AccountTab save={save} />}
            {tab === 'ogrenme' && <LearningTab save={save} />}
            {tab === 'sinav' && <ExamTab save={save} />}
            {tab === 'gorunum' && <LookTab save={save} />}
            {tab === 'bildirim' && <NotifyTab save={save} />}
            {tab === 'abonelik' && <><SubscriptionCard /><Orders /></>}
            {tab === 'guvenlik' && <Security />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

type Save = UseMutationResult<{ user: Me }, ApiError, Partial<Me> | Record<string, unknown>>

function AccountTab({ save }: { save: Save }) {
  const { user, signOut } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  if (!user) return null
  return (
    <>
      <Section title="Profil">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate({ name, username }) }}>
          <Input label="Ad" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Kullanıcı adı" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
          <Input label="E-posta" value={user.email} disabled className="sm:col-span-2" />
          <Button type="submit" loading={save.isPending} className="sm:col-span-2 sm:w-fit">Kaydet</Button>
        </form>
      </Section>
      <TrackSummary />

      <Section title="Yaş grubu" hint="İçerik, Defne'nin konuşma tonu, iş ortağı hediyeleri ve rakip eşleşmesi buna göre ayarlanır.">
        <div className="grid grid-cols-3 gap-2">
          {AGE.map((a) => (
            <button key={a.key} onClick={() => a.key !== user.age_group && save.mutate({ age_group: a.key })} disabled={user.age_group === 'kid' ? a.key !== 'kid' : a.key === 'kid'} aria-pressed={user.age_group === a.key} className={clsx(pill(user.age_group === a.key), 'flex flex-col items-center gap-0.5 py-3 disabled:opacity-40')}>
              <img src={img(`avatars/${a.art}.webp`)} alt="" className="mb-1 size-12 rounded-2xl object-cover" />
              <span>{a.label}</span>
              <span className={clsx('text-[11px] font-semibold', user.age_group === a.key ? 'text-on-inv/70' : 'text-ink-soft')}>{a.text}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-soft">{user.age_group === 'kid' ? 'Çocuk hesabının yaş grubunu veli, destek ekibimize yazarak değiştirebilir.' : 'Yaş grubu ayda bir değiştirilebilir. Çocuk hesabı yalnızca kayıt sırasında veli onayıyla açılır. Her öğrencinin kendi hesabı olmalı: ilerleme, seviye ve içerik kişiye özeldir.'}</p>
      </Section>
      <JoinInstitution />
      <Section title="Oturum" danger>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={signOut} icon={<LogOut className="size-4" />}>Çıkış yap</Button>
          <DeleteAccount />
        </div>
      </Section>
    </>
  )
}

function LearningTab({ save }: { save: Save }) {
  const { user } = useAuth()
  if (!user) return null
  const kid = user.age_group === 'kid'
  return (
    <>
      <Section title="Günlük tempo" hint="Seri, bu hedefin en az 10 XP'lik kısmını tamamladığın günlerde uzar.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PACES.map((p) => (
            <button key={p.xp} onClick={() => save.mutate({ daily_goal_xp: p.xp })} className={clsx(pill(user.daily_goal_xp === p.xp), 'flex flex-col items-center py-2.5')}>
              <span>{p.label}</span>
              <span className={clsx('text-[11px] font-semibold', user.daily_goal_xp === p.xp ? 'text-on-inv/70' : 'text-ink-soft')}>{p.xp} XP · ~{p.minutes} dk</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Seviye ve hedef">
        <Label>Seviye</Label>
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-card p-3">
          <span className="grid size-12 place-items-center rounded-xl bg-inv font-mono text-lg font-black text-on-inv">{user.cefr_level}</span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-ink-soft">Seviyen seviye testinden gelir. Seviyendeki dersleri bitirince bir üst seviyeye kendiliğinden geçersin.</span>
          <Link to="/placement" className="rounded-xl bg-paper-2 px-3 py-2 text-sm font-extrabold hover:bg-ink/[0.06]">Seviye testine gir</Link>
        </div>
        <Label>Neden öğreniyorsun?</Label>
        <div className="flex flex-wrap gap-2">
          {GOALS.filter((g) => !(kid && g.key === 'exam')).map((g) => (
            <button key={g.key} onClick={() => save.mutate({ learning_goal: g.key })} className={clsx(pill(user.learning_goal === g.key), 'px-3')}>{g.emoji} {g.label}</button>
          ))}
        </div>
      </Section>
      <Section title="Kişiselleştirme" hint="Defne sohbetleri, hikâye önerileri ve günlük planın bu seçimlere göre hazırlanır.">
        <Label>İlgi alanların</Label>
        <div className="mb-5 flex flex-wrap gap-2">
          {INTERESTS.map((o) => {
            const on = user.interests?.includes(o.key)
            const next = on ? user.interests.filter((x) => x !== o.key) : [...(user.interests ?? []), o.key]
            return (
              <button key={o.key} onClick={() => next.length && save.mutate({ interests: next })} aria-pressed={on} className={clsx('flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-bold transition', on ? 'border-inv bg-inv text-on-inv' : 'border-line hover:border-ink/30')}>
                <img src={o.photo} alt="" className="size-7 rounded-full object-cover" /> {o.label}
              </button>
            )
          })}
        </div>
        <Label>Odak beceri</Label>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SKILLS.map((k) => {
            const I = SKILL[k].icon
            return <button key={k} onClick={() => save.mutate({ focus_skill: k })} className={clsx(pill(user.focus_skill === k), 'flex items-center justify-center gap-1.5')}><I className="size-4" /> {SKILL[k].label}</button>
          })}
        </div>
        <Label note="hatırlatmalar bu saate göre gelir">Çalışma saatin</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STUDY_TIMES.map((t) => <button key={t.key} onClick={() => save.mutate({ study_time: t.key })} className={pill(user.study_time === t.key)}>{t.label}</button>)}
        </div>
      </Section>
    </>
  )
}

/** School stage, grade and exam come from onboarding; changing them means answering those questions again. */
function TrackSummary({ compact }: { compact?: boolean }) {
  const { user } = useAuth()
  if (!user) return null
  const st = STAGES.find((x) => x.key === user.school_stage)
  const ex = EXAMS.find((e) => e.key === user.exam_target)
  const body = (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-card p-3">
      {ex ? <span className="grid h-11 min-w-14 place-items-center rounded-xl px-2 text-sm font-black text-white" style={{ background: ex.color }}>{ex.name}</span> : <span className="grid h-11 min-w-14 place-items-center rounded-xl bg-paper-2 px-2 text-xs font-black">Genel</span>}
      <span className="min-w-0 flex-1 text-sm font-bold leading-tight">{st ? `${st.label}${user.grade ? ` · ${user.grade}. sınıf` : ''}` : 'Okul seçilmedi'}<span className="block text-xs font-semibold text-ink-soft">{ex ? ex.label : 'Sınav hedefi yok'} · onboarding'de seçildi</span></span>
      <Link to="/yolum" className="rounded-xl border-2 border-line px-3 py-2 text-sm font-extrabold hover:border-ink/30">Yolumu yeniden belirle</Link>
    </div>
  )
  return compact ? body : <Section title="Okul ve sınav" hint="Yol haritası, sınav modu ve Defne bu tercihlere göre kurulur. Değiştirmek için onboarding sorularını yeniden yanıtlarsın; 30 günde bir yapılabilir.">{body}</Section>
}

function ExamTab({ save }: { save: Save }) {
  const { user } = useAuth()
  if (!user) return null
  const on = examOn(user)
  return (
    <Section title="Sınav modu" hint="Sınav hedefin kayıt sırasında seçtiğin hedeften gelir; Defne, günlük plan ve denemeler buna göre çalışır.">
      <div className="rounded-2xl bg-paper-2 px-4">
        <Toggle label="Sınav modunu menüde göster" description={on ? 'Menüde görünüyor.' : 'Kapalı. Menüde görünmez, hedefin saklı kalır.'} checked={on} onChange={(v) => save.mutate({ preferences: { exam_mode: v } })} />
      </div>
      <div className="mt-5"><TrackSummary compact /></div>
      {user.exam_target && (
        <Input className="mt-4" label="Sınav tarihi" type="date" defaultValue={user.exam_date ?? ''} min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)} onBlur={(e) => e.target.value !== (user.exam_date ?? '') && save.mutate({ exam_date: e.target.value || null })} hint="Geri sayım ve deneme planı için." />
      )}
    </Section>
  )
}

function LookTab({ save }: { save: Save }) {
  const [theme] = useTheme()
  const { user } = useAuth()
  if (!user) return null
  const prefs = user.preferences
  return (
    <>
      <Section title="Tema">
        <div className="grid grid-cols-3 gap-2.5">
          {([['light', 'Açık', Sun], ['dark', 'Koyu', Moon], ['system', 'Sistem', Monitor]] as const).map(([v, l, I]) => (
            <button key={v} onClick={() => { setTheme(v); save.mutate({ preferences: { theme: v } }) }} aria-pressed={theme === v} className={clsx('press overflow-hidden rounded-2xl border-2 text-left transition', theme === v ? 'border-ink shadow-[0_3px_0_0_var(--ink)]' : 'border-line hover:border-ink/25')}>
              {/* a tiny preview of the app in that theme */}
              <span className="relative block h-16 overflow-hidden" style={{ background: v === 'dark' ? '#11141c' : v === 'light' ? '#f7f8fa' : 'linear-gradient(90deg,#f7f8fa 50%,#11141c 50%)' }}>
                <span className="absolute left-2 top-2 h-12 w-5 rounded-md" style={{ background: v === 'dark' ? '#1b2030' : '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }} />
                <span className="absolute left-9 right-2 top-2 h-3 rounded" style={{ background: v === 'dark' ? '#2b3242' : '#e3e6eb' }} />
                <span className="absolute left-9 top-7 size-6 rounded-full bg-flame" />
                <span className="absolute left-[4.25rem] top-8 h-2 w-8 rounded" style={{ background: v === 'light' ? '#e3e6eb' : '#2b3242' }} />
              </span>
              <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-extrabold"><I className="size-4" /> {l}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Dil ve ses">
        <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-paper-2 px-4 py-3">
          <span>
            <span className="block font-bold">Arayüz dili</span>
            <span className="block text-xs text-ink-soft">Ders içeriği her zaman İngilizce.</span>
          </span>
          <LangSelect />
        </div>
        <Toggle label="Ses efektleri" checked={prefs.sound !== false} onChange={(v) => save.mutate({ preferences: { sound: v } })} />
        <div className="pt-2">
          <Label note="kaydırınca örnek okurum">Okuma hızı ({(prefs.tts_rate ?? 0.95).toFixed(2)}x)</Label>
          <input type="range" min={0.6} max={1.3} step={0.05} defaultValue={prefs.tts_rate ?? 0.95} onChange={(e) => speak('This is how I will read to you.', { rate: Number(e.target.value) })} onMouseUp={(e) => save.mutate({ preferences: { tts_rate: Number((e.target as HTMLInputElement).value) } })} onTouchEnd={(e) => save.mutate({ preferences: { tts_rate: Number((e.target as HTMLInputElement).value) } })} className="w-full accent-[#FF5A36]" />
        </div>
      </Section>
    </>
  )
}

const NOTIFY: [NotifyGroup, string, string][] = [
  ['homework', 'Ödevler', 'Öğretmenin yeni ödev verdiğinde.'],
  ['achievements', 'Rozetler', 'Yeni bir rozet kazandığında.'],
  ['league', 'Lig sonuçları', 'Hafta bitince yükseldin mi, kaldın mı.'],
  ['duel', 'Arena', 'Gölge düellosu sonuçları.'],
  ['gifts', 'Hediyeler', 'Sandıktan iş ortağı hediyesi çıktığında.'],
]

function NotifyTab({ save }: { save: Save }) {
  const { user } = useAuth()
  if (!user) return null
  const prefs = user.preferences
  return (
    <Section title="Bildirimler" hint="Az ama zamanında: yalnızca serin tehlikedeyken ve önemli bir şey olduğunda.">
      <div className="divide-y-2 divide-line/10">
        <Toggle label="Seri hatırlatma e-postaları" description="Serin bitmek üzereyken, seçtiğin çalışma zamanında haber veririz." checked={prefs.email_reminders !== false} onChange={(v) => save.mutate({ preferences: { email_reminders: v } })} />
        <Toggle label="Haftalık karne e-postası" description="Pazartesi sabahı geçen haftanın özeti: XP, çalıştığın günler, yeni kelimeler." checked={prefs.email_weekly !== false} onChange={(v) => save.mutate({ preferences: { email_weekly: v } })} />
        {user.age_group !== 'kid' && <Toggle label="Kampanya e-postaları" description="Yeni paketler ve indirimler. Ayda en fazla iki kez." checked={user.marketing_opt_in} onChange={(v) => save.mutate({ marketing_opt_in: v })} />}
      </div>
      <p className="mb-1 mt-6 text-xs font-black uppercase tracking-widest text-ink-soft">Uygulama içi bildirimler</p>
      <div className="divide-y-2 divide-line/10">
        {NOTIFY.map(([k, l, d]) => (
          <Toggle key={k} label={l} description={d} checked={prefs.notify?.[k] !== false} onChange={(v) => save.mutate({ preferences: { notify: { [k]: v } } })} />
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-soft">Seri hatırlatmasının saati, <b>Öğrenme</b> sekmesindeki çalışma zamanına göre gelir.</p>
    </Section>
  )
}

function Security() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
  const change = useMutation({
    mutationFn: () => post('/account/password', pw),
    onSuccess: () => { toast('Şifren güncellendi, diğer cihazlardan çıkış yapıldı.', 'success'); setPw({ current_password: '', password: '', password_confirmation: '' }) },
  })
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => get<{ data: { id: number; name: string; last_used_at: string | null; created_at: string; current: boolean }[] }>('/account/sessions') })
  const revoke = useMutation({ mutationFn: (id: number) => del(`/account/sessions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) })
  const err = change.error as ApiError | null

  return (
    <Section title="Güvenlik" hint="Şifreni değiştirince diğer cihazlardaki oturumlar kapanır. Hesabın aynı anda en fazla 3 cihazda açık kalır; yeni bir cihazda giriş yapınca en eskisi kapanır.">
      <form className="mb-6 grid gap-3" onSubmit={(e: FormEvent) => { e.preventDefault(); change.mutate() }}>
        {err && <Alert tone="error">{err.first()}</Alert>}
        <Input label="Mevcut şifre" type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Yeni şifre" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
          <Input label="Yeni şifre (tekrar)" type="password" autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} />
        </div>
        <Button type="submit" variant="secondary" className="w-fit" loading={change.isPending}>Şifreyi değiştir</Button>
      </form>

      <p className="mb-2 font-bold">Oturumlar</p>
      <ul className="mb-6 divide-y-2 divide-line/10 rounded-2xl border-2 border-line/15">
        {sessions.data?.data.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            {s.name === 'web' ? <Monitor className="size-5" /> : <Smartphone className="size-5" />}
            <div className="flex-1 text-sm">
              <p className="font-bold">{s.name === 'admin-panel' ? 'Yönetim paneli' : s.name} {s.current && <span className="text-mint-deep">(bu cihaz)</span>}</p>
              <p className="text-ink-soft">Son kullanım: {dateTR(s.last_used_at ?? s.created_at, true)}</p>
            </div>
            {!s.current && <button onClick={() => revoke.mutate(s.id)} className="text-sm font-bold text-berry">Kapat</button>}
          </li>
        ))}
      </ul>
      {user?.is_staff && <TwoFactor />}
    </Section>
  )
}

function TwoFactor() {
  const { user, refresh } = useAuth()
  const [setup, setSetup] = useState<{ secret: string; otpauth_url: string } | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [pw, setPw] = useState('')
  const start = useMutation({ mutationFn: () => post<{ secret: string; otpauth_url: string }>('/account/2fa/setup'), onSuccess: setSetup })
  const confirm = useMutation({ mutationFn: (code: string) => post<{ recovery_codes: string[] }>('/account/2fa/confirm', { code }), onSuccess: (r) => { setCodes(r.recovery_codes); setSetup(null); refresh() } })
  const disable = useMutation({ mutationFn: () => post('/account/2fa/disable', { current_password: pw }), onSuccess: () => refresh() })

  return (
    <div className="rounded-2xl border-2 border-dashed border-line/30 p-4">
      <p className="font-bold">Yönetici iki adımlı doğrulama (TOTP)</p>
      <p className="mb-3 text-sm text-ink-soft">Etkinleştirirsen yönetim paneli girişinde e-posta kodu yerine Google Authenticator / Authy kodu istenir.</p>
      {codes && (
        <Alert tone="success">
          Kurtarma kodlarını güvenli bir yere kaydet (her biri bir kez kullanılır):
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono">{codes.map((c) => <span key={c}>{c}</span>)}</div>
        </Alert>
      )}
      {user?.two_factor_enabled ? (
        <div className="mt-3 flex gap-2">
          <Input type="password" placeholder="Şifren" value={pw} onChange={(e) => setPw(e.target.value)} className="flex-1" />
          <Button variant="danger" loading={disable.isPending} onClick={() => disable.mutate()}>Kapat</Button>
        </div>
      ) : setup ? (
        <div className="space-y-3">
          <p className="text-sm">Doğrulayıcı uygulamana bu anahtarı ekle, sonra üretilen kodu gir:</p>
          <p className="break-all rounded-xl bg-paper-2 p-3 font-mono text-sm font-bold">{setup.secret}</p>
          <a href={setup.otpauth_url} className="text-sm font-bold text-flame">Telefonda aç →</a>
          <OtpInput onComplete={(c) => confirm.mutate(c)} status={confirm.error ? 'error' : 'idle'} />
        </div>
      ) : (
        <Button size="sm" onClick={() => start.mutate()} loading={start.isPending}>Etkinleştir</Button>
      )}
    </div>
  )
}

function Orders() {
  const { data } = useQuery({ queryKey: ['orders'], queryFn: () => get<{ orders: { uuid: string; status: string; total: string; created_at: string; plan: { name: string } | null }[] }>('/orders') })
  if (!data?.orders.length) return null
  const S: Record<string, string> = { paid: 'Ödendi', pending: 'Bekliyor', failed: 'Başarısız', refunded: 'İade', cancelled: 'İptal' }
  return (
    <Section title="Siparişlerim">
      <ul className="divide-y-2 divide-line/10">
        {data.orders.map((o) => (
          <li key={o.uuid} className="flex items-center justify-between py-2.5 text-sm">
            <span><b>{o.plan?.name ?? 'Paket'}</b> · {dateTR(o.created_at)}</span>
            <span className="font-bold">{tl(o.total)} · {S[o.status] ?? o.status}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function DeleteAccount() {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const request = useMutation({ mutationFn: () => post('/account/delete/request', { current_password: pw }) })
  const confirm = useMutation({ mutationFn: (code: string) => post('/account/delete', { code }), onSuccess: () => signOut() })
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} icon={<Trash2 className="size-4" />}>Hesabı sil</Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h2 className="text-2xl font-extrabold">Hesabını kalıcı olarak sil</h2>
        <p className="mb-5 mt-2 text-ink-soft">Tüm ilerlemen, serin, rozetlerin ve kalan Premium süren silinir. Bu işlem geri alınamaz.</p>
        {!request.isSuccess ? (
          <div className="space-y-3">
            {request.error && <Alert tone="error">{(request.error as ApiError).first()}</Alert>}
            <Input type="password" label="Şifren" value={pw} onChange={(e) => setPw(e.target.value)} />
            <Button block variant="danger" loading={request.isPending} onClick={() => request.mutate()}>Onay kodu gönder</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">E-postana gelen 6 haneli kodu gir:</p>
            <OtpInput onComplete={(c) => confirm.mutate(c)} status={confirm.error ? 'error' : 'idle'} />
            {confirm.error && <Alert tone="error">{(confirm.error as ApiError).first()}</Alert>}
          </div>
        )}
      </Modal>
    </>
  )
}

/** Students of a partner school can join with the code their teacher shares. */
function JoinInstitution() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const join = useMutation({
    mutationFn: () => post<{ user: Me }>('/institution/join', { code }),
    onSuccess: (r) => { setUser(r.user); toast('Kuruma katıldın ✓', 'success'); setCode('') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  if (!user) return null
  return (
    <Section title="Okul / kurum">
      {user.institution ? (
        <p className="font-bold">{user.institution.name} <span className="font-normal text-ink-soft">{user.institution_role === 'manager' ? 'kurum yöneticisi' : 'öğrenci koltuğun aktif'}</span></p>
      ) : (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); join.mutate() }}>
          <Input label="Kurum katılım kodu" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ör. ABC-1234" className="min-w-48 flex-1" />
          <Button type="submit" loading={join.isPending} disabled={code.length < 4}>Katıl</Button>
        </form>
      )}
    </Section>
  )
}
