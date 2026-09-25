
const TEXT = {
  terms: {
    title: 'Kullanım Koşulları',
    body: [
      ['Hizmet', "DilGO, Bayrak Dil Okulları tarafından sunulan çevrim içi İngilizce öğrenme platformudur. Hesap oluşturarak bu koşulları kabul etmiş olursun."],
      ['Hesap güvenliği', 'Hesabının ve şifrenin güvenliğinden sen sorumlusun. Şüpheli bir durum fark edersen şifreni değiştir ve bize bildir.'],
      ['Premium üyelik', 'Premium paketler seçilen süre boyunca geçerlidir ve otomatik yenilenmez. Cayma hakkı ve iadeler Mesafeli Sözleşmeler Yönetmeliği kapsamında değerlendirilir.'],
      ['Ödüller ve kuponlar', 'Oyun içi elmas, kart ve kuponların nakit karşılığı yoktur, devredilemez. Canlı ders kuponları üzerinde belirtilen süre içinde kullanılmalıdır.'],
      ['Adil kullanım', 'Hileli XP kazanımı, otomasyon, çoklu hesap ve diğer kullanıcılara zarar veren davranışlar hesabın askıya alınmasına neden olabilir.'],
      ['Yapay zekâ', 'AI öğretmen Ada eğitim amaçlıdır; yanıtları hata içerebilir ve profesyonel tavsiye yerine geçmez.'],
    ],
  },
  privacy: {
    title: 'Gizlilik Politikası & KVKK Aydınlatma Metni',
    body: [
      ['Veri sorumlusu', 'Bayrak Dil Okulları, 6698 sayılı KVKK kapsamında veri sorumlusudur.'],
      ['Toplanan veriler', 'Ad, e-posta, öğrenme ilerlemen, uygulama içi etkinliklerin, ödeme kayıtların (kart bilgileri bizde saklanmaz, ödeme kuruluşunca işlenir) ve güvenlik amaçlı IP kayıtları.'],
      ['İşleme amaçları', 'Hizmetin sunulması, öğrenmenin kişiselleştirilmesi, güvenlik, yasal yükümlülükler ve açık rızan varsa pazarlama iletişimi.'],
      ['Yapay zekâ işlemesi', 'AI öğretmenle yazdığın metinler yanıt üretmek için yapay zekâ sağlayıcımıza iletilir; reklam amacıyla kullanılmaz.'],
      ['Hakların', 'Verilerine erişme, düzeltme, silme ve itiraz haklarına sahipsin. Hesabını Ayarlar → Hesabı sil adımından dilediğin an kalıcı olarak silebilirsin.'],
      ['İletişim', 'KVKK başvuruların için destek e-posta adresimize yazabilirsin.'],
    ],
  },
}

export default function Legal({ kind }: { kind: 'terms' | 'privacy' }) {
  const t = TEXT[kind]
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <article>
        <h1 className="mb-8 text-4xl">{t.title}</h1>
        {t.body.map(([h, p]) => (
          <section key={h} className="mb-5">
            <h2 className="mb-1 text-lg font-extrabold">{h}</h2>
            <p className="leading-relaxed text-ink-soft">{p}</p>
          </section>
        ))}
        <p className="mt-8 text-xs text-ink-soft">Son güncelleme: {new Date().getFullYear()}. Bu metin taslaktır; yayına almadan önce hukuk danışmanınızla gözden geçirin.</p>
      </article>
    </div>
  )
}
