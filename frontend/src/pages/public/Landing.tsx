import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { BarChart3, Building2, Mail, Quote, Star } from 'lucide-react'
import { get } from '@/lib/api'
import type { Plan } from '@/lib/types'
import { rewardImg } from '@/lib/assets'
import { LinkButton } from '@/components/ui/Button'
import { UserAvatar } from '@/components/game/UserAvatar'
import { Img } from '@/components/ui/Img'
import { Reveal } from '@/components/motion/Page'
import { SKILL, SKILLS as SKILL_KEYS } from '@/lib/skills'
import { Bento, TryIt } from './landing/Sections'
import { FinalCta3D, TrustBar } from './landing/Story'
import { AudiencesPro, HeroPro, MeetHigoPro, PricingPro, Strengths, TurkeyLadder } from './landing/Showcase'
import { BRAND } from '@/lib/brand'

export interface Review {
  id: number
  name: string
  role: string | null
  avatar: string | null
  quote: string
  highlight: string | null
  rating: number
  cefr_level: string | null
  streak: number | null
}

interface LandingData { learners: number; stories: number; plans: Plan[]; testimonials?: Review[] }

export default function Landing() {
  const { data } = useQuery({ queryKey: ['landing'], queryFn: () => get<LandingData>('/landing') })
  const reviews = data?.testimonials ?? []
  return (
    <>
      <HeroPro />
      <TrustBar />
      <TurkeyLadder />
      <AudiencesPro />
      <Strengths />
      <MeetHigoPro />
      <TryIt />
      <Bento />
      <Reviews reviews={reviews} />
      <ForInstitutions />
      <PricingPro plans={data?.plans?.length ? data.plans : FALLBACK_PLANS} />
      <Faq />
      <Ticker reviews={reviews} />
      <FinalCta3D />
    </>
  )
}

/* ------------------------------------------------------------------ hero */

/* ---------------------------------------------------------------- ticker */

const FALLBACK_HIGHLIGHTS = ['Günde 10 dakika yetti.', 'Konuşmaktan korkmuyorum.', 'Hataları Türkçe açıklıyor.', 'Serim 100 günü geçti.', 'Mülakatı İngilizce geçtim.']

function Ticker({ reviews }: { reviews: Review[] }) {
  const items = (reviews.map((r) => r.highlight).filter(Boolean) as string[]).concat(FALLBACK_HIGHLIGHTS).slice(0, 8)
  const row = [...items, ...items]
  return (
    <div className="marquee overflow-hidden border-y-2 border-line bg-paper py-4">
      <div className="fade-x">
        <div className="marquee-track gap-3">
          {row.map((t, i) => (
            <span key={i} className="flex shrink-0 items-center gap-2 rounded-full border-2 border-line bg-card px-4 py-2 text-sm font-bold">
              <Star className="size-4 shrink-0 fill-butter text-butter" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------- skill switcher */

/* ------------------------------------------------------------------- Defne */

/* ---------------------------------------------------------- reward track */

/* --------------------------------------------------------------- reviews */

/**
 * Two rows of reviews drifting in opposite directions, fading out at the edges.
 * Hover (or touch) pauses a row. Every card wears the learner's level colour.
 */
function Reviews({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null
  const half = Math.ceil(reviews.length / 2)
  const rows = [reviews.slice(0, half), reviews.slice(half).length ? reviews.slice(half) : reviews.slice(0, half)]
  return (
    <section id="yorumlar" className="relative overflow-hidden bg-paper py-24">
      <div className="mx-auto mb-10 max-w-6xl px-5">
        <Reveal className="max-w-2xl">
          <p className="mb-2 font-extrabold uppercase tracking-widest text-berry">Öğrencilerimiz</p>
          <h2 className="text-4xl leading-tight sm:text-5xl">Ne değişti?</h2>
          <p className="mt-3 text-lg text-ink-soft">Öğrenciler, veliler ve öğretmenler anlatıyor.</p>
        </Reveal>
      </div>
      <div className="space-y-5 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        {rows.map((row, k) => (
          <div key={k} className="group flex w-max gap-5 hover:[animation-play-state:paused] active:[animation-play-state:paused] motion-reduce:animate-none" style={{ animation: `marquee ${Math.max(28, row.length * 9)}s linear infinite ${k ? 'reverse' : ''}` }}>
            {[...row, ...row].map((r, j) => <ReviewCard key={`${r.id}-${j}`} r={r} hidden={j >= row.length} />)}
          </div>
        ))}
      </div>
    </section>
  )
}

const LEVEL_TONE: Record<string, string> = { A1: '#22b573', A2: '#2fb8a0', B1: '#2f7cf6', B2: '#8f7cf8', C1: '#ef4e7b', C2: '#ff7a3d' }

function ReviewCard({ r, hidden }: { r: Review; hidden: boolean }) {
  const tone = LEVEL_TONE[r.cefr_level ?? ''] ?? '#ff5a36'
  return (
    <figure aria-hidden={hidden || undefined} className="relative flex w-[300px] shrink-0 flex-col overflow-hidden rounded-3xl border-2 border-line bg-card p-5 sm:w-[360px]">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />
      <div className="flex items-center justify-between">
        <span className="flex gap-0.5">{[...Array(r.rating)].map((_, k) => <Star key={k} className="size-3.5 fill-butter text-butter" />)}</span>
        <Quote className="size-6 text-ink/10" />
      </div>
      <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed">{r.quote}</blockquote>
      <figcaption className="mt-4 flex items-center gap-3 border-t-2 border-dashed border-line pt-4">
        <UserAvatar name={r.name} avatar={r.avatar} className="size-10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{r.name}</span>
          <span className="block truncate text-xs text-ink-soft">{r.role}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {r.cefr_level && <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ background: tone }}>{r.cefr_level}</span>}
          {!!r.streak && <span className="flex items-center gap-0.5 text-[11px] font-bold text-ink-soft"><Img src={rewardImg('flame')} alt="" className="size-3.5" />{r.streak} gün</span>}
        </span>
      </figcaption>
    </figure>
  )
}

/* ---------------------------------------------------------------- school */

/* --------------------------------------------------------------- pricing */

const FALLBACK_PLANS: Plan[] = [
  { id: 1, slug: 'monthly', name: 'Aylık', tagline: 'Esnek başla', interval: 'month', duration_days: 30, price: '149', compare_at_price: null, currency: 'TRY', features: ['Sınırsız can', 'Tüm hikayeler ve sesli okumalar', 'Günde 200 AI mesajı'], badge: null, bonus_gems: 0, live_lesson_credits: 0, is_featured: false },
  { id: 2, slug: 'quarterly', name: '3 Aylık', tagline: 'Alışkanlık kur', interval: 'quarter', duration_days: 90, price: '349', compare_at_price: '447', currency: 'TRY', features: ['Aylık paketin tüm özellikleri', '500 bonus elmas', '1 canlı ders kuponu'], badge: 'En popüler', bonus_gems: 500, live_lesson_credits: 1, is_featured: true },
  { id: 3, slug: 'yearly', name: 'Yıllık', tagline: 'Akıcılığa kadar', interval: 'year', duration_days: 365, price: '999', compare_at_price: '1788', currency: 'TRY', features: ['Tüm Premium özellikler', '4 canlı ders kuponu', 'CEFR seviye sertifikası'], badge: '%44 tasarruf', bonus_gems: 2000, live_lesson_credits: 4, is_featured: false },
]


/* ------------------------------------------------------------------- faq */

const QS: [string, string][] = [
  ['Gerçekten ücretsiz mi?', 'Evet. Tüm ders yolu, seçili hikâyeler, kelime tekrarları ve günde 10 AI mesajı ücretsizdir. Premium; sınırsız can, tüm hikâyeler, daha fazla AI pratiği ve canlı ders kuponları ekler.'],
  ['Seviyemi bilmiyorum, nereden başlamalıyım?', '3 dakikalık seviye testiyle seviyeni bul; ders yolun otomatik olarak sana göre ayarlanır. İstersen sonradan Ayarlar’dan değiştirebilirsin.'],
  ['Canlı ders kuponu nasıl çalışır?', 'Kuponu Ödüller sayfasında açtığında sana özel bir kod oluşur. Bu kodla Bayrak Dil Okulları’nda online ya da şubede ücretsiz ders alırsın.'],
  ['Telefonumda kullanabilir miyim?', `Evet. ${BRAND} tarayıcıda çalışır; iOS ve Android uygulamaları da aynı hesabı kullanır. İlerlemen her cihazda aynıdır.`],
  ['Verilerim güvende mi?', 'Şifreler şifrelenerek saklanır, hesabın e-posta kodlarıyla korunur ve KVKK kapsamında hesabını istediğin an silebilirsin.'],
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="sss" className="mx-auto max-w-3xl px-5 pb-24">
      <Reveal><h2 className="mb-10 text-center text-4xl">Sık sorulanlar</h2></Reveal>
      <div className="space-y-3">
        {QS.map(([q, a], i) => {
          const on = open === i
          return (
            <Reveal key={q} delay={i * 0.04}>
              <div className={clsx('overflow-hidden rounded-2xl border-2 bg-card transition', on ? 'border-flame/40' : 'border-line')}>
                <button onClick={() => setOpen(on ? null : i)} aria-expanded={on} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-lg font-extrabold">
                  {q}
                  <span className={clsx('grid size-7 shrink-0 place-items-center rounded-full text-xl transition', on ? 'rotate-45 bg-flame text-white' : 'bg-paper-2 text-ink-soft')}>+</span>
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                      <p className="px-6 pb-5 leading-relaxed text-ink-soft">{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- final cta */


/* ------------------------------------------------------------------- Duel */

/* ------------------------------------------------------------- Institutions */

/** B2B: schools, courses and companies buy seats and follow their learners. */
function ForInstitutions() {
  const points = [
    { icon: Building2, title: 'Müdür ve öğretmen panelleri', text: 'Müdür bütün okulu, her öğretmen kendi sınıflarını görür ve yönetir.' },
    { icon: Mail, title: 'Ödev ver, takip et', text: 'Ders, hikâye ya da sınav ödevi verin; öğrenci bitirince kendiliğinden işaretlenir.' },
    { icon: BarChart3, title: 'Sınıf karnesi', text: 'Kim çalışıyor, hangi beceride geride; sınıf sınıf, haftalık olarak görün.' },
  ]
  return (
    <section id="kurumlar" className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="mb-2 font-extrabold uppercase tracking-widest text-sage-deep dark:text-sage">Okullar için</p>
          <h2 className="text-4xl leading-tight sm:text-5xl">Okulunuzun bütün İngilizcesi tek yerde</h2>
          <p className="mt-4 text-lg text-ink-soft">İlkokuldan liseye; LGS ve YDT hazırlığı, Defne ile konuşma pratiği ve dört beceri takibi, okulunuzun kendi paneliyle.</p>
          <div className="mt-8 space-y-4">
            {points.map((p) => (
              <div key={p.title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sage text-white"><p.icon className="size-5" /></span>
                <div><p className="font-display text-lg font-black">{p.title}</p><p className="text-ink-soft">{p.text}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/okullar" size="lg">Okullar için</LinkButton>
            <LinkButton to="/contact?konu=okul" size="lg" variant="secondary">Teklif alın</LinkButton>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-[32px] border-2 border-line bg-card shadow-soft">
            <div className="flex items-center justify-between border-b-2 border-line px-5 py-4">
              <div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">Öğretmen paneli</p><p className="font-display text-lg font-black">8-A sınıfı</p></div>
              <span className="rounded-full bg-mint/15 px-3 py-1 text-sm font-extrabold text-mint-deep">%90 katılım</span>
            </div>
            <div className="grid grid-cols-4 gap-3 border-b-2 border-line p-5">
              {SKILL_KEYS.map((k, i) => {
                const S = SKILL[k]
                return (
                  <div key={k}>
                    <p className="mb-1 flex items-center gap-1 text-xs font-bold"><S.icon className={clsx('size-3.5', S.text)} /> {S.label}</p>
                    <div className="h-2 overflow-hidden rounded-full bg-paper-2"><div className={clsx('h-full rounded-full', S.bg)} style={{ width: `${[82, 64, 47, 38][i]}%` }} /></div>
                  </div>
                )
              })}
            </div>
            {[['Öğrenci A', '76 XP', 5], ['Öğrenci B', '62 XP', 12], ['Öğrenci C', '41 XP', 3], ['Öğrenci D', 'davetli', 0]].map(([n, xp, st]) => (
              <div key={n as string} className="flex items-center gap-3 border-b-2 border-line px-5 py-3 last:border-b-0">
                <span className="grid size-9 place-items-center rounded-full bg-paper-2 font-display font-black">{(n as string).slice(-1)}</span>
                <span className="flex-1 font-bold">{n}</span>
                <span className="text-sm font-bold tabular-nums">{xp}</span>
                <span className="w-10 text-right text-sm tabular-nums text-ink-soft">{st ? `${st}g` : '-'}</span>
              </div>
            ))}
            <p className="bg-paper-2 px-5 py-2 text-center text-xs text-ink-soft">Örnek görünüm, isimler temsilidir.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
