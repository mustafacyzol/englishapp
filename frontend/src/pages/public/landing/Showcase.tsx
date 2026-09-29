import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, Check, Crown, Flame, Sparkles } from 'lucide-react'
import { rewardImg, img, PHOTO } from '@/lib/assets'
import { tl } from '@/lib/format'
import type { Plan } from '@/lib/types'
import { LinkButton } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { Defne } from '@/components/game/Defne'
import { higoImg, type HigoPose } from '@/components/game/Higo'
import { DefneMock, DuelMock, ExamMock, PathMock, Phone, SwipeMock } from './Mocks'

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Steps through `count` items on a timer while the section is on screen, pauses
 * on hover or focus, and restarts the timer when someone picks an item by hand.
 * Returns the index, a setter, and the 0-1 progress of the current item.
 */
function useAutoplay(count: number, ms: number, inView: boolean, pauseOnHover = false) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  const [p, setP] = useState(0)
  useEffect(() => {
    if (!inView || paused || reduced) return
    const start = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const k = Math.min(1, (now - start) / ms)
      setP(k)
      if (k >= 1) setI((x) => (x + 1) % count)
      else raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [i, inView, paused, reduced, ms, count, tick])
  const pick = (n: number) => {
    setI(n)
    setP(0)
    setTick((t) => t + 1)
  }
  // Hover no longer freezes the show unless asked: people read while it keeps moving.
  const bind = pauseOnHover ? { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false) } : {}
  return { i, pick, progress: reduced ? 0 : p, bind }
}

/* ------------------------------------------------------------------ hero */

/**
 * Hero for every age: a clear promise, two actions, who it is for, and the
 * product itself (a phone with the real path screen, three small moments from
 * the app, Higo peeking over the edge). Pointer movement adds gentle depth.
 */
const WORDS = [
  { t: 'Hello!', x: '-150%', y: -150, c: 'bg-sky text-white' },
  { t: 'Merhaba', x: '60%', y: -120, c: 'bg-butter text-[#1f2433]' },
  { t: 'Let’s talk', x: '-160%', y: 30, c: 'bg-card text-ink ring-1 ring-line' },
  { t: 'You got it!', x: '70%', y: 60, c: 'bg-mint text-white' },
]

export function HeroPro() {
  const reduced = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 70, damping: 18 })
  const sy = useSpring(my, { stiffness: 70, damping: 18 })
  const near = (d: number) => ({ x: useTransform(sx, (v) => v * d), y: useTransform(sy, (v) => v * d) }) // eslint-disable-line react-hooks/rules-of-hooks
  const a = near(0.6)
  const c = near(0.9)
  const ph = near(0.3)
  const move = (e: React.PointerEvent) => {
    if (reduced) return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 24)
    my.set(((e.clientY - r.top) / r.height - 0.5) * 18)
  }
  const who = [
    { k: 'Çocuk', a: 'braids' },
    { k: 'Genç', a: 'cap' },
    { k: 'Yetişkin', a: 'glasses' },
    { k: 'Sınav', a: 'ponytail' },
    { k: 'Kurum', a: 'afro' },
  ]
  return (
    <section onPointerMove={move} className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_34rem_at_85%_0%,color-mix(in_oklab,var(--color-flame)_10%,transparent),transparent_70%),radial-gradient(44rem_30rem_at_0%_100%,color-mix(in_oklab,var(--color-sky)_9%,transparent),transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(70%_60%_at_50%_30%,#000_10%,transparent_75%)]" />

      <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-16 pt-8 sm:gap-12 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.7, ease }} className="font-display text-[clamp(2.6rem,5.8vw,4.6rem)] font-black leading-[1.06] tracking-[-0.02em]">
            İngilizceyi her yaşta,{' '}
            <span className="bg-gradient-to-r from-flame via-[#ff7a3d] to-[#ffb020] bg-clip-text pb-1 text-transparent">kendi hızında</span> öğren.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6, ease }} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Kişisel ders planı, seninle konuşan yapay zekâ öğretmen ve günde birkaç dakikalık pratik. Çocuktan yetişkine, sınav hazırlığından iş İngilizcesine.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6, ease }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/register" size="lg" className="gap-2">Ücretsiz başla <ArrowRight className="size-5" /></LinkButton>
            <LinkButton to="/placement" size="lg" variant="secondary">Seviyemi bul · 3 dk</LinkButton>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-9 hidden sm:block">
            <p className="mb-2.5 text-xs font-black uppercase tracking-[0.16em] text-ink-soft">Kimin için?</p>
            <div className="flex flex-wrap gap-2">
              {who.map((w, i) => (
                <motion.a key={w.k} href="#kimler-icin" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + i * 0.05 }} className="group flex items-center gap-2 rounded-full border-2 border-line bg-card py-1 pl-1 pr-3.5 text-sm font-extrabold transition hover:border-ink/25">
                  <img src={img(`avatars/${w.a}.webp`)} alt="" className="size-7 rounded-full object-cover" />
                  {w.k}
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Higo bursting out of the phone (a short looping film), with the words he
            brings along flying out around him */}
        <div className="relative mx-auto aspect-[560/752] w-full max-w-[250px] sm:max-w-[340px] lg:max-w-[420px]">
          <motion.div aria-hidden className="absolute inset-[8%] rounded-full bg-gradient-to-br from-flame/20 via-butter/15 to-sky/20 blur-3xl" animate={reduced ? {} : { scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }} />
          <motion.div style={ph} initial={{ opacity: 0, y: 30, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease }} className="relative size-full overflow-hidden rounded-[36px] dark:bg-white dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)]">
            <video className="size-full object-cover mix-blend-multiply dark:mix-blend-normal" autoPlay muted loop playsInline preload="auto" poster={img('hero/higo-phone.webp')} aria-label="Higo telefondan fırlıyor">
              <source src={img('hero/higo-phone.webm')} type="video/webm" />
              <source src={img('hero/higo-phone.mp4')} type="video/mp4" />
            </video>
          </motion.div>

          {!reduced && WORDS.map((w, k) => (
            <motion.span
              key={w.t}
              aria-hidden
              className={clsx('absolute left-1/2 top-[42%] z-10 whitespace-nowrap rounded-2xl px-3 py-1.5 font-display text-sm font-black shadow-[0_12px_24px_-12px_rgba(31,36,51,.35)] sm:text-base', w.c)}
              initial={{ x: '-50%', y: 0, scale: 0.3, opacity: 0 }}
              animate={{ x: ['-50%', w.x], y: [0, w.y], scale: [0.3, 1, 1], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3.2, times: [0, 0.35, 1], repeat: Infinity, repeatDelay: 1.2, delay: 1.2 + k * 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {w.t}
            </motion.span>
          ))}

          <motion.div style={a} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, type: 'spring', stiffness: 140, damping: 16 }} className="absolute -left-6 bottom-[14%] z-20 hidden w-[200px] rounded-2xl bg-card p-3 shadow-[0_20px_40px_-18px_rgba(31,36,51,.35)] ring-1 ring-line sm:block lg:-left-20">
            <div className="mb-1.5 flex items-center gap-2"><Defne className="size-7" /><p className="text-sm font-black">Defne</p><span className="ml-auto rounded-full bg-mint/12 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-mint-deep">Düzeltme</span></div>
            <p className="text-sm"><s className="text-berry">I am agree</s> → <b className="text-mint-deep">I agree</b></p>
          </motion.div>
          <motion.div style={c} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, type: 'spring', stiffness: 140, damping: 16 }} className="absolute -right-4 top-[10%] z-20 flex items-center gap-2.5 rounded-2xl bg-[#141926] px-3.5 py-2.5 text-white shadow-[0_20px_40px_-18px_rgba(0,0,0,.5)] lg:-right-14">
            <Flame className="size-5 fill-flame text-flame" />
            <span><span className="block font-display text-base font-black leading-none">21 gün</span><span className="text-[11px] font-bold text-white/60">seri</span></span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- audiences */

const AUDIENCES = [
  { key: 'kid', tab: 'Çocuklar', age: '7-12 yaş', photo: img('photos/aud-kid.webp'), title: 'Oyun gibi, güvenli ve sade', points: ['Kısa cümleler, bol teşvik, çocuğa uygun konular', 'Yalnızca yaşıtlarıyla düello, reklam yok', 'Veli onaylı hesap ve günlük süre hedefi'], cta: 'Çocuğum için başla', to: '/register', tone: 'text-mint-deep bg-mint/12' },
  { key: 'teen', tab: 'Gençler', age: '13-17 yaş', photo: img('photos/aud-teen.webp'), title: 'Okul, dizi, müzik, oyun', points: ['İlgi alanına göre hikâyeler ve sohbetler', 'Arkadaşlarınla lig ve Gölge Düellosu', 'İsteğe bağlı YKS-YDT hazırlığı'], cta: 'Hemen başla', to: '/register', tone: 'text-sky bg-sky/12' },
  { key: 'adult', tab: 'Yetişkinler', age: '18 yaş ve üzeri', photo: PHOTO.hero, title: 'İş, seyahat, özgüven', points: ['Toplantı, mülakat ve seyahat senaryoları', 'Defne ile sesli konuşma provası', 'Günde 5-20 dakikalık esnek plan'], cta: 'Ücretsiz dene', to: '/register', tone: 'text-flame bg-flame/10' },
  { key: 'exam', tab: 'Sınava hazırlık', age: 'YDS · YÖKDİL · YDT · IELTS · TOEFL', photo: PHOTO.write, title: 'Gerçek formatta, Türkçe çözümle', points: ['Sınav formatında 5 seçenekli sorular', 'Her sorudan sonra neden doğru, neden yanlış', 'Zayıf bölüm önerisi ve sınav geri sayımı'], cta: 'Sınav hedefimi seç', to: '/register', tone: 'text-lilac bg-lilac/15' },
  { key: 'org', tab: 'Okul ve şirketler', age: 'Kurumsal', photo: PHOTO.classroom, title: 'Sınıfınız tek panelde', points: ['Kendi logonuzla kurum paneli', 'Sınıf karnesi, dört beceri raporu', 'E-posta ya da kodla toplu katılım'], cta: 'Kurumsal teklif alın', to: '/contact?konu=corporate', tone: 'text-sage-deep bg-sage/15' },
] as const

/**
 * "Who is it for": five audiences, one after another. Every photo sits in the
 * same frame, the next one crossfades in with a slow zoom, and the tabs show a
 * progress line. It plays by itself while on screen and stops on hover.
 */
export function AudiencesPro() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const { i, pick, progress, bind } = useAutoplay(AUDIENCES.length, 6500, inView)
  const cur = AUDIENCES[i]
  return (
    <section id="kimler-icin" ref={ref} className="mx-auto max-w-6xl px-5 py-20 md:py-28" {...bind}>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Kimin için?</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-black leading-[1.08] tracking-tight">Herkese aynı uygulama değil, herkese kendi uygulaması.</h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* tabs */}
        <div role="tablist" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {AUDIENCES.map((x, k) => {
            const on = k === i
            return (
              <button key={x.key} role="tab" aria-selected={on} onClick={() => pick(k)} className={clsx('relative shrink-0 overflow-hidden rounded-2xl border-2 px-4 py-3 text-left transition lg:py-4', on ? 'border-ink bg-card' : 'border-line bg-card/60 hover:border-ink/25')}>
                <span className="block font-display text-[15px] font-black lg:text-lg">{x.tab}</span>
                <span className="hidden text-xs font-bold text-ink-soft lg:block">{x.age}</span>
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-line/60">
                  <span className="block h-full bg-flame" style={{ width: on ? `${progress * 100}%` : k < i ? '100%' : '0%', opacity: k < i ? 0.25 : 1 }} />
                </span>
              </button>
            )
          })}
        </div>

        {/* stage */}
        <div className="grid overflow-hidden rounded-[32px] border-2 border-line bg-card md:grid-cols-[1.1fr_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden bg-paper-2 md:aspect-auto md:min-h-[420px]">
            <AnimatePresence initial={false}>
              <motion.div key={cur.key} className="absolute inset-0" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ opacity: { duration: 0.6 }, scale: { duration: 6.5, ease: 'linear' } }}>
                <Img src={cur.photo} alt="" className="size-full object-cover" />
              </motion.div>
            </AnimatePresence>
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
            <AnimatePresence mode="wait">
              <motion.span key={cur.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#1f2433]">{cur.age}</motion.span>
            </AnimatePresence>
          </div>
          <div className="relative flex min-h-[340px] flex-col justify-center p-6 sm:p-9">
            <AnimatePresence mode="wait">
              <motion.div key={cur.key} initial="hide" animate="show" exit="hide" variants={{ show: { transition: { staggerChildren: 0.06 } }, hide: {} }}>
                <motion.span variants={{ hide: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className={clsx('inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider', cur.tone)}>{cur.tab}</motion.span>
                <motion.h3 variants={{ hide: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="mt-4 font-display text-3xl font-black leading-tight">{cur.title}</motion.h3>
                <ul className="mt-5 space-y-3">
                  {cur.points.map((p) => (
                    <motion.li key={p} variants={{ hide: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} className="flex gap-3 text-[16px]">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-paper"><Check className="size-3.5" strokeWidth={3.5} /></span>{p}
                    </motion.li>
                  ))}
                </ul>
                <motion.div variants={{ hide: { opacity: 0 }, show: { opacity: 1 } }}>
                  <LinkButton to={cur.to} size="lg" className="mt-8 gap-2" variant="dark">{cur.cta} <ArrowRight className="size-5" /></LinkButton>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Meet Higo */

/** A day with Higo: five moments from morning to night, each a small real screen. */
const DAY: { time: string; pose: HigoPose; bg: string; ink: string; kicker: string; title: string; text: string; Scene: ComponentType }[] = [
  { time: '07:30', pose: 'wave', bg: '#fff1e2', ink: '#1f2433', kicker: 'Günaydın', title: 'Seni nazikçe hatırlatır', text: 'Seçtiğin saatte tek bir bildirim: “5 dakikan var mı?” Serin kopmaz, baskı hissetmezsin.', Scene: () => <Notif /> },
  { time: '08:10', pose: 'point', bg: '#e8f1ff', ink: '#1f2433', kicker: 'Yolda', title: 'Kısa ders, net hedef', text: 'Metroda iki durak: bir ders biter. Higo sıradaki durağı gösterir, kaybolmazsın.', Scene: () => <MiniLesson /> },
  { time: '12:40', pose: 'think', bg: '#f1ecff', ink: '#1f2433', kicker: 'Takıldığında', title: 'Birlikte düşünür', text: 'Yanlış yaptığında azar yok: Türkçe açıklama ve bir ipucu. Doğrusu bir dokunuş uzakta.', Scene: () => <Hint /> },
  { time: '19:00', pose: 'music', bg: '#e6f7ef', ink: '#1f2433', kicker: 'Akşam', title: 'Oyunla tekrar ettirir', text: 'Kelimle ve kelime avı: sıkılmadan tekrar, unutmadan önce tam zamanında.', Scene: () => <Tiles /> },
  { time: '21:30', pose: 'cheer', bg: '#1d2236', ink: '#ffffff', kicker: 'Gün sonu', title: 'Başarını kutlar', text: 'Günlük hedef tamam, seri bir gün daha uzadı, sandık seni bekliyor. Yarın görüşürüz!', Scene: () => <Win /> },
]

/**
 * Meet Higo as "a day with Higo". Scrolling down moves the day sideways: the sky
 * shifts from morning to night, the clock turns, and Higo walks from scene to
 * scene, changing pose. Each scene shows the real bit of the app that moment is
 * about. With reduced motion it becomes a simple list.
 */
export function MeetHigoPro() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [i, setI] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => setI(Math.max(0, Math.min(DAY.length - 1, Math.round(v * (DAY.length - 1))))))
  const bg = useTransform(scrollYProgress, DAY.map((_, k) => k / (DAY.length - 1)), DAY.map((d) => d.bg))
  const sun = useTransform(scrollYProgress, [0, 1], [-10, 190])
  const sunLeft = useTransform(sun, (v) => `${40 + v / 3.5}%`)
  const higoLeft = useTransform(scrollYProgress, [0, 1], ['6%', '78%'])
  const cur = DAY[i]
  const night = i === DAY.length - 1

  if (reduced)
    return (
      <section className="mx-auto max-w-6xl space-y-6 px-5 py-16" aria-label="Higo ile tanış">
        <h2 className="font-display text-[clamp(2rem,4.2vw,3.1rem)] font-black">Higo ile bir gün</h2>
        {DAY.map((d) => <div key={d.time} className="rounded-3xl border-2 border-line p-5"><p className="font-mono text-sm">{d.time}</p><p className="font-display text-xl font-black">{d.title}</p><p className="text-ink-soft">{d.text}</p></div>)}
      </section>
    )

  return (
    <section ref={ref} className="relative" style={{ height: `${DAY.length * 90}vh` }} aria-label="Higo ile tanış">
      <motion.div className="sticky top-0 flex h-dvh flex-col overflow-hidden" style={{ backgroundColor: bg }}>
        {/* sky: a sun (then moon) arcs across, the clock shows the time */}
        <motion.span aria-hidden className={clsx('absolute top-[34%] hidden size-14 sm:block rounded-full opacity-70 blur-[1px] transition-colors duration-700 sm:size-20', night ? 'bg-[#f3f0e6] shadow-[0_0_40px_rgba(255,255,255,.5)]' : 'bg-[#ffc233] shadow-[0_0_60px_rgba(255,194,51,.7)]')} style={{ left: sunLeft }} />
        {night && Array.from({ length: 18 }, (_, k) => <motion.span key={k} aria-hidden className="absolute size-1 rounded-full bg-white" style={{ left: `${(k * 37) % 100}%`, top: `${(k * 23) % 40}%` }} initial={{ opacity: 0 }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2 + (k % 3), delay: k * 0.1 }} />)}

        <div className="relative z-10 mx-auto flex w-full max-w-6xl items-start justify-between px-5 pt-20 sm:pt-24">
          <div style={{ color: cur.ink }} className="transition-colors duration-500">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Tanış: Higo</p>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,4vw,3rem)] font-black leading-[1.05] tracking-tight">Higo ile bir gün</h2>
          </div>
          <AnimatePresence mode="popLayout">
            <motion.p key={cur.time} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className={clsx('rounded-2xl px-3 py-1.5 font-mono text-2xl font-black tabular-nums sm:text-4xl', night ? 'bg-white/10 text-white' : 'bg-white/70 text-[#1f2433]')}>{cur.time}</motion.p>
          </AnimatePresence>
        </div>

        {/* the day slides sideways */}
        <motion.div className="relative z-10 flex flex-1" style={{ width: `${DAY.length * 100}%` }} animate={{ x: `-${(i * 100) / DAY.length}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }}>
          {DAY.map((d, k) => (
            <div key={d.time} className="flex w-full items-center" style={{ width: `${100 / DAY.length}%` }}>
              <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-5 pb-40 sm:pb-24 lg:grid-cols-2 lg:gap-16 lg:pb-10 [&_.max-w-sm]:lg:max-w-md">
                <div className="lg:order-2" style={{ color: d.ink }}>
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">{d.kicker}</p>
                  <h3 className="mt-2 font-display text-[clamp(1.6rem,3.2vw,2.6rem)] font-black leading-tight">{d.title}</h3>
                  <p className="mt-3 max-w-md text-[17px] leading-relaxed opacity-80">{d.text}</p>
                </div>
                <motion.div className="lg:order-1" animate={{ scale: k === i ? 1 : 0.9, opacity: k === i ? 1 : 0.4 }} transition={{ duration: 0.4 }}>
                  <d.Scene />
                </motion.div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Higo walks along the bottom, changing pose for each moment */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 sm:h-40">
          <span aria-hidden className={clsx('absolute inset-x-0 bottom-0 h-10 transition-colors duration-500', night ? 'bg-white/5' : 'bg-black/[0.04]')} />
          <motion.div className="absolute bottom-4 w-24 sm:w-32" style={{ left: higoLeft }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img key={cur.pose} src={higoImg(cur.pose)} alt="Higo" initial={{ y: 30, opacity: 0, rotate: -10 }} animate={{ y: [0, -10, 0], opacity: 1, rotate: 0 }} exit={{ y: 20, opacity: 0 }} transition={{ y: { duration: 0.6 }, default: { type: 'spring', stiffness: 260, damping: 16 } }} className="w-full drop-shadow-[0_16px_16px_rgba(160,40,10,.25)]" />
            </AnimatePresence>
          </motion.div>
          <div className="absolute bottom-3 right-5 flex gap-1.5 sm:right-10">
            {DAY.map((d, k) => <span key={d.time} className={clsx('h-1.5 rounded-full transition-all duration-300', k === i ? 'w-8 bg-flame' : night ? 'w-3 bg-white/30' : 'w-3 bg-black/15')} />)}
          </div>
        </div>
      </motion.div>
    </section>
  )
}

/* small scenes, each a real piece of the app */
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mx-auto w-full max-w-sm rounded-3xl bg-white p-5 text-[#1f2433] shadow-[0_30px_60px_-30px_rgba(31,36,51,.45)]', className)}>{children}</div>
}
function Notif() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <img src={higoImg('wave')} alt="" className="size-11" />
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#676d7c]">DilGO · şimdi</p><p className="font-extrabold">5 dakikan var mı? Serin 12. gününde!</p></div>
      </div>
      <div className="mt-3 flex gap-2"><span className="flex-1 rounded-xl bg-[#ff5a36] py-2 text-center text-sm font-extrabold text-white">Başla</span><span className="flex-1 rounded-xl bg-[#f3efe9] py-2 text-center text-sm font-extrabold">Sonra</span></div>
    </Card>
  )
}
function MiniLesson() {
  return (
    <Card>
      <p className="text-xs font-black uppercase tracking-widest text-[#2f7cf6]">Ders 3 · 2/6</p>
      <p className="mt-2 font-display text-xl font-black">“Otobüs durağı nerede?”</p>
      <div className="mt-3 flex flex-wrap gap-2">{['Where', 'is', 'the', 'bus stop', '?'].map((w, k) => <motion.span key={w} initial={{ y: 10, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: k * 0.12 }} className="rounded-xl border-2 border-[#e7e1d8] px-2.5 py-1 font-bold">{w}</motion.span>)}</div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f3efe9]"><motion.div className="h-full rounded-full bg-[#22b573]" initial={{ width: '10%' }} whileInView={{ width: '40%' }} transition={{ duration: 1.2 }} /></div>
    </Card>
  )
}
function Hint() {
  return (
    <Card>
      <p className="font-bold"><s className="text-[#e5484d]">She go to school.</s></p>
      <p className="mt-1 font-extrabold text-[#0f8a55]">She goes to school.</p>
      <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#f1ecff] p-3 text-sm"><img src={higoImg('think')} alt="" className="size-9" /><span><b>İpucu:</b> he, she, it ile fiile <b>-s</b> gelir.</span></div>
    </Card>
  )
}
function Tiles() {
  const rows = [['c', 'r', 'a', 'n', 'e'], ['h', 'o', 'u', 's', 'e']]
  return (
    <Card>
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#22b573]">Kelimle · ev</p>
      {rows.map((r, ri) => (
        <div key={ri} className="mb-1.5 flex justify-center gap-1.5">
          {r.map((c, ci) => <motion.span key={ci} initial={{ rotateX: 90 }} whileInView={{ rotateX: 0 }} transition={{ delay: ri * 0.5 + ci * 0.1 }} className={clsx('grid size-11 place-items-center rounded-lg font-display text-xl font-black uppercase text-white', ri === 1 ? 'bg-[#22b573]' : ['bg-[#9aa1b2]', 'bg-[#9aa1b2]', 'bg-[#9aa1b2]', 'bg-[#9aa1b2]', 'bg-[#22b573]'][ci])}>{c}</motion.span>)}
        </div>
      ))}
    </Card>
  )
}
function Win() {
  return (
    <Card className="text-center">
      <p className="font-display text-4xl font-black">+45 XP</p>
      <p className="text-sm font-bold text-[#676d7c]">Günlük hedef tamam · 12 gün seri</p>
      <div className="mt-3 flex justify-center gap-2">{['flame', 'gem', 'chest'].map((e, k) => <motion.span key={e} initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 0.2 + k * 0.15, type: 'spring' }} className="grid size-12 place-items-center rounded-2xl bg-[#fff4e6]"><img src={rewardImg(e)} alt="" className="size-8" /></motion.span>)}</div>
    </Card>
  )
}

/* ------------------------------------------------------- five strengths */

const STRENGTHS: { kicker: string; title: string; text: string; Mock: ComponentType; tint: string }[] = [
  { kicker: 'Alışkanlık', title: 'Her gün bir durak', text: 'Kısa derslerden oluşan bir yol haritası. Nerede kaldığını ve serinin kaç gündür sürdüğünü her an görürsün.', Mock: PathMock, tint: '#ff5a36' },
  { kicker: 'Kelime', title: 'Kaydır, ezberle, unutma', text: 'Sağa biliyorum, sola tekrar. Aralıklı tekrar, bilmediğin kelimeyi tam unutacağın gün geri getirir.', Mock: SwipeMock, tint: '#2f7cf6' },
  { kicker: 'Rekabet', title: '12 saniyelik düellolar', text: 'Rakibinin gölgesi seninle aynı soruları cevaplar. Hız bonusu, seri çarpanı ve haftalık ligler.', Mock: DuelMock, tint: '#8f7cf8' },
  { kicker: 'Konuşma', title: 'Seninle konuşan öğretmen', text: 'Defne ile sesli arama ve rol oyunları. Hataların Türkçe açıklanır, seviyene ve yaşına göre konuşur.', Mock: DefneMock, tint: '#22b573' },
  { kicker: 'Sınav', title: 'Hedefin sınavsa, sınav modu', text: 'YDS, YÖKDİL, YDT, IELTS ve TOEFL formatında sorular ve Türkçe çözümler. Yalnızca isteyenlere açılır.', Mock: ExamMock, tint: '#ffb020' },
]

/**
 * The five strengths as tabs beside one phone. The screen slides to the chosen
 * strength; it advances by itself while visible, with a progress line on the
 * active item, and any item can be picked directly.
 */
export function Strengths() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.2 })
  const { i, pick, progress, bind } = useAutoplay(STRENGTHS.length, 5000, inView)
  const cur = STRENGTHS[i]
  return (
    <section id="nasil" ref={ref} className="relative overflow-hidden py-20 md:py-28" {...bind}>
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Tek uygulama, beş güç</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-black leading-[1.08] tracking-tight">Öğrenmenin her parçası, tek bir düzende.</h2>
        </div>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center justify-center gap-2 lg:hidden">
            {STRENGTHS.map((x, k) => (
              <button key={x.title} onClick={() => pick(k)} aria-label={x.title} className="relative h-2 overflow-hidden rounded-full bg-line transition-all" style={{ width: k === i ? 44 : 14 }}>
                {k === i && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress * 100}%`, background: x.tint }} />}
                {k < i && <span className="absolute inset-0 rounded-full opacity-50" style={{ background: x.tint }} />}
              </button>
            ))}
          </div>
          <ol className="hidden space-y-2 lg:col-start-1 lg:block">
            {STRENGTHS.map((s, k) => {
              const on = k === i
              return (
                <li key={s.title}>
                  <button onClick={() => pick(k)} aria-current={on} className={clsx('relative w-full overflow-hidden rounded-2xl border-2 px-5 py-4 text-left transition', on ? 'border-ink bg-card shadow-[0_14px_30px_-18px_rgba(31,36,51,.4)]' : 'border-transparent hover:bg-paper-2')}>
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-xs font-bold text-ink-soft">0{k + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: on ? s.tint : undefined }}>{s.kicker}</span>
                        <span className={clsx('block font-display text-xl font-black leading-tight', !on && 'text-ink/70')}>{s.title}</span>
                      </span>
                    </span>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden pl-8 text-[15px] leading-relaxed text-ink-soft">
                          <span className="block pt-2">{s.text}</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {on && <span className="absolute inset-x-5 bottom-0 h-[3px] rounded bg-line/70"><span className="block h-full rounded" style={{ width: `${progress * 100}%`, background: s.tint }} /></span>}
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="relative mx-auto w-[270px] sm:w-[300px] lg:col-start-2">
            <motion.span aria-hidden className="absolute left-1/2 top-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" animate={{ backgroundColor: cur.tint, opacity: 0.18 }} transition={{ duration: 0.6 }} />
            <Phone>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={i} className="absolute inset-0" initial={{ y: '14%', opacity: 0, filter: 'blur(6px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ y: '-10%', opacity: 0, filter: 'blur(6px)' }} transition={{ duration: 0.5, ease }}>
                  <cur.Mock />
                </motion.div>
              </AnimatePresence>
            </Phone>
          </div>

          <div className="text-center lg:col-start-3 lg:text-left">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.35, ease }} className="mx-auto max-w-xs lg:mx-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] lg:hidden" style={{ color: cur.tint }}>{cur.kicker}</p>
                <p className="hidden font-display text-[5.5rem] font-black leading-none lg:block" style={{ color: cur.tint, opacity: 0.2 }}>0{i + 1}</p>
                <p className="font-display text-2xl font-black lg:-mt-6">{cur.title}</p>
                <p className="mt-2 text-ink-soft">{cur.text}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- pricing */

const FREE = ['Tüm ders yolu', 'Seçili hikâyeler', 'Kelime oyunları', 'Günde 10 Defne mesajı']

/**
 * Pricing, light and calm: a free column and the paid plans on the page itself.
 * Each paid plan shows what it costs per day (the honest way to compare), its
 * monthly equivalent and the saving; the featured one gets a glowing outline
 * and Higo on top.
 */
export function PricingPro({ plans, cta, embedded, title = 'Ücretsiz başla, hazır olunca yüksel.', sub = 'Temel her şey ücretsiz. Premium sınırları kaldırır, canlı ders ve daha fazla konuşma pratiği ekler.' }: { plans: Plan[]; cta?: (p: Plan) => ReactNode; embedded?: boolean; title?: string; sub?: string }) {
  const monthly = plans.find((p) => p.duration_days <= 31) ?? plans[0]
  const perMonth = (p: Plan) => Number(p.price) / Math.max(1, Math.round(p.duration_days / 30))
  const perDay = (p: Plan) => Number(p.price) / Math.max(1, p.duration_days)
  const saving = (p: Plan) => (monthly && p !== monthly ? Math.round((1 - perMonth(p) / Number(monthly.price)) * 100) : 0)
  const day = (n: number) => `₺${n.toFixed(n < 10 ? 1 : 0).replace('.', ',')}`
  return (
    <section id={embedded ? undefined : 'paketler'} className={clsx('relative', embedded ? 'py-4' : 'py-24')}>
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Paketler</p>
          <h2 className="mt-3 font-display text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.06] tracking-tight">{title}</h2>
          <p className="mt-4 text-lg text-ink-soft">{sub}</p>
        </div>

        <div className={clsx('grid items-stretch gap-5 md:grid-cols-2', embedded ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
          {!embedded && <PriceCard name="Ücretsiz" tagline="Her zaman" price="₺0" note="Kredi kartı gerekmez" features={FREE} cta={<LinkButton to="/register" block variant="secondary">Ücretsiz başla</LinkButton>} />}
          {plans.map((p) => (
            <PriceCard
              key={p.id}
              featured={p.is_featured}
              name={p.name}
              tagline={p.tagline ?? ''}
              price={tl(p.price)}
              was={p.compare_at_price ? tl(p.compare_at_price) : undefined}
              daily={day(perDay(p))}
              note={p !== monthly ? `ayda ${tl(String(Math.round(perMonth(p))))}` : 'otomatik yenilenmez'}
              badge={p.is_featured ? 'En popüler' : saving(p) > 0 ? `%${saving(p)} tasarruf` : undefined}
              features={p.features ?? []}
              cta={cta ? cta(p) : <LinkButton to="/register" block variant={p.is_featured ? 'primary' : 'dark'}>{p.is_featured ? 'Premium’a başla' : 'Seç'}</LinkButton>}
            />
          ))}
        </div>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-ink-soft">
          {(embedded ? ['Otomatik yenileme yok', 'Güvenli ödeme', 'Tek seferlik ödeme'] : ['Otomatik yenileme yok', 'İstediğin an iptal', 'Kurumlara özel fiyat']).map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-mint-deep" strokeWidth={3} />{t}</li>)}
        </ul>
      </div>
    </section>
  )
}

function PriceCard({ name, tagline, price, was, note, badge, features, cta, featured, daily }: { name: string; tagline: string; price: string; was?: string; note: string; badge?: string; features: string[]; cta: ReactNode; featured?: boolean; daily?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, ease }} className={clsx('relative rounded-[28px] p-[2px]', featured ? 'bg-[conic-gradient(from_var(--a),#ff5a36,#ffc233,#ff8a3d,#ff5a36)] shadow-[0_30px_70px_-30px_rgba(255,90,54,.55)] [animation:spin-border_6s_linear_infinite] lg:-my-3' : 'bg-line')}>
      {featured && <img src={higoImg('thumbs')} alt="" className="absolute -right-3 -top-12 z-10 w-20 drop-shadow-[0_10px_12px_rgba(160,40,10,.25)]" />}
      <div className="flex h-full flex-col rounded-[26px] bg-card p-6">
        <div className="flex items-center gap-2">
          <p className="font-display text-xl font-black">{name}</p>
          {featured && <Crown className="size-4 text-butter-deep" />}
        </div>
        <p className="text-sm text-ink-soft">{tagline}</p>
        <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
          {badge && <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider', featured ? 'bg-flame text-white' : 'bg-mint/15 text-mint-deep')}>{badge}</span>}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <p className="font-display text-5xl font-black leading-none tracking-tight">{price}</p>
          {was && <p className="pb-1 text-sm font-bold text-ink-soft line-through">{was}</p>}
        </div>
        <p className="mt-1.5 text-sm font-bold text-ink-soft">{note}</p>
        {daily && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-paper-2 px-3 py-2 text-sm">
            <span className="font-display text-lg font-black text-flame">{daily}</span>
            <span className="font-semibold text-ink-soft">günlük maliyet</span>
          </p>
        )}
        <ul className="mt-5 flex-1 space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex gap-2.5 text-[14px]"><span className={clsx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', featured ? 'bg-flame text-white' : 'bg-paper-2 text-ink')}>{featured ? <Sparkles className="size-3" /> : <Check className="size-3" strokeWidth={3.5} />}</span>{f}</li>
          ))}
        </ul>
        <div className="mt-7">{cta}</div>
      </div>
    </motion.div>
  )
}
