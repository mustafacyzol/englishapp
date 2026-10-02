import { motion } from 'motion/react'
import { ArrowRight, BarChart3, BookOpenCheck, Check, ClipboardList, GraduationCap, KeyRound, MessageCircle, Palette, ShieldCheck, Users } from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { img } from '@/lib/assets'
import { PHOTO } from '@/lib/assets'
import { higoImg } from '@/components/game/Higo'

const ROLES = [
  { who: 'Müdür ve yönetim', icon: ShieldCheck, color: '#1f2433', points: ['Tüm sınıfların haftalık katılımı ve dört beceri karnesi', 'Öğretmen ekleme, sınıf ve şube açma', 'Okulun logosu ve rengiyle kendi paneli'] },
  { who: 'İngilizce öğretmeni', icon: GraduationCap, color: '#2f7cf6', points: ['Yalnızca kendi sınıflarını görür ve yönetir', 'Ders, hikâye, kelime ya da sınav ödevi verir', 'Kimin yaptığını, kimin takıldığını anında görür'] },
  { who: 'Öğrenci', icon: Users, color: '#ff5a36', points: ['Ödevleri uygulamanın en üstünde görür', 'Seviyesine ve sınıfına göre kişisel ders yolu', 'Defne ile konuşma, LGS ve YDT pratiği'] },
] as const

const FEATURES = [
  { icon: ClipboardList, t: 'Ödev ve takip', d: 'Ders ve hikâye ödevleri öğrenci bitirince kendiliğinden işaretlenir; öğretmen sınıfın durumunu tek bakışta görür.' },
  { icon: BarChart3, t: 'Sınıf karnesi', d: 'Okuma, dinleme, konuşma ve yazma dengesi, haftalık XP ve seri. Haftanın önerisi: sınıfın en zayıf becerisi.' },
  { icon: BookOpenCheck, t: 'Sınavlara hazırlık', d: '8. sınıflar için LGS, lise için YKS-YDT formatında sorular ve Türkçe çözümler.' },
  { icon: MessageCircle, t: 'Yapay zekâ ile konuşma', d: 'Her öğrenci Defne ile sesli konuşur; yaşına ve sınıfına uygun, güvenli içerikle.' },
  { icon: KeyRound, t: 'Kolay katılım', d: 'Öğrenciler okul koduyla ya da e-posta davetiyle saniyeler içinde katılır.' },
  { icon: Palette, t: 'Okulunuzun kimliği', d: 'Panel okulunuzun logosu ve rengiyle açılır; öğrenciler kendi okullarını görür.' },
]

const STEPS = [
  ['Tanışalım', 'Öğrenci sayınızı ve sınıflarınızı konuşalım, size uygun teklifi hazırlayalım.'],
  ['Kurulum', 'Okulunuzu açıyoruz; öğretmenlerinizi ve sınıflarınızı birlikte ekliyoruz.'],
  ['Başlayın', 'Öğrenciler kodla katılır, öğretmenler ilk ödevi verir. Destek ekibimiz yanınızda.'],
]

/** "Okullar için": what a school gets, for each role, and how to start. */
export default function Schools() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-sage/15 px-3 py-1 text-sm font-black uppercase tracking-[0.16em] text-sage-deep dark:text-sage"><GraduationCap className="size-4" /> Okullar için</p>
            <h1 className="mt-4 font-display text-[clamp(2.4rem,5.4vw,4.2rem)] font-black leading-[1.05] tracking-tight">Okulunuzun bütün İngilizcesi <span className="text-flame">tek yerde.</span></h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">İlkokuldan liseye; müdür, öğretmen ve öğrenci için ayrı ekranlar. Ödev verin, ilerlemeyi izleyin, LGS ve YDT’ye hazırlayın. Öğrenciler oyun gibi çalışır, siz sonuçları görürsünüz.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/contact?konu=okul" size="lg" className="gap-2">Okulunuz için teklif alın <ArrowRight className="size-5" /></LinkButton>
              <LinkButton to="/register" size="lg" variant="secondary">Öğrenci olarak dene</LinkButton>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-ink-soft">
              {['KVKK uyumlu', 'Reklamsız', 'Öğrenci başına fiyat'].map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-mint-deep" strokeWidth={3} />{t}</li>)}
            </ul>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
            <div className="overflow-hidden rounded-[32px] border-2 border-line">
              <Img src={PHOTO.classroom} alt="Sınıfta İngilizce dersi" className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-4 w-[240px] rounded-2xl bg-card p-4 shadow-[0_24px_50px_-24px_rgba(31,36,51,.45)] ring-1 ring-line sm:-left-8">
              <div className="mb-2 flex items-center gap-2">
                <img src={img('schools/teacher.webp')} alt="" className="size-8 rounded-full object-cover ring-2 ring-card" />
                <span className="text-xs font-bold leading-tight text-ink-soft"><b className="text-ink">Ayşe Öğretmen</b> ödev verdi</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-flame">8-A · Ödev</p>
              <p className="mt-1 font-extrabold">Hikâye: The Red Umbrella</p>
              <div className="mt-2 flex items-center gap-2 text-xs font-bold"><span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2"><span className="block h-full w-[78%] rounded-full bg-mint" /></span>21/27 yaptı</div>
            </div>
            <img src={higoImg('point')} alt="" className="absolute -right-3 -top-8 w-20 drop-shadow-[0_12px_14px_rgba(160,40,10,.2)] sm:w-24" />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-black">Her rol için ayrı, sade bir ekran</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {ROLES.map((r, k) => (
            <motion.div key={r.who} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.08 }} className="rounded-3xl border-2 border-line bg-card p-6">
              {r.who === 'İngilizce öğretmeni' ? <img src={img('schools/teacher.webp')} alt="" className="size-12 rounded-2xl object-cover" /> : <span className="grid size-12 place-items-center rounded-2xl text-white" style={{ background: r.color }}><r.icon className="size-6" /></span>}
              <h3 className="mt-4 font-display text-xl font-black">{r.who}</h3>
              <ul className="mt-3 space-y-2">
                {r.points.map((p) => <li key={p} className="flex gap-2 text-[15px]"><Check className="mt-1 size-4 shrink-0 text-mint-deep" strokeWidth={3} />{p}</li>)}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-paper-2/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-black">Okulun ihtiyacı olan her şey</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="rounded-3xl bg-card p-5 ring-1 ring-line">
                <f.icon className="size-6 text-flame" />
                <p className="mt-3 font-display text-lg font-black">{f.t}</p>
                <p className="mt-1 text-[15px] text-ink-soft">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-black">Üç adımda başlayın</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(([t, d], k) => (
            <li key={t} className="relative rounded-3xl border-2 border-line bg-card p-6">
              <span className="font-display text-5xl font-black text-flame/25">{k + 1}</span>
              <p className="mt-1 font-display text-xl font-black">{t}</p>
              <p className="mt-1 text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[28px] bg-[#1f2433] p-7 text-white sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-2xl font-black">Okulunuza özel teklif</p>
            <p className="mt-1 text-white/70">Öğrenci sayısına göre fiyatlandırılır. Bir iş günü içinde dönüş yapıyoruz.</p>
          </div>
          <LinkButton to="/contact?konu=okul" size="lg" variant="butter" className="shrink-0 gap-2">İletişime geç <ArrowRight className="size-5" /></LinkButton>
        </div>
      </section>
    </div>
  )
}
