# DilGO ekonomisi: XP, seri, elmas ve ödüller

Tüm değerler tek bir yerde durur: `backend/config/dilgo.php` (`economy`, `gamification`, `rewards`, `referral`).
Rakamları değiştirmek için kod değil, bu dosya düzenlenir. Sunucu her ödülü kendisi hesaplar; istemci
"şu kadar XP ver" diyemez.

## 1. Yeni bir hesap nasıl başlar

| Değer | Başlangıç | Nereden |
| --- | --- | --- |
| XP | 0 | |
| Seviye | 1 | |
| Seri | 0 (gri alev) | |
| Elmas | 50 | `users.gems` varsayılanı (hoş geldin elmasları) |
| Can | 5 | 30 dakikada 1 dolar |
| Lig | Bronz, yeni grup | ilk XP ile gruba yerleşir |
| Kasa, kuponlar, rozetler | boş | |

Davet koduyla gelen biri e-postasını doğruladığında +100 elmas alır, davet eden +150 elmas.

Demo sürümdeki **"Yeni öğrenci"** düğmesi tam olarak bu durumu gösterir. Bu durum, gerçek backend'de
kaydını yeni tamamlamış bir hesaptan kaydedilmiştir.

## 2. XP: her kaynak için sabit, küçük ve tavanlı

| Etkinlik | XP | Günlük tavan (grup) |
| --- | --- | --- |
| Ders | dersin kendi değeri (10-20) + hatasızsa 5 | yok (canlarla zaten sınırlı) |
| Hikâye, ilk okuma | 15 + quiz puanı/20 (en çok 20) | 120 (hikâye) |
| Hikâye, tekrar | 5 | 120 (hikâye) |
| Kelime tekrarı | kelime başına 1 | 60 (kelime) |
| Kelime oyunları | doğru başına 1 | 60 (kelime) |
| Sınav sorusu | doğru 3, yanlış 1 | 80 (sınav) |
| Gölge Düellosu | 5 + doğru başına 1 + kazanırsan 5 | 150 (düello) |
| Defne ile yazışma | mesaj başına 3 (sesli 4) | 60 (AI) |
| Yazma laboratuvarı | 10 | 60 (AI) |

- Tavan dolunca etkinlik yine yapılabilir, yalnızca XP 0 yazılır. Arayüz `capped: true` bilgisini alır.
- XP Takviyesi kartı (x2) tavan hesaplanırken dahil edilir, yani takviye tavanı delemez.
- Tavanlar yerel gün başında (Europe/Istanbul) sıfırlanır.

## 3. Seri (streak)

- Bir gün, o gün **en az 10 XP** kazanıldıysa "çalışılmış" sayılır. Tek bir dokunuş seriyi uzatmaz.
- Bir gün kaçarsa kasadaki **Seri Dondurucu** otomatik kullanılır (en çok 2 tane tutulabilir).
- Seri kilometre taşları (her biri hesap başına bir kez): 3 gün 30 elmas, 7 gün Seri Dondurucu,
  14 gün XP Takviyesi, 30 gün 3 gün Premium, 50 gün Gizemli Sandık, 100 gün canlı ders,
  200 gün 7 gün Premium, 365 gün canlı ders ve 1000 elmas.

## 4. Elmas: az kaynak, net harcama

Kazanılır: günlük hedef +5, seviye atlama +20, lig ilk üç 100/60/40, seri kilometre taşları, sandıklar.
Harcanır: can doldurma 350, mağaza (dondurucu, takviye, sandık, çerçeve).

Her tek seferlik ödül `reward_claims` tablosuna yazılır. Aynı ödül ikinci kez verilemez.

## 5. Sandık ve iş ortağı hediyeleri

- Sandık açılmadan önce, açılış ekranında olasılıklar gösterilir.
- "İş ortağı hediyesi" çıkarsa, aktif teklifler arasından ağırlığa göre biri seçilir ve kişiye özel,
  tek kullanımlık bir kod üretilir. Stoğu biten teklif havuzdan kendiliğinden düşer.
- Teklifin **kitlesi** vardır: `all` (herkes) veya `adult` (yalnızca 18+). Çocuk ve genç hesaplara
  kahve, sinema gibi yetişkin teklifleri hiç çıkmaz. Olasılık tablosu da buna göre hesaplanır.
- Kazanılan hediye üç yerde görünür: bildirim ("Sandıktan hediye kazandın"), **Ödüller > Kuponlarım**
  sekmesi (kod, kalan gün, koşullar, "Kullandım") ve kasa geçmişi. Süresi dolan kupon kendiliğinden
  "Süresi doldu" olur.
- Yönetim panelinden `Ayarlar > Özellikler > İş ortağı hediyeleri` kapatılırsa sandıktan hiç hediye çıkmaz.

## 6. Yaş grupları

Kayıtta seçilir (Çocuk 7-12, Genç 13-17, Yetişkin 18+). Çocuk hesabı veli onayı ister, onay denetim
kaydına yazılır. Yaş grubu şunları belirler:

- Defne'nin tonu ve güvenlik kuralları (çocuklara kısa, sade, kişisel bilgi sormayan konuşma).
- Sınav modu çocuklarda hiç görünmez. Genç ve yetişkinlerde isteğe bağlıdır (Ayarlar > Sınav modu).
- İş ortağı hediyelerinin kitlesi.
- Gölge Düellosu'nda rakip gölgesi aynı yaş grubundan seçilir.
- Çocuk hesaplarına kampanya e-postası seçeneği gösterilmez.

## 7. Tek hesap, tek öğrenci

İlerleme, seviye, yaşa uygun içerik ve lig bir kişiye aittir; bu yüzden hesap paylaşımı zorlaştırılır:

- Aynı anda en fazla 3 cihazda oturum açık kalır; 4. cihazda giriş yapılınca en eski oturum kapanır.
- Yaş grubu 30 günde bir değiştirilebilir. Çocuk hesabı yalnızca kayıtta veli onayıyla açılır; çocuk hesabından büyük yaş grubuna geçiş destek ekibi üzerinden yapılır.
- Sınav modu çocuk hesaplarında sunucu tarafında da kapalıdır.
