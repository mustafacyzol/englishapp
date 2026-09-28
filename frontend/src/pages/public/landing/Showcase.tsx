import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, Check, Crown, Flame, GraduationCap, Sparkles } from 'lucide-react'
import { img, PHOTO } from '@/lib/assets'
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
function useAutoplay(count: number, ms: number, inView: boolean) {
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
  const bind = { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false), onFocusCapture: () => setPaused(true), onBlurCapture: () => setPaused(false) }
  return { i, pick, progress: reduced ? 0 : p, bind }
}

/* ------------------------------------------------------------------ hero */

/**
 * Hero for every age: a clear promise, two actions, who it is for, and the
 * product itself (a phone with the real path screen, three small moments from
 * the app, Higo peeking over the edge). Pointer movement adds gentle depth.
 */
export function HeroPro() {
  const reduced = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 70, damping: 18 })
  const sy = useSpring(my, { stiffness: 70, damping: 18 })
  const near = (d: number) => ({ x: useTransform(sx, (v) => v * d), y: useTransform(sy, (v) => v * d) }) // eslint-disable-line react-hooks/rules-of-hooks
  const a = near(0.6)
  const b = near(1.2)
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
    { k: 'Yetişkin', a: 'beard' },
    { k: 'Sınav', a: 'ponytail' },
    { k: 'Kurum', a: 'granny' },
  ]
  return (
    <section onPointerMove={move} className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_34rem_at_85%_0%,color-mix(in_oklab,var(--color-flame)_10%,transparent),transparent_70%),radial-gradient(44rem_30rem_at_0%_100%,color-mix(in_oklab,var(--color-sky)_9%,transparent),transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(70%_60%_at_50%_30%,#000_10%,transparent_75%)]" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
        <div>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="text-[13px] font-black uppercase tracking-[0.18em] text-flame">
            Bayrak Dil Okulları · Dijital İngilizce
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.7, ease }} className="mt-4 font-display text-[clamp(2.6rem,5.8vw,4.6rem)] font-black leading-[1.06] tracking-[-0.02em]">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-9">
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

        {/* product composition */}
        <div className="relative mx-auto h-[520px] w-full max-w-[520px] sm:h-[560px]">
          <motion.div aria-hidden className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-flame/15 via-butter/10 to-sky/15 blur-2xl" />
          <motion.div style={ph} initial={{ opacity: 0, y: 40, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: -4 }} transition={{ duration: 0.9, ease }} className="absolute left-1/2 top-1/2 w-[250px] -translate-x-1/2 -translate-y-1/2 sm:w-[270px]">
            <Phone><PathMock /></Phone>
            <motion.img src={higoImg('wave')} alt="Higo" initial={{ opacity: 0, y: 30, rotate: 12 }} animate={{ opacity: 1, y: 0, rotate: 8 }} transition={{ delay: 0.9, type: 'spring', stiffness: 160, damping: 12 }} className="absolute -right-16 -top-14 w-28 drop-shadow-[0_16px_18px_rgba(200,60,20,.25)] sm:-right-20 sm:w-32" />
          </motion.div>

          <motion.div style={a} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55, type: 'spring', stiffness: 140, damping: 16 }} className="absolute -left-2 top-[16%] w-[210px] sm:-left-6 rounded-2xl bg-card p-3 shadow-[0_20px_40px_-18px_rgba(31,36,51,.35)] ring-1 ring-line">
            <div className="mb-1.5 flex items-center gap-2"><Defne className="size-7" /><p className="text-sm font-black">Defne</p><span className="ml-auto rounded-full bg-mint/12 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-mint-deep">Düzeltme</span></div>
            <p className="text-sm"><s className="text-berry">I am agree</s> → <b className="text-mint-deep">I agree</b></p>
            <p className="mt-1 text-[11px] text-ink-soft">“agree” zaten fiil, “am” gerekmez.</p>
          </motion.div>

          <motion.div style={b} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, type: 'spring', stiffness: 140, damping: 16 }} className="absolute right-0 top-[58%] w-[200px] rounded-2xl bg-card p-3.5 shadow-[0_20px_40px_-18px_rgba(31,36,51,.35)] ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-lilac"><GraduationCap className="size-3.5" /> YDS denemesi</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="font-display text-3xl font-black leading-none">%72</p>
              <p className="pb-0.5 text-xs font-bold text-mint-deep">+9 bu hafta</p>
            </div>
            <div className="mt-2 flex h-8 items-end gap-1">{[40, 52, 48, 60, 66, 72].map((h, k) => <motion.span key={k} className="flex-1 rounded-t bg-lilac/70" initial={{ height: 0 }} animate={{ height: Math.round(h * 0.4) }} transition={{ delay: 0.9 + k * 0.06, duration: 0.5 }} />)}</div>
          </motion.div>

          <motion.div style={c} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, type: 'spring', stiffness: 140, damping: 16 }} className="absolute bottom-[4%] left-[6%] flex items-center gap-3 rounded-2xl bg-[#141926] px-4 py-3 text-white shadow-[0_20px_40px_-18px_rgba(0,0,0,.5)]">
            <span className="grid size-10 place-items-center rounded-xl bg-flame/20"><Flame className="size-5 fill-flame text-flame" /></span>
            <span><span className="block font-display text-lg font-black leading-none">21 gün</span><span className="text-[11px] font-bold text-white/60">kesintisiz seri</span></span>
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

const HIGO_STEPS: { pose: HigoPose; kicker: string; title: string; text: string; bubble: string }[] = [
  { pose: 'wave', kicker: 'Rehber', title: 'Seni karşılar, yolu gösterir', text: 'İlk günden sınav gününe kadar her adımda yanında. Nereden devam edeceğini hep bilirsin.', bubble: 'Hello!' },
  { pose: 'cheer', kicker: 'Motivasyon', title: 'Başarını seninle kutlar', text: 'Doğru cevaplarda, serilerde ve ödüllerde coşar. Küçük kazanımlar büyük alışkanlık olur.', bubble: 'Great job!' },
  { pose: 'think', kicker: 'Destek', title: 'Takıldığında birlikte düşünür', text: 'Yanlışlar ceza değil. Türkçe açıklama ve ipucu hep hazır.', bubble: 'Hmm, let’s see…' },
  { pose: 'music', kicker: 'Oyun', title: 'Kelimeleri oyunla hatırlatır', text: 'Kelime yağmuru, balon kurtar, hafıza kartları. Ezber değil, keyifli tekrar.', bubble: 'Let’s play!' },
]

/**
 * Meet Higo: a stage with the mascot on a soft pedestal, English phrases orbiting
 * him, and four roles that play one after another on their own (click to jump).
 * Each change springs Higo into his new pose.
 */
export function MeetHigoPro() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const { i, pick, progress, bind } = useAutoplay(HIGO_STEPS.length, 4200, inView)
  const reduced = useReducedMotion()
  const cur = HIGO_STEPS[i]
  const orbit = ['Hello!', 'Well done!', 'Let’s go!', 'Nice try!', 'You got it!']
  return (
    <section ref={ref} className="px-5 py-10 md:py-16" aria-label="Higo ile tanış" {...bind}>
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[40px] bg-gradient-to-br from-[#fff6ec] via-[#fff1ea] to-[#fdeee6] p-6 ring-1 ring-black/5 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:p-14 dark:from-[#1d1a1f] dark:via-[#1b1b22] dark:to-[#1a1c24]">
        {/* stage */}
        <div className="relative mx-auto grid aspect-square w-full max-w-[420px] place-items-center">
          <span aria-hidden className="absolute bottom-[12%] h-[14%] w-[62%] rounded-[50%] bg-gradient-to-b from-flame/25 to-transparent blur-md" />
          <span aria-hidden className="absolute bottom-[14%] h-[10%] w-[56%] rounded-[50%] border-2 border-flame/20 bg-white/60 dark:bg-white/5" />
          <motion.div aria-hidden className="absolute inset-[4%] rounded-full border border-dashed border-flame/25" animate={reduced ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}>
            {orbit.map((w, k) => {
              const ang = (k / orbit.length) * Math.PI * 2
              return (
                <motion.span key={w} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#1f2433] shadow-soft ring-1 ring-black/5" style={{ left: `${50 + Math.cos(ang) * 50}%`, top: `${50 + Math.sin(ang) * 50}%` }} animate={reduced ? undefined : { rotate: -360 }} transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}>
                  {w}
                </motion.span>
              )
            })}
          </motion.div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img key={cur.pose} src={higoImg(cur.pose)} alt="Higo" className="relative z-10 w-[62%] drop-shadow-[0_24px_24px_rgba(190,60,20,.25)]" initial={{ opacity: 0, y: 30, scale: 0.8, rotate: -8 }} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} exit={{ opacity: 0, y: -20, scale: 0.9, rotate: 6 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.span key={cur.bubble} initial={{ opacity: 0, scale: 0.6, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.15 }} className="absolute right-[6%] top-[14%] z-20 rounded-2xl rounded-bl-md bg-[#1f2433] px-3.5 py-2 font-display text-lg font-black text-white shadow-soft">
              {cur.bubble}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* roles */}
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Tanış: Higo</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3.1rem)] font-black leading-[1.08] tracking-tight">Konuşmayı öğrenmiş bir baloncuk. Senin çalışma arkadaşın.</h2>
          <div className="mt-7 space-y-2">
            {HIGO_STEPS.map((s, k) => {
              const on = k === i
              return (
                <button key={s.title} onClick={() => pick(k)} aria-current={on} className={clsx('relative block w-full overflow-hidden rounded-2xl px-4 py-3 text-left transition', on ? 'bg-white shadow-[0_12px_30px_-16px_rgba(31,36,51,.35)] dark:bg-white/10' : 'hover:bg-white/50 dark:hover:bg-white/5')}>
                  <span className="flex items-center gap-3">
                    <span className={clsx('text-[11px] font-black uppercase tracking-wider', on ? 'text-flame' : 'text-ink-soft')}>{s.kicker}</span>
                    <span className={clsx('font-display text-lg font-black', !on && 'text-ink/70')}>{s.title}</span>
                  </span>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden text-[15px] text-ink-soft">
                        <span className="block pt-1">{s.text}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                  {on && <span className="absolute inset-x-4 bottom-0 h-[2px] rounded bg-line"><span className="block h-full rounded bg-flame" style={{ width: `${progress * 100}%` }} /></span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
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
  const inView = useInView(ref, { amount: 0.35 })
  const { i, pick, progress, bind } = useAutoplay(STRENGTHS.length, 5500, inView)
  const cur = STRENGTHS[i]
  return (
    <section id="nasil" ref={ref} className="relative overflow-hidden py-20 md:py-28" {...bind}>
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Tek uygulama, beş güç</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-black leading-[1.08] tracking-tight">Öğrenmenin her parçası, tek bir düzende.</h2>
        </div>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
          <ol className="space-y-2 lg:col-start-1">
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

          <div className="hidden lg:col-start-3 lg:block">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.35, ease }} className="max-w-xs">
                <p className="font-display text-[5.5rem] font-black leading-none" style={{ color: cur.tint, opacity: 0.2 }}>0{i + 1}</p>
                <p className="-mt-6 font-display text-2xl font-black">{cur.title}</p>
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
 * Pricing on a dark stage: a free column and the paid plans, the featured one
 * lifted with a glowing border and Higo on top. Each paid plan shows its monthly
 * equivalent and the saving, so the comparison is instant.
 */
export function PricingPro({ plans }: { plans: Plan[] }) {
  const monthly = plans.find((p) => p.duration_days <= 31) ?? plans[0]
  const perMonth = (p: Plan) => Number(p.price) / Math.max(1, Math.round(p.duration_days / 30))
  const saving = (p: Plan) => (monthly && p !== monthly ? Math.round((1 - perMonth(p) / Number(monthly.price)) * 100) : 0)
  return (
    <section id="paketler" className="relative overflow-hidden bg-[#0f131c] py-24 text-white">
      <div aria-hidden className="absolute inset-0 [background:radial-gradient(50rem_26rem_at_50%_0%,rgba(255,90,54,.22),transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-butter">Paketler</p>
          <h2 className="mt-3 font-display text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.06] tracking-tight">Ücretsiz başla, hazır olunca yüksel.</h2>
          <p className="mt-4 text-lg text-white/65">Temel her şey ücretsiz. Premium sınırları kaldırır, canlı ders ve daha fazla konuşma pratiği ekler.</p>
        </div>

        <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4">
          <PriceCard name="Ücretsiz" tagline="Her zaman" price="₺0" note="Kredi kartı gerekmez" features={FREE} cta={<LinkButton to="/register" block variant="secondary">Ücretsiz başla</LinkButton>} />
          {plans.map((p) => (
            <PriceCard
              key={p.id}
              featured={p.is_featured}
              name={p.name}
              tagline={p.tagline ?? ''}
              price={tl(p.price)}
              was={p.compare_at_price ? tl(p.compare_at_price) : undefined}
              note={p !== monthly ? `ayda ${tl(String(Math.round(perMonth(p))))}` : 'aylık yenilenmez'}
              badge={p.is_featured ? 'En popüler' : saving(p) > 0 ? `%${saving(p)} tasarruf` : undefined}
              features={p.features ?? []}
              cta={<LinkButton to="/register" block variant={p.is_featured ? 'primary' : 'dark'}>{p.is_featured ? 'Premium’a başla' : 'Seç'}</LinkButton>}
            />
          ))}
        </div>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-white/55">
          {['Otomatik yenileme yok', 'İstediğin an iptal', 'Kurumlara özel fiyat'].map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-mint" strokeWidth={3} />{t}</li>)}
        </ul>
      </div>
    </section>
  )
}

function PriceCard({ name, tagline, price, was, note, badge, features, cta, featured }: { name: string; tagline: string; price: string; was?: string; note: string; badge?: string; features: string[]; cta: ReactNode; featured?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, ease }} className={clsx('relative rounded-[28px] p-[2px]', featured ? 'bg-gradient-to-b from-flame via-[#ff8a3d] to-butter shadow-[0_30px_80px_-20px_rgba(255,90,54,.55)] lg:-my-4' : 'bg-white/10')}>
      {featured && <img src={higoImg('thumbs')} alt="" className="absolute -right-3 -top-12 z-10 w-20 drop-shadow-[0_10px_12px_rgba(0,0,0,.4)]" />}
      <div className={clsx('flex h-full flex-col rounded-[26px] p-6', featured ? 'bg-[#1a1f2c]' : 'bg-[#141926]')}>
        <div className="flex items-center gap-2">
          <p className="font-display text-xl font-black">{name}</p>
          {featured && <Crown className="size-4 text-butter" />}
        </div>
        <p className="text-sm text-white/55">{tagline}</p>
        {badge && <span className={clsx('mt-3 w-fit rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider', featured ? 'bg-flame text-white' : 'bg-mint/15 text-mint')}>{badge}</span>}
        <div className="mt-5 flex items-end gap-2">
          <p className="font-display text-5xl font-black leading-none tracking-tight">{price}</p>
          {was && <p className="pb-1 text-sm font-bold text-white/40 line-through">{was}</p>}
        </div>
        <p className="mt-1.5 text-sm font-bold text-white/60">{note}</p>
        <ul className="mt-6 flex-1 space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex gap-2.5 text-[14px] text-white/85"><span className={clsx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', featured ? 'bg-flame' : 'bg-white/10')}>{featured ? <Sparkles className="size-3" /> : <Check className="size-3" strokeWidth={3.5} />}</span>{f}</li>
          ))}
        </ul>
        <div className="mt-7">{cta}</div>
      </div>
    </motion.div>
  )
}
