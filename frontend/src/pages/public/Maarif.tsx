import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import {
  ArrowRight, BookOpen, Building2, ClipboardCheck, Compass, ExternalLink, Globe2, GraduationCap, Heart, Home, Leaf, Lightbulb, MessagesSquare, Rocket, School, Sparkles, Target, Users,
} from 'lucide-react'
import { higoImg } from '@/components/game/Higo'
import { LinkButton } from '@/components/ui/Button'
import { BRAND } from '@/lib/brand'

const ease = [0.22, 1, 0.36, 1] as const

function Rise({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.6, ease, delay }} className={className}>
      {children}
    </motion.div>
  )
}

/** The eight themes every middle-school grade works through, with the path units that serve each one. */
const THEMES = [
  { n: 1, en: 'School Life', tr: 'Okul hayatı', icon: School, color: '#e8403a', units: ['Merhaba!', 'Dün'], can: 'Kendini tanıtır, okuldaki kişileri ve yerleri anlatır.' },
  { n: 2, en: 'Classroom Life', tr: 'Sınıf hayatı', icon: ClipboardCheck, color: '#f08a24', units: ['Okulda', 'Kurallar'], can: 'Sınıf eşyalarını, yönergeleri ve kuralları anlar ve kullanır.' },
  { n: 3, en: 'Personal Life', tr: 'Kişisel hayat', icon: Heart, color: '#d23f7a', units: ['Günüm', 'Sağlık'], can: 'Günlük rutinini, sevdiklerini ve duygularını ifade eder.' },
  { n: 4, en: 'Family Life', tr: 'Aile hayatı', icon: Home, color: '#8f5cf6', units: ['Ailem', 'Evim'], can: 'Ailesini, evini ve evdeki sorumlulukları anlatır.' },
  { n: 5, en: 'Life in the Neighbourhood & City', tr: 'Mahalle ve şehir', icon: Building2, color: '#2f7cf6', units: ['Şehirde', 'Karşılaştır'], can: 'Yol sorar, tarif eder, şehirdeki yerleri karşılaştırır.' },
  { n: 6, en: 'Life in the World', tr: 'Dünya ve kültür', icon: Globe2, color: '#0f9d8a', units: ['Yemek ve Alışveriş', 'Hikâye Anlat', 'Yolculuk'], can: 'Farklı kültürleri, yemekleri ve seyahatleri konuşur.' },
  { n: 7, en: 'Life in Nature', tr: 'Doğa', icon: Leaf, color: '#22a35a', units: ['Şu An', 'Deneyimler'], can: 'Hava durumunu, doğayı ve çevreyi korumayı anlatır.' },
  { n: 8, en: 'Life in the Universe & Future', tr: 'Evren ve gelecek', icon: Rocket, color: '#5b6fd6', units: ['Hafta Sonum', 'Planlar'], can: 'Gelecek planlarını, hayallerini ve teknolojiyi konuşur.' },
]

/** Grades 5 to 8 in the programme and what the path does for each. */
const GRADES = [
  { g: 5, level: 'A2.1', hours: 10, focus: 'Dinleme ve konuşmayla başlayan, oyunlu ve görsel ağırlıklı üniteler.', path: 'A1 üniteleri, Maarif temalarıyla etiketli' },
  { g: 6, level: 'A2.2', hours: 10, focus: 'Kısa metin okuma, basit cümle yazma ve günlük kalıplar.', path: 'A1 üniteleri ve kelime setleri' },
  { g: 7, level: 'A2.3', hours: 14, focus: 'Geçmiş zaman, karşılaştırma ve daha uzun diyaloglar.', path: 'A2 üniteleri, hikâyeler, Defne ile konuşma' },
  { g: 8, level: 'A2.4', hours: 14, focus: 'LGS formatında okuma, diyalog tamamlama ve kelime soruları.', path: 'A2 üniteleri ve her ünite sonunda LGS tarzı sorular' },
]

const PRINCIPLES = [
  { icon: Target, title: 'Beceri temelli', text: 'Ezber yerine dinleme, okuma, konuşma ve yazma becerilerini gerçek iletişim görevleriyle kazandırır.' },
  { icon: Sparkles, title: 'Değerler ve eğilimler', text: 'Merak, sorumluluk, saygı ve iş birliği gibi değerleri derslerin içine yerleştirir.' },
  { icon: BookOpen, title: 'Okuryazarlık', text: 'Bilgi, dijital, görsel ve kültürel okuryazarlığı dil öğrenimiyle birlikte geliştirir.' },
  { icon: Compass, title: 'Gerçek hayat bağlamı', text: 'Okul, aile, şehir, doğa ve gelecek gibi öğrencinin kendi dünyasından temalarla ilerler.' },
]

/** How a Maarif unit is taught on the platform, step by step. */
const FLOW = [
  { icon: Lightbulb, title: 'Rehberle başla', text: 'Her ünitenin kitap gibi açılan rehberi konuyu Türkçe anlatır: ne anlama gelir, nasıl kurulur, örnekler ve sık yapılan hatalar.' },
  { icon: BookOpen, title: 'Kelime ve dilbilgisi', text: 'Yol haritasının çoğu durağı temanın kelimeleri ve yapılarıdır. Aralıklı tekrar unuttuğun kelimeyi doğru zamanda geri getirir.' },
  { icon: MessagesSquare, title: 'Dinle ve konuş', text: 'Yapay zekâ öğretmen Defne ile temaya uygun rol oyunları: okulda tanışma, yol tarifi, tatil planı.' },
  { icon: GraduationCap, title: 'Ölç ve pekiştir', text: '8. sınıfta her ünite sonunda LGS formatında kısa bir soru seti; öğretmen panelinde sınıfın tema tema karnesi.' },
]

export default function Maarif() {
  const [open, setOpen] = useState<number | null>(1)
  return (
    <div className="overflow-x-clip">
      {/* hero */}
      <section className="relative mx-auto max-w-6xl px-5 pb-14 pt-10 sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(232,64,58,.14),transparent_65%)]" />
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-flame">
              <span className="size-2 rounded-full bg-flame" /> Türkiye Yüzyılı Maarif Modeli
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease }} className="mt-4 font-display text-[clamp(2.2rem,5.4vw,4rem)] font-black leading-[1.02] tracking-tight">
              Okuldaki İngilizceyle <span className="text-flame">aynı yolda</span>, bir adım önde.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6, ease }} className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              {BRAND}, ortaokul öğrencilerinin yolunu MEB'in Türkiye Yüzyılı Maarif Modeli İngilizce programının temalarına ve seviyelerine göre kurar. Öğrenci sınıfta gördüğü konuyu evde oyunla pekiştirir, 8. sınıfta LGS'ye her ünitede biraz daha hazır olur.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease }} className="mt-7 flex flex-wrap gap-3">
              <LinkButton to="/register" size="lg">Ücretsiz başla <ArrowRight className="size-5" /></LinkButton>
              <LinkButton to="/okullar" size="lg" variant="secondary">Okullar için</LinkButton>
            </motion.div>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[['4', 'sınıf düzeyi', '5, 6, 7 ve 8'], ['8', 'tema', 'her sınıfta'], ['A2', 'hedef seviye', 'A2.1 ile A2.4']].map(([v, k, s], i) => (
                <Rise key={k} delay={0.25 + i * 0.06} className="rounded-2xl border-2 border-line bg-card p-3">
                  <p className="font-display text-3xl font-black text-ink">{v}</p>
                  <p className="text-sm font-extrabold leading-tight">{k}</p>
                  <p className="text-xs text-ink-soft">{s}</p>
                </Rise>
              ))}
            </div>
          </div>

          {/* a unit card as it appears on the path */}
          <motion.div initial={{ opacity: 0, scale: 0.94, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.15, duration: 0.7, ease }} className="relative mx-auto w-full max-w-sm">
            <div className="rounded-[32px] border-2 border-line bg-card p-5 shadow-[0_30px_70px_-30px_rgba(31,36,51,.45)]">
              <div className="rounded-3xl bg-gradient-to-br from-[#e8403a] to-[#f08a24] p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">Maarif Modeli · 6. sınıf</p>
                <p className="mt-1 font-display text-2xl font-black leading-tight">Ünite 2 · Ailem</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-extrabold backdrop-blur"><Home className="size-3.5" /> Tema 4 · Family Life</span>
              </div>
              <ul className="mt-4 space-y-2">
                {[['Rehber: have got = sahiplik', 'bg-butter/30'], ['Aile kelimeleri', 'bg-mint/25'], ['Dilbilgisi: my, your, his, her', 'bg-sky/20'], ['Defne ile: aileni tanıt', 'bg-[#8f5cf6]/15'], ['Kelime tekrarı', 'bg-mint/25']].map(([t, c], i) => (
                  <motion.li key={t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.08 }} className={clsx('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold', c)}>
                    <span className="grid size-7 place-items-center rounded-full bg-card text-xs font-black">{i + 1}</span>{t}
                  </motion.li>
                ))}
              </ul>
            </div>
            <img src={higoImg('books')} alt="" className="absolute -right-3 -top-12 w-24 drop-shadow-xl sm:-bottom-8 sm:-left-10 sm:right-auto sm:top-auto sm:w-32" />
          </motion.div>
        </div>
      </section>

      {/* what the model is */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <Rise className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-flame">Model nedir?</p>
            <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">Bilgiyi değil, beceriyi merkeze alan program</h2>
            <p className="mt-3 text-ink-soft">Türkiye Yüzyılı Maarif Modeli, MEB'in 2024-2025 eğitim öğretim yılından itibaren kademeli olarak uyguladığı yeni öğretim programlarının ortak çerçevesidir. İngilizce dersinde öğrencinin dili bir iletişim aracı olarak kullanabilmesini, temalar etrafında örülen öğrenme çıktılarıyla hedefler.</p>
          </Rise>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p, i) => (
              <Rise key={p.title} delay={i * 0.06} className="rounded-3xl border-2 border-line bg-paper p-5">
                <span className="grid size-11 place-items-center rounded-2xl bg-flame/10 text-flame"><p.icon className="size-5" /></span>
                <p className="mt-4 font-display text-lg font-black">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{p.text}</p>
              </Rise>
            ))}
          </div>
        </div>
      </section>

      {/* grade ladder */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Rise className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-flame">Sınıf sınıf</p>
          <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">Her sınıfın seviyesi, süresi ve yolu</h2>
          <p className="mt-3 text-ink-soft">Program ortaokulda A2 seviyesini dört basamağa ayırır. Öğrenci kayıt olurken sınıfını seçer; yol haritası, sınav modu ve Defne o sınıfa göre ayarlanır.</p>
        </Rise>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {GRADES.map((g, i) => (
            <Rise key={g.g} delay={i * 0.07} className="relative">
              <div className="flex h-full flex-col rounded-3xl border-2 border-line bg-card p-5" style={{ marginTop: `${(3 - i) * 0}px` }}>
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-4xl font-black">{g.g}<span className="text-lg">. sınıf</span></p>
                  <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-black text-paper">{g.level}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2"><motion.div initial={{ width: 0 }} whileInView={{ width: `${25 * (i + 1)}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease, delay: 0.2 + i * 0.1 }} className="h-full rounded-full bg-flame" /></div>
                <p className="mt-4 text-sm leading-relaxed">{g.focus}</p>
                <p className="mt-3 text-xs font-bold text-ink-soft">Programda ünite başına yaklaşık {g.hours} ders saati</p>
                <p className="mt-auto pt-4 text-sm font-extrabold text-flame">{BRAND}: {g.path}</p>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* eight themes */}
      <section className="bg-[#171b26] text-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <Rise className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-butter">8 tema</p>
            <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">Öğrencinin kendi dünyasından dışarıya</h2>
            <p className="mt-3 text-white/70">Temalar okuldan başlar, aileye, şehre, dünyaya ve geleceğe açılır. Yol haritasındaki her ünite hangi temaya hizmet ettiğini etiketiyle gösterir.</p>
          </Rise>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {THEMES.map((t) => {
              const on = open === t.n
              return (
                <motion.button key={t.n} layout onClick={() => setOpen(on ? null : t.n)} aria-expanded={on} className={clsx('group rounded-3xl border p-4 text-left transition', on ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/[.04] hover:border-white/25')}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: t.color }}><t.icon className="size-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-white/50">Tema {t.n}</span>
                      <span className="block font-display text-[15px] font-black leading-tight">{t.tr}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-white/55">{t.en}</p>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease }} className="overflow-hidden">
                        <p className="mt-3 text-sm leading-relaxed text-white/85">{t.can}</p>
                        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/50">Yoldaki üniteler</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">{t.units.map((u) => <span key={u} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">{u}</span>)}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      {/* how it is taught */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
          <Rise className="lg:sticky lg:top-28">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-flame">Derste nasıl görünür?</p>
            <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">Bir Maarif ünitesi, dört adımda</h2>
            <p className="mt-3 text-ink-soft">Kısa ve sık tekrar (aralıklı tekrar), kendini sınama (geri çağırma) ve anlaşılır girdi gibi araştırmayla desteklenen yöntemler, programın temalarıyla birleşir.</p>
            <img src={higoImg('map')} alt="" className="mt-6 hidden w-36 lg:block" />
          </Rise>
          <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-0.5 before:bg-line">
            {FLOW.map((f, i) => (
              <Rise key={f.title} delay={i * 0.06} className="relative flex gap-4">
                <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-line bg-card text-flame"><f.icon className="size-6" /></span>
                <div className="flex-1 rounded-3xl border-2 border-line bg-card p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">Adım {i + 1}</p>
                  <p className="mt-1 font-display text-lg font-black">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{f.text}</p>
                </div>
              </Rise>
            ))}
          </ol>
        </div>
      </section>

      {/* schools + CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <Rise className="overflow-hidden rounded-[36px] bg-gradient-to-br from-[#e8403a] to-[#c9302c] p-7 text-white sm:p-10">
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">Okullar ve öğretmenler için</p>
              <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">Sınıfınızın İngilizcesini tema tema izleyin</h2>
              <ul className="mt-5 space-y-2 text-white/90">
                {['Sınıfa ünite, hikâye ya da LGS denemesi ödevi verin', 'Hangi temada kim zorlanıyor, karnede görün', 'Okul ligleriyle öğrencileri her gün derse çekin'].map((x) => <li key={x} className="flex gap-2"><Users className="mt-0.5 size-4 shrink-0" />{x}</li>)}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/okullar" className="press inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 font-display font-extrabold uppercase tracking-wide text-[#c9302c] shadow-[0_4px_0_0_rgba(0,0,0,.2)]">Okul paneli <ArrowRight className="size-4" /></Link>
                <Link to="/placement" className="inline-flex h-12 items-center rounded-2xl border-2 border-white/50 px-5 font-display font-extrabold uppercase tracking-wide">Seviye testi</Link>
              </div>
            </div>
            <img src={higoImg('cheer')} alt="" className="mx-auto w-44 drop-shadow-2xl md:w-56" />
          </div>
        </Rise>

        <div className="mt-8 rounded-3xl border-2 border-dashed border-line p-5 text-sm text-ink-soft">
          <p className="font-bold text-ink">Kaynak ve not</p>
          <p className="mt-1">Tema adları, sınıf düzeyleri ve ders saatleri MEB Türkiye Yüzyılı Maarif Modeli İngilizce öğretim programından alınmıştır. {BRAND} bağımsız bir eğitim platformudur ve MEB ile resmî bir bağı yoktur; içerikler programla uyumlu olacak şekilde hazırlanmış özgün materyallerdir.</p>
          <a href="https://tymm.meb.gov.tr/ogretim-programlari" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-flame hover:underline">tymm.meb.gov.tr öğretim programları <ExternalLink className="size-3.5" /></a>
        </div>
      </section>
    </div>
  )
}
