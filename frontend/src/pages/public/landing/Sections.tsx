import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, Volume2 } from 'lucide-react'
import { leagueImg, rewardImg } from '@/lib/assets'
import { sfx } from '@/lib/fx'
import { SKILL, SKILLS } from '@/lib/skills'
import { LinkButton } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { SwipeDeck, type DeckWord, type Outcome } from '@/pages/app/games/WordGames'

const ease = [0.22, 1, 0.36, 1] as const

/* ------------------------------------------------------------- try it */

const TRY: DeckWord[] = [
  { id: null, word: 'journey', translation: 'yolculuk', example: 'The journey took five hours.', interval_days: 0 },
  { id: null, word: 'borrow', translation: 'ödünç almak', example: 'Can I borrow your pen?', interval_days: 0 },
  { id: null, word: 'confident', translation: 'kendinden emin', example: 'She felt confident in the interview.', interval_days: 0 },
  { id: null, word: 'receipt', translation: 'fiş', example: 'Can I have the receipt, please?', interval_days: 0 },
  { id: null, word: 'improve', translation: 'geliştirmek', example: 'I want to improve my English.', interval_days: 0 },
]

/** Try the product before signing up: a real swipe deck, right on the page. */
export function TryIt() {
  const [done, setDone] = useState<Outcome[] | null>(null)
  const [round, setRound] = useState(0)
  const known = done?.filter((o) => o.known).length ?? 0
  return (
    <section id="dene" className="relative overflow-hidden bg-[#11141c] py-20 text-white md:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(40rem_24rem_at_20%_20%,rgba(47,124,246,.25),transparent_70%),radial-gradient(40rem_24rem_at_90%_90%,rgba(232,64,58,.22),transparent_70%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_440px]">
        <div>
          <p className="mb-2 font-extrabold uppercase tracking-widest text-butter">Kaydolmadan dene</p>
          <h2 className="text-4xl leading-tight sm:text-5xl">Beş kelime, otuz saniye</h2>
          <p className="mt-4 max-w-lg text-lg text-white/70">Kartı sağa kaydırırsan biliyorsun, sola kaydırırsan tekrar edeceğiz. Anlamını görmek için karta dokun. Telefonda parmağınla, bilgisayarda ok tuşlarıyla.</p>
          <div className="mt-6 flex items-center gap-4 text-sm font-black">
            <span className="flex items-center gap-2 rounded-full bg-berry/20 px-3 py-1.5 text-berry">← Tekrar</span>
            <span className="flex items-center gap-2 rounded-full bg-mint/20 px-3 py-1.5 text-mint">Biliyorum →</span>
          </div>
        </div>
        <div className="arena-dark rounded-[32px] bg-paper p-5 ring-1 ring-white/10">
          {done ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-10 text-center">
              <p className="font-display text-6xl font-black">{known}/{done.length}</p>
              <p className="mt-2 text-ink-soft">{known === done.length ? 'Hepsini biliyordun! Seviyen sandığından yüksek olabilir.' : `${done.length - known} kelimeyi senin için tekrar listesine alırız.`}</p>
              <div className="mt-6 flex flex-col gap-2">
                <LinkButton to="/register" size="lg" block>Kaldığın yerden devam et</LinkButton>
                <button onClick={() => { setDone(null); setRound((r) => r + 1) }} className="text-sm font-bold text-ink-soft hover:text-ink">Tekrar dene</button>
              </div>
            </motion.div>
          ) : (
            <SwipeDeck key={round} deck={TRY} onFinish={(o) => setDone(o)} />
          )}
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
