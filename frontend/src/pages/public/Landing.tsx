import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Check, Quote, Star } from 'lucide-react'
import { get } from '@/lib/api'
import { tl } from '@/lib/format'
import type { Plan } from '@/lib/types'
import { PHOTO, rewardImg, leagueImg, storyImg } from '@/lib/assets'
import { LinkButton } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { Reveal } from '@/components/motion/Page'
import { Ada } from '@/components/game/Ada'

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
      <Hero />
      <Ticker reviews={reviews} />
      <SkillSwitcher />
      <MeetAda />
      <RewardTrack />
      <Reviews reviews={reviews} />
      <School />
      <Pricing plans={data?.plans} />
      <Faq />
      <FinalCta />
    </>
  )
}

/* ------------------------------------------------------------------ hero */

const HERO_WORDS = [
  { w: 'Oku.', c: 'text-butter-deep' },
  { w: 'Dinle.', c: 'text-sky' },
  { w: 'Konuş.', c: 'text-flame' },
  { w: 'Yaz.', c: 'text-mint-deep' },
]

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 70])
  const yChip = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -40])

  return (
    <section ref={ref} className="relative overflow-hidden">
      <span className="glow left-[-10%] top-[-12%] size-[420px] bg-flame/25" />
      <span className="glow right-[-8%] top-[18%] size-[380px] bg-sky/20" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-20">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-mint/30 bg-mint/10 px-3.5 py-1.5 text-sm font-extrabold text-mint-deep"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-mint" />
            </span>
            Bayrak Dil Okulları güvencesiyle
          </motion.p>

          <h1 className="font-display text-[clamp(2.8rem,7.5vw,5rem)] font-black leading-[0.98] tracking-tight">
            {HERO_WORDS.map((x, i) => (
              <motion.span
                key={x.w}
                initial={reduced ? false : { opacity: 0, y: 26, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.08 + i * 0.09, type: 'spring', stiffness: 220, damping: 18 }}
                className={clsx('mr-3 inline-block', x.c)}
              >
                {x.w}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft"
          >
            Dört beceri tek uygulamada. Seviyene göre hikâyeler, 5 dakikalık dersler ve seni tanıyan yapay zekâ öğretmenin&nbsp;Ada.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/register" size="lg">Ücretsiz başla</LinkButton>
            <LinkButton to="/placement" size="lg" variant="secondary">Seviyemi bul</LinkButton>
          </motion.div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-ink-soft">
            {['Kredi kartı gerekmez', 'Günde 5 dakika yeter', 'Web, iOS ve Android'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-mint" strokeWidth={3} /> {t}</li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <motion.div
            style={{ y }}
            initial={reduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/3.5] overflow-hidden rounded-[36px] shadow-soft"
          >
            <Img src={PHOTO.hero} alt="Telefonundan İngilizce çalışan genç bir kadın" className="photo" priority />
          </motion.div>

          <motion.div
            style={{ y: yChip }}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 160, damping: 16 }}
            className="absolute -left-2 bottom-10 flex items-center gap-3 rounded-2xl bg-card p-3 pr-5 shadow-soft ring-1 ring-line sm:-left-8"
          >
            <Img src={rewardImg('flame')} alt="" className="size-12 animate-float object-contain" priority />
            <div>
              <p className="font-display text-2xl font-black leading-none">47 gün</p>
              <p className="text-xs font-bold text-ink-soft">kesintisiz seri</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, type: 'spring', stiffness: 160, damping: 16 }}
            className="absolute -right-1 top-8 max-w-[264px] rounded-2xl bg-card p-3.5 shadow-soft ring-1 ring-line sm:-right-7"
          >
            <div className="mb-2 flex items-center gap-2">
              <Ada className="size-8" />
              <p className="text-sm font-black">Ada</p>
              <span className="ml-auto text-[10px] font-extrabold uppercase tracking-wider text-mint-deep">düzeltti</span>
            </div>
            <p className="text-sm"><s className="text-berry">I am agree</s> → <b className="text-mint-deep">I agree</b></p>
            <p className="mt-1 text-xs leading-snug text-ink-soft">"agree" zaten bir fiil, yanına "am" gelmez.</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

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

const SKILLS = [
  { key: 'read', title: 'Oku', photo: PHOTO.read, accent: 'butter', line: 'Seviyene uygun kısa hikâyeler.', text: 'Bilmediğin kelimeye dokun; anlamını gör, sesini dinle, kelime defterine ekle. Her hikâyenin sonunda kısa bir anlama testi var.' },
  { key: 'listen', title: 'Dinle', photo: PHOTO.listen, accent: 'sky', line: 'Her cümle doğal sesle okunur.', text: 'Hızı yavaşlat, kelime kelime takip et, dinleyerek yaz. Kulağın İngilizceye gerçek cümlelerle alışır.' },
  { key: 'speak', title: 'Konuş', photo: PHOTO.speak, accent: 'flame', line: 'Mikrofona konuş, anında düzelt.', text: 'Kafede sipariş ver, havalimanında check-in yap, mülakata gir. Ada rolü üstlenir, telaffuzunu ve cümleni anında kontrol eder.' },
  { key: 'write', title: 'Yaz', photo: PHOTO.write, accent: 'mint', line: 'Yazdığın metin puanlanır.', text: 'Yazma atölyesi seviyeni tahmin eder, hatalarını Türkçe açıklar ve düzeltilmiş metni yan yana gösterir.' },
] as const

const ACCENT: Record<string, { text: string; bg: string; bar: string; ring: string }> = {
  butter: { text: 'text-butter-deep', bg: 'bg-butter/12', bar: 'bg-butter', ring: 'ring-butter/40' },
  sky: { text: 'text-sky', bg: 'bg-sky/10', bar: 'bg-sky', ring: 'ring-sky/40' },
  flame: { text: 'text-flame', bg: 'bg-flame/10', bar: 'bg-flame', ring: 'ring-flame/40' },
  mint: { text: 'text-mint-deep', bg: 'bg-mint/10', bar: 'bg-mint', ring: 'ring-mint/40' },
}

function SkillSwitcher() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduced = useReducedMotion()

  useEffect(() => {
    if (paused || !inView || reduced) return
    const t = setTimeout(() => setActive((a) => (a + 1) % SKILLS.length), 5200)
    return () => clearTimeout(t)
  }, [active, paused, inView, reduced])

  const s = SKILLS[active]

  return (
    <section id="beceriler" ref={ref} className="mx-auto max-w-6xl px-5 py-24" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Reveal className="mb-12 max-w-xl">
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Dört beceri</p>
        <h2 className="text-4xl leading-tight sm:text-5xl">Ezber değil, kullanım.</h2>
        <p className="mt-4 text-lg text-ink-soft">Bir dili bilmek dört şeyi birden yapabilmektir. DilGO dördünü de aynı derste çalıştırır.</p>
      </Reveal>

      <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
        <ul className="flex flex-col gap-3">
          {SKILLS.map((x, i) => {
            const on = i === active
            const ac = ACCENT[x.accent]
            return (
              <li key={x.key}>
                <button
                  onClick={() => setActive(i)}
                  aria-current={on}
                  className={clsx(
                    'relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition',
                    on ? clsx('border-transparent ring-2', ac.bg, ac.ring) : 'border-line bg-card hover:bg-paper-2',
                  )}
                >
                  <div className="flex items-baseline gap-3">
                    <span className={clsx('font-display text-2xl font-black', on ? ac.text : 'text-ink')}>{x.title}</span>
                    <span className="text-sm font-bold text-ink-soft">{x.line}</span>
                  </div>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden text-[15px] leading-relaxed text-ink-soft"
                      >
                        <span className="mt-2 block">{x.text}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                  {on && !reduced && (
                    <motion.span
                      key={active}
                      className={clsx('absolute inset-x-0 bottom-0 h-1', ac.bar)}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: paused ? 0.25 : 1 }}
                      transition={{ duration: paused ? 0.3 : 5.2, ease: 'linear' }}
                      style={{ transformOrigin: 'left' }}
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="relative min-h-[380px] overflow-hidden rounded-[32px] bg-paper-2 lg:min-h-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={s.key}
              initial={reduced ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Img src={s.photo} alt={s.title} className="photo" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute inset-x-6 bottom-5 font-display text-2xl font-black text-white">{s.line}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- Ada */

const CHAT: { role: 'ada' | 'me'; text: string; note?: string; fix?: [string, string] }[] = [
  { role: 'ada', text: "Hi! Welcome to Bean & Leaf. What can I get for you?" },
  { role: 'me', text: 'I want a latte and one cake please' },
  { role: 'ada', text: "Sure — a latte and a slice of cake. For here or to take away?", fix: ['I want a latte and one cake', "I'd like a latte and a slice of cake"], note: 'Siparişte "I\'d like" daha kibar; kek dilimle istenir.' },
]

function MeetAda() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4, once: true })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!inView || step >= CHAT.length) return
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 350 : 1250)
    return () => clearTimeout(t)
  }, [inView, step])

  return (
    <section id="ada" className="relative overflow-hidden bg-sky/6 py-24">
      <span className="glow left-1/3 top-0 size-[420px] bg-sky/20" />
      <div ref={ref} className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
        <Reveal>
          <p className="mb-2 font-extrabold uppercase tracking-widest text-sky">Yapay zekâ öğretmenin</p>
          <h2 className="text-4xl leading-tight sm:text-5xl">Ada seni tanıyor.</h2>
          <ul className="mt-8 space-y-4 text-lg">
            {[
              'Seviyeni, hedefini ve kaydettiğin kelimeleri bilir.',
              'Tek bir önemli hatanı seçer, Türkçe açıklar.',
              'Kafe, havalimanı, doktor, mülakat, IELTS: gerçek sahneler.',
              'Yazılı ya da sesli. Gece yarısı bile hazır.',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-sky text-white"><Check className="size-4" strokeWidth={3} /></span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <LinkButton to="/register" className="mt-9" size="lg">Ada ile konuşmaya başla</LinkButton>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative overflow-hidden rounded-[32px] bg-card p-5 shadow-soft ring-1 ring-line">
            <div className="mb-4 flex items-center gap-3 border-b-2 border-line pb-4">
              <Ada className="size-11" online />
              <div>
                <p className="font-display text-lg font-black leading-tight">Ada</p>
                <p className="text-xs font-bold text-mint-deep">Kafede sipariş · rol yapma</p>
              </div>
            </div>
            <div className="flex min-h-[290px] flex-col gap-3">
              {CHAT.slice(0, step).map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  className={clsx('max-w-[86%]', m.role === 'me' && 'self-end')}
                >
                  <p className={clsx('rounded-2xl px-4 py-2.5 text-[15px]', m.role === 'me' ? 'bg-sky text-white' : 'bg-paper-2')}>{m.text}</p>
                  {m.fix && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ delay: 0.45 }} className="mt-2 overflow-hidden rounded-2xl bg-mint/12 p-3">
                      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-mint-deep">Küçük düzeltme</p>
                      <p className="text-sm"><s className="text-berry">{m.fix[0]}</s> → <b className="text-mint-deep">{m.fix[1]}</b></p>
                      <p className="mt-1 text-xs text-ink-soft">{m.note}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
              {step < CHAT.length && (
                <div className="flex gap-1.5 self-start rounded-2xl bg-paper-2 px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="size-2 rounded-full bg-ink-soft/60" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.13 }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- reward track */

const TRACK = [
  { day: '3. gün', label: '30 elmas', icon: 'gems' },
  { day: '7. gün', label: 'Seri dondurucu', icon: 'freeze' },
  { day: '14. gün', label: '2x XP takviyesi', icon: 'boost' },
  { day: '30. gün', label: '3 gün Premium', icon: 'crown' },
  { day: '50. gün', label: 'Gizemli sandık', icon: 'chest' },
  { day: '100. gün', label: 'Canlı ders kuponu', icon: 'voucher' },
]

function RewardTrack() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.25, once: true })
  return (
    <section id="oduller" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mb-14 max-w-xl">
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Oyun gibi</p>
        <h2 className="text-4xl leading-tight sm:text-5xl">Her gün dönmek için bir sebep.</h2>
        <p className="mt-4 text-lg text-ink-soft">Serin büyüdükçe kasana gerçek ödüller düşer. Sonunda okulumuzdaki canlı derse kadar gider.</p>
      </Reveal>

      <div ref={ref} className="relative">
        <div className="absolute left-0 right-0 top-[58px] hidden h-1 rounded-full bg-line md:block">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-butter via-flame to-berry" initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}} transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }} style={{ transformOrigin: 'left' }} />
        </div>
        <ol className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-6">
          {TRACK.map((t, i) => (
            <motion.li
              key={t.day}
              initial={{ opacity: 0, y: 26 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 180, damping: 18 }}
              className="flex flex-col items-center text-center"
            >
              <Img src={rewardImg(t.icon)} alt="" className="size-[72px] object-contain drop-shadow-md" />
              <span className="mt-2 grid size-5 place-items-center rounded-full bg-card ring-4 ring-paper">
                <span className="size-2.5 rounded-full bg-flame" />
              </span>
              <p className="mt-3 font-display text-lg font-black">{t.day}</p>
              <p className="text-sm font-semibold text-ink-soft">{t.label}</p>
            </motion.li>
          ))}
        </ol>
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-3">
        {[
          { img: leagueImg(4), title: '10 lig', text: "Bronz'dan Elmas'a. Her hafta 30 kişilik grupta yarış; ilk 7 terfi eder." },
          { img: rewardImg('trophy'), title: '38 rozet', text: 'Okudukça, konuştukça, yazdıkça yeni madalyalar açılır. Gizli olanlar da var.' },
          { img: rewardImg('voucher'), title: 'Gerçek ödül', text: 'Canlı ders kuponunu Bayrak Dil Okulları’nda gerçek öğretmenle kullanırsın.' },
        ].map((c, i) => (
          <Reveal key={c.title} delay={i * 0.07}>
            <div className="group flex h-full items-start gap-4 rounded-3xl border-2 border-line bg-card p-6 transition duration-300 hover:-translate-y-1 hover:border-flame/30 hover:shadow-soft">
              <Img src={c.img} alt="" className="size-16 shrink-0 object-contain transition duration-300 group-hover:scale-110" />
              <div>
                <h3 className="text-xl">{c.title}</h3>
                <p className="mt-1 text-ink-soft">{c.text}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- reviews */

function Reviews({ reviews }: { reviews: Review[] }) {
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)
  const n = reviews.length

  const go = useCallback((d: number) => {
    setDir(d)
    setI((x) => (x + d + n) % Math.max(1, n))
  }, [n])

  useEffect(() => {
    if (paused || n < 2) return
    const t = setTimeout(() => go(1), 6500)
    return () => clearTimeout(t)
  }, [i, paused, n, go])

  if (!n) return null
  const r = reviews[i]

  return (
    <section id="yorumlar" className="relative overflow-hidden bg-paper py-24">
      <span className="glow right-[-6%] top-10 size-[360px] bg-berry/18" />
      <div className="relative mx-auto max-w-5xl px-5">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-lg">
            <p className="mb-2 font-extrabold uppercase tracking-widest text-berry">Öğrencilerimiz</p>
            <h2 className="text-4xl leading-tight sm:text-5xl">Ne değişti?</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => go(-1)} aria-label="Önceki yorum" className="press grid size-12 place-items-center rounded-2xl border-2 border-line bg-card hover:bg-paper-2"><ArrowLeft className="size-5" /></button>
            <button onClick={() => go(1)} aria-label="Sonraki yorum" className="press grid size-12 place-items-center rounded-2xl border-2 border-line bg-card hover:bg-paper-2"><ArrowRight className="size-5" /></button>
          </div>
        </Reveal>

        <div
          className="relative min-h-[320px] sm:min-h-[280px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.figure
              key={r.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -48 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 70 && go(info.offset.x < 0 ? 1 : -1)}
              className="absolute inset-0 cursor-grab rounded-[32px] border-2 border-line bg-card p-8 shadow-soft active:cursor-grabbing sm:p-10"
            >
              <Quote className="mb-4 size-9 text-flame/30" />
              <blockquote className="font-display text-xl font-extrabold leading-snug sm:text-2xl">“{r.quote}”</blockquote>
              <figcaption className="mt-7 flex flex-wrap items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky font-display text-xl font-black text-white">{r.name[0]}</span>
                <span className="min-w-0">
                  <span className="block font-extrabold">{r.name}</span>
                  <span className="block text-sm text-ink-soft">{r.role}</span>
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {r.cefr_level && <span className="ink-chip py-0.5 text-xs">{r.cefr_level} seviye</span>}
                  {!!r.streak && (
                    <span className="ink-chip py-0.5 text-xs">
                      <Img src={rewardImg('flame')} alt="" className="size-4" /> {r.streak} gün seri
                    </span>
                  )}
                  <span className="flex gap-0.5">
                    {[...Array(r.rating)].map((_, k) => <Star key={k} className="size-4 fill-butter text-butter" />)}
                  </span>
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {reviews.map((x, k) => (
            <button
              key={x.id}
              onClick={() => { setDir(k > i ? 1 : -1); setI(k) }}
              aria-label={`${k + 1}. yorum`}
              className={clsx('h-2 rounded-full transition-all', k === i ? 'w-7 bg-flame' : 'w-2 bg-line hover:bg-ink-soft/40')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- school */

function School() {
  return (
    <section className="px-5 py-14">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px]">
        <Img src={PHOTO.classroom} alt="Bayrak Dil Okulları sınıfı" className="h-[520px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center p-8 text-white sm:p-14">
          <p className="mb-3 font-extrabold uppercase tracking-widest text-butter">Arkasında gerçek bir okul var</p>
          <h2 className="text-4xl leading-tight sm:text-5xl">Uygulamada çalış, sınıfta konuş.</h2>
          <p className="mt-5 text-lg text-white/85">DilGO, Bayrak Dil Okulları öğretmenlerinin hazırladığı müfredatla çalışır. Kasandaki canlı ders kuponlarıyla gerçek öğretmenlerimizle pratik yaparsın.</p>
          <Link to="/about" className="mt-7 inline-flex items-center gap-2 font-extrabold text-butter hover:underline">Okulumuzu tanı <ArrowRight className="size-5" /></Link>
        </div>
      </Reveal>
    </section>
  )
}

/* --------------------------------------------------------------- pricing */

const FALLBACK_PLANS: Plan[] = [
  { id: 1, slug: 'monthly', name: 'Aylık', tagline: 'Esnek başla', interval: 'month', duration_days: 30, price: '149', compare_at_price: null, currency: 'TRY', features: ['Sınırsız can', 'Tüm hikayeler ve sesli okumalar', 'Günde 200 AI mesajı'], badge: null, bonus_gems: 0, live_lesson_credits: 0, is_featured: false },
  { id: 2, slug: 'quarterly', name: '3 Aylık', tagline: 'Alışkanlık kur', interval: 'quarter', duration_days: 90, price: '349', compare_at_price: '447', currency: 'TRY', features: ['Aylık paketin tüm özellikleri', '500 bonus elmas', '1 canlı ders kuponu'], badge: 'En popüler', bonus_gems: 500, live_lesson_credits: 1, is_featured: true },
  { id: 3, slug: 'yearly', name: 'Yıllık', tagline: 'Akıcılığa kadar', interval: 'year', duration_days: 365, price: '999', compare_at_price: '1788', currency: 'TRY', features: ['Tüm Premium özellikler', '4 canlı ders kuponu', 'CEFR seviye sertifikası'], badge: '%44 tasarruf', bonus_gems: 2000, live_lesson_credits: 4, is_featured: false },
]

export function PlanCards({ plans, cta }: { plans: Plan[]; cta: (p: Plan) => React.ReactNode }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.id}
          className={clsx(
            'relative flex flex-col rounded-3xl border-2 bg-card p-7 transition duration-300',
            p.is_featured ? 'border-flame shadow-soft md:-my-3 md:py-10' : 'border-line hover:-translate-y-1 hover:shadow-soft',
          )}
        >
          {p.badge && <span className={clsx('absolute -top-3.5 left-7 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white', p.is_featured ? 'bg-flame' : 'bg-mint')}>{p.badge}</span>}
          <p className="font-display text-2xl font-black">{p.name}</p>
          <p className="text-ink-soft">{p.tagline}</p>
          <div className="my-6 flex items-end gap-2">
            <span className="font-display text-5xl font-black leading-none">{tl(p.price)}</span>
            {p.compare_at_price && <s className="mb-1 font-bold text-ink-soft">{tl(p.compare_at_price)}</s>}
          </div>
          <ul className="mb-7 flex-1 space-y-3">
            {(p.features ?? []).map((f) => (
              <li key={f} className="flex gap-2.5 font-semibold"><Check className="mt-0.5 size-5 shrink-0 text-mint" strokeWidth={3} /> {f}</li>
            ))}
          </ul>
          {cta(p)}
        </div>
      ))}
    </div>
  )
}

function Pricing({ plans }: { plans?: Plan[] }) {
  return (
    <section id="paketler" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mb-14 text-center">
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Paketler</p>
        <h2 className="text-4xl sm:text-5xl">Ücretsiz başla.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">Ders yolu, seçili hikâyeler ve günde 10 AI mesajı her zaman ücretsiz. Premium sınırları kaldırır.</p>
      </Reveal>
      <Reveal><PlanCards plans={plans?.length ? plans : FALLBACK_PLANS} cta={(p) => <LinkButton to="/register" variant={p.is_featured ? 'primary' : 'secondary'} block>Başla</LinkButton>} /></Reveal>
      <p className="mt-8 text-center text-sm font-semibold text-ink-soft">iyzico güvencesiyle 3D Secure ödeme · Otomatik yenileme yok</p>
    </section>
  )
}

/* ------------------------------------------------------------------- faq */

const QS: [string, string][] = [
  ['Gerçekten ücretsiz mi?', 'Evet. Tüm ders yolu, seçili hikâyeler, kelime tekrarları ve günde 10 AI mesajı ücretsizdir. Premium; sınırsız can, tüm hikâyeler, daha fazla AI pratiği ve canlı ders kuponları ekler.'],
  ['Seviyemi bilmiyorum, nereden başlamalıyım?', '3 dakikalık seviye testiyle seviyeni bul; ders yolun otomatik olarak sana göre ayarlanır. İstersen sonradan Ayarlar’dan değiştirebilirsin.'],
  ['Canlı ders kuponu nasıl çalışır?', 'Kuponu Ödüller sayfasında açtığında sana özel bir kod oluşur. Bu kodla Bayrak Dil Okulları’nda online ya da şubede ücretsiz ders alırsın.'],
  ['Telefonumda kullanabilir miyim?', 'Evet. DilGO tarayıcıda çalışır; iOS ve Android uygulamaları da aynı hesabı kullanır. İlerlemen her cihazda aynıdır.'],
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

function FinalCta() {
  return (
    <section className="px-5 pb-24">
      <Reveal className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 overflow-hidden rounded-[36px] bg-flame px-6 py-16 text-center text-white md:flex-row md:text-left">
        <span className="glow left-1/4 top-0 size-[320px] bg-white/25" />
        <div className="relative flex -space-x-6">
          {['the-cat-who-loved-tea', 'mias-first-day-in-london', 'the-red-umbrella'].map((s, i) => (
            <motion.div key={s} initial={{ opacity: 0, y: 20, rotate: -6 }} whileInView={{ opacity: 1, y: i % 2 ? 12 : 0, rotate: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, type: 'spring', stiffness: 160, damping: 16 }}>
              <Img src={storyImg(s)} alt="" className="size-28 rounded-3xl border-4 border-flame object-cover" />
            </motion.div>
          ))}
        </div>
        <div className="relative flex-1">
          <h2 className="text-4xl">İlk hikâyen seni bekliyor.</h2>
          <p className="mt-2 text-lg text-white/85">Hesap oluşturmak 1 dakika. Kredi kartı gerekmez.</p>
        </div>
        <Link to="/register" className="press relative rounded-2xl bg-white px-8 py-4 text-lg font-black uppercase tracking-wide text-flame shadow-[0_4px_0_0_rgba(0,0,0,0.2)]">Hemen başla</Link>
      </Reveal>
    </section>
  )
}
