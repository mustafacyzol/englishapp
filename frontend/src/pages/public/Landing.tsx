import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import clsx from 'clsx'
import { ArrowRight, Check } from 'lucide-react'
import { get } from '@/lib/api'
import { tl } from '@/lib/format'
import type { Plan } from '@/lib/types'
import { PHOTO, rewardImg, leagueImg, badgeImg, storyImg } from '@/lib/assets'
import { LinkButton } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Page'
import { Ada } from '@/components/game/Ada'

interface LandingData { learners: number; stories: number; plans: Plan[] }

export default function Landing() {
  const { data } = useQuery({ queryKey: ['landing'], queryFn: () => get<LandingData>('/landing') })
  return (
    <>
      <Hero />
      <Proof />
      <FourSkills />
      <MeetAda />
      <GameLoop />
      <School />
      <Pricing plans={data?.plans} />
      <Faq />
      <FinalCta />
    </>
  )
}

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 80])
  return (
    <section ref={ref} className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 lg:grid-cols-[1fr_1.05fr] lg:pb-24 lg:pt-16">
      <div>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 inline-flex items-center gap-2 rounded-full bg-mint/12 px-3 py-1.5 text-sm font-extrabold text-mint-deep">
          <span className="size-2 rounded-full bg-mint" /> Bayrak Dil Okulları güvencesiyle
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.02]">
          İngilizceyi okuyarak, dinleyerek, <span className="text-flame">konuşarak</span> öğren.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
          Seviyene göre hikayeler, 5 dakikalık dersler ve seni tanıyan yapay zekâ öğretmenin Ada. Her gün biraz çalış, seri yap, ödülleri topla.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
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
        <motion.div style={{ y }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative aspect-[4/3.4] overflow-hidden rounded-[32px]">
          <img src={PHOTO.hero} alt="Telefonundan İngilizce çalışan genç bir kadın" className="photo" fetchPriority="high" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="absolute -left-3 bottom-8 flex items-center gap-3 rounded-2xl bg-card p-3 pr-5 shadow-soft sm:-left-8">
          <img src={rewardImg('flame')} alt="" className="size-11 animate-float object-contain" />
          <div>
            <p className="text-2xl font-black leading-none">47 gün</p>
            <p className="text-xs font-bold text-ink-soft">kesintisiz seri</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="absolute -right-2 top-6 max-w-[250px] rounded-2xl bg-card p-3 shadow-soft sm:-right-6">
          <div className="mb-2 flex items-center gap-2">
            <Ada className="size-8" />
            <p className="text-sm font-black">Ada</p>
          </div>
          <p className="text-sm"><s className="text-berry">I am agree</s> → <b className="text-mint-deep">I agree</b></p>
          <p className="mt-1 text-xs text-ink-soft">"agree" zaten bir fiil, yanına "am" gelmez.</p>
        </motion.div>
      </div>
    </section>
  )
}

function Proof() {
  const items = [['6', 'seviye (A1–C2)'], ['4', 'beceri tek yerde'], ['38', 'rozet ve ödül'], ['1', 'gerçek dil okulu']]
  return (
    <section className="border-y-2 border-line bg-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
        {items.map(([n, l], i) => (
          <Reveal key={l} delay={i * 0.05} className="text-center">
            <p className="text-4xl font-black text-flame">{n}</p>
            <p className="mt-1 font-bold text-ink-soft">{l}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const SKILLS = [
  { title: 'Oku', photo: PHOTO.read, color: 'text-butter-deep', text: 'Seviyene uygun kısa hikayeler. Bilmediğin kelimeye dokun, anlamını gör, kelime defterine ekle.' },
  { title: 'Dinle', photo: PHOTO.listen, color: 'text-sky', text: 'Her hikaye ve cümle doğal sesle okunur. Hızı ayarla, dinleyerek yaz, kulağını alıştır.' },
  { title: 'Konuş', photo: PHOTO.speak, color: 'text-flame', text: 'Mikrofona konuş, telaffuzun anında kontrol edilsin. Ada ile kafede, havalimanında, mülakatta pratik yap.' },
  { title: 'Yaz', photo: PHOTO.write, color: 'text-mint-deep', text: 'Yazma atölyesi metnini puanlar, hatalarını Türkçe açıklar ve düzeltilmiş halini gösterir.' },
]

function FourSkills() {
  return (
    <section id="beceriler" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mb-12 max-w-2xl">
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Dört beceri</p>
        <h2 className="text-4xl leading-tight sm:text-5xl">Sadece kelime ezberi değil. Gerçek İngilizce.</h2>
      </Reveal>
      <div className="grid gap-6 sm:grid-cols-2">
        {SKILLS.map((s, i) => (
          <Reveal key={s.title} delay={(i % 2) * 0.08}>
            <article className="group overflow-hidden rounded-3xl border-2 border-line bg-card">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={s.photo} alt="" loading="lazy" className="photo transition duration-700 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <h3 className={clsx('text-3xl', s.color)}>{s.title}</h3>
                <p className="mt-2 text-lg text-ink-soft">{s.text}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function MeetAda() {
  return (
    <section className="bg-sky/8 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px]">
            <img src={PHOTO.adaWave} alt="AI İngilizce öğretmeni Ada" loading="lazy" className="aspect-[4/3] w-full object-cover" />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mb-2 font-extrabold uppercase tracking-widest text-sky">Yapay zekâ öğretmenin</p>
          <h2 className="text-4xl leading-tight sm:text-5xl">Ada ile tanış. Seni tanıyan öğretmen.</h2>
          <ul className="mt-8 space-y-4 text-lg">
            {[
              'Seviyeni, hedefini ve kaydettiğin kelimeleri bilir.',
              'Hatanı bulur, Türkçe açıklar, doğrusunu gösterir.',
              'Kafe, havalimanı, doktor, iş mülakatı, IELTS: gerçek sahnelerde konuşursun.',
              'Yazılı ya da sesli. Gece yarısı bile hazır.',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-sky text-white"><Check className="size-4" strokeWidth={3} /></span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <LinkButton to="/register" className="mt-8" size="lg">Ada ile konuşmaya başla</LinkButton>
        </Reveal>
      </div>
    </section>
  )
}

function GameLoop() {
  const cards = [
    { img: rewardImg('flame'), title: 'Seri', text: 'Her gün hedefini tamamla, serin büyüsün. 7, 30 ve 100. günde büyük ödüller.' },
    { img: leagueImg(4), title: '10 lig', text: "Bronz'dan Elmas'a. Her hafta 30 kişilik grupta yarış, ilk 7 terfi eder." },
    { img: badgeImg('stories'), title: '38 rozet', text: 'Okudukça, konuştukça, yazdıkça yeni rozetler aç.' },
    { img: rewardImg('voucher'), title: 'Gerçek ödüller', text: 'Kazandığın canlı ders kuponlarını okulumuzda gerçek öğretmenle kullan.' },
  ]
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mb-12 text-center">
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Oyun gibi</p>
        <h2 className="mx-auto max-w-2xl text-4xl leading-tight sm:text-5xl">Her gün geri dönmek için bir sebep.</h2>
      </Reveal>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.06}>
            <div className="h-full rounded-3xl border-2 border-line bg-card p-6 text-center transition hover:-translate-y-1 hover:shadow-soft">
              <img src={c.img} alt="" loading="lazy" className="mx-auto size-28 object-contain" />
              <h3 className="mt-4 text-2xl">{c.title}</h3>
              <p className="mt-2 text-ink-soft">{c.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function School() {
  return (
    <section className="px-5 py-12">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px]">
        <img src={PHOTO.classroom} alt="Bayrak Dil Okulları sınıfı" loading="lazy" className="h-[520px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center p-8 text-white sm:p-14">
          <p className="mb-3 font-extrabold uppercase tracking-widest text-butter">Arkasında gerçek bir okul var</p>
          <h2 className="text-4xl leading-tight sm:text-5xl">Uygulamada çalış, sınıfta konuş.</h2>
          <p className="mt-5 text-lg text-white/85">DilGO, Bayrak Dil Okulları'nın öğretmenleri tarafından hazırlanan müfredatla çalışır. Ödül kasandaki canlı ders kuponlarıyla gerçek öğretmenlerimizle pratik yaparsın.</p>
          <Link to="/about" className="mt-7 inline-flex items-center gap-2 font-extrabold text-butter hover:underline">Okulumuzu tanı <ArrowRight className="size-5" /></Link>
        </div>
      </Reveal>
    </section>
  )
}

const FALLBACK_PLANS: Plan[] = [
  { id: 1, slug: 'monthly', name: 'Aylık', tagline: 'Esnek başla', interval: 'month', duration_days: 30, price: '149', compare_at_price: null, currency: 'TRY', features: ['Sınırsız can', 'Tüm hikayeler ve sesli okumalar', 'Günde 200 AI mesajı'], badge: null, bonus_gems: 0, live_lesson_credits: 0, is_featured: false },
  { id: 2, slug: 'quarterly', name: '3 Aylık', tagline: 'Alışkanlık kur', interval: 'quarter', duration_days: 90, price: '349', compare_at_price: '447', currency: 'TRY', features: ['Aylık paketin tüm özellikleri', '500 bonus elmas', '1 canlı ders kuponu'], badge: 'En popüler', bonus_gems: 500, live_lesson_credits: 1, is_featured: true },
  { id: 3, slug: 'yearly', name: 'Yıllık', tagline: 'Akıcılığa kadar', interval: 'year', duration_days: 365, price: '999', compare_at_price: '1788', currency: 'TRY', features: ['Tüm Premium özellikler', '4 canlı ders kuponu', 'CEFR seviye sertifikası'], badge: '%44 tasarruf', bonus_gems: 2000, live_lesson_credits: 4, is_featured: false },
]

export function PlanCards({ plans, cta }: { plans: Plan[]; cta: (p: Plan) => React.ReactNode }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((p) => (
        <div key={p.id} className={clsx('relative flex flex-col rounded-3xl border-2 bg-card p-7', p.is_featured ? 'border-flame shadow-soft' : 'border-line')}>
          {p.badge && <span className={clsx('absolute -top-3.5 left-7 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white', p.is_featured ? 'bg-flame' : 'bg-mint')}>{p.badge}</span>}
          <p className="text-2xl font-black">{p.name}</p>
          <p className="text-ink-soft">{p.tagline}</p>
          <div className="my-6 flex items-end gap-2">
            <span className="text-5xl font-black leading-none">{tl(p.price)}</span>
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
      <Reveal className="mb-12 text-center">
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Paketler</p>
        <h2 className="text-4xl sm:text-5xl">Ücretsiz başla, hazır olunca yüksel.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">Dersler, seçili hikayeler ve günde 10 AI mesajı her zaman ücretsiz.</p>
      </Reveal>
      <Reveal><PlanCards plans={plans?.length ? plans : FALLBACK_PLANS} cta={(p) => <LinkButton to="/register" variant={p.is_featured ? 'primary' : 'secondary'} block>Başla</LinkButton>} /></Reveal>
    </section>
  )
}

function Faq() {
  const qs = [
    ['Gerçekten ücretsiz mi?', 'Evet. Tüm ders yolu, seçili hikayeler, kelime tekrarları ve günde 10 AI mesajı ücretsizdir. Premium; sınırsız can, tüm hikayeler, daha fazla AI pratiği ve canlı ders kuponları ekler.'],
    ['Seviyemi bilmiyorum, nereden başlamalıyım?', '3 dakikalık seviye testiyle seviyeni bul; ders yolun otomatik olarak sana göre ayarlanır.'],
    ['Canlı ders kuponu nasıl çalışır?', "Kuponu Ödüller sayfasında açtığında sana özel bir kod oluşur. Bu kodla Bayrak Dil Okulları'nda online ya da şubede ücretsiz ders alırsın."],
    ['Telefonumda kullanabilir miyim?', 'Evet. DilGO tarayıcıda çalışır; iOS ve Android uygulamaları da aynı hesabı kullanır.'],
    ['Verilerim güvende mi?', 'Şifreler şifrelenerek saklanır, hesabın e-posta kodlarıyla korunur ve KVKK kapsamında hesabını istediğin an silebilirsin.'],
  ]
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24">
      <Reveal><h2 className="mb-8 text-center text-4xl">Sık sorulanlar</h2></Reveal>
      <div className="space-y-3">
        {qs.map(([q, a]) => (
          <details key={q} className="group rounded-2xl border-2 border-line bg-card px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-lg font-extrabold">
              {q}
              <span className="text-2xl text-ink-soft transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="px-5 pb-24">
      <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-8 overflow-hidden rounded-[36px] bg-flame px-6 py-16 text-center text-white md:flex-row md:text-left">
        <div className="flex -space-x-6">
          {['the-cat-who-loved-tea', 'mias-first-day-in-london', 'the-red-umbrella'].map((s, i) => (
            <img key={s} src={storyImg(s)} alt="" loading="lazy" className="size-28 rounded-3xl border-4 border-flame object-cover" style={{ transform: `translateY(${i % 2 ? 12 : 0}px)` }} />
          ))}
        </div>
        <div className="flex-1">
          <h2 className="text-4xl">İlk hikayen seni bekliyor.</h2>
          <p className="mt-2 text-lg text-white/85">Hesap oluşturmak 1 dakika. Kredi kartı gerekmez.</p>
        </div>
        <Link to="/register" className="press rounded-2xl bg-white px-8 py-4 text-lg font-black uppercase tracking-wide text-flame shadow-[0_4px_0_0_rgba(0,0,0,0.2)]">Hemen başla</Link>
      </Reveal>
    </section>
  )
}
