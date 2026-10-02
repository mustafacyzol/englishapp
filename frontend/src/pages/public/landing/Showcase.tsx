import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTime, useTransform } from 'motion/react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Check, Crown, Sparkles } from 'lucide-react'
import { useSiteConfig } from '@/lib/site'
import { rewardImg, img, PHOTO } from '@/lib/assets'
import { tl } from '@/lib/format'
import type { Plan } from '@/lib/types'
import { LinkButton } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { Defne } from '@/components/game/Defne'
import { higoImg } from '@/components/game/Higo'
import { FrameSequence, HIGO_DAY, HigoMotion } from '@/components/game/HigoMotion'
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
const ORBIT = [
  { t: 'Hello!', c: 'bg-sky text-white' },
  { t: 'Merhaba', c: 'bg-butter text-[#1f2433]' },
  { t: 'Let’s talk', c: 'bg-card text-ink ring-1 ring-line' },
  { t: 'Well done!', c: 'bg-mint text-white' },
  { t: 'Why?', c: 'bg-lilac text-white' },
]

/**
 * A word chip travelling round an ellipse: it grows and comes forward on the
 * near side, shrinks and slips behind Higo on the far side, which reads as 3D.
 */
function OrbitChip({ word, phase }: { word: (typeof ORBIT)[number]; phase: number }) {
  const t = useTime()
  const ang = useTransform(t, (ms) => (ms / 14000 + phase) * Math.PI * 2)
  const x = useTransform(ang, (a) => `${Math.cos(a) * 47}cqw`)
  const y = useTransform(ang, (a) => `${Math.sin(a) * 15}cqw`)
  const scale = useTransform(ang, (a) => 0.78 + (Math.sin(a) + 1) * 0.16)
  const zIndex = useTransform(ang, (a) => (Math.sin(a) > 0 ? 20 : 1))
  const opacity = useTransform(ang, (a) => 0.55 + (Math.sin(a) + 1) * 0.225)
  return (
    <motion.span aria-hidden style={{ x, y, scale, zIndex, opacity, translateX: '-50%', translateY: '-50%' }} className={clsx('absolute left-1/2 top-[60%] whitespace-nowrap rounded-2xl px-3 py-1.5 font-display text-sm font-black shadow-[0_12px_24px_-12px_rgba(31,36,51,.35)] sm:text-base', word.c)}>
      {word.t}
    </motion.span>
  )
}

export function HeroPro() {
  const reduced = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 70, damping: 18 })
  const sy = useSpring(my, { stiffness: 70, damping: 18 })
  const near = (d: number) => ({ x: useTransform(sx, (v) => v * d), y: useTransform(sy, (v) => v * d) }) // eslint-disable-line react-hooks/rules-of-hooks
  const a = near(0.6)
  const ph = near(0.3)
  const move = (e: React.PointerEvent) => {
    if (reduced) return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 24)
    my.set(((e.clientY - r.top) / r.height - 0.5) * 18)
  }
  const who = [
    { k: 'İlkokul', a: 'braids' },
    { k: 'Ortaokul · LGS', a: 'cap' },
    { k: 'Lise · YDT', a: 'headphones' },
    { k: 'Üniversite', a: 'glasses' },
    { k: 'Okullar', a: 'afro' },
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
            İlkokuldan üniversiteye, LGS’den YDS’ye: Türkiye’deki öğrenciler için kurulmuş ders yolu, seninle konuşan yapay zekâ öğretmen ve günde birkaç dakikalık pratik.
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

        {/* Higo himself, animated on a transparent stage: words in several
            languages orbit him like little moons, passing in front and behind */}
        <div className="relative mx-auto aspect-square w-full max-w-[300px] [container-type:inline-size] sm:max-w-[400px] lg:max-w-[480px]">
          <motion.div aria-hidden className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-flame)_22%,transparent),transparent_68%)]" animate={reduced ? {} : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }} />
          <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
            <ellipse cx="50" cy="60" rx="47" ry="15" fill="none" stroke="currentColor" strokeWidth="0.35" strokeDasharray="0.6 2.2" className="text-ink/25" />
          </svg>
          {!reduced && ORBIT.map((w, k) => <OrbitChip key={w.t} word={w} phase={k / ORBIT.length} />)}
          <motion.div style={ph} initial={{ opacity: 0, y: 40, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease }} className="absolute inset-[4%] z-10">
            <HigoMotion className="size-full object-contain drop-shadow-[0_24px_24px_rgba(200,60,20,.22)]" />
          </motion.div>
          <span aria-hidden className="absolute bottom-[9%] left-1/2 z-0 h-[5%] w-[34%] -translate-x-1/2 rounded-[50%] bg-ink/15 blur-md" />

          <motion.div style={a} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, type: 'spring', stiffness: 140, damping: 16 }} className="absolute -left-4 bottom-[6%] z-30 hidden w-[200px] rounded-2xl bg-card p-3 shadow-[0_20px_40px_-18px_rgba(31,36,51,.35)] ring-1 ring-line sm:block lg:-left-16">
            <div className="mb-1.5 flex items-center gap-2"><Defne className="size-7" /><p className="text-sm font-black">Defne</p><span className="ml-auto rounded-full bg-mint/12 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-mint-deep">Düzeltme</span></div>
            <p className="text-sm"><s className="text-berry">I am agree</s> → <b className="text-mint-deep">I agree</b></p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- Türkiye */

const LADDER = [
  { stage: 'İlkokul', range: '2-4. sınıf', tag: 'İlk kelimeler', text: 'Şarkılar, oyunlar ve resimlerle; okulda görülen konularla birlikte.', color: '#22b573', icon: 'braids' },
  { stage: 'Ortaokul', range: '5-8. sınıf', tag: 'LGS', text: 'Okul İngilizcesi ve 8. sınıfta LGS formatında diyalog, okuma ve görsel soruları.', color: '#2f7cf6', icon: 'cap' },
  { stage: 'Lise', range: '9-12. sınıf', tag: 'YKS-YDT', text: 'Okul sınavlarına destek; dil bölümü için YDT’nin paragraf, diyalog ve çeviri soruları.', color: '#8f7cf8', icon: 'headphones' },
  { stage: 'Üniversite', range: 'Hazırlık dahil', tag: 'Muafiyet · YDS · YÖKDİL', text: 'Hazırlığı atlatan akademik okuma ve yazma, ardından ÖSYM sınavları.', color: '#ff7a3d', icon: 'glasses' },
  { stage: 'Okullar', range: 'Müdür ve öğretmen', tag: 'Okul paneli', text: 'Sınıflar, ödevler ve raporlarla okulun bütün İngilizce ihtiyacı tek yerde.', color: '#1f2433', icon: 'afro' },
] as const

/**
 * The "made for Turkey" band: one ladder from primary school to university and
 * schools, each step naming the exam that matters at that age.
 */
export function TurkeyLadder() {
  return (
    <section className="relative overflow-x-clip py-20 md:py-24" aria-label="Türkiye için tasarlandı">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#e30a17]/10 px-3 py-1 text-sm font-black uppercase tracking-[0.16em] text-[#c8102e]">
            <svg viewBox="0 0 30 20" className="h-3.5 w-5 rounded-[2px]" aria-hidden><rect width="30" height="20" fill="#e30a17" /><circle cx="11" cy="10" r="5" fill="#fff" /><circle cx="12.3" cy="10" r="4" fill="#e30a17" /><polygon fill="#fff" points="16.5,10 19.8,8.9 17.8,11.7 17.8,8.3 19.8,11.1" /></svg>
            Türkiye için tasarlandı
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.3rem)] font-black leading-[1.06] tracking-tight">İlkokuldan üniversiteye, <span className="text-flame">her sınava</span> bir yol.</h2>
          <p className="mt-4 text-lg text-ink-soft">Sınıfını ve hedefini söyle; ders yolu, soru tipleri ve Defne’nin konuşması ona göre ayarlansın.</p>
        </div>

        <ol className="relative grid gap-4 md:grid-cols-5">
          <span aria-hidden className="absolute left-[10%] right-[10%] top-[38px] hidden h-[3px] rounded-full bg-gradient-to-r from-[#22b573] via-[#8f7cf8] to-[#1f2433] md:block" />
          {LADDER.map((l, k) => (
            <motion.li key={l.stage} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ delay: k * 0.08, type: 'spring', stiffness: 220, damping: 22 }} className="relative flex gap-4 rounded-3xl border-2 border-line bg-card p-4 md:flex-col md:items-center md:p-5 md:text-center">
              <span className="relative z-10 grid size-[60px] shrink-0 place-items-center overflow-hidden rounded-2xl ring-4 ring-paper md:size-[76px]" style={{ background: `color-mix(in oklab, ${l.color} 16%, var(--card))` }}>
                <img src={img(`avatars/${l.icon}.webp`)} alt="" className="size-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl font-black">{l.stage}</span>
                <span className="block text-xs font-bold text-ink-soft">{l.range}</span>
                <span className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white" style={{ background: l.color }}>{l.tag}</span>
                <span className="mt-2 block text-sm leading-relaxed text-ink-soft">{l.text}</span>
              </span>
            </motion.li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LinkButton to="/register" size="lg" className="gap-2">Sınıfıma göre başla <ArrowRight className="size-5" /></LinkButton>
          <LinkButton to="/okullar" size="lg" variant="secondary">Okullar için</LinkButton>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- audiences */

const AUDIENCES = [
  { key: 'kid', tab: 'İlkokul', age: '2-4. sınıf', photo: img('photos/aud-kid.webp'), title: 'Oyun gibi, güvenli ve sade', points: ['Kısa cümleler, bol teşvik, çocuğa uygun konular', 'Yalnızca yaşıtlarıyla düello, reklam yok', 'Veli onaylı hesap ve günlük süre hedefi'], cta: 'Çocuğum için başla', to: '/register', tone: 'text-mint-deep bg-mint/12' },
  { key: 'teen', tab: 'Ortaokul ve lise', age: '5-12. sınıf · LGS · YDT', photo: img('photos/aud-teen.webp'), title: 'Okul İngilizcesi, LGS ve YDT', points: ['Sınıfına göre kelime ve dilbilgisi', '8. sınıfta LGS, lisede YKS-YDT formatında sorular', 'Arkadaşlarınla lig ve Gölge Düellosu'], cta: 'Hemen başla', to: '/register', tone: 'text-sky bg-sky/12' },
  { key: 'adult', tab: 'Yetişkinler', age: '18 yaş ve üzeri', photo: PHOTO.hero, title: 'İş, seyahat, özgüven', points: ['Toplantı, mülakat ve seyahat senaryoları', 'Defne ile sesli konuşma provası', 'Günde 5-20 dakikalık esnek plan'], cta: 'Ücretsiz dene', to: '/register', tone: 'text-flame bg-flame/10' },
  { key: 'exam', tab: 'Üniversite ve sınavlar', age: 'Hazırlık · YDS · YÖKDİL · IELTS', photo: PHOTO.write, title: 'Hazırlıktan YDS’ye, Türkçe çözümle', points: ['Hazırlık muafiyet ve ÖSYM formatında sorular', 'Her sorudan sonra neden doğru, neden yanlış', 'Zayıf bölüm önerisi ve sınav geri sayımı'], cta: 'Sınav hedefimi seç', to: '/register', tone: 'text-lilac bg-lilac/15' },
  { key: 'org', tab: 'Okullar', age: 'Müdür · öğretmen · öğrenci', photo: PHOTO.classroom, title: 'Okulunuzun tüm İngilizcesi tek yerde', points: ['Müdür ve öğretmen panelleri, sınıf yönetimi', 'Ödev verme, takip ve dört beceri raporu', 'Öğrenciler kodla katılır, veliler ilerlemeyi görür'], cta: 'Okullar için', to: '/okullar', tone: 'text-sage-deep bg-sage/15' },
] as const

/**
 * "Who is it for": five audiences, one after another. Every photo sits in the
 * same frame, the next one crossfades in with a slow zoom, and the tabs show a
 * progress line. It plays by itself while on screen and stops on hover.
 */
export function AudiencesPro() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const { i, pick, progress, bind } = useAutoplay(AUDIENCES.length, 4200, inView)
  const cur = AUDIENCES[i]
  return (
    <section id="kimler-icin" ref={ref} className="mx-auto max-w-6xl overflow-x-clip px-5 py-20 md:py-28" {...bind}>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Kimin için?</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-black leading-[1.08] tracking-tight">Herkese aynı uygulama değil, herkese kendi uygulaması.</h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* tabs */}
        <motion.div role="tablist" initial="hide" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {AUDIENCES.map((x, k) => {
            const on = k === i
            return (
              <motion.button variants={{ hide: { opacity: 0, y: 24, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 24 } } }} key={x.key} role="tab" aria-selected={on} onClick={() => pick(k)} className={clsx('relative shrink-0 overflow-hidden rounded-2xl border-2 px-4 py-3 text-left transition-colors lg:py-4', on ? 'border-ink bg-card' : 'border-line bg-card/60 hover:border-ink/25')}>
                <span className="block font-display text-[15px] font-black lg:text-lg">{x.tab}</span>
                <span className="hidden text-xs font-bold text-ink-soft lg:block">{x.age}</span>
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-line/60">
                  <span className="block h-full bg-flame" style={{ width: on ? `${progress * 100}%` : k < i ? '100%' : '0%', opacity: k < i ? 0.25 : 1 }} />
                </span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* stage: wipes open when it scrolls in */}
        <motion.div initial={{ opacity: 0, x: 90, rotateY: -14 }} whileInView={{ opacity: 1, x: 0, rotateY: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ type: 'spring', stiffness: 110, damping: 20 }} style={{ transformPerspective: 1400 }} className="grid overflow-hidden rounded-[32px] border-2 border-line bg-card md:grid-cols-[1.1fr_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden bg-paper-2 md:aspect-auto md:min-h-[420px]">
            <AnimatePresence initial={false}>
              <motion.div key={cur.key} className="absolute inset-0 z-[1]" initial={{ clipPath: 'circle(0% at 12% 88%)', scale: 1.12 }} animate={{ clipPath: 'circle(150% at 12% 88%)', scale: 1 }} exit={{ zIndex: 0 }} transition={{ clipPath: { duration: 0.7, ease }, scale: { duration: 4.4, ease: 'linear' } }}>
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
              <motion.div key={cur.key} initial="hide" animate="show" exit={{ opacity: 0, x: -24, transition: { duration: 0.14 } }} variants={{ show: { transition: { staggerChildren: 0.045 } }, hide: {} }}>
                <motion.span variants={{ hide: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0 } }} className={clsx('inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider', cur.tone)}>{cur.tab}</motion.span>
                <motion.h3 variants={{ hide: { opacity: 0, x: 40 }, show: { opacity: 1, x: 0 } }} className="mt-4 font-display text-3xl font-black leading-tight">{cur.title}</motion.h3>
                <ul className="mt-5 space-y-3">
                  {cur.points.map((p) => (
                    <motion.li key={p} variants={{ hide: { opacity: 0, x: 36 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 420, damping: 30 } } }} className="flex gap-3 text-[16px]">
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
        </motion.div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Meet Higo */

/**
 * Higo's story in five beats. Each beat owns a slice of the scroll (`from`), a
 * colour, and the real bit of the app it is about.
 */
const BEATS: { from: number; tint: string; kicker: string; title: string; text: string; Scene: ComponentType }[] = [
  { from: 0, tint: '#ff7a45', kicker: 'Merhaba', title: 'Ben Higo, yol arkadaşın', text: 'Seçtiğin saatte tek bir nazik hatırlatma: “5 dakikan var mı?” Serin kopmaz, baskı hissetmezsin.', Scene: () => <Notif /> },
  { from: 0.12, tint: '#2f7cf6', kicker: 'Okuma', title: 'Birlikte hikâye okuruz', text: 'Seviyene göre kısa hikâyeler. Bilmediğin kelimeye dokun, anlamı hemen çıksın; okurken kelime biriktir.', Scene: () => <StoryTap /> },
  { from: 0.4, tint: '#8f7cf8', kicker: 'Takıldığında', title: 'Azar yok, ipucu var', text: 'Yanlışta Türkçe açıklama ve tek cümlelik ipucu. Doğrusu bir dokunuş uzakta.', Scene: () => <Hint /> },
  { from: 0.58, tint: '#22b573', kicker: 'Tekrar', title: 'Oyunla, tam zamanında', text: 'Kelimle ve kelime avı: unutmak üzere olduğun kelime, oyunun içinde geri gelir.', Scene: () => <Tiles /> },
  { from: 0.76, tint: '#ffb020', kicker: 'Gün sonu', title: 'Her başarını kutlar', text: 'Günlük hedef tamam, seri bir gün uzadı, sandık seni bekliyor. Yarın görüşürüz!', Scene: () => <Win /> },
]
const beatAt = (p: number) => BEATS.reduce((acc, b, k) => (p >= b.from ? k : acc), 0)

/**
 * Meet Higo, scroll-driven: the page scrubs through a real animation of Higo
 * (wave, read, think, cheer) frame by frame, so he transforms smoothly as you
 * scroll. Kept light on purpose: one canvas, a short scroll distance, and colour
 * changes done with CSS transitions per beat rather than repainting the screen
 * on every scroll frame. With reduced motion it is a simple list.
 */
export function MeetHigoPro() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // a light spring only to round off wheel steps; it settles within ~150 ms
  const smooth = useSpring(scrollYProgress, { stiffness: 420, damping: 48, mass: 0.4, restDelta: 0.0005 })
  const [i, setI] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const k = beatAt(v)
    if (k !== i) setI(k)
  })

  if (reduced)
    return (
      <section className="mx-auto max-w-6xl space-y-6 px-5 py-16" aria-label="Higo ile tanış">
        <h2 className="font-display text-[clamp(2rem,4.2vw,3.1rem)] font-black">Tanış: Higo</h2>
        {BEATS.map((d) => <div key={d.title} className="rounded-3xl border-2 border-line p-5"><p className="text-xs font-black uppercase tracking-widest" style={{ color: d.tint }}>{d.kicker}</p><p className="font-display text-xl font-black">{d.title}</p><p className="text-ink-soft">{d.text}</p></div>)}
      </section>
    )

  const cur = BEATS[i]
  const go = (k: number) => {
    const el = ref.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + (BEATS[k].from + 0.02) * (el.offsetHeight - window.innerHeight), behavior: 'smooth' })
  }

  return (
    <section ref={ref} className="relative" style={{ height: '320vh' }} aria-label="Higo ile tanış">
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        {/* one soft wash per beat, cross-faded by CSS */}
        {BEATS.map((b, k) => <div key={b.title} aria-hidden className="absolute inset-0 transition-opacity duration-500" style={{ opacity: k === i ? 0.12 : 0, background: `radial-gradient(56rem 38rem at 30% 55%, ${b.tint}, transparent 70%)` }} />)}

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-4 px-5 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-0">
          {/* Higo on his stage */}
          <div className="relative mx-auto w-[min(76vw,42vh)] lg:w-[min(100%,60vh)]">
            <span aria-hidden className="absolute inset-[12%] rounded-full transition-colors duration-500" style={{ backgroundColor: `color-mix(in oklab, ${cur.tint} 18%, transparent)` }} />
            <span aria-hidden className="absolute inset-[18%] rounded-full border-[3px] border-dashed transition-colors duration-500" style={{ borderColor: `color-mix(in oklab, ${cur.tint} 45%, transparent)` }} />
            <FrameSequence seq={HIGO_DAY} progress={smooth} label="Higo animasyonu" className="relative w-full [filter:drop-shadow(0_22px_18px_rgba(160,50,20,.16))]" />
            <span aria-hidden className="absolute bottom-[3%] left-1/2 h-[5%] w-[32%] -translate-x-1/2 rounded-[50%] bg-ink/12 blur-md" />
            {/* the real bit of the app for this beat, popping in beside him */}
            <div className="absolute -bottom-8 right-[-8%] w-[58%] sm:w-[50%] lg:-bottom-2 lg:right-[-6%] lg:w-[50%]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={i} initial={{ opacity: 0, scale: 0.85, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: -2 }} exit={{ opacity: 0, scale: 0.9, y: -10 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="origin-bottom-left [&>div]:max-w-none [&>div]:p-3.5 sm:[&>div]:p-4">
                  <cur.Scene />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* the words */}
          <div className="relative mt-8 lg:mt-0">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Tanış: Higo</p>
            <div className="relative mt-3 min-h-[190px] sm:min-h-[210px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={i} initial="hide" animate="show" exit="out" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
                  <motion.p variants={WORD_V} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: cur.tint }}>
                    <span className="font-mono">0{i + 1}</span><span className="h-px w-6 bg-current" />{cur.kicker}
                  </motion.p>
                  <motion.h2 variants={WORD_V} className="mt-2 font-display text-[clamp(1.8rem,4vw,3rem)] font-black leading-[1.05] tracking-tight">{cur.title}</motion.h2>
                  <motion.p variants={WORD_V} className="mt-3 max-w-md text-[17px] leading-relaxed text-ink-soft">{cur.text}</motion.p>
                </motion.div>
              </AnimatePresence>
            </div>
            {/* chapter rail: shows where you are, and jumps */}
            <div className="mt-6 flex items-center gap-2">
              {BEATS.map((b, k) => (
                <button key={b.title} onClick={() => go(k)} aria-label={b.title} className="relative h-2.5 overflow-hidden rounded-full bg-line transition-[width] duration-300" style={{ width: k === i ? 48 : 14 }}>
                  <span className="absolute inset-0 rounded-full transition-opacity" style={{ background: b.tint, opacity: k <= i ? 1 : 0 }} />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-ink-soft">{i < BEATS.length - 1 ? 'Kaydırmaya devam et' : 'Hazırsın!'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const WORD_V = {
  hide: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 32 } },
  out: { opacity: 0, y: -8, transition: { duration: 0.12 } },
}

/* small scenes, each a real piece of the app */
function StoryTap() {
  return (
    <Card>
      <p className="text-xs font-black uppercase tracking-widest text-[#2f7cf6]">Hikâye · A2</p>
      <p className="mt-2 text-[15px] leading-relaxed">Mia opened the door and saw a <span className="relative rounded bg-[#e8f1ff] px-1 font-extrabold text-[#2f7cf6] underline decoration-dotted underline-offset-4">puppy<motion.span initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1f2433] px-2 py-1 text-xs font-bold text-white">yavru köpek</motion.span></span> on the step.</p>
      <p className="mt-2 text-xs font-bold text-[#676d7c]">+1 kelime defterine eklendi</p>
    </Card>
  )
}
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
  const { i, pick, progress, bind } = useAutoplay(STRENGTHS.length, 3400, inView)
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
          <motion.ol initial="hide" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }} className="hidden space-y-2 lg:col-start-1 lg:block">
            {STRENGTHS.map((s, k) => {
              const on = k === i
              return (
                <motion.li key={s.title} variants={{ hide: { opacity: 0, x: -60, rotate: -4 }, show: { opacity: 1, x: 0, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } } }}>
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
                </motion.li>
              )
            })}
          </motion.ol>

          <motion.div initial={{ opacity: 0, y: 120, rotateX: 35, scale: 0.85 }} whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }} viewport={{ once: true, amount: 0.25 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} className="relative mx-auto w-[270px] [perspective:1200px] sm:w-[300px] lg:col-start-2">
            <motion.span aria-hidden className="absolute left-1/2 top-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" animate={{ backgroundColor: cur.tint, opacity: 0.18 }} transition={{ duration: 0.6 }} />
            <Phone>
              <div className="absolute inset-0 [perspective:900px]">
              <AnimatePresence initial={false}>
                <motion.div key={i} className="absolute inset-0 [backface-visibility:hidden] [transform-origin:50%_50%_-140px]" initial={{ rotateY: 90, opacity: 0.4 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0.4 }} transition={{ duration: 0.42, ease: [0.65, 0, 0.35, 1] }}>
                  <cur.Mock />
                </motion.div>
              </AnimatePresence>
              </div>
            </Phone>
          </motion.div>

          <div className="text-center lg:col-start-3 lg:text-left">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, y: 26, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -14, transition: { duration: 0.12 } }} transition={{ type: 'spring', stiffness: 460, damping: 30 }} className="mx-auto max-w-xs lg:mx-0">
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
 * Pricing, light and calm: the free column, the paid plans and the corporate
 * card side by side, so a parent, a learner and a school all find their row in
 * one place. The corporate card is edited in Yönetim > Site ayarları > Kurumsal paket.
 */
export function PricingPro({ plans, cta, embedded, title = 'Ücretsiz başla, hazır olunca yüksel.', sub = 'Temel her şey ücretsiz. Premium sınırları kaldırır, canlı ders ve daha fazla konuşma pratiği ekler.' }: { plans: Plan[]; cta?: (p: Plan) => ReactNode; embedded?: boolean; title?: string; sub?: string }) {
  const { data: cfg } = useSiteConfig()
  const corp = cfg?.site?.corporate
  const showCorp = !embedded && !!corp && corp.enabled !== false && !!corp.name
  const monthly = plans.find((p) => p.duration_days <= 31) ?? plans[0]
  const perMonth = (p: Plan) => Number(p.price) / Math.max(1, Math.round(p.duration_days / 30))
  const saving = (p: Plan) => (monthly && p !== monthly ? Math.round((1 - perMonth(p) / Number(monthly.price)) * 100) : 0)
  const cards = (embedded ? 0 : 1) + plans.length
  return (
    <section id={embedded ? undefined : 'paketler'} className={clsx('relative', embedded ? 'py-4' : 'py-24')}>
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Paketler</p>
          <h2 className="mt-3 font-display text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.06] tracking-tight">{title}</h2>
          <p className="mt-4 text-lg text-ink-soft">{sub}</p>
        </div>

        <div className={clsx('grid items-stretch gap-5 md:grid-cols-2', cards >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
          {!embedded && <PriceCard name="Ücretsiz" tagline="Her zaman" price="₺0" note="Kredi kartı gerekmez" features={FREE} cta={<LinkButton to="/register" block variant="secondary">Ücretsiz başla</LinkButton>} />}
          {plans.map((p) => (
            <PriceCard
              key={p.id}
              featured={p.is_featured}
              name={p.name}
              tagline={p.tagline ?? ''}
              price={tl(p.price)}
              was={p.compare_at_price ? tl(p.compare_at_price) : undefined}
              note={p !== monthly ? `ayda ${tl(String(Math.round(perMonth(p))))}` : 'otomatik yenilenmez'}
              badge={p.is_featured ? 'En popüler' : saving(p) > 0 ? `%${saving(p)} tasarruf` : undefined}
              features={p.features ?? []}
              cta={cta ? cta(p) : <LinkButton to="/register" block variant={p.is_featured ? 'primary' : 'dark'}>{p.is_featured ? 'Premium’a başla' : 'Seç'}</LinkButton>}
            />
          ))}
        </div>

        {showCorp && <CorporateCard c={corp!} />}

        <ul className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-ink-soft">
          {(embedded ? ['Otomatik yenileme yok', 'Güvenli ödeme', 'Tek seferlik ödeme'] : ['Otomatik yenileme yok', 'İstediğin an iptal', 'Güvenli ödeme']).map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-mint-deep" strokeWidth={3} />{t}</li>)}
        </ul>
      </div>
    </section>
  )
}

/** Schools and companies: one wide card under the plans, edited from the admin panel. */
function CorporateCard({ c }: { c: NonNullable<NonNullable<ReturnType<typeof useSiteConfig>['data']>['site']>['corporate'] & object }) {
  const features = (c.features ?? '').split('\n').map((f) => f.trim()).filter(Boolean)
  const external = /^https?:/.test(c.url ?? '')
  const btn = 'press inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 font-display font-extrabold uppercase tracking-wide text-paper shadow-hard-sm lg:w-auto'
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, ease }} className="relative mt-5 overflow-hidden rounded-[28px] border-2 border-line bg-card">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sage to-mint" />
      <div className="grid items-center gap-6 p-6 pl-8 lg:grid-cols-[1fr_1.5fr_auto] lg:gap-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-sage/15 text-sage-deep dark:text-sage"><Building2 className="size-5" /></span>
            <p className="font-display text-xl font-black">{c.name}</p>
            <span className="rounded-full bg-sage/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-sage-deep dark:text-sage">Okul ve şirket</span>
          </div>
          {c.tagline && <p className="mt-2 text-sm text-ink-soft">{c.tagline}</p>}
          <p className="mt-3 font-display text-3xl font-black tracking-tight">{c.price}</p>
          {c.note && <p className="text-sm font-bold text-ink-soft">{c.note}</p>}
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {features.map((f) => <li key={f} className="flex gap-2.5 text-[14px]"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sage/15 text-sage-deep dark:text-sage"><Check className="size-3" strokeWidth={3.5} /></span>{f}</li>)}
        </ul>
        {external ? <a href={c.url!} target="_blank" rel="noopener" className={btn}>{c.cta || 'Teklif al'} <ArrowRight className="size-4" /></a> : <Link to={c.url || '/contact?konu=corporate'} className={btn}>{c.cta || 'Teklif al'} <ArrowRight className="size-4" /></Link>}
      </div>
    </motion.div>
  )
}

function PriceCard({ name, tagline, price, was, note, badge, features, cta, featured }: { name: string; tagline: string; price: string; was?: string; note: string; badge?: string; features: string[]; cta: ReactNode; featured?: boolean }) {
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
          <p className={clsx('font-display font-black leading-none tracking-tight', price.length > 8 ? 'text-[2.1rem]' : 'text-5xl')}>{price}</p>
          {was && <p className="pb-1 text-sm font-bold text-ink-soft line-through">{was}</p>}
        </div>
        <p className="mt-1.5 text-sm font-bold text-ink-soft">{note}</p>
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
