import { Link } from 'react-router-dom'
import { Reveal } from '@/components/motion/Page'

export type LegalKind = 'terms' | 'privacy' | 'cookies' | 'distance' | 'refund'

interface Doc { title: string; intro: string; body: [string, string][] }

const TEXT: Record<LegalKind, Doc> = {
  terms: {
    title: 'Kullanım Koşulları',
    intro: 'DilGO’yu kullanırken geçerli olan kurallar ve karşılıklı sorumluluklar.',
    body: [
      ['Hizmet', 'DilGO, Bayrak Dil Okulları tarafından sunulan çevrim içi İngilizce öğrenme platformudur. Hesap oluşturarak bu koşulları kabul etmiş olursun.'],
      ['Hesap güvenliği', 'Hesabının ve şifrenin güvenliğinden sen sorumlusun. Şüpheli bir durum fark edersen şifreni değiştir ve bize bildir. Hesabını başkasıyla paylaşman hâlinde oluşacak kayıplardan sorumlu değiliz.'],
      ['Premium üyelik', 'Premium paketler seçilen süre boyunca geçerlidir ve otomatik yenilenmez. Süre bitiminde hesabın ücretsiz sürüme döner; ilerlemen ve kelime defterin silinmez.'],
      ['Ödüller ve kuponlar', 'Oyun içi elmas, kart ve kuponların nakit karşılığı yoktur, devredilemez ve satılamaz. Canlı ders kuponları üzerinde belirtilen süre içinde kullanılmalıdır.'],
      ['Adil kullanım', 'Hileli XP kazanımı, otomasyon, çoklu hesap ve diğer kullanıcılara zarar veren davranışlar hesabın askıya alınmasına neden olabilir.'],
      ['İçerik hakları', 'Uygulamadaki hikâyeler, dersler, görseller ve sesler Bayrak Dil Okulları’na aittir; izinsiz çoğaltılamaz ve ticari olarak kullanılamaz.'],
      ['Yapay zekâ', 'AI öğretmen Ada eğitim amaçlıdır; yanıtları hata içerebilir ve profesyonel tavsiye yerine geçmez.'],
      ['Değişiklikler', 'Koşullarda değişiklik olursa uygulama içinde duyurulur. Değişiklikten sonra kullanmaya devam etmen kabul anlamına gelir.'],
    ],
  },
  privacy: {
    title: 'Gizlilik ve KVKK Aydınlatma Metni',
    intro: 'Hangi verini neden işlediğimizi ve hangi haklara sahip olduğunu anlatır.',
    body: [
      ['Veri sorumlusu', 'Bayrak Dil Okulları, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusudur.'],
      ['Toplanan veriler', 'Ad, e-posta, öğrenme ilerlemen, uygulama içi etkinliklerin, ödeme kayıtların (kart bilgileri bizde saklanmaz, ödeme kuruluşunca işlenir) ve güvenlik amaçlı IP kayıtları.'],
      ['İşleme amaçları', 'Hizmetin sunulması, öğrenmenin kişiselleştirilmesi, güvenlik, yasal yükümlülükler ve açık rızan varsa pazarlama iletişimi.'],
      ['Yapay zekâ işlemesi', 'AI öğretmenle yazdığın metinler yanıt üretmek için yapay zekâ sağlayıcımıza iletilir; reklam amacıyla kullanılmaz ve model eğitimine verilmez.'],
      ['Ses kayıtları', 'Konuşma alıştırmalarında mikrofon yalnızca sen başlattığında çalışır. Ses cihazında metne çevrilir; ham kayıt sunucularımızda saklanmaz.'],
      ['Saklama süresi', 'Verilerin hesabın açık olduğu sürece saklanır. Hesabını sildiğinde öğrenme verilerin kalıcı olarak silinir, yasal saklama zorunluluğu olan kayıtlar (fatura vb.) mevzuattaki süre boyunca tutulur.'],
      ['Hakların', 'Verilerine erişme, düzeltme, silme ve itiraz haklarına sahipsin. Hesabını Ayarlar → Hesabı sil adımından dilediğin an kalıcı olarak silebilirsin.'],
      ['İletişim', 'KVKK başvuruların için destek e-posta adresimize yazabilirsin.'],
    ],
  },
  cookies: {
    title: 'Çerez Politikası',
    intro: 'Tarayıcında hangi bilgileri sakladığımız ve bunları nasıl kontrol edeceğin.',
    body: [
      ['Zorunlu çerezler', 'Oturumunu açık tutmak için giriş anahtarını tarayıcının yerel deposunda saklarız. Bu olmadan uygulamaya giriş yapılamaz.'],
      ['Tercih çerezleri', 'Tema (açık/koyu), ses ayarı ve okuma hızı gibi tercihlerini cihazında saklarız. Bu veriler sunucuya gönderilmez.'],
      ['Ölçümleme', 'Uygulamanın nerede takıldığını anlamak için toplu ve kimliksizleştirilmiş kullanım istatistikleri tutarız; kişisel profil çıkarılmaz.'],
      ['Üçüncü taraf', 'Ödeme adımında iyzico kendi güvenlik çerezlerini kullanır. Reklam ağı çerezi kullanmıyoruz.'],
      ['Kontrol', 'Tarayıcı ayarlarından çerezleri silebilir ya da engelleyebilirsin. Zorunlu çerezleri engellersen oturumun açık kalmaz.'],
    ],
  },
  distance: {
    title: 'Mesafeli Satış Sözleşmesi',
    intro: 'Premium paket satın alırken kurulan sözleşmenin esasları.',
    body: [
      ['Taraflar', 'Satıcı: Bayrak Dil Okulları. Alıcı: uygulama üzerinden Premium paket satın alan kullanıcı.'],
      ['Sözleşme konusu', 'Sözleşmenin konusu, DilGO uygulamasında seçilen süreli dijital Premium üyelik hizmetidir. Paketin süresi, bedeli ve içeriği ödeme ekranında gösterilir.'],
      ['Ödeme', 'Ödemeler iyzico altyapısı üzerinden 3D Secure ile alınır. Kart bilgilerin satıcıya iletilmez ve saklanmaz.'],
      ['Teslim', 'Hizmet dijitaldir; ödeme onaylandığı anda hesabına tanımlanır. Ayrı bir teslimat süresi ve kargo bedeli yoktur.'],
      ['Cayma hakkı', 'Mesafeli Sözleşmeler Yönetmeliği uyarınca elektronik ortamda anında ifa edilen hizmetlerde cayma hakkı bulunmamakla birlikte, ilk 14 gün içinde hizmeti hiç kullanmadıysan iade talebinde bulunabilirsin.'],
      ['Uyuşmazlık', 'Uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.'],
    ],
  },
  refund: {
    title: 'İptal ve İade Politikası',
    intro: 'Premium üyeliğini nasıl iptal edeceğin ve iadenin nasıl işlediği.',
    body: [
      ['İptal', 'Premium paketler otomatik yenilenmediği için ayrıca iptal işlemi gerekmez. Sürenin sonunda hesabın kendiliğinden ücretsiz sürüme döner.'],
      ['İade koşulu', 'Satın alma tarihinden itibaren 14 gün içinde ve Premium’a özel içerikleri kullanmadıysan ücretin tamamı iade edilir.'],
      ['Kısmi kullanım', 'Premium hikâyeleri açtıysan, ek AI mesaj hakkını kullandıysan veya canlı ders kuponunu açtıysan hizmet ifa edilmiş sayılır ve iade yapılamaz.'],
      ['Nasıl talep edilir', 'İletişim sayfasındaki formdan "Teknik destek" konusuyla ya da destek e-postamızdan sipariş numaranla başvurman yeterlidir.'],
      ['Süre', 'Onaylanan iadeler 3 iş günü içinde ödeme kuruluşuna iletilir; kartına yansıma süresi bankana göre değişir.'],
      ['Canlı ders kuponları', 'Hediye edilen ve kazanılan canlı ders kuponlarının nakit karşılığı yoktur, iadeye konu edilemez.'],
    ],
  },
}

export default function Legal({ kind }: { kind: LegalKind }) {
  const t = TEXT[kind]
  const others = (Object.keys(TEXT) as LegalKind[]).filter((k) => k !== kind)
  const href: Record<LegalKind, string> = { terms: '/terms', privacy: '/privacy', cookies: '/cookies', distance: '/distance-sales', refund: '/refund' }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Reveal>
        <p className="mb-2 font-extrabold uppercase tracking-widest text-flame">Yasal</p>
        <h1 className="text-4xl sm:text-5xl">{t.title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t.intro}</p>
      </Reveal>

      <article className="mt-10 space-y-7">
        {t.body.map(([h, p], i) => (
          <Reveal key={h} delay={Math.min(i, 5) * 0.04}>
            <section className="rounded-2xl border-2 border-line bg-card p-6">
              <h2 className="mb-1.5 text-lg font-extrabold">{h}</h2>
              <p className="leading-relaxed text-ink-soft">{p}</p>
            </section>
          </Reveal>
        ))}
      </article>

      <p className="mt-8 rounded-2xl bg-butter/12 p-4 text-sm font-semibold text-ink-soft">
        Son güncelleme: {new Date().getFullYear()}. Bu metin taslaktır; yayına almadan önce hukuk danışmanınızla gözden geçirin.
      </p>

      <nav className="mt-10 border-t-2 border-line pt-6">
        <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink-soft">Diğer belgeler</p>
        <ul className="flex flex-wrap gap-2">
          {others.map((k) => (
            <li key={k}>
              <Link to={href[k]} className="ink-chip hover:border-flame/40 hover:text-flame">{TEXT[k].title}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
