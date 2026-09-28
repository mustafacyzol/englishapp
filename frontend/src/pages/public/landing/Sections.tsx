import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, Check, Volume2 } from 'lucide-react'
import { img, leagueImg, rewardImg } from '@/lib/assets'
import { sfx } from '@/lib/fx'
import { SKILL, SKILLS } from '@/lib/skills'
import { LinkButton } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { QuickChoice, SwipeDeck, type DeckWord, type Outcome } from '@/pages/app/games/WordGames'

const ease = [0.22, 1, 0.36, 1] as const

/* ------------------------------------------------------------- try it */

const TRY: DeckWord[] = [
  { id: null, word: 'journey', translation: 'yolculuk', example: 'The journey took five hours.', interval_days: 0 },
  { id: null, word: 'borrow', translation: 'ödünç almak', example: 'Can I borrow your pen?', interval_days: 0 },
  { id: null, word: 'confident', translation: 'kendinden emin', example: 'She felt confident in the interview.', interval_days: 0 },
  { id: null, word: 'receipt', translation: 'fiş', example: 'Can I have the receipt, please?', interval_days: 0 },
  { id: null, word: 'improve', translation: 'geliştirmek', example: 'I want to improve my English.', interval_days: 0 },
]

const TRY_STEPS = [
  { t: 'Kelime kartları', d: 'Sağa biliyorum, sola tekrar.' },
  { t: 'Hızlı anlam', d: 'Doğru Türkçesini seç.' },
  { t: 'Sonucun', d: 'Kazandığın XP ve planın.' },
]

/**
 * "60 seconds of DilGO": a real mini lesson on the page. Five words on swipe
 * cards, then a quick meaning round with the same words, then a result with the
 * XP it would earn. A step rail on the left shows where you are.
 */
export function TryIt() {
  const [step, setStep] = useState(0)
  const [a, setA] = useState<Outcome[]>([])
  const [b, setB] = useState<Outcome[]>([])
  const [round, setRound] = useState(0)
  const known = b.filter((o) => o.known).length
  const xp = a.length + known
  const restart = () => { setStep(0); setA([]); setB([]); setRound((r) => r + 1) }
  return (
    <section id="dene" className="relative overflow-hidden py-20 md:py-28">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(46rem_26rem_at_15%_20%,color-mix(in_oklab,var(--color-sky)_10%,transparent),transparent_70%),radial-gradient(40rem_26rem_at_90%_85%,color-mix(in_oklab,var(--color-flame)_9%,transparent),transparent_70%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_460px]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Şimdi dene</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-black leading-[1.08] tracking-tight">60 saniyelik bir mini ders.</h2>
          <p className="mt-4 max-w-lg text-lg text-ink-soft">Hesap açmadan uygulamanın içinden küçük bir parça. Beş kelime, iki etkinlik, bir sonuç.</p>
          <ol className="mt-8 space-y-3">
            {TRY_STEPS.map((x, k) => {
              const on = k === step
              const done = k < step
              return (
                <li key={x.t} className={clsx('flex items-center gap-4 rounded-2xl px-4 py-3 transition', on ? 'bg-card shadow-[0_14px_30px_-18px_rgba(31,36,51,.35)] ring-1 ring-line' : '')}>
                  <span className={clsx('grid size-10 shrink-0 place-items-center rounded-full font-display font-black transition', done ? 'bg-mint text-white' : on ? 'bg-flame text-white' : 'bg-paper-2 text-ink-soft')}>{done ? <Check className="size-5" strokeWidth={3} /> : k + 1}</span>
                  <span>
                    <span className={clsx('block font-display text-lg font-black', !on && !done && 'text-ink/60')}>{x.t}</span>
                    <span className="block text-sm text-ink-soft">{x.d}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-[32px] bg-card p-5 shadow-[0_40px_80px_-40px_rgba(31,36,51,.45)] ring-1 ring-line sm:p-6">
            <div className="mb-4 flex gap-1.5">{TRY_STEPS.map((_, k) => <span key={k} className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2"><motion.span className="block h-full rounded-full bg-flame" initial={false} animate={{ width: k < step ? '100%' : k === step ? '35%' : '0%' }} /></span>)}</div>
            <AnimatePresence mode="wait">
              <motion.div key={`${step}-${round}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
                {step === 0 && <SwipeDeck deck={TRY} onFinish={(o) => { setA(o); setStep(1) }} />}
                {step === 1 && <QuickChoice deck={TRY} onFinish={(o) => { setB(o); setStep(2) }} />}
                {step === 2 && (
                  <div className="py-6 text-center">
                    <img src={img('higo/cheer.webp')} alt="" className="mx-auto w-28" />
                    <p className="mt-2 font-display text-5xl font-black">{known}/{b.length}</p>
                    <p className="text-ink-soft">doğru anlam</p>
                    <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-2 text-left">
                      <span className="rounded-2xl bg-paper-2 p-3"><span className="block font-display text-2xl font-black text-flame">+{xp} XP</span><span className="text-xs font-bold text-ink-soft">bu mini derste</span></span>
                      <span className="rounded-2xl bg-paper-2 p-3"><span className="block font-display text-2xl font-black">{a.filter((o) => !o.known).length + b.filter((o) => !o.known).length}</span><span className="text-xs font-bold text-ink-soft">tekrar listesine</span></span>
                    </div>
                    <LinkButton to="/register" size="lg" block className="mt-6 gap-2">Hesabını aç, kaydedelim <ArrowRight className="size-5" /></LinkButton>
                    <button onClick={restart} className="mt-3 text-sm font-bold text-ink-soft hover:text-ink">Baştan dene</button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------ bento: the hooks */

/** Why people come back tomorrow: the game layer as a bento grid that assembles on scroll. */
export function Bento() {
  const tile = 'relative overflow-hidden rounded-[28px] border-2 border-line bg-card p-5'
  const up = (d = 0) => ({ initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.55, delay: d, ease } })
  return (
    <section id="oduller" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="mb-10 max-w-2xl">
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Neden yarın da açarsın?</p>
        <h2 className="text-4xl leading-tight sm:text-5xl">Oyun gibi, ama sonunda gerçekten konuşuyorsun</h2>
      </div>
      <div className="grid auto-rows-[minmax(170px,auto)] gap-4 md:grid-cols-4">
        <motion.div {...up()} className={clsx(tile, 'md:col-span-2 md:row-span-2')}>
          <p className="text-xs font-black uppercase tracking-widest text-ink-soft">Dört beceri</p>
          <h3 className="mt-1 text-2xl">Okuma, dinleme, konuşma, yazma dengede</h3>
          <div className="mt-6 space-y-3">
            {SKILLS.map((k, i) => {
              const Sk = SKILL[k]
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className={clsx('grid size-9 place-items-center rounded-xl text-white', Sk.bg)}><Sk.icon className="size-4" /></span>
                  <span className="w-20 text-sm font-bold">{Sk.label}</span>
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-paper-2"><motion.span className={clsx('block h-full rounded-full', Sk.bg)} initial={{ width: 0 }} whileInView={{ width: `${[78, 64, 52, 70][i]}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 + i * 0.1, ease }} /></span>
                </div>
              )
            })}
          </div>
          <p className="mt-5 text-sm text-ink-soft">Her gün her beceriden bir görev; en geride kalanı Defne öne alır.</p>
        </motion.div>
        <motion.div {...up(0.05)} className={clsx(tile, 'flex flex-col justify-between')}>
          <Img src={rewardImg('flame')} alt="" className="size-14 object-contain" />
          <div><p className="font-display text-2xl font-black">Seri</p><p className="text-sm text-ink-soft">Gerçek bir çalışma yaptığın her gün büyür; dondurucu kaçırdığın günü korur.</p></div>
        </motion.div>
        <motion.div {...up(0.1)} className={clsx(tile, 'flex flex-col justify-between')}>
          <Img src={leagueImg(6)} alt="" className="size-14 object-contain" />
          <div><p className="font-display text-2xl font-black">Ligler</p><p className="text-sm text-ink-soft">10 kademe, haftalık terfi. XP günlük sınırlı, yani adil.</p></div>
        </motion.div>
        <motion.div {...up(0.15)} className={clsx(tile, 'flex flex-col justify-between')}>
          <Img src={rewardImg('chest')} alt="" className="size-14 object-contain" />
          <div><p className="font-display text-2xl font-black">Gizemli sandık</p><p className="text-sm text-ink-soft">Olasılıklar açık. İçinden iş ortaklarımızın hediyeleri çıkabilir.</p></div>
        </motion.div>
        <motion.button {...up(0.2)} onClick={() => sfx.correct(0)} className={clsx(tile, 'group flex flex-col justify-between text-left')}>
          <span className="grid size-14 place-items-center rounded-2xl bg-flame text-white transition group-hover:scale-105"><Volume2 className="size-7" /></span>
          <div><p className="font-display text-2xl font-black">“Dil-GO!”</p><p className="text-sm text-ink-soft">Doğru cevabın sesi. Dokun, dinle.</p></div>
        </motion.button>
      </div>
    </section>
  )
}

export function MiniCta() {
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5">
      <p className="font-display text-2xl font-black">Seviyeni bilmiyor musun?</p>
      <Link to="/placement" className="flex items-center gap-2 font-extrabold text-flame hover:underline">3 dakikalık seviye testi <ArrowRight className="size-5" /></Link>
    </div>
  )
}
