import { PHOTO } from '@/lib/assets'
import { LinkButton } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Page'

const VALUES = [
  ['Önce konuşmak', 'Dil, konuşulmak için vardır. Her dersimiz ve her uygulama ekranımız öğrencinin ağzını açmasını hedefler.'],
  ['Küçük adımlar, her gün', 'Uzun ve seyrek çalışma yerine kısa ve düzenli pratik. Seriler ve günlük hedefler bu yüzden var.'],
  ['Türkçe konuşanı anlamak', 'Türk öğrencilerin tipik hatalarını biliyoruz. Açıklamalarımız bu hatalara göre hazırlanır.'],
  ['Gerçek öğretmen, gerçek ödül', 'Teknoloji öğretmenin yerini almaz; onu her güne taşır. Uygulamadaki ödüller sınıfta karşılık bulur.'],
]

export default function About() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-12">
        <Reveal className="max-w-3xl">
          <p className="mb-3 font-extrabold uppercase tracking-widest text-flame">Hakkımızda</p>
          <h1 className="text-[clamp(2.3rem,5vw,3.8rem)] leading-[1.05]">Sınıfta öğrendiklerimizi herkesin cebine taşıyoruz.</h1>
          <p className="mt-6 text-xl leading-relaxed text-ink-soft">DilGO, Bayrak Dil Okulları'nın yıllardır sınıfta kullandığı yöntemlerin dijital hali. Öğretmenlerimizin hazırladığı müfredatı; hikayeler, sesli pratik ve yapay zekâ ile her gün birkaç dakikada uygulanabilir hale getirdik.</p>
        </Reveal>
      </section>

      <Reveal className="mx-auto max-w-6xl px-5">
        <div className="overflow-hidden rounded-[36px]">
          <img src={PHOTO.team} alt="Bayrak Dil Okulları öğretmen ekibi" className="aspect-[16/8] w-full object-cover" />
        </div>
      </Reveal>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-24 lg:grid-cols-2">
        <Reveal>
          <h2 className="text-4xl leading-tight">Neden bir uygulama yaptık?</h2>
        </Reveal>
        <Reveal delay={0.08} className="space-y-5 text-lg leading-relaxed text-ink-soft">
          <p>Öğrencilerimiz sınıfta hızla ilerliyordu ama dersler arasındaki günlerde pratik yapacak bir yer bulamıyordu. Kelime uygulamaları konuşmayı, konuşma uygulamaları okumayı, hiçbiri de Türk öğrencinin ihtiyacını tam karşılamıyordu.</p>
          <p>Önce hikaye okumayı ve dinlemeyi getiren HikayeGO'yu yaptık. Öğrencilerimiz daha fazlasını istedi: konuşmak, yazmak, yarışmak. DilGO bu isteklerin cevabı. Dört beceri, tek uygulama.</p>
        </Reveal>
      </section>

      <section className="bg-paper py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal><h2 className="mb-10 text-4xl">İnandıklarımız</h2></Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {VALUES.map(([t, d], i) => (
              <Reveal key={t} delay={(i % 2) * 0.08}>
                <div className="h-full rounded-3xl border-2 border-line bg-card p-7">
                  <h3 className="text-2xl">{t}</h3>
                  <p className="mt-3 text-lg text-ink-soft">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
        <Reveal>
          <div className="overflow-hidden rounded-[32px]"><img src={PHOTO.classroom} alt="Sınıfta ders" loading="lazy" className="aspect-[4/3] w-full object-cover" /></div>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="text-4xl leading-tight">Uygulama ve sınıf birlikte çalışır.</h2>
          <ul className="mt-6 space-y-4 text-lg text-ink-soft">
            <li><b className="text-ink">Aynı müfredat:</b> Uygulamadaki üniteler, sınıftaki derslerimizle aynı CEFR hedeflerine göre hazırlanır.</li>
            <li><b className="text-ink">Canlı ders kuponları:</b> Uygulamada kazandığın kuponu şubelerimizde ya da online derslerimizde kullanırsın.</li>
            <li><b className="text-ink">Sertifika:</b> Yıllık paketle seviyeni okulumuzun sertifikasıyla belgelersin.</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/register">Ücretsiz başla</LinkButton>
            <LinkButton to="/contact" variant="secondary">Kurslarımız hakkında bilgi al</LinkButton>
          </div>
        </Reveal>
      </section>
    </>
  )
}
