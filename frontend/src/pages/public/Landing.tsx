import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, BookOpen, Check, Crown, Flame, Gem, GraduationCap, Headphones, Mic, PenLine, Sparkles, Trophy, Volume2, X } from 'lucide-react'
import { get } from '@/lib/api'
import { tl, num } from '@/lib/format'
import type { Plan } from '@/lib/types'
import { Logo } from '@/components/game/Logo'
import { LinkButton } from '@/components/ui/Button'
import { Sticker } from '@/components/ui/Misc'
import { AchievementBadge } from '@/components/game/AchievementBadge'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { Ada } from '@/components/game/Ada'

interface LandingData {
  learners: number
  stories: number
  plans: Plan[]
}

const rise = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } }

export default function Landing() {
  const { data } = useQuery({ queryKey: ['landing'], queryFn: () => get<LandingData>('/landing') })

  return (
    <div className="overflow-x-clip">
      <Nav />
      <Hero learners={data?.learners} />
      <Marquee />
      <FourSkills />
      <Difference />
      <GameLoop />
      <School />
      <Pricing plans={data?.plans} />
      <Faq />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="safe-top sticky top-0 z-40 border-b-2 border-line/10 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo small />
        <nav className="hidden items-center gap-7 text-sm font-bold md:flex">
          <a href="#beceriler" className="hover:text-flame">4 Beceri</a>
          <a href="#fark" className="hover:text-flame">Farkımız</a>
          <a href="#oyun" className="hover:text-flame">Oyun</a>
          <a href="#paketler" className="hover:text-flame">Paketler</a>
        </nav>
        <div className="flex items-center gap-2">
          <LinkButton to="/login" variant="ghost" size="sm">Giriş</LinkButton>
          <LinkButton to="/register" size="sm">Ücretsiz başla</LinkButton>
        </div>
      </div>
    </header>
  )
}

function Hero({ learners }: { learners?: number }) {
  return (
    <section className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-12 md:grid-cols-[1.05fr_1fr] md:pt-20">
      <div>
        <motion.div initial={{ opacity: 0, rotate: -8, y: 10 }} animate={{ opacity: 1, rotate: -3, y: 0 }} className="mb-6 inline-block">
          <Sticker color="bg-mint"><GraduationCap className="size-3.5" /> Bayrak Dil Okulları güvencesiyle</Sticker>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-[clamp(2.7rem,7vw,5.2rem)] font-extrabold leading-[0.92]">
          İngilizceyi <span className="scribble-underline">dört yönden</span> yakala.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
          Hikayelerle <b className="text-ink">oku</b> ve <b className="text-ink">dinle</b>, yapay zekâ öğretmenin Ada ile <b className="text-ink">konuş</b> ve <b className="text-ink">yaz</b>. Her gün birkaç dakika, seriler, ligler ve gerçek ödüllerle.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 flex flex-wrap gap-3">
          <LinkButton to="/register" size="lg">Ücretsiz başla <ArrowRight className="size-5" /></LinkButton>
          <LinkButton to="/placement" size="lg" variant="secondary">Seviyemi bul · 3 dk</LinkButton>
        </motion.div>
        <div className="mt-8 flex items-center gap-4 text-sm font-semibold text-ink-soft">
          <div className="flex -space-x-2">
            {['bg-flame', 'bg-butter', 'bg-mint', 'bg-sky'].map((c, i) => (
              <span key={c} className={clsx('grid size-9 place-items-center rounded-full border-2 border-line text-xs font-extrabold text-[#1B1F3B]', c)}>{'AZMK'[i]}</span>
            ))}
          </div>
          <span>{learners && learners >= 500 ? `${num(learners)}+ öğrenci` : 'Öğrencilerimiz'} her gün birkaç dakikayla pratik yapıyor</span>
        </div>
      </div>
      <HeroCollage />
    </section>
  )
}

function HeroCollage() {
  const float = (r: number, d = 0) => ({ style: { ['--r' as string]: `${r}deg`, animationDelay: `${d}s` } })
  return (
    <div className="relative min-h-[460px] select-none" aria-hidden>
      {/* story page */}
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="absolute left-2 top-4 w-[78%] animate-float" {...float(-4)}>
        <div className="ink-card grain relative p-5">
          <div className="mb-3 flex items-center justify-between">
            <Sticker color="bg-butter" rotate={0}>A2 · Hikaye</Sticker>
            <span className="grid size-9 place-items-center rounded-full border-2 border-line bg-flame text-white"><Volume2 className="size-4" /></span>
          </div>
          <h3 className="mb-2 text-xl font-extrabold">The Cat Who Loved Tea</h3>
          <p className="font-read text-[15px] leading-7">
            One day, while she was reading the newspaper, she heard a strange{' '}
            <span className="relative rounded bg-butter px-1 font-semibold text-[#1B1F3B]">
              noise
              <span className="absolute left-1/2 top-8 z-10 w-max -translate-x-1/2 rounded-lg border-2 border-line bg-[#1B1F3B] px-2 py-1 font-sans text-xs font-bold text-[#F6F1E7] shadow-hard-sm">ses, gürültü · + Kaydet</span>
            </span>
            . Pamuk was sitting on the table…
          </p>
        </div>
      </motion.div>
      {/* Ada chat */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="absolute bottom-6 right-0 w-[72%] animate-float" {...float(3, 1.2)}>
        <div className="ink-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Ada className="size-10" />
            <div>
              <p className="font-display font-extrabold leading-none">Ada</p>
              <p className="text-xs text-ink-soft">AI İngilizce öğretmenin</p>
            </div>
          </div>
          <div className="mb-2 ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm border-2 border-line bg-sky px-3 py-2 text-sm font-semibold text-white">I am agree with you!</div>
          <div className="rounded-2xl border-2 border-dashed border-mint bg-mint/15 px-3 py-2 text-xs">
            <b>✓ I agree with you!</b> — "agree" zaten fiil, yanına "am" gelmez.
          </div>
        </div>
      </motion.div>
      {/* streak + badge */}
      <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: -8 }} transition={{ delay: 0.5, type: 'spring' }} className="absolute right-4 top-0">
        <div className="ink-card flex items-center gap-2 bg-flame px-4 py-2 text-white">
          <Flame className="size-6 animate-flicker fill-butter text-butter" />
          <span className="font-display text-2xl font-extrabold">47</span>
          <span className="text-xs font-bold leading-tight">günlük<br />seri</span>
        </div>
      </motion.div>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.65, type: 'spring' }} className="absolute bottom-0 left-4">
        <AchievementBadge tier="gold" icon="book" size={96} />
      </motion.div>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.75, type: 'spring' }} className="absolute left-[40%] top-[46%] rotate-6">
        <div className="ink-chip bg-butter text-[#1B1F3B]"><Gem className="size-4" /> +25</div>
      </motion.div>
    </div>
  )
}

function Marquee() {
  const words = ['HİKAYE OKU', 'SESLİ DİNLE', 'ADA İLE KONUŞ', 'YAZINI DÜZELT', 'LİGDE YÜKSEL', 'SERİNİ KORU', 'ROZET TOPLA', 'CANLI DERS KAZAN']
  return (
    <div className="-rotate-1 border-y-2 border-line bg-[#1B1F3B] py-3 text-[#F6F1E7]">
      <motion.div className="flex w-max gap-8 font-display text-xl font-extrabold" animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}>
        {[...words, ...words].map((w, i) => (
          <span key={i} className="flex items-center gap-8">
            {w} <Sparkles className="size-5 text-butter" />
          </span>
        ))}
      </motion.div>
    </div>
  )
}

function FourSkills() {
  const skills = [
    { icon: BookOpen, title: 'Oku', color: 'bg-butter', text: 'A1\'den C1\'e seviyene göre hikayeler. Bilmediğin kelimeye dokun, Türkçesini gör, tek tıkla kelime defterine ekle.', demo: <ReadDemo />, span: 'md:col-span-2' },
    { icon: Headphones, title: 'Dinle', color: 'bg-sky', text: 'Her hikaye ve her cümle doğal sesle okunur. Hızını ayarla, dinleyerek yaz, kulağını gerçek İngilizceye alıştır.', demo: null, span: '' },
    { icon: Mic, title: 'Konuş', color: 'bg-flame', text: 'Mikrofona konuş, telaffuzun anında kontrol edilsin. Kafede sipariş, mülakat, IELTS… Ada ile rol yap.', demo: null, span: '' },
    { icon: PenLine, title: 'Yaz', color: 'bg-mint', text: 'Yazma Atölyesi metnini CEFR seviyesine göre puanlar, hatalarını Türkçe açıklar ve düzeltilmiş halini gösterir.', demo: <WriteDemo />, span: 'md:col-span-2' },
  ]
  return (
    <section id="beceriler" className="mx-auto max-w-6xl px-5 py-24">
      <motion.div {...rise} className="mb-12 max-w-2xl">
        <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-flame">Dört beceri · tek uygulama</p>
        <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">Kelime ezberi yetmez. Dil; okumak, dinlemek, konuşmak ve yazmaktır.</h2>
      </motion.div>
      <div className="grid gap-5 md:grid-cols-3">
        {skills.map((s, i) => (
          <motion.article key={s.title} {...rise} transition={{ ...rise.transition, delay: i * 0.06 }} className={clsx('ink-card flex flex-col gap-4 p-6', s.span)}>
            <div className="flex items-center gap-3">
              <span className={clsx('grid size-12 place-items-center rounded-2xl border-2 border-line text-[#1B1F3B] shadow-hard-sm', s.color)}>
                <s.icon className="size-6" strokeWidth={2.4} />
              </span>
              <h3 className="text-3xl font-extrabold">{s.title}</h3>
            </div>
            <p className="text-ink-soft">{s.text}</p>
            {s.demo}
          </motion.article>
        ))}
      </div>
    </section>
  )
}

function ReadDemo() {
  return (
    <div className="mt-auto rounded-2xl border-2 border-dashed border-line/40 bg-paper-2 p-4 font-read text-[15px] leading-7">
      Deniz wanted to <span className="rounded bg-butter px-1 text-[#1B1F3B]">disappear</span>. But then she took a breath, smiled and said…
      <div className="mt-3 flex flex-wrap gap-2 font-sans text-xs font-bold">
        <span className="ink-chip py-0.5">disappear → yok olmak</span>
        <span className="ink-chip bg-mint py-0.5 text-[#0f2e27]">✓ Kelime defterine eklendi</span>
      </div>
    </div>
  )
}

function WriteDemo() {
  return (
    <div className="mt-auto grid gap-3 rounded-2xl border-2 border-dashed border-line/40 bg-paper-2 p-4 text-sm sm:grid-cols-[auto_1fr]">
      <div className="grid size-20 place-items-center rounded-2xl border-2 border-line bg-card text-center shadow-hard-sm">
        <div>
          <div className="font-display text-2xl font-extrabold">B1</div>
          <div className="text-[10px] font-bold uppercase text-ink-soft">78/100</div>
        </div>
      </div>
      <ul className="space-y-1.5">
        <li><s className="text-berry">I have went</s> → <b>I went</b> <span className="text-ink-soft">· zaman belli ise past simple</span></li>
        <li><s className="text-berry">informations</s> → <b>information</b> <span className="text-ink-soft">· sayılamayan isim</span></li>
        <li className="text-mint-deep font-semibold">Güçlü yön: bağlaçları çok iyi kullanmışsın!</li>
      </ul>
    </div>
  )
}

function Difference() {
  const rows = [
    ['Dört beceri birlikte (okuma, dinleme, konuşma, yazma)', true, 'partial', 'partial'],
    ['Türkçe konuşanlara özel hata açıklamaları', true, false, false],
    ['Seviyeli hikaye kütüphanesi + sesli okuma', true, false, false],
    ['AI öğretmen senin kelime defterini biliyor', true, false, 'partial'],
    ['Seri, lig, rozet, görev — tam oyunlaştırma', true, true, false],
    ['Gerçek öğretmenle canlı ders ödülleri', true, false, false],
    ['Arkasında fiziksel bir dil okulu', true, false, false],
  ] as const
  const cell = (v: boolean | 'partial') => (v === true ? <Check className="mx-auto size-5 text-mint-deep" strokeWidth={3} /> : v === 'partial' ? <span className="text-xs font-bold text-ink-soft">kısmen</span> : <X className="mx-auto size-5 text-ink-soft/50" />)
  return (
    <section id="fark" className="border-y-2 border-line bg-paper-2 py-24">
      <div className="mx-auto max-w-5xl px-5">
        <motion.div {...rise} className="mb-10 text-center">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-flame">Neden DilGO?</p>
          <h2 className="text-4xl font-extrabold sm:text-5xl">Oyun gibi eğlenceli, okul kadar ciddi.</h2>
        </motion.div>
        <motion.div {...rise} className="ink-card overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b-2 border-line text-sm">
                <th className="p-4 font-display text-base font-extrabold">Özellik</th>
                <th className="bg-flame p-4 text-center font-display font-extrabold text-white">DilGO</th>
                <th className="p-4 text-center font-bold text-ink-soft">Oyun tabanlı kelime uygulamaları</th>
                <th className="p-4 text-center font-bold text-ink-soft">AI sohbet uygulamaları</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, a, b, c]) => (
                <tr key={label} className="border-b-2 border-line/10 last:border-0">
                  <td className="p-4 font-semibold">{label}</td>
                  <td className="bg-flame/10 p-4 text-center">{cell(a)}</td>
                  <td className="p-4 text-center">{cell(b)}</td>
                  <td className="p-4 text-center">{cell(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  )
}

function GameLoop() {
  return (
    <section id="oyun" className="mx-auto max-w-6xl px-5 py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <motion.div {...rise}>
          <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-flame">Tamamen oyunlaştırılmış</p>
          <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">Her gün geri dönmek için bir sebep.</h2>
          <ul className="mt-8 space-y-5">
            {[
              [Flame, 'bg-flame', 'Seri & seri dondurucu', 'Her gün hedefini tuttur, serin büyüsün. Bir gün kaçırırsan dondurucun seni korur.'],
              [Trophy, 'bg-butter', '10 kademeli haftalık lig', "Bronz'dan Elmas'a: 30 kişilik gruplarda yarış, ilk 7 terfi eder."],
              [Crown, 'bg-sky', '35+ rozet ve gizli başarımlar', 'Kitap Kurdu, Bülbül, Keskin Nişancı… Bronzdan efsaneye.'],
              [Gem, 'bg-mint', 'Ödül Kasası', 'Kazandığın kartları istediğin an aç: XP takviyesi, Premium günleri, gerçek canlı ders kuponları.'],
            ].map(([Icon, color, title, text]) => {
              const I = Icon as typeof Flame
              return (
                <li key={title as string} className="flex gap-4">
                  <span className={clsx('grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-line text-[#1B1F3B] shadow-hard-sm', color as string)}>
                    <I className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-xl font-extrabold">{title as string}</h3>
                    <p className="text-ink-soft">{text as string}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </motion.div>
        <motion.div {...rise} className="relative">
          <div className="ink-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <LeagueEmblem tier={3} size={48} />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">Safir Ligi</p>
                <p className="font-display text-xl font-extrabold">Bu hafta · 2 gün kaldı</p>
              </div>
            </div>
            {[
              ['Elif K.', 1240, 'bg-butter'],
              ['Sen', 1175, 'bg-flame text-white'],
              ['Mert A.', 980, 'bg-card'],
              ['Selin T.', 910, 'bg-card'],
            ].map(([n, xp, c], i) => (
              <div key={n as string} className={clsx('mb-2 flex items-center gap-3 rounded-2xl border-2 border-line px-4 py-2.5', c as string)}>
                <span className="w-5 font-display font-extrabold">{i + 1}</span>
                <span className="flex-1 font-bold">{n as string}</span>
                <span className="font-mono text-sm">{xp as number} XP</span>
              </div>
            ))}
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-widest text-mint-deep">▲ Terfi bölgesi</p>
          </div>
          <div className="absolute -bottom-8 -right-4 flex gap-2">
            <AchievementBadge tier="legend" icon="flame" size={84} />
            <AchievementBadge tier="silver" icon="mic" size={84} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function School() {
  return (
    <section className="px-5 py-12">
      <motion.div {...rise} className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] border-2 border-line bg-[#1B1F3B] p-8 text-[#F6F1E7] shadow-hard-lg sm:p-14">
        <div className="absolute -right-16 -top-16 size-72 rounded-full border-2 border-[#F6F1E7]/10" />
        <div className="absolute -bottom-24 right-24 size-72 rounded-full border-2 border-[#F6F1E7]/10" />
        <div className="relative grid gap-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <Sticker color="bg-butter" rotate={-2}>Hibrit öğrenme</Sticker>
            <h2 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">Arkasında gerçek bir dil okulu var.</h2>
            <p className="mt-5 max-w-xl text-lg text-[#F6F1E7]/75">
              DilGO, Bayrak Dil Okulları'nın yıllardır sınıfta uyguladığı müfredatla hazırlandı. Uygulamada çalış, kazandığın canlı ders kuponlarıyla öğretmenlerimizle konuş, seviyeni sertifikayla belgele.
            </p>
          </div>
          <div className="grid gap-3 self-center">
            {[['Müfredat', 'CEFR uyumlu, öğretmenlerimizce hazırlanan üniteler'], ['Canlı ders', 'Online ya da şubede, gerçek eğitmenle'], ['Sertifika', 'Yıllık pakette CEFR seviye sertifikası']].map(([t, d]) => (
              <div key={t} className="rounded-2xl border-2 border-[#F6F1E7]/20 bg-white/5 p-4">
                <p className="font-display text-lg font-extrabold text-butter">{t}</p>
                <p className="text-sm text-[#F6F1E7]/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}

const FALLBACK_PLANS: Plan[] = [
  { id: 1, slug: 'monthly', name: 'Aylık', tagline: 'Esnek başla', interval: 'month', duration_days: 30, price: '149', compare_at_price: null, currency: 'TRY', features: ['Sınırsız can', 'Tüm hikayeler', 'Günde 200 AI mesajı'], badge: null, bonus_gems: 0, live_lesson_credits: 0, is_featured: false },
  { id: 2, slug: 'quarterly', name: '3 Aylık', tagline: 'Alışkanlık kur', interval: 'quarter', duration_days: 90, price: '349', compare_at_price: '447', currency: 'TRY', features: ['Aylık paketin tüm özellikleri', '500 bonus elmas', '1 canlı ders kuponu'], badge: 'En popüler', bonus_gems: 500, live_lesson_credits: 1, is_featured: true },
  { id: 3, slug: 'yearly', name: 'Yıllık', tagline: 'Akıcılığa kadar', interval: 'year', duration_days: 365, price: '999', compare_at_price: '1788', currency: 'TRY', features: ['Tüm Premium özellikler', '4 canlı ders kuponu', 'CEFR sertifikası'], badge: '%44 tasarruf', bonus_gems: 2000, live_lesson_credits: 4, is_featured: false },
]

export function PlanCards({ plans, cta }: { plans: Plan[]; cta: (p: Plan) => React.ReactNode }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((p) => (
        <div key={p.id} className={clsx('ink-card relative flex flex-col p-6', p.is_featured && 'bg-butter text-[#1B1F3B] md:-translate-y-3')}>
          {p.badge && <Sticker color={p.is_featured ? 'bg-flame text-white' : 'bg-mint'} rotate={3} className="absolute -top-3 right-5">{p.badge}</Sticker>}
          <p className="font-display text-2xl font-extrabold">{p.name}</p>
          <p className={clsx('text-sm', p.is_featured ? 'text-[#1B1F3B]/70' : 'text-ink-soft')}>{p.tagline}</p>
          <div className="my-5 flex items-end gap-2">
            <span className="font-display text-5xl font-extrabold leading-none">{tl(p.price)}</span>
            {p.compare_at_price && <s className="mb-1 text-sm opacity-60">{tl(p.compare_at_price)}</s>}
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm font-semibold">
            {(p.features ?? []).map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} /> {f}</li>
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
      <motion.div {...rise} className="mb-12 text-center">
        <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-flame">Paketler</p>
        <h2 className="text-4xl font-extrabold sm:text-5xl">Ücretsiz başla, hazır olunca yüksel.</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">Ücretsiz planda dersler, seçili hikayeler ve günde 10 AI mesajı her zaman açık.</p>
      </motion.div>
      <PlanCards plans={plans?.length ? plans : FALLBACK_PLANS} cta={(p) => <LinkButton to="/register" variant={p.is_featured ? 'dark' : 'secondary'} block>Başla</LinkButton>} />
    </section>
  )
}

function Faq() {
  const qs = [
    ['Gerçekten ücretsiz mi?', 'Evet. Tüm ders yolu, seçili hikayeler, kelime tekrarları ve günde 10 AI mesajı ücretsizdir. Premium; sınırsız can, tüm hikayeler, daha fazla AI pratiği ve canlı ders kuponları ekler.'],
    ['Seviyemi bilmiyorum, nereden başlamalıyım?', '3 dakikalık seviye testiyle A1–C2 arasındaki seviyeni bul; yolun otomatik olarak sana göre ayarlanır.'],
    ['Canlı ders kuponu nasıl çalışır?', "Kupon kartını Ödül Kasası'nda açtığında sana özel bir kod üretilir. Bu kodla Bayrak Dil Okulları'nda online ya da şubede ücretsiz ders alırsın."],
    ['Telefonumda kullanabilir miyim?', 'Evet. DilGO tarayıcıda çalışır; iOS ve Android uygulamaları da aynı hesabı kullanır.'],
    ['Verilerim güvende mi?', 'Şifreler sektör standardında şifrelenir, hesabın e-posta kodlarıyla korunur ve KVKK kapsamında hesabını istediğin an silebilirsin.'],
  ]
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24">
      <h2 className="mb-8 text-center text-4xl font-extrabold">Sık sorulanlar</h2>
      <div className="space-y-3">
        {qs.map(([q, a]) => (
          <details key={q} className="ink-card group p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-extrabold">
              {q}
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-line bg-butter text-[#1B1F3B] transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t-2 border-line bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-soft">DilGO bir Bayrak Dil Okulları uygulamasıdır. Oku, dinle, konuş, yaz — İngilizce tek uygulamada.</p>
        </div>
        <div className="space-y-2 text-sm font-bold">
          <Link to="/placement" className="block hover:text-flame">Seviye testi</Link>
          <Link to="/register" className="block hover:text-flame">Kayıt ol</Link>
          <Link to="/login" className="block hover:text-flame">Giriş yap</Link>
        </div>
        <div className="space-y-2 text-sm font-bold">
          <Link to="/terms" className="block hover:text-flame">Kullanım koşulları</Link>
          <Link to="/privacy" className="block hover:text-flame">Gizlilik & KVKK</Link>
        </div>
      </div>
      <p className="safe-bottom border-t-2 border-line/10 py-4 text-center text-xs text-ink-soft">© {new Date().getFullYear()} Bayrak Dil Okulları · Tüm hakları saklıdır.</p>
    </footer>
  )
}
