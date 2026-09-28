import { useRef, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, Check, Volume2 } from 'lucide-react'
import { img, leagueImg, PHOTO, rewardImg } from '@/lib/assets'
import { sfx } from '@/lib/fx'
import { SKILL, SKILLS } from '@/lib/skills'
import { LinkButton } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { SwipeDeck, type DeckWord, type Outcome } from '@/pages/app/games/WordGames'
import { DefneMock, DuelMock, ExamMock, PathMock, Phone, ScaledPhone, SwipeMock } from './Mocks'

const ease = [0.22, 1, 0.36, 1] as const

/* -------------------------------------------------------- audience tabs */

const AUDIENCES = [
  { key: 'kid', tab: 'Çocuklar', age: '7-12 yaş', photo: img('onboarding/games.webp'), title: 'Oyun gibi, güvenli ve sade', points: ['Kısa cümleler, bol teşvik, çocuğa uygun konular', 'Yalnızca yaşıtlarıyla düello, reklam yok', 'Veli raporu ve günlük süre hedefi'], cta: 'Çocuğum için başla', color: 'bg-butter' },
  { key: 'teen', tab: 'Gençler', age: '13-17 yaş', photo: img('onboarding/music.webp'), title: 'Okul, dizi, müzik, oyun', points: ['İlgi alanına göre hikâyeler ve sohbetler', 'Arkadaşlarınla lig ve Gölge Düellosu', 'YKS-YDT hazırlığı isteğe bağlı'], cta: 'Hemen başla', color: 'bg-sky' },
  { key: 'adult', tab: 'Yetişkinler', age: '18+', photo: PHOTO.hero, title: 'İş, seyahat, özgüven', points: ['Toplantı, mülakat ve seyahat senaryoları', 'Defne ile sesli arama provası', 'Günde 5-20 dakikalık esnek plan'], cta: 'Ücretsiz dene', color: 'bg-flame' },
  { key: 'exam', tab: 'Sınava hazırlık', age: 'YDS · YÖKDİL · YDT · IELTS · TOEFL', photo: PHOTO.write, title: 'Gerçek formatta, Türkçe çözümle', points: ['ÖSYM formatında 5 seçenekli sorular', 'Her sorudan sonra neden doğru, neden yanlış', 'Zayıf bölüm önerisi ve sınav geri sayımı'], cta: 'Sınav hedefimi seç', color: 'bg-lilac' },
  { key: 'org', tab: 'Okul ve şirketler', age: 'Kurumsal', photo: PHOTO.classroom, title: 'Sınıfınız tek panelde', points: ['Kendi logonuzla kurum paneli', 'Sınıf karnesi, dört beceri raporu', 'E-posta ya da kodla toplu katılım'], cta: 'Kurumsal teklif alın', color: 'bg-sage' },
] as const

/** Audience-first, like the best classroom platforms: pick who you are, see what you get. */
export function Audiences() {
  const [a, setA] = useState<(typeof AUDIENCES)[number]['key']>('adult')
  const cur = AUDIENCES.find((x) => x.key === a)!
  return (
    <section id="kimler-icin" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Kimin için?</p>
        <h2 className="text-4xl leading-tight sm:text-5xl">Herkese aynı uygulama değil, herkese kendi uygulaması</h2>
      </div>
      <div className="no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5" role="tablist">
        {AUDIENCES.map((x) => (
          <button key={x.key} role="tab" aria-selected={a === x.key} onClick={() => setA(x.key)} className={clsx('relative shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition', a === x.key ? 'text-paper' : 'text-ink-soft hover:text-ink')}>
            {a === x.key && <motion.span layoutId="aud" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <span className="relative">{x.tab}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={a} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease }} className="grid overflow-hidden rounded-[32px] border-2 border-line bg-card md:grid-cols-[1fr_1.1fr]">
          <div className="relative min-h-60 md:min-h-[380px]">
            <Img src={cur.photo} alt="" className="photo" />
            <span className={clsx('absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black text-white', cur.color)}>{cur.age}</span>
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <h3 className="text-3xl leading-tight">{cur.title}</h3>
            <ul className="mt-6 space-y-3">
              {cur.points.map((p) => <li key={p} className="flex gap-3 text-lg"><span className={clsx('mt-1 grid size-6 shrink-0 place-items-center rounded-full text-white', cur.color)}><Check className="size-3.5" strokeWidth={3.5} /></span>{p}</li>)}
            </ul>
            <LinkButton to={a === 'org' ? '/contact?konu=corporate' : '/register'} size="lg" className="mt-8 self-start" variant="dark">{cur.cta}</LinkButton>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

/* ------------------------------------------- scroll-pinned feature story */

const STEPS: { kicker: string; title: string; text: string; Mock: ComponentType; tint: string }[] = [
  { kicker: 'Alışkanlık', title: 'Her gün bir durak', text: 'Kısa derslerden oluşan bir yol haritası. “Buradasın” işareti nerede kaldığını, seri alevin kaç gündür çalıştığını gösterir.', Mock: PathMock, tint: 'var(--color-flame)' },
  { kicker: 'Kelime', title: 'Kaydır, ezberle, unutma', text: 'Sağa biliyorum, sola tekrar. Aralıklı tekrar bilmediğin kelimeyi tam unutacağın gün geri getirir; beş ayrı kelime oyunuyla sıkılmazsın.', Mock: SwipeMock, tint: 'var(--color-sky)' },
  { kicker: 'Rekabet', title: '12 saniyelik düellolar', text: 'Gölge Düellosu’nda rakibin gölgesi seninle aynı soruları canlı cevaplar. Hız bonusu, seri çarpanı, kupalar ve ligler.', Mock: DuelMock, tint: 'var(--color-lilac)' },
  { kicker: 'Konuşma', title: 'Seninle konuşan öğretmen', text: 'Defne ile sesli arama yap, rol oyunlarında pratik yap. Hatalarını Türkçe açıklar, seviyene ve yaşına göre konuşur.', Mock: DefneMock, tint: 'var(--color-sage)' },
  { kicker: 'Sınav', title: 'Hedefin sınavsa, sınav modu', text: 'YDS, YÖKDİL, YDT, IELTS ve TOEFL formatında sorular, her birine Türkçe çözüm. Yalnızca sınav hedefi seçenlere açılır.', Mock: ExamMock, tint: 'var(--color-butter)' },
]

/**
 * The five strengths as one scroll story. On large screens the phone is pinned
 * and its screen changes with scroll progress while the matching step lights up;
 * on phones the same content becomes a simple stack of cards.
 */
export function FeatureStory() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const [i, setI] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => setI(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length))))
  const rotate = useTransform(progress, [0, 1], reduced ? [0, 0] : [-4, 4])
  const S = STEPS[i]

  return (
    <section id="nasil" ref={ref} className="relative lg:h-[480vh]">
      {/* large screens: pinned */}
      <div className="sticky top-0 hidden h-dvh overflow-hidden lg:block">
        <motion.div aria-hidden className="absolute inset-0 transition-colors duration-700" style={{ background: `radial-gradient(60rem 36rem at 75% 50%, color-mix(in oklab, ${S.tint} 14%, transparent), transparent 70%)` }} />
        <div className="relative mx-auto grid h-full max-w-6xl grid-cols-[1fr_auto] items-center gap-16 px-5 pt-16">
          <div>
            <p className="mb-3 font-extrabold uppercase tracking-widest text-flame">Tek uygulama, beş güç</p>
            <ol className="relative space-y-2 border-l-2 border-line pl-8">
              <motion.span aria-hidden className="absolute -left-[2px] top-0 w-[2px] origin-top bg-ink" style={{ height: '100%', scaleY: progress }} />
              {STEPS.map((s, k) => (
                <li key={s.title} className={clsx('transition-all duration-500', k === i ? 'opacity-100' : 'opacity-35')}>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ink-soft">{String(k + 1).padStart(2, '0')} · {s.kicker}</p>
                  <h3 className={clsx('font-display font-black leading-tight transition-all duration-500', k === i ? 'text-4xl' : 'text-2xl')}>{s.title}</h3>
                  <AnimatePresence initial={false}>
                    {k === i && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="max-w-md overflow-hidden pb-4 pt-2 text-lg leading-relaxed text-ink-soft">
                        {s.text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </li>
              ))}
            </ol>
          </div>
          <motion.div style={{ rotate }} className="relative w-[min(340px,calc((100dvh-150px)*0.4865))]">
            <Phone>
              <AnimatePresence mode="popLayout">
                <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -40, scale: 0.96 }} transition={{ duration: 0.45, ease }}>
                  <S.Mock />
                </motion.div>
              </AnimatePresence>
            </Phone>
          </motion.div>
        </div>
      </div>

      {/* phones and tablets: stacked */}
      <div className="mx-auto max-w-xl space-y-6 px-5 py-16 lg:hidden">
        <p className="font-extrabold uppercase tracking-widest text-flame">Tek uygulama, beş güç</p>
        {STEPS.map((s, k) => (
          <motion.article key={s.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.5, ease }} className="overflow-hidden rounded-[28px] border-2 border-line bg-card">
            <div className="p-5 pb-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-soft">{String(k + 1).padStart(2, '0')} · {s.kicker}</p>
              <h3 className="mt-1 text-2xl leading-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
            </div>
            <div className="flex justify-center" style={{ background: `color-mix(in oklab, ${s.tint} 12%, transparent)` }}>
              <div className="pt-5"><ScaledPhone width={220} crop={300}><s.Mock /></ScaledPhone></div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

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
