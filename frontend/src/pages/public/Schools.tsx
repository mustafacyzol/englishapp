import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { animate, AnimatePresence, motion, useInView, useScroll, useTransform } from 'motion/react'
import clsx from 'clsx'
import {
  ArrowRight, BarChart3, Bell, BookOpenCheck, Check, ClipboardList, Flame, GraduationCap, KeyRound, Lock, MessageCircle, Palette, Phone, Plus, ShieldCheck, Trophy, Users,
} from 'lucide-react'
import { ApiError, post } from '@/lib/api'
import { img, PHOTO } from '@/lib/assets'
import { SKILL, SKILLS } from '@/lib/skills'
import { higoImg } from '@/components/game/Higo'
import { Img } from '@/components/ui/Img'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Turnstile } from '../auth/Turnstile'

const ease = [0.22, 1, 0.36, 1] as const
const goForm = () => document.getElementById('basvuru')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/** Numbers that count up when they come into view. */
function Count({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.6 })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!seen) return
    const c = animate(0, to, { duration: 1.2, ease, onUpdate: (x) => setV(Math.round(x)) })
    return () => c.stop()
  }, [seen, to])
  return <span ref={ref} className="tabular-nums">{v}{suffix}</span>
}

function Kicker({ children, tone = 'text-flame' }: { children: ReactNode; tone?: string }) {
  return <p className={clsx('text-xs font-black uppercase tracking-[0.2em]', tone)}>{children}</p>
}

function Rise({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.6, delay, ease }} className={className}>
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------ hero mock */

/** A live-looking teacher panel: bars fill, a homework card ticks up, a notification lands. */
function PanelMock() {
  const [done, setDone] = useState(14)
  useEffect(() => {
    const t = setInterval(() => setDone((d) => (d >= 27 ? 14 : d + 1)), 700)
    return () => clearInterval(t)
  }, [])
  const rows = [
    ['Elif', 'avatars/braids.webp', 92, 12],
    ['Mert', 'avatars/cap.webp', 78, 6],
    ['Zeynep', 'avatars/ponytail.webp', 64, 9],
    ['Can', 'avatars/headphones.webp', 41, 2],
  ] as const
  return (
    <div className="relative">
      <motion.div initial={{ opacity: 0, y: 30, rotate: 1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, ease }} className="overflow-hidden rounded-[30px] border-2 border-line bg-card shadow-[0_40px_90px_-40px_rgba(31,36,51,.45)]">
        <div className="flex items-center justify-between border-b-2 border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={img('schools/teacher.webp')} alt="" className="size-10 rounded-full object-cover" />
            <div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">Öğretmen paneli</p><p className="font-display text-lg font-black">8-A sınıfı</p></div>
          </div>
          <span className="rounded-full bg-mint/15 px-3 py-1 text-sm font-extrabold text-mint-deep">bu hafta %92 katılım</span>
        </div>
        <div className="grid grid-cols-4 gap-3 border-b-2 border-line p-5">
          {SKILLS.map((k, i) => {
            const S = SKILL[k]
            return (
              <div key={k}>
                <p className="mb-1 flex items-center gap-1 text-[11px] font-bold sm:text-xs"><S.icon className={clsx('size-3.5', S.text)} /> {S.label}</p>
                <div className="h-2 overflow-hidden rounded-full bg-paper-2"><motion.div initial={{ width: 0 }} animate={{ width: `${[82, 66, 51, 44][i]}%` }} transition={{ delay: 0.5 + i * 0.12, duration: 1, ease }} className={clsx('h-full rounded-full', S.bg)} /></div>
              </div>
            )
          })}
        </div>
        {rows.map(([n, a, xp, st], i) => (
          <motion.div key={n} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.08 }} className="flex items-center gap-3 border-b-2 border-line px-5 py-3 last:border-b-0">
            <span className="w-4 text-center font-display font-black text-ink-soft">{i + 1}</span>
            <img src={img(a)} alt="" className="size-9 rounded-full object-cover" />
            <span className="flex-1 font-bold">{n}</span>
            <span className="flex items-center gap-0.5 text-sm font-bold text-ink-soft"><Flame className="size-3.5 fill-flame text-flame" />{st}</span>
            <span className="w-14 text-right font-mono text-sm font-bold tabular-nums">{xp} XP</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 20 }} className="absolute -bottom-8 -left-3 w-[230px] rounded-2xl bg-card p-4 shadow-[0_24px_50px_-24px_rgba(31,36,51,.5)] ring-1 ring-line sm:-left-10">
        <p className="text-[11px] font-black uppercase tracking-widest text-flame">Ödev · Hikâye</p>
        <p className="mt-1 font-extrabold">The Red Umbrella</p>
        <div className="mt-2 flex items-center gap-2 text-xs font-bold">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2"><motion.span animate={{ width: `${(done / 27) * 100}%` }} className="block h-full rounded-full bg-mint" /></span>
          <span className="tabular-nums">{done}/27</span>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5, type: 'spring', stiffness: 220, damping: 20 }} className="absolute -right-2 -top-12 flex sm:-top-6 items-center gap-2 rounded-2xl bg-inv px-3 py-2.5 text-on-inv shadow-xl sm:-right-8">
        <span className="grid size-8 place-items-center rounded-xl bg-mint"><Bell className="size-4 text-white" /></span>
        <span className="text-xs font-bold leading-tight">Yeni ödev:<br /><span className="opacity-75">Unit 3 kelimeleri</span></span>
      </motion.div>
    </div>
  )
}

/* -------------------------------------------------------------- roles */

const ROLES = [
  {
    key: 'mudur', label: 'Müdür', icon: ShieldCheck, tone: '#1f2433',
    title: 'Bütün okul tek ekranda',
    points: ['Her sınıfın haftalık katılımı ve dört beceri karnesi', 'Öğretmen ekleme, sınıf ve şube açma, öğretmene sınıf verme', 'Okul ligi: sınıflar arası tatlı bir rekabet', 'Okulunuzun logosu ve rengiyle açılan panel'],
    mock: () => (
      <div className="grid gap-3 sm:grid-cols-3">
        {[['5-A', 88, '#22b573'], ['6-B', 74, '#2f7cf6'], ['8-A', 92, '#e8403a']].map(([c, p, col]) => (
          <div key={c as string} className="rounded-2xl bg-paper-2 p-4">
            <p className="font-display text-2xl font-black">{c}</p>
            <p className="text-xs font-bold text-ink-soft">katılım</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-card"><motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.9, ease }} className="h-full rounded-full" style={{ background: col as string }} /></div>
            <p className="mt-1 text-right font-mono text-sm font-bold">%{p}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'ogretmen', label: 'Öğretmen', icon: GraduationCap, tone: '#2f7cf6',
    title: 'Ödev ver, kim nerede takıldı gör',
    points: ['Yalnızca kendi sınıflarını görür ve yönetir', 'Ders, hikâye, kelime ya da sınav ödevi; son tarihli', 'Öğrenci bitirince ödev kendiliğinden işaretlenir', 'Sınıfının ligi ve en zayıf becerisi için öneri'],
    mock: () => (
      <div className="space-y-2">
        {[['Unit 3: Okulda', 'Ders', 24, 27], ['The Red Umbrella', 'Hikâye', 19, 27], ['LGS deneme 4', 'Sınav', 11, 27]].map(([t, k, d, n], i) => (
          <motion.div key={t as string} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 rounded-2xl bg-paper-2 p-3">
            <span className="grid size-9 place-items-center rounded-xl bg-sky text-white"><ClipboardList className="size-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{t}</span><span className="text-xs font-bold text-ink-soft">{k}</span></span>
            <span className="font-mono text-sm font-bold">{d}/{n}</span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    key: 'ogrenci', label: 'Öğrenci', icon: Users, tone: '#e8403a',
    title: 'Oyun gibi çalışır, ödevini kaçırmaz',
    points: ['Ödev bildirimlere düşer, tek dokunuşla açılır', 'Seviyesine göre kişisel ders yolu ve Higo', 'Defne ile sesli konuşma, LGS ve YDT pratiği', 'Sınıfım ve Okulum ligleri, seri ve rozetler'],
    mock: () => (
      <div className="flex items-center gap-4 rounded-2xl bg-paper-2 p-4">
        <img src={higoImg('cheer')} alt="" className="size-20 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-black">Sınıfında 2. sıradasın!</p>
          <p className="text-sm text-ink-soft">Bu hafta 340 XP · 6 gün seri</p>
          <div className="mt-2 flex gap-1">{[1, 1, 1, 1, 1, 1, 0].map((d, i) => <span key={i} className={clsx('h-2 flex-1 rounded-full', d ? 'bg-flame' : 'bg-line')} />)}</div>
        </div>
      </div>
    ),
  },
] as const

function Roles() {
  const [k, setK] = useState(0)
  const r = ROLES[k]
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Rise className="max-w-2xl">
        <Kicker>Üç rol, üç ekran</Kicker>
        <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-tight">Herkes yalnızca işine yarayanı görür</h2>
      </Rise>
      <div className="mt-8 inline-flex rounded-2xl border-2 border-line bg-card p-1" role="tablist">
        {ROLES.map((x, i) => (
          <button key={x.key} role="tab" aria-selected={k === i} onClick={() => setK(i)} className={clsx('relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition sm:px-5 sm:text-[15px]', k === i ? 'text-on-inv' : 'text-ink-soft hover:text-ink')}>
            {k === i && <motion.span layoutId="role-tab" className="absolute inset-0 rounded-xl bg-inv" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <x.icon className="relative size-4" /><span className="relative">{x.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={r.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease }} className="mt-6 grid gap-6 rounded-[32px] border-2 border-line bg-card p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h3 className="font-display text-2xl font-black sm:text-3xl" style={{ color: r.tone === '#1f2433' ? undefined : r.tone }}>{r.title}</h3>
            <ul className="mt-5 space-y-3">
              {r.points.map((p, i) => (
                <motion.li key={p} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex gap-3 text-[16px]">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-mint text-white"><Check className="size-3.5" strokeWidth={3.5} /></span>{p}
                </motion.li>
              ))}
            </ul>
          </div>
          <r.mock />
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

/* ------------------------------------------------------- a week in class */

const WEEK = [
  { d: 'Pazartesi', t: 'Öğretmen ödevi verir', x: 'Unit 3 dersi ve bir hikâye, cuma son gün.', icon: ClipboardList, c: 'bg-sky' },
  { d: 'Pazartesi', t: 'Öğrenciye bildirim gider', x: 'Ödev bildirimlere düşer, tek dokunuşla açılır.', icon: Bell, c: 'bg-mint' },
  { d: 'Salı - Perşembe', t: 'Günde 10 dakika', x: 'Ders, kelime oyunu, Defne ile konuşma. Seri büyür.', icon: Flame, c: 'bg-flame' },
  { d: 'Perşembe', t: 'Takılanlar görünür', x: 'Panel kimin başlamadığını ve hangi becerinin geride kaldığını gösterir.', icon: BarChart3, c: 'bg-lilac' },
  { d: 'Cuma', t: 'Karne ve lig', x: 'Ödev kendiliğinden kapanır; sınıf ligi ve haftalık karne hazır.', icon: Trophy, c: 'bg-butter' },
]

function Week() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] })
  const h = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  return (
    <section className="bg-paper-2/60 py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Rise className="lg:sticky lg:top-28 lg:self-start">
          <Kicker tone="text-sky">Bir hafta</Kicker>
          <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-tight">Sınıfınızda bir hafta böyle geçer</h2>
          <p className="mt-3 max-w-md text-lg text-ink-soft">Öğretmenin işi azalır, öğrencinin çalışma süresi artar. Takip kendiliğinden olur.</p>
          <img src={higoImg('map')} alt="" className="mt-6 hidden w-40 lg:block" />
        </Rise>
        <div ref={ref} className="relative pl-10">
          <span aria-hidden className="absolute bottom-2 left-[15px] top-2 w-1 rounded-full bg-line" />
          <motion.span aria-hidden style={{ height: h }} className="absolute left-[15px] top-2 w-1 rounded-full bg-flame" />
          <ol className="space-y-5">
            {WEEK.map((w, i) => (
              <motion.li key={w.t} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5, delay: i * 0.04, ease }} className="relative rounded-3xl border-2 border-line bg-card p-5">
                <span className={clsx('absolute -left-[42px] top-5 grid size-8 place-items-center rounded-full text-white ring-4 ring-paper', w.c)}><w.icon className="size-4" /></span>
                <p className="text-xs font-black uppercase tracking-widest text-ink-soft">{w.d}</p>
                <p className="mt-1 font-display text-xl font-black">{w.t}</p>
                <p className="mt-1 text-ink-soft">{w.x}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ features */

const FEATURES = [
  { icon: ClipboardList, t: 'Ödev ve takip', d: 'Ders, hikâye, sınav ya da serbest görev; son tarihli. Kim yaptı, kim başlamadı, tek bakışta.', c: 'text-sky' },
  { icon: BarChart3, t: 'Dört beceri karnesi', d: 'Okuma, dinleme, konuşma, yazma dengesi; haftalık XP ve seri. Sınıfın en zayıf becerisi için öneri.', c: 'text-lilac' },
  { icon: Trophy, t: 'Sınıf ve okul ligi', d: 'Haftalık ve aylık XP sıralaması. Öğrenci kendi sınıfını, öğretmen sınıflarını, müdür bütün okulu görür.', c: 'text-butter-deep' },
  { icon: BookOpenCheck, t: 'Sınava hazırlık', d: 'Gerçek formatta denemeler, Türkçe çözümler ve sınav tarihine göre günlük plan.', c: 'text-flame' },
  { icon: MessageCircle, t: 'Defne ile konuşma', d: 'Her öğrenci yapay zekâ öğretmenle sesli konuşur; yaşına uygun, güvenli içerikle.', c: 'text-sage-deep dark:text-sage' },
  { icon: KeyRound, t: 'Kolay katılım', d: 'Okul koduyla ya da e-posta davetiyle saniyeler içinde; doğru sınıfa kendiliğinden yerleşir.', c: 'text-mint-deep' },
  { icon: Palette, t: 'Okulunuzun kimliği', d: 'Panel okulunuzun logosu ve rengiyle açılır, öğrenciler kendi okullarını görür.', c: 'text-berry' },
  { icon: Lock, t: 'KVKK ve güvenlik', d: 'Reklamsız. Veriler Türkiye mevzuatına uygun saklanır, yalnızca okulunuzun yetkilileri görür.', c: 'text-ink' },
]

/* -------------------------------------------------------- grade → CEFR */

const LADDER = [
  { g: '2-4. sınıf', l: 'A1', t: 'Kelime, şarkı ve hikâyelerle ilk adımlar', c: '#22b573' },
  { g: '5-6. sınıf', l: 'A1+', t: 'Günlük konuşmalar ve temel dilbilgisi', c: '#2fb8a0' },
  { g: '7-8. sınıf', l: 'A2', t: 'LGS formatı ve okuma becerisi', c: '#2f7cf6' },
  { g: '9-10. sınıf', l: 'A2-B1', t: 'Anlatma, karşılaştırma, deneyimler', c: '#8f7cf8' },
  { g: '11-12. sınıf', l: 'B1-B2', t: 'YDT, akademik okuma ve fikir savunma', c: '#e8403a' },
]

/* -------------------------------------------------------------- form */

const TYPES: [string, string][] = [['ilkokul', 'İlkokul'], ['ortaokul', 'Ortaokul'], ['lise', 'Lise'], ['kurs', 'Kurs / Dershane'], ['diger', 'Diğer']]
const ROLE_OPTS: [string, string][] = [['mudur', 'Müdür'], ['ogretmen', 'Öğretmen'], ['diger', 'Diğer']]
const INTERESTS: [string, string][] = [['odev', 'Ödev takibi'], ['sinav', 'Sınava hazırlık'], ['konusma', 'Konuşma pratiği'], ['rapor', 'Raporlar']]
const SIZES: [number, string][] = [[100, '1-100'], [300, '100-300'], [600, '300-600'], [1000, '600+']]

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={clsx('rounded-full border-2 px-3.5 py-1.5 text-sm font-extrabold transition', on ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card text-ink-soft hover:border-ink/30 hover:text-ink')}>
      {children}
    </button>
  )
}

function ApplyForm() {
  const blank = { school_name: '', city: '', district: '', school_type: 'ortaokul', students: '300', grades: [] as number[], contact_name: '', contact_role: 'mudur', email: '', phone: '', interests: ['odev'] as string[], message: '', kvkk: false }
  const [f, setF] = useState(blank)
  const [captcha, setCaptcha] = useState('')
  const [note, setNote] = useState(false)
  const m = useMutation({ mutationFn: () => post<{ message: string }>('/schools/apply', { ...f, students: Number(f.students) || 0, district: f.district || null, message: f.message || null, captcha }) })
  const err = m.error as ApiError | null
  const e = (k: string) => err?.errors?.[k]?.[0]
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }))
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  if (m.isSuccess)
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
        <motion.img src={higoImg('cheer')} alt="" initial={{ y: 20, rotate: -8 }} animate={{ y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }} className="mx-auto size-32 object-contain" />
        <h3 className="mt-4 font-display text-3xl font-black">Başvurunuz alındı!</h3>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">{m.data.message}</p>
        <Button className="mt-8" variant="secondary" onClick={() => { m.reset(); setF(blank) }}>Yeni başvuru</Button>
      </motion.div>
    )

  return (
    <form className="grid gap-5" onSubmit={(ev: FormEvent) => { ev.preventDefault(); m.mutate() }}>
      {err && <Alert tone="error">{err.first()}</Alert>}
      <Input label="Okul adı" value={f.school_name} onChange={(x) => set('school_name', x.target.value)} required error={e('school_name')} placeholder="ör. Atatürk Ortaokulu" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="İl" value={f.city} onChange={(x) => set('city', x.target.value)} required error={e('city')} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Okul türü</span>
          <select value={f.school_type} onChange={(x) => set('school_type', x.target.value)} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-bold">Öğrenci sayısı</p>
        <div className="grid grid-cols-4 gap-1.5">{SIZES.map(([n, l]) => <button type="button" key={n} onClick={() => set('students', String(n))} aria-pressed={Number(f.students) === n} className={clsx('rounded-xl border-2 px-1 py-2 text-xs font-extrabold transition sm:text-sm', Number(f.students) === n ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card text-ink-soft hover:text-ink')}>{l}</button>)}</div>
        {e('students') && <p className="mt-1 text-sm font-semibold text-berry">Lütfen bir aralık seçin.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Adınız soyadınız" value={f.contact_name} onChange={(x) => set('contact_name', x.target.value)} required error={e('contact_name')} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Göreviniz</span>
          <select value={f.contact_role} onChange={(x) => set('contact_role', x.target.value)} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
            {ROLE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <Input label="E-posta" type="email" value={f.email} onChange={(x) => set('email', x.target.value)} required error={e('email')} placeholder="ad@okul.k12.tr" />
        <Input label="Telefon" type="tel" inputMode="tel" value={f.phone} onChange={(x) => set('phone', x.target.value)} required error={e('phone')} placeholder="05xx xxx xx xx" />
      </div>
      <div>
        <p className="mb-2 text-sm font-bold">Neye ihtiyacınız var? <span className="font-normal text-ink-soft">(birden çok seçebilirsiniz)</span></p>
        <div className="flex flex-wrap gap-2">{INTERESTS.map(([v, l]) => <Chip key={v} on={f.interests.includes(v)} onClick={() => set('interests', toggle(f.interests, v))}>{l}</Chip>)}</div>
      </div>
      {note ? (
        <Textarea label="Notunuz (isteğe bağlı)" rows={3} value={f.message} onChange={(x) => set('message', x.target.value)} />
      ) : (
        <button type="button" onClick={() => setNote(true)} className="-mt-1 w-fit text-sm font-bold text-ink-soft underline-offset-2 hover:text-ink hover:underline">+ Not eklemek istiyorum</button>
      )}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex gap-3 text-sm">
        <input type="checkbox" checked={f.kvkk} onChange={(x) => set('kvkk', x.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#e8403a]" required />
        <span><Link to="/privacy" className="font-bold underline">KVKK metnini</Link> okudum, benimle iletişime geçilmesini kabul ediyorum.</span>
      </label>
      {e('kvkk') && <p className="-mt-4 text-sm font-semibold text-berry">{e('kvkk')}</p>}
      <Turnstile onToken={setCaptcha} />
      <Button type="submit" size="lg" block loading={m.isPending} className="whitespace-nowrap">Başvuruyu gönder <ArrowRight className="size-5" /></Button>
      <p className="-mt-3 text-center text-xs text-ink-soft">Ücretsiz ve bağlayıcı değil. En geç 1 iş günü içinde arıyoruz.</p>
    </form>
  )
}

/* ---------------------------------------------------------------- FAQ */

const FAQ: [string, string][] = [
  ['Fiyatlandırma nasıl?', 'Öğrenci sayısına ve seçtiğiniz özelliklere göre yıllık okul lisansı. Başvurunuzdan sonra size özel teklif hazırlıyoruz; deneme süresi de mümkün.'],
  ['Kurulum ne kadar sürer?', 'Genellikle bir hafta içinde: okulunuzu açıyoruz, öğretmenlerinizi ve sınıflarınızı birlikte ekliyoruz, ilk ödevi beraber veriyoruz.'],
  ['Öğrencilerin telefonu yoksa?', 'Tarayıcıda, okulun bilgisayar laboratuvarında ya da tabletlerde aynı hesapla çalışır. Ödevler evde ya da okulda yapılabilir.'],
  ['Müfredatla uyumlu mu?', 'Ders yolu CEFR seviyelerine göre kuruldu ve sınıf düzeylerinin konularıyla eşleştirildi. Öğretmenleriniz ödevleri kendi planlarına göre seçer.'],
]

function SchoolFaq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="space-y-2.5">
      {FAQ.map(([q, a], i) => (
        <div key={q} className={clsx('overflow-hidden rounded-2xl border-2 bg-card transition-colors', open === i ? 'border-ink/25' : 'border-line')}>
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-extrabold">
            {q}<span className={clsx('grid size-7 shrink-0 place-items-center rounded-full transition', open === i ? 'rotate-45 bg-flame text-white' : 'bg-paper-2 text-ink-soft')}><Plus className="size-4" strokeWidth={3} /></span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden px-5 pb-4 text-ink-soft">{a}</motion.p>}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- page */

/** "Okullar için": what a school gets, role by role, a week in class, and the application form. */
export default function Schools() {
  return (
    <div>
      {/* hero */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_90%_10%,color-mix(in_oklab,var(--color-sky)_12%,transparent),transparent_70%),radial-gradient(40rem_26rem_at_0%_90%,color-mix(in_oklab,var(--color-flame)_9%,transparent),transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 lg:grid-cols-[1fr_1.05fr] lg:pb-28 lg:pt-16">
          <div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full bg-sky/12 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky"><GraduationCap className="size-4" /> Okullar için</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.6, ease }} className="mt-4 font-display text-[clamp(2.5rem,5.6vw,4.4rem)] font-black leading-[1.03] tracking-tight">
              Okulunuzun İngilizcesi, <span className="text-flame">tek panelde.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.6, ease }} className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
              Ödev verin, kendiliğinden takip edilsin. Öğrenciler oyun gibi çalışsın, siz sonucu görün.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.6, ease }} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button size="lg" onClick={goForm} className="h-16 whitespace-nowrap px-8 text-[17px] sm:min-w-[300px]">Okulunuz için teklif alın <ArrowRight className="size-5" /></Button>
              <Link to="/register" className="press inline-flex h-16 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 border-line bg-card px-8 font-display text-[17px] font-extrabold uppercase tracking-wide shadow-[0_4px_0_0_var(--line)] hover:bg-paper-2 sm:min-w-[260px]">Öğrenci olarak dene</Link>
            </motion.div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-ink-soft">
              {['KVKK uyumlu', 'Reklamsız', 'Kurulum desteği', 'Öğrenci başına fiyat'].map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-mint-deep" strokeWidth={3} />{t}</li>)}
            </ul>
          </div>
          <div className="relative mx-2 sm:mx-8 lg:mx-0"><PanelMock /></div>
        </div>
      </section>

      {/* numbers */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-line px-5 sm:grid-cols-4 sm:divide-x">
          {[[4, '', 'beceri, tek karne'], [3, '', 'ayrı panel: müdür, öğretmen, öğrenci'], [10, ' dk', 'günde yeterli'], [33, '', "ünite, A1'den B2'ye"]].map(([n, s, t]) => (
            <div key={t as string} className="px-4 py-7 text-center">
              <p className="font-display text-4xl font-black text-flame sm:text-5xl"><Count to={n as number} suffix={s as string} /></p>
              <p className="mt-1 text-sm font-bold text-ink-soft">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* the national programme, said once and plainly */}
      <section className="mx-auto max-w-6xl px-5 pt-14">
        <div className="flex flex-col items-start gap-4 rounded-[28px] border-2 border-line bg-card p-5 sm:flex-row sm:items-center sm:p-6">
          <img src={higoImg('books')} alt="" className="size-20 shrink-0 object-contain" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-[0.18em] text-flame">Türkiye Yüzyılı Maarif Modeli ile uyumlu</span>
            <span className="mt-1 block font-display text-xl font-black leading-tight sm:text-2xl">Öğrenci kendi sınıfının ünitelerini görür</span>
            <span className="mt-1 block text-sm text-ink-soft">2. sınıftan 12. sınıfa MEB İngilizce ünite başlıkları ve kelimeleri yolda; 8. sınıfta LGS, 12. sınıfta YDT notlarıyla. Her ünite bir değerlendirme sınavıyla biter.</span>
          </span>
        </div>
      </section>

      <Roles />
      <Week />

      {/* features */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Rise className="max-w-2xl">
          <Kicker tone="text-mint-deep">Neler var</Kicker>
          <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-tight">Okulun ihtiyacı olan her şey</h2>
        </Rise>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((x, i) => (
            <Rise key={x.t} delay={(i % 4) * 0.06}>
              <div className="group h-full rounded-3xl border-2 border-line bg-card p-5 transition hover:-translate-y-1 hover:border-ink/20 hover:shadow-[0_18px_40px_-24px_rgba(31,36,51,.4)]">
                <span className="grid size-11 place-items-center rounded-2xl bg-paper-2 transition group-hover:scale-110"><x.icon className={clsx('size-5', x.c)} /></span>
                <p className="mt-4 font-display text-lg font-black">{x.t}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{x.d}</p>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* grade ladder */}
      <section className="relative overflow-hidden bg-inv py-20 text-on-inv">
        <div className="mx-auto max-w-6xl px-5">
          <Rise className="max-w-2xl">
            <Kicker tone="text-butter">Her sınıfa uygun</Kicker>
            <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-tight">İlkokuldan liseye, bir merdiven</h2>
            <p className="mt-3 text-lg text-on-inv/70">Her öğrenci seviye testiyle kendi basamağından başlar. Sınıf düzeyleri için önerilen hedefler:</p>
          </Rise>
          <div className="mt-10 grid gap-3 md:grid-cols-5 md:items-end">
            {LADDER.map((l, i) => (
              <motion.div key={l.g} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ delay: i * 0.1, duration: 0.6, ease }} className="rounded-3xl bg-paper/[0.06] p-5 ring-1 ring-paper/10" style={{ minHeight: `${150 + i * 26}px` }}>
                <span className="inline-block rounded-full px-2.5 py-1 font-display text-sm font-black text-white" style={{ background: l.c }}>{l.l}</span>
                <p className="mt-3 font-display text-xl font-black">{l.g}</p>
                <p className="mt-1 text-sm text-on-inv/70">{l.t}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* photo + quote */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
        <Rise>
          <div className="relative overflow-hidden rounded-[32px] border-2 border-line">
            <Img src={PHOTO.classroom} alt="Sınıfta İngilizce dersi" className="aspect-[4/3] w-full object-cover" />
          </div>
        </Rise>
        <Rise delay={0.1}>
          <Kicker tone="text-berry">Üç adımda başlayın</Kicker>
          <ol className="mt-5 space-y-4">
            {[['Tanışalım', 'Formu doldurun, sizi arayalım. Öğrenci sayınıza göre teklif hazırlayalım.'], ['Kurulum', 'Okulunuzu açıyoruz; öğretmenlerinizi ve sınıflarınızı birlikte ekliyoruz.'], ['Başlayın', 'Öğrenciler kodla katılır, öğretmenler ilk ödevi verir. Destek ekibimiz yanınızda.']].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-flame font-display text-lg font-black text-white">{i + 1}</span>
                <span><span className="block font-display text-xl font-black">{t}</span><span className="text-ink-soft">{d}</span></span>
              </li>
            ))}
          </ol>
        </Rise>
      </section>

      {/* application */}
      <section id="basvuru" className="scroll-mt-20 bg-paper-2/60 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Kicker>Başvuru</Kicker>
            <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-tight">Okulunuz için teklif alın</h2>
            <p className="mt-3 text-lg text-ink-soft">Bir dakikalık form. Bir iş günü içinde arayıp teklifi ve demo paneli paylaşıyoruz.</p>
            <ul className="mt-6 space-y-3">
              {[[Phone, 'Sizi arayan bir okul danışmanı'], [ShieldCheck, 'Bağlayıcı değil, ücretsiz demo'], [Users, 'Öğretmenlerinize kurulum eğitimi']].map(([I, t]) => {
                const Icon = I as typeof Phone
                return <li key={t as string} className="flex items-center gap-3 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-card text-flame ring-1 ring-line"><Icon className="size-4" /></span>{t as string}</li>
              })}
            </ul>
            <div className="mt-8"><SchoolFaq /></div>
          </div>
          <div className="rounded-[32px] border-2 border-line bg-card p-6 shadow-[0_30px_70px_-40px_rgba(31,36,51,.4)] sm:p-9">
            <ApplyForm />
          </div>
        </div>
      </section>
    </div>
  )
}
