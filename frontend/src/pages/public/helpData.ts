import { BRAND } from '@/lib/brand'

/**
 * The help centre: every part of the product in plain Turkish, one short answer
 * per question. Grouped by topic; the page searches across all of them.
 */
export interface HelpTopic { key: string; title: string; icon: string; items: [string, string][] }

export const HELP: HelpTopic[] = [
  {
    key: 'baslarken',
    title: 'Başlarken',
    icon: 'wave',
    items: [
      [`${BRAND} nedir?`, `${BRAND}, Türkiye'deki öğrenciler için kurulmuş bir İngilizce platformudur. Kısa dersler, hikâyeler, kelime oyunları ve seninle konuşan yapay zekâ öğretmen Defne ile okuma, dinleme, konuşma ve yazmayı birlikte geliştirirsin.`],
      ['Gerçekten ücretsiz mi?', 'Evet. Tüm ders yolu, seçili hikâyeler, kelime oyunları ve günde 10 Defne mesajı ücretsizdir. Premium; sınırsız can, tüm hikâyeler, daha fazla konuşma pratiği ve canlı ders kuponları ekler.'],
      ['Seviyemi bilmiyorum, nereden başlamalıyım?', 'Seviye testini çöz: dinleme, okuma, sıralama ve kelime sorularıyla yaklaşık 3 dakika sürer. Sonuca göre yolunun uygun kısmı açılır. Testi atlarsan A1 Merhaba ünitesinden başlarsın.'],
      ['Günde ne kadar çalışmalıyım?', 'Kayıtta günlük hedefini seçersin: 5, 10, 15 ya da 20 dakika. Araştırmalar kısa ve düzenli çalışmanın uzun ve seyrek çalışmadan daha kalıcı olduğunu gösteriyor. Çoğu öğrenci için günde 10 dakika iyi bir başlangıç.'],
      ['Telefonumda kullanabilir miyim?', `Evet. ${BRAND} tarayıcıda çalışır; iOS ve Android uygulamaları da aynı hesabı kullanır. İlerlemen her cihazda aynıdır.`],
      ['Higo kim?', "Higo, yolculuğundaki maskot arkadaşın. Ünitelerin yanında seni karşılar, rehber kitabında ipuçları verir ve başarılarını kutlar. Defne ise yapay zekâ öğretmenin; konuşma ve yazma pratiğini onunla yaparsın."],
    ],
  },
  {
    key: 'yol',
    title: 'Ders yolu ve seviyeler',
    icon: 'path',
    items: [
      ['Ders yolu nasıl ilerliyor?', "Yol A1'den B2'ye kadar CEFR seviyelerine göre ünitelere ayrılır. Her ünitede sırayla kelimeler, dilbilgisi, bir kelime oyunu, dinle ve konuş, bir okuma (hikâye) ve Defne ile bir konuşma görevi vardır. Bir durağı bitirince sıradaki açılır."],
      ['CEFR seviyeleri ne demek?', 'Avrupa Dilleri Ortak Çerçevesi: A1 başlangıç, A2 temel, B1 orta, B2 orta üstü. Her seviyenin sonunda bir seviye sınavı vardır; geçince bir sonraki seviye açılır ve profilindeki seviyen yükselir.'],
      ['Rehber kitabı ne işe yarar?', 'Her ünitenin başındaki "Rehber" düğmesi bir kitap açar: ünitenin dilbilgisi konusu Türkçe anlatılır, örnek cümleler ve Higo’nun ipuçları vardır. Sayfaları kaydırarak ya da oklarla çevirirsin.'],
      ['Bir dersi tekrar edebilir miyim?', 'Evet. Bitirdiğin her durağa tekrar dokunup çalışabilirsin. Tekrarlar daha az XP verir ama kelimelerin hafızanda kalmasına yardım eder.'],
      ['Premium durakları ne?', "Bazı hikâyeler ve Defne görevleri Premium'a özeldir. Ücretsiz kullanıyorsan bu durakları atlayıp yoluna devam edebilirsin; seviye atlamak için zorunlu değildir."],
      ['Seviyemi elle değiştirebilir miyim?', 'Ayarlar > Öğrenme bölümünden seviyeni değiştirebilir ya da seviye testini yeniden çözebilirsin. Ders yolu yeni seviyene göre güncellenir.'],
    ],
  },
  {
    key: 'defne',
    title: 'Defne AI',
    icon: 'chat',
    items: [
      ['Defne ile neler yapabilirim?', 'Serbest sohbet, rol oyunları (kafede sipariş, havaalanı, iş görüşmesi gibi), sesli arama ve yazı düzeltme. Hatalarını Türkçe açıklar, daha doğal bir söyleyiş önerir ve yeni kelimeleri kaydetmeni sağlar.'],
      ['Sesli arama nasıl çalışır?', 'Mikrofon izni verdiğinde Defne ile telefonla konuşur gibi konuşursun. Konuşmanın yazısı ekranda görünür, istersen Türkçe çevirisini açabilirsin.'],
      ['Günlük mesaj sınırı var mı?', 'Ücretsiz kullanımda günde 10 mesaj, Premium’da çok daha fazlası. Kalan mesaj sayın sohbet ekranının üstünde görünür.'],
      ['Yazdıklarım güvende mi?', 'Sohbetlerin yalnızca senin hesabında saklanır ve dersini kişiselleştirmek için kullanılır. İstediğin an sohbetlerini silebilirsin.'],
      ['Defne neden bazen yavaş cevap veriyor?', 'Yanıtlar o an oluşturulur. Bağlantın yavaşsa ya da çok uzun bir mesaj yazdıysan birkaç saniye sürebilir.'],
    ],
  },
  {
    key: 'seri',
    title: 'Seri, XP ve ödüller',
    icon: 'flame',
    items: [
      ['Seri nedir, nasıl korunur?', 'Günlük hedefini tamamladığın her gün serin bir gün uzar. Bir gün kaçırırsan sıfırlanır; mağazadan alacağın seri dondurucu bir günlüğüne korur. Seçtiğin saatte nazik bir hatırlatma gelir.'],
      ['XP nasıl kazanılır?', 'Dersler, hikâyeler, kelime oyunları, Defne görevleri ve Arena düelloları XP verir. Hatasız bitirmek ve XP takviyesi kullanmak daha fazla kazandırır.'],
      ['Günlük görevler ne zaman yenilenir?', 'Her gün gece yarısı (Türkiye saati) yeni görevler gelir; haftalık görevler pazartesi yenilenir. Görevleri tamamlayınca elmas ve sandık kazanırsın.'],
      ['Rozetler nasıl kazanılır?', 'Rozetler sunucuda otomatik verilir: seri günleri, bitirdiğin üniteler, seviye atlama, lig başarıları, davet ettiğin arkadaşlar ve daha fazlası. Kazandığında bildirim alırsın, profilinde görünür.'],
      ['Elmaslar ne işe yarar?', 'Mağazadan çerçeve, profil kapağı, seri dondurucu, XP takviyesi, can ve sandık alırsın. Elmaslar görevlerden, sandıklardan ve seri ödüllerinden gelir.'],
      ['Kasa ve sandıklar nasıl çalışır?', 'Kazandığın ödüller Kasa’na düşer. Sandığı açtığında elmas, güçlendirici ya da iş ortaklarımızdan hediye çıkabilir; neler çıkabileceğini açtıktan sonra görürsün.'],
    ],
  },
  {
    key: 'arena',
    title: 'Arena ve ligler',
    icon: 'trophy',
    items: [
      ['Gölge Düellosu nedir?', 'Ligindeki bir oyuncuyla 12 saniyelik hızlı sorulardan oluşan bir düello. Rakibinin önceki oyununun gölgesiyle yarışırsın; seri yaptıkça puan çarpanın artar.'],
      ['Ligler nasıl çalışır?', 'Her hafta benzer seviyedeki oyuncularla bir lige girersin. Hafta sonunda ilk sıralar bir üst lige çıkar, son sıralar düşer. Hafta pazartesi sıfırlanır.'],
      ['Okulumun ligini görebilir miyim?', 'Okuluna bağlıysan Ligler sayfasında "Sınıfım" ve "Okulum" sekmeleri görünür. Bu hafta ya da bu ay kazanılan XP’ye göre sınıf arkadaşlarınla sıralanırsın. Öğretmenler de kendi sınıflarının ligini görür.'],
      ['Rakibim gerçek bir kişi mi?', 'Evet, ligindeki gerçek oyuncuların kayıtlı oyunlarıyla eşleşirsin. İsimler ve kişisel bilgiler gösterilmez.'],
    ],
  },
  {
    key: 'sinav',
    title: 'Sınav modu',
    icon: 'target',
    items: [
      ['Hangi sınavlara hazırlanabilirim?', 'LGS, YKS-YDT, YDS, YÖKDİL, IELTS ve TOEFL. Kayıtta ya da ayarlardan hedef sınavını seçince Sınav modu açılır.'],
      ['Deneme sınavı gerçek formatta mı?', 'Evet. Deneme, seçtiğin sınavın bölüm dağılımına göre soru seçer ve süreyi sınavın gerçek temposuna göre ayarlar. Bitince bölüm bölüm sonucunu ve Türkçe çözümleri görürsün.'],
      ['Günlük plan nasıl belirleniyor?', 'Sınav tarihine kalan gün sayısına göre günlük soru hedefin artar; en zayıf iki bölümün öne çıkarılır ve belli aralıklarla deneme önerilir.'],
      ['Sorular resmî sınav soruları mı?', 'Hayır. Sorular resmî sınavların formatına uygun olarak özgün hazırlanmıştır; resmî kurumlarla bir bağlantısı yoktur.'],
    ],
  },
  {
    key: 'premium',
    title: 'Premium ve ödeme',
    icon: 'crown',
    items: [
      ["Premium'da neler var?", 'Sınırsız can, tüm hikâyeler ve Premium durakları, çok daha fazla Defne mesajı, bonus elmas ve paketine göre canlı ders kuponları.'],
      ['Hangi ödeme yöntemleri geçerli?', 'Kredi ve banka kartıyla, iyzico güvenli ödeme sayfası üzerinden ödersin. Kart bilgilerin bizde saklanmaz.'],
      ['Aboneliğimi nasıl iptal ederim?', 'Ayarlar > Abonelik bölümünden tek dokunuşla iptal edebilirsin. Ödediğin dönemin sonuna kadar Premium devam eder.'],
      ['İade alabilir miyim?', 'Mesafeli satış sözleşmesindeki süre içinde Ayarlar > Abonelik bölümünden iade talebi oluşturabilirsin. Ayrıntılar İptal ve iade sayfasında.'],
      ['Canlı ders kuponu nasıl çalışır?', 'Kuponu Ödüller sayfasında açtığında sana özel bir kod oluşur. Bu kodla Bayrak Dil Okulları’nda online ya da şubede ücretsiz ders alırsın.'],
      ['Arkadaşımı davet edersem ne kazanırım?', 'Davet kodunla katılan her arkadaşın için elmas kazanırsın; arkadaşın ilk satın alımını yaptığında Premium gün de eklenir.'],
    ],
  },
  {
    key: 'okullar',
    title: 'Okullar ve öğretmenler',
    icon: 'school',
    items: [
      ['Okulumuz nasıl katılır?', '"Okullar için" sayfasındaki formu doldurun. Ekibimiz sizinle iletişime geçer, öğrenci sayınıza göre teklif hazırlar ve okul panelinizi açar.'],
      ['Müdür ve öğretmen panelleri ne yapar?', 'Müdür bütün okulu, sınıfları ve öğretmenleri yönetir. Öğretmen yalnızca kendi sınıflarını görür: öğrenci ilerlemesi, dört beceri karnesi, ödevler ve sınıf ligi.'],
      ['Ödev nasıl verilir?', 'Panelde bir ders, hikâye, sınav ya da serbest görev seçip sınıfa atarsınız. Öğrenci bildirim alır; ders ve hikâye ödevleri bitirildiğinde kendiliğinden işaretlenir.'],
      ['Öğrenciler okula nasıl bağlanır?', 'E-postayla davet gönderebilir ya da okul kodunu paylaşabilirsiniz. Öğrenci kodu girince ilgili sınıfa eklenir.'],
      ['Sınıf ligi nedir?', 'Sınıf ve okul içinde haftalık ve aylık XP sıralaması. Öğrenciler kendi sınıflarını ve okulu, öğretmenler kendi sınıflarını, müdür bütün okulu görür.'],
      ['Öğrenci verileri kimlerle paylaşılır?', 'Yalnızca okulunuzun yetkili kişileriyle. Veriler KVKK’ya uygun saklanır; üçüncü taraflarla reklam amacıyla paylaşılmaz.'],
    ],
  },
  {
    key: 'hesap',
    title: 'Hesap ve gizlilik',
    icon: 'heart',
    items: [
      ['Şifremi unuttum, ne yapmalıyım?', 'Giriş ekranındaki "Şifremi unuttum" bağlantısına dokun, e-postana gelen kodla yeni şifre belirle.'],
      ['E-posta adresimi değiştirebilir miyim?', 'Ayarlar > Hesap bölümünden değiştirebilirsin; yeni adrese bir doğrulama kodu gönderilir.'],
      ['Hesabımı nasıl silerim?', 'Ayarlar > Hesap > Hesabı sil. KVKK kapsamında tüm kişisel verilerin silinir. Bu işlem geri alınamaz.'],
      ['Bildirimleri nasıl ayarlarım?', 'Ayarlar > Bildirimler bölümünden hatırlatma saatini seçebilir, e-posta ve uygulama bildirimlerini açıp kapatabilirsin.'],
      ['Sesler neden telefonumun dilinde okunuyor?', 'Okulun ya da sitenin yöneticisi sunucu sesi tanımladığında tüm kelimeler doğal İngilizce sesle okunur. Tanımlı değilse telefonundaki İngilizce ses kullanılır; telefonunda yoksa Ayarlar > Dil > Metin okuma bölümünden İngilizce ses paketini indirmen yeterli.'],
    ],
  },
]

export const HELP_COUNT = HELP.reduce((n, t) => n + t.items.length, 0)
