import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, MessageCircle, Layers, School, Sprout } from 'lucide-react'
import { get } from '@/lib/api'
import { img } from '@/lib/assets'
import { LinkButton } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { higoImg } from '@/components/game/Higo'
import { BRAND } from '@/lib/brand'

const ease = [0.22, 1, 0.36, 1] as const

const VALUES = [
  { icon: MessageCircle, color: '#ff5a36', title: 'Önce konuşmak', text: 'Dil konuşulmak için var. Her ders, her ekran öğrencinin ağzını açmasını hedefler; Defne bu yüzden var.' },
  { icon: Sprout, color: '#22b573', title: 'Küçük adımlar, her gün', text: 'Uzun ve seyrek çalışma yerine kısa ve düzenli pratik. Günlük hedef ve seri bu alışkanlığı korur.' },
  { icon: HeartHandshake, color: '#8f7cf8', title: 'Türkçe konuşanı anlamak', text: 'Türk öğrencilerin tipik hatalarını biliyoruz. Açıklamalar Türkçe ve bu hatalara göre yazılır.' },
  { icon: GraduationCap, color: '#2f7cf6', title: 'Gerçek öğretmen, gerçek sınıf', text: 'Teknoloji öğretmenin yerini almaz, onu her güne taşır. Okul paneli bu yüzden uygulamanın parçası.' },
]

/** The research behind the product, in one line each, with where it comes from. */
const METHOD = [
  { t: 'Aralıklı tekrar', d: 'Kelimeler unutulmak üzereyken geri gelir; aynı süreyle çok daha kalıcı öğrenme.', src: 'Cepeda ve ark., Psychological Bulletin, 2006' },
  { t: 'Hatırlayarak öğrenme', d: 'Okumak yerine cevabı hatırlamaya çalışmak; her alıştırma küçük bir sınav.', src: 'Roediger ve Karpicke, Psychological Science, 2006' },
  { t: 'Anlaşılır girdi', d: 'Seviyenin biraz üstünde hikâyeler ve dinlemeler; bağlamdan öğrenilen dil.', src: 'Krashen, Input Hypothesis, 1985' },
  { t: 'CEFR ile ölçülen ilerleme', d: 'A1’den B2’ye her ünite, Avrupa ortak çerçevesinin "yapabilirim" ifadelerine göre.', src: 'Avrupa Konseyi, CEFR Companion Volume, 2020' },
]

const STORY = [
  { tag: 'Sınıfta', title: 'Her şey bir sınıfta başladı', text: 'Bayrak Dil Okulları’nda öğrencilerimiz derste hızla ilerliyordu, ama iki ders arasındaki günlerde pratik yapacak bir yer bulamıyordu.', icon: School },
  { tag: 'İlk adım', title: 'Önce hikâyeler geldi', text: 'Okuma ve dinlemeyi her güne taşıyan hikâye uygulamamızı yaptık. Öğrenciler daha fazlasını istedi: konuşmak, yazmak, yarışmak.', icon: BookOpen },
  { tag: 'Bugün', title: 'Dört beceri, tek uygulama', text: 'Ders yolu, hikâyeler, oyunlar, Defne ile konuşma ve Gölge Düellosu. İlkokuldan üniversiteye, kendi hızında.', icon: Layers },
  { tag: 'Okullarla', title: 'Sınıfa geri dönüyoruz', text: 'Öğretmen ve müdür panelleriyle uygulama, çıktığı yere, sınıfa geri dönüyor: ödev, takip ve dört beceri karnesi.', icon: GraduationCap },
]

/**
 * About, told as a story: a collage hero that drifts apart as you scroll, a
 * timeline whose line draws itself, the values, and the people behind it.
 */
export default function About() {
  const { data } = useQuery({ queryKey: ['landing'], queryFn: () => get<{ learners: number; stories: number }>('/landing') })
  const hero = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const y1 = useTransform(p, [0, 1], [0, -120])
  const y2 = useTransform(p, [0, 1], [0, 60])
  const y3 = useTransform(p, [0, 1], [0, -40])
  const r1 = useTransform(p, [0, 1], [-4, -10])
  const r3 = useTransform(p, [0, 1], [5, 12])

  const line = useRef<HTMLDivElement>(null)
  const { scrollYProgress: lp } = useScroll({ target: line, offset: ['start 70%', 'end 60%'] })
  const draw = useSpring(lp, { stiffness: 90, damping: 22 })

  return (
    <div className="overflow-x-clip">
      {/* ------------------------------------------------------------ hero */}
      <section ref={hero} className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
        <div>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-black uppercase tracking-[0.2em] text-flame">Hakkımızda</motion.p>
          <h1 className="mt-4 font-display text-[clamp(2.4rem,5.4vw,4.2rem)] font-black leading-[1.04] tracking-tight">
            {['Sınıfta', 'öğrendiklerimizi', 'herkesin', 'cebine', 'taşıyoruz.'].map((w, k) => (
              <motion.span key={w} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * k, duration: 0.6, ease }} className={k === 3 ? 'inline-block pr-[0.25em] text-flame' : 'inline-block pr-[0.25em]'}>{w}</motion.span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            {BRAND}, Bayrak Dil Okulları’nın sınıfta denenmiş yöntemlerinin dijital hali: her gün birkaç dakikada, dört beceriyle.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/register" size="lg" className="gap-2">Ücretsiz başla <ArrowRight className="size-5" /></LinkButton>
            <LinkButton to="/okullar" size="lg" variant="secondary">Okullar için</LinkButton>
          </motion.div>
        </div>

        {/* collage: three moments of learning that drift apart as you scroll */}
        <div className="relative mx-auto h-[420px] w-full max-w-[520px] sm:h-[480px]">
          <motion.div style={{ y: y1, rotate: r1 }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }} className="absolute left-0 top-6 w-[58%] overflow-hidden rounded-[28px] border-4 border-card shadow-[0_30px_60px_-30px_rgba(31,36,51,.5)]">
            <Img src={img('about/home.webp')} alt="Evde, babasıyla İngilizce çalışan bir öğrenci" className="aspect-[4/5] w-full object-cover" />
          </motion.div>
          <motion.div style={{ y: y2 }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.8, ease }} className="absolute right-0 top-0 w-[52%] overflow-hidden rounded-[28px] border-4 border-card shadow-[0_30px_60px_-30px_rgba(31,36,51,.5)]">
            <Img src={img('about/uni.webp')} alt="Kampüste telefonla konuşma pratiği yapan bir üniversite öğrencisi" className="aspect-[4/5] w-full object-cover" />
          </motion.div>
          <motion.div style={{ y: y3, rotate: r3 }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8, ease }} className="absolute bottom-0 left-[18%] w-[66%] overflow-hidden rounded-[28px] border-4 border-card shadow-[0_30px_60px_-30px_rgba(31,36,51,.5)]">
            <Img src={img('about/class.webp')} alt="İstanbul’da bir dil okulu sınıfı" className="aspect-[16/10] w-full object-cover" />
          </motion.div>
          <motion.img src={higoImg('wave')} alt="" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: [0, -6, 0] }} transition={{ opacity: { delay: 0.8 }, y: { repeat: Infinity, duration: 3, ease: 'easeInOut' } }} className="absolute -bottom-6 right-0 w-24 drop-shadow-xl sm:w-28" />
        </div>
      </section>

      {/* -------------------------------------------------------- numbers */}
      <section className="border-y-2 border-line bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
          {[
            [data?.learners ? data.learners.toLocaleString('tr-TR') : '·', `öğrenci ${BRAND} ile çalışıyor`],
            [data?.stories ?? '·', 'seviyeli hikâye'],
            ['4', 'beceri: okuma, dinleme, konuşma, yazma'],
            ['A1 → B2', 'CEFR uyumlu tek yol'],
          ].map(([v, l], k) => (
            <motion.div key={l} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.08 }}>
              <p className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-black leading-none">{v}</p>
              <p className="mt-2 text-sm font-semibold text-ink-soft">{l}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ timeline */}
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Hikâyemiz</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.05]">Neden bir uygulama yaptık?</h2>
          <p className="mt-4 text-lg text-ink-soft">Kısa cevap: öğrencilerimiz istedi. Uzun cevap yanda.</p>
          <img src={higoImg('map')} alt="" className="mt-8 hidden w-40 lg:block" />
        </div>
        <div ref={line} className="relative pl-10">
          <span aria-hidden className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-[3px] rounded-full bg-line" />
          <motion.span aria-hidden style={{ scaleY: draw }} className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-[3px] origin-top rounded-full bg-gradient-to-b from-flame via-butter to-mint" />
          {STORY.map((s, k) => (
            <motion.article key={s.title} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6, ease }} className="relative mb-10 last:mb-0">
              <span className="absolute -left-10 top-0 grid size-8 place-items-center rounded-full border-[3px] border-card bg-ink text-paper shadow"><s.icon className="size-4" /></span>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ink-soft">0{k + 1} · {s.tag}</p>
              <h3 className="mt-1 font-display text-2xl font-black">{s.title}</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-ink-soft">{s.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- values */}
      <section className="bg-paper-2/60 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">İlkelerimiz</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.05]">Her kararı bu dört cümleyle tartıyoruz.</h2>
          </div>
          <div className="grid border-t-2 border-ink sm:grid-cols-2">
            {VALUES.map((v, k) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ delay: (k % 2) * 0.1, duration: 0.5, ease }} className={`group border-b-2 border-line py-8 sm:px-8 ${k % 2 ? 'sm:border-l-2' : 'sm:pl-0'}`}>
                <p className="font-mono text-sm font-bold" style={{ color: v.color }}>0{k + 1}</p>
                <h3 className="mt-2 font-display text-2xl font-black">{v.title}</h3>
                <p className="mt-2 max-w-md text-[16px] leading-relaxed text-ink-soft">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- method */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Yöntemimiz</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.05]">Araştırmanın söylediğini her güne çeviriyoruz.</h2>
            <p className="mt-4 text-lg text-ink-soft">Dört ilke, her derste.</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {METHOD.map((m, k) => (
              <motion.li key={m.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ delay: (k % 2) * 0.08, duration: 0.5, ease }} className="rounded-[24px] border-2 border-line bg-card p-6">
                <p className="font-display text-4xl font-black text-ink/10">{k + 1}</p>
                <h3 className="-mt-2 font-display text-xl font-black">{m.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{m.d}</p>
                <p className="mt-3 text-xs font-bold text-ink-soft/80">Kaynak: {m.src}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- team */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.7, ease }} className="relative">
          <div className="overflow-hidden rounded-[32px] border-2 border-line">
            <Img src={img('about/team.webp')} alt="Ürün ekibi bir dil öğrenme uygulamasının taslakları üzerinde çalışıyor" className="aspect-[4/5] w-full object-cover sm:aspect-[5/4]" />
          </div>
          <div className="absolute -bottom-5 -right-3 rounded-2xl bg-card px-4 py-3 shadow-[0_20px_40px_-20px_rgba(31,36,51,.45)] ring-1 ring-line sm:-right-6">
            <p className="text-xs font-black uppercase tracking-widest text-ink-soft">Ekip</p>
            <p className="font-display text-lg font-black">Öğretmenler + yazılımcılar</p>
          </div>
        </motion.div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-flame">Biz kimiz?</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.05]">Öğretmenlerle yazılımcılar aynı masada.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">Her dersi önce sınıfta deneyen öğretmenlerimiz yazar; ekibimiz onu her ekranda aynı özenle çalışır hale getirir. Öğrencilerden gelen her geri bildirim bir sonraki sürüme girer.</p>
          <ul className="mt-6 space-y-3">
            {['Müfredat: deneyimli İngilizce öğretmenleri', 'Ürün ve tasarım: İstanbul’daki ekibimiz', 'Destek: gerçek insanlar, Türkçe'].map((t) => (
              <li key={t} className="flex items-center gap-3 font-bold"><span className="size-2.5 rounded-full bg-flame" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------------- cta */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-[36px] bg-ink px-6 py-14 text-center text-paper sm:px-12">
          <span aria-hidden className="absolute -left-16 -top-16 size-56 rounded-full bg-flame/25 blur-2xl" />
          <span aria-hidden className="absolute -bottom-20 -right-10 size-64 rounded-full bg-butter/20 blur-2xl" />
          <img src={higoImg('cheer')} alt="" className="relative mx-auto mb-4 w-24" />
          <h2 className="relative font-display text-[clamp(1.8rem,4vw,2.8rem)] font-black leading-tight">Bugün birkaç dakikayla başla.</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-paper/70">Ücretsiz hesap, kredi kartı yok. Seviyeni ölç, yolun sana göre açılsın.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton to="/register" size="lg" variant="butter" className="gap-2">Ücretsiz başla <ArrowRight className="size-5" /></LinkButton>
            <LinkButton to="/contact" size="lg" variant="secondary">Bize yaz</LinkButton>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
