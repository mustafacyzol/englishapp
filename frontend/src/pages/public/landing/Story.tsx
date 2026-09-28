import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, BadgeCheck, GraduationCap, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { img } from '@/lib/assets'
import { num } from '@/lib/format'
import { LinkButton } from '@/components/ui/Button'
import { Higo, higoImg, type HigoPose } from '@/components/game/Higo'
import { Defne } from '@/components/game/Defne'

const ease = [0.22, 1, 0.36, 1] as const
const obj = (n: string) => img(`3d/${n}.webp`)

/** A headline that arrives word by word. */
function Words({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduced = useReducedMotion()
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span className="inline-block" initial={reduced ? false : { y: '105%' }} animate={{ y: 0 }} transition={{ delay: delay + i * 0.07, duration: 0.6, ease }}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  )
}

const ROTATE = ['konuşarak', 'oynayarak', 'dinleyerek', 'yazarak']
function Rotor() {
  const [i, setI] = useState(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setI((x) => (x + 1) % ROTATE.length), 2300)
    return () => clearInterval(t)
  }, [reduced])
  return (
    <span className="relative inline-grid overflow-hidden pb-[0.08em] align-bottom">
      <span className="invisible col-start-1 row-start-1" aria-hidden>dinleyerek</span>
      <motion.span key={i} className="col-start-1 row-start-1 bg-gradient-to-r from-flame to-[#ff8a3d] bg-clip-text text-transparent" initial={reduced ? false : { y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.5, ease }}>
        {ROTATE[i]}
      </motion.span>
    </span>
  )
}

/** A 3D object floating on the hero stage, moved by both the pointer and the scroll. */
function Float({ src, className, px, py, depth, scroll, delay, alt = '' }: { src: string; className: string; px: MotionValue<number>; py: MotionValue<number>; depth: number; scroll: MotionValue<number>; delay: number; alt?: string }) {
  const x = useTransform(px, (v) => v * depth)
  const yPointer = useTransform(py, (v) => v * depth)
  const yScroll = useTransform(scroll, [0, 1], [0, -160 * depth])
  const y = useTransform([yPointer, yScroll] as MotionValue<number>[], ([a, b]: number[]) => a + b)
  return (
    <motion.img
      src={src}
      alt={alt}
      draggable={false}
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 140, damping: 14 }}
      className={clsx('pointer-events-none absolute select-none object-contain drop-shadow-[0_22px_28px_rgba(31,36,51,.18)]', className)}
    />
  )
}

/**
 * Hero: one promise, two actions and a living 3D stage. Higo stands in the
 * middle; the globe, microphone, book and trophy drift with the pointer and
 * rise at their own speed as the page scrolls.
 */
export function Hero3D({ learners }: { learners?: number }) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const px = useSpring(rawX, { stiffness: 60, damping: 18 })
  const py = useSpring(rawY, { stiffness: 60, damping: 18 })
  const stageY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 80])
  const copyFade = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const move = (e: React.PointerEvent) => {
    if (reduced) return
    const r = e.currentTarget.getBoundingClientRect()
    rawX.set(((e.clientX - r.left) / r.width - 0.5) * 40)
    rawY.set(((e.clientY - r.top) / r.height - 0.5) * 30)
  }
  const faces = ['headphones', 'fox', 'beanie', 'reader', 'grandpa']

  return (
    <section ref={ref} onPointerMove={move} className="relative isolate overflow-hidden">
      {/* backdrop: two soft brand pools and a fading hairline grid */}
      <div aria-hidden className="absolute inset-0 -z-10 [background:radial-gradient(56rem_32rem_at_78%_18%,color-mix(in_oklab,var(--color-flame)_14%,transparent),transparent_70%),radial-gradient(40rem_28rem_at_5%_95%,color-mix(in_oklab,var(--color-sky)_12%,transparent),transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-70 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(80%_65%_at_55%_25%,#000_15%,transparent_72%)]" />

      <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-10 pt-8 md:grid-cols-[1.1fr_1fr] md:gap-10 md:pb-24 md:pt-14">
        <motion.div style={{ opacity: copyFade }} className="relative z-10">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-line bg-card/80 py-1 pl-1 pr-3.5 text-sm font-extrabold backdrop-blur">
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-paper">Yeni</span>
            Defne ile sesli arama ve Higo geldi
          </motion.p>
          <h1 className="font-display text-[clamp(2.6rem,6.6vw,4.9rem)] font-black leading-[1] tracking-[-0.02em]">
            <Words text="İngilizceyi" /> <Rotor /><br className="hidden sm:block" /> <Words text="öğren." delay={0.15} />
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6, ease }} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Günde birkaç dakika. Kişisel yol haritası, seninle konuşan yapay zekâ öğretmen Defne, oyunlar ve düellolar. Bayrak Dil Okulları güvencesiyle.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6, ease }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/register" size="lg">Ücretsiz başla <ArrowRight className="size-5" /></LinkButton>
            <LinkButton to="/placement" size="lg" variant="secondary">Seviyemi bul · 3 dk</LinkButton>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 flex items-center gap-3">
            <span className="flex -space-x-2.5">
              {faces.map((f, i) => (
                <motion.img key={f} src={img(`avatars/${f}.webp`)} alt="" className="size-10 rounded-full border-[3px] border-card object-cover" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.65 + i * 0.06 }} />
              ))}
            </span>
            <span className="text-sm leading-tight">
              {learners && learners >= 1000 ? (
                <><span className="block font-extrabold">{num(learners)}+ öğrenci</span><span className="text-ink-soft">DilGO ile pratik yapıyor</span></>
              ) : (
                <><span className="block font-extrabold">Çocuk, genç ve yetişkin modu</span><span className="text-ink-soft">Herkes kendi yaşına uygun içerikle</span></>
              )}
            </span>
          </motion.div>
        </motion.div>

        {/* The stage */}
        <motion.div style={{ y: stageY }} className="relative mx-auto aspect-square w-full max-w-[520px]">
          <motion.span aria-hidden className="absolute inset-[12%] rounded-full bg-gradient-to-br from-flame/20 via-butter/15 to-sky/20 blur-2xl" animate={reduced ? undefined : { scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }} />
          <motion.span aria-hidden className="absolute inset-[16%] rounded-full border-2 border-dashed border-line" animate={reduced ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 70, ease: 'linear' }} />
          <motion.span aria-hidden className="absolute inset-[4%] rounded-full border border-line/70" animate={reduced ? undefined : { rotate: -360 }} transition={{ repeat: Infinity, duration: 110, ease: 'linear' }} />

          <Float src={obj('globe')} className="left-[2%] top-[8%] w-[27%]" px={px} py={py} depth={0.9} scroll={scrollYProgress} delay={0.5} />
          <Float src={obj('trophy')} className="right-[4%] top-[4%] w-[21%]" px={px} py={py} depth={0.6} scroll={scrollYProgress} delay={0.62} />
          <Float src={obj('mic')} className="right-[-2%] top-[46%] w-[23%]" px={px} py={py} depth={1.2} scroll={scrollYProgress} delay={0.74} />
          <Float src={obj('book')} className="bottom-[4%] left-[0%] w-[27%]" px={px} py={py} depth={0.7} scroll={scrollYProgress} delay={0.86} />

          <motion.div className="absolute left-1/2 top-[52%] w-[46%] -translate-x-1/2 -translate-y-1/2" initial={{ opacity: 0, y: 40, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 12 }}>
            <motion.img src={higoImg('wave')} alt="Higo, DilGO’nun maskotu" className="w-full drop-shadow-[0_30px_40px_rgba(200,60,20,.3)]" animate={reduced ? undefined : { y: [0, -12, 0], rotate: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }} />
            <span aria-hidden className="mx-auto mt-1 block h-4 w-2/3 rounded-[50%] bg-ink/10 blur-md" />
          </motion.div>

          {/* two tiny product moments */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.05, type: 'spring', stiffness: 160, damping: 16 }} className="absolute bottom-[12%] right-[2%] w-[210px] rounded-2xl bg-card p-3 shadow-soft ring-1 ring-line max-sm:hidden">
            <div className="mb-1.5 flex items-center gap-2"><Defne className="size-7" /><p className="text-sm font-black">Defne</p><span className="ml-auto text-[10px] font-extrabold uppercase tracking-wider text-mint-deep">düzeltti</span></div>
            <p className="text-sm"><s className="text-berry">I am agree</s> → <b className="text-mint-deep">I agree</b></p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="absolute left-[22%] top-[-2%] flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-black text-paper shadow-soft">
            <span className="size-2 rounded-full bg-mint" /> 13 günlük seri
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/** Honest trust points instead of borrowed logos. */
export function TrustBar() {
  const items = [
    { icon: GraduationCap, t: 'CEFR uyumlu müfredat', s: 'A1’den C1’e, 4 beceri' },
    { icon: BadgeCheck, t: 'Öğretmenler hazırlıyor', s: 'Bayrak Dil Okulları ekibi' },
    { icon: ShieldCheck, t: 'KVKK uyumlu, reklamsız', s: 'Çocuk hesapları veli onaylı' },
    { icon: Lock, t: 'Güvenli ödeme', s: 'İstediğin an iptal' },
  ]
  return (
    <section className="border-y-2 border-line bg-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-6 lg:grid-cols-4">
        {items.map((x, i) => (
          <motion.div key={x.t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: i * 0.07 }} className="flex items-center gap-3 px-2 py-2">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-flame ring-1 ring-line"><x.icon className="size-5" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-tight">{x.t}</span>
              <span className="block text-xs text-ink-soft">{x.s}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

const HIGO_STEPS: { pose: HigoPose; kicker: string; title: string; text: string }[] = [
  { pose: 'wave', kicker: 'Merhaba!', title: 'Ben Higo, konuşmayı öğrenmiş bir baloncuk.', text: 'DilGO’da her adımda yanındayım. İlk dersinden sınav gününe kadar.' },
  { pose: 'cheer', kicker: 'Doğru cevap', title: 'Her başarını seninle kutlarım.', text: 'Seri yaptıkça coşarım, ödüllerini birlikte açarız.' },
  { pose: 'think', kicker: 'Zor bir soru', title: 'Takıldığında birlikte düşünürüz.', text: 'Yanlışlar ceza değil: Türkçe açıklama ve ipucu hep hazır.' },
  { pose: 'music', kicker: 'Mola zamanı', title: 'Kelimeleri oyunla hatırlatırım.', text: 'Kelime yağmuru, balon kurtar, hafıza kartları. Ezber değil, eğlence.' },
]

/**
 * "Meet Higo": the mascot stays pinned while four short lines scroll past, and
 * he switches pose for each one. On phones it becomes a simple stack.
 */
export function MeetHigo() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [step, setStep] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => setStep(Math.min(HIGO_STEPS.length - 1, Math.floor(v * HIGO_STEPS.length))))
  const cur = HIGO_STEPS[step]
  return (
    <>
      {/* desktop: pinned */}
      <section ref={ref} className="relative hidden h-[360vh] lg:block" aria-label="Higo ile tanış">
        <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_30%_50%,color-mix(in_oklab,var(--color-butter)_16%,transparent),transparent_70%)]" />
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_1.1fr] items-center gap-16 px-5">
            <div className="relative grid place-items-center">
              <motion.span aria-hidden className="absolute size-[380px] rounded-full bg-gradient-to-br from-flame/15 to-butter/25" animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 5 }} />
              <Higo pose={cur.pose} className="relative size-[340px]" float />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Tanış: Higo</p>
              <div className="relative mt-4 min-h-[260px]">
                {HIGO_STEPS.map((s, i) => (
                  <motion.div key={s.title} className="absolute inset-0" initial={false} animate={{ opacity: i === step ? 1 : 0, y: i === step ? 0 : i < step ? -30 : 30 }} transition={{ duration: 0.45, ease }} aria-hidden={i !== step}>
                    <p className="mb-3 inline-block rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-wider text-paper">{s.kicker}</p>
                    <h2 className="font-display text-5xl font-black leading-[1.05] tracking-tight">{s.title}</h2>
                    <p className="mt-4 max-w-lg text-lg text-ink-soft">{s.text}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                {HIGO_STEPS.map((_, i) => <span key={i} className={clsx('h-1.5 rounded-full transition-all duration-300', i === step ? 'w-10 bg-flame' : 'w-4 bg-line')} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* phones and tablets: stacked */}
      <section className="px-5 py-16 lg:hidden" aria-label="Higo ile tanış">
        <p className="text-center text-sm font-black uppercase tracking-[0.2em] text-flame">Tanış: Higo</p>
        <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
          {HIGO_STEPS.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 2) * 0.08 }} className="flex items-center gap-4 rounded-3xl border-2 border-line bg-card p-4">
              <img src={higoImg(s.pose)} alt="" className="size-20 shrink-0 object-contain" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-flame">{s.kicker}</p>
                <p className="font-display text-lg font-black leading-tight">{s.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}

const WHY = [
  { o: 'book', tone: 'from-[#fff4e8] to-[#ffe2cc]', dark: false, kicker: '01 · Kişisel plan', title: 'Sana özel bir yol haritası', text: 'Hedefin, seviyen ve günlük süren ne ise plan ona göre kurulur. Her gün nereden devam edeceğini bilirsin.', points: ['Seviye testiyle doğru başlangıç', 'Dört beceri dengesi', 'Zayıf becerine ek pratik'] },
  { o: 'mic', tone: 'from-[#e9f1ff] to-[#d6e5ff]', dark: false, kicker: '02 · Konuşma', title: 'Konuşmaktan korkmadan konuş', text: 'Defne ile sesli arama yap, rol oyunlarıyla gerçek hayatı prova et. Hataların nazikçe, Türkçe açıklanır.', points: ['Sesli arama ve rol oyunları', 'Anında düzeltme', 'Telaffuz geri bildirimi'] },
  { o: 'globe', tone: 'from-[#e8fbf2] to-[#d2f4e4]', dark: false, kicker: '03 · Gerçek içerik', title: 'Dünyaya açılan hikâyeler', text: 'Seviyene göre hikâyeler, dizi dili, seyahat ve iş senaryoları. Dokunduğun kelime defterine eklenir.', points: ['A1-C1 hikâye kütüphanesi', 'Sesli okuma', 'Akıllı kelime defteri'] },
  { o: 'trophy', tone: 'from-[#1b2030] to-[#11141c]', dark: true, kicker: '04 · Motivasyon', title: 'Bırakmak istemeyeceğin bir alışkanlık', text: 'Seri, lig, Gölge Düellosu ve gizemli sandıklar. Ölçülü bir ekonomi: puanlar emekle kazanılır.', points: ['Haftalık ligler', '12 saniyelik düellolar', 'Gerçek iş ortağı hediyeleri'] },
  { o: 'shield', tone: 'from-[#f3efff] to-[#e6dfff]', dark: false, kicker: '05 · Güven', title: 'Ölçülebilir ve güvenli', text: 'Dört beceri karnesi, çalışma takvimi ve kurum raporları. Çocuk hesaplarında veli onayı, reklam yok.', points: ['Beceri karnesi', 'Kurum paneli', 'KVKK uyumlu'] },
] as const

/**
 * "Why DilGO": full-width cards that pin and stack as you scroll, each one
 * settling slightly smaller under the next, with its 3D object turning in.
 */
export function WhyStack() {
  return (
    <section id="neden" className="relative mx-auto max-w-6xl px-5 py-20">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Neden DilGO?</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[1.05] tracking-tight">En iyi dil uygulamalarının güçlü yanları, <span className="text-flame">tek bir yerde.</span></h2>
      </div>
      <div className="relative">
        {WHY.map((c, i) => <StackCard key={c.title} c={c} i={i} total={WHY.length} />)}
      </div>
    </section>
  )
}

function StackCard({ c, i, total }: { c: (typeof WHY)[number]; i: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1 - (total - i) * 0.015])
  const { scrollYProgress: enter } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const rot = useTransform(enter, [0, 1], [reduced ? 0 : -18, 0])
  const objY = useTransform(enter, [0, 1], [reduced ? 0 : 60, 0])
  return (
    <div ref={ref} className={clsx('sticky', i < total - 1 ? 'mb-[22vh]' : 'mb-0')} style={{ top: `calc(96px + ${i * 22}px)` }}>
      <motion.article style={{ scale }} className={clsx('relative grid origin-top overflow-hidden rounded-[32px] bg-gradient-to-br p-6 ring-1 ring-black/5 sm:p-10 md:grid-cols-[1.3fr_1fr] md:items-center md:gap-8', c.tone, c.dark ? 'text-white' : 'text-[#1f2433]')}>
        <div className="relative z-10">
          <p className={clsx('text-xs font-black uppercase tracking-[0.2em]', c.dark ? 'text-butter' : 'text-flame')}>{c.kicker}</p>
          <h3 className="mt-3 font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-black leading-[1.08]">{c.title}</h3>
          <p className={clsx('mt-3 max-w-lg text-[17px] leading-relaxed', c.dark ? 'text-white/75' : 'text-[#1f2433]/75')}>{c.text}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {c.points.map((p) => <li key={p} className={clsx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold', c.dark ? 'bg-white/10' : 'bg-white/70')}><Sparkles className={clsx('size-3.5', c.dark ? 'text-butter' : 'text-flame')} />{p}</li>)}
          </ul>
        </div>
        <motion.img src={obj(c.o)} alt="" style={{ rotate: rot, y: objY }} className="pointer-events-none mx-auto mt-6 w-40 drop-shadow-[0_30px_30px_rgba(0,0,0,.18)] sm:w-52 md:mt-0 md:w-64" />
      </motion.article>
    </div>
  )
}

/** Closing call to action: Higo cheers, the headline lands word by word. */
export function FinalCta3D() {
  return (
    <section className="px-5 pb-24 pt-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-gradient-to-br from-flame to-[#d9391f] px-6 py-14 text-white sm:px-14 sm:py-16">
        <div aria-hidden className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,.7)_1px,transparent_1.3px)] [background-size:22px_22px]" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }} className="font-display text-[clamp(2.1rem,5vw,3.8rem)] font-black leading-[1.02] tracking-tight">Bugün başla,<br />yarın konuş.</motion.h2>
            <p className="mt-4 max-w-md text-lg text-white/85">İlk dersin 5 dakika. Kredi kartı gerekmez, istediğin an bırakabilirsin.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/register" size="lg" variant="secondary">Ücretsiz hesap aç <ArrowRight className="size-5" /></LinkButton>
              <LinkButton to="/contact?konu=corporate" size="lg" variant="ghost" className="text-white hover:bg-white/10">Kurumsal teklif</LinkButton>
            </div>
          </div>
          <motion.img src={higoImg('cheer')} alt="" initial={{ opacity: 0, y: 40, rotate: -10 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 120, damping: 12 }} className="mx-auto w-52 drop-shadow-[0_30px_30px_rgba(80,10,0,.35)] sm:w-64" />
        </div>
      </div>
    </section>
  )
}
