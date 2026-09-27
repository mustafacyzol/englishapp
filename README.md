# DilGO · Bayrak Dil Okulları

**Oku · Dinle · Konuş · Yaz.** Dört beceriyi tek uygulamada birleştiren, tamamen oyunlaştırılmış İngilizce öğrenme platformu.
HikayeGO'nun hikaye tabanlı okuma deneyimini; Duolingo tarzı ders yolu ve oyunlaştırmayla, yapay zekâ öğretmen **Defne** ile konuşma/yazma pratiğiyle ve Bayrak Dil Okulları'nın gerçek öğretmenleriyle birleştirir.

> "DilGO" çalışma adıdır; marka adı tek yerden değişir (bkz. [Adı değiştirmek](#adı-değiştirmek)).

---

## İçindekiler
- [Ne var?](#ne-var)
- [Mimari](#mimari)
- [Yerelde çalıştırma](#yerelde-çalıştırma)
- [Demo önizleme (sunucusuz)](#demo-önizleme-sunucusuz)
- [Klasör yapısı](#klasör-yapısı)
- [Güvenlik](#güvenlik)
- [Mobil uygulama (iOS / Android)](#mobil-uygulama-ios--android)
- [Yayına alma (Hostinger)](docs/DEPLOY_HOSTINGER.md)
- [Ürün stratejisi ve farkımız](docs/PRODUCT.md)

## Ne var?

| Alan | Özellikler |
|---|---|
| **Okuma + Dinleme** | Seviyeli (A1-C2) hikaye kütüphanesi, dokun-çevir kelime kartı, paragraf/tüm hikaye sesli okuma (kelime kelime vurgulu), Türkçe çeviri katmanı, kavrama quizi, kaldığın yerden devam, yer imi |
| **Ders yolu** | Kurs → ünite → ders; 7 alıştırma tipi (seçmeli, boşluk doldurma, dinle-seç, kutucukla çeviri, dinle-yaz, sesli söyle, eşleştir), yanlışlar sona tekrar gelir, ünite rehberleri (Türkçe dilbilgisi notları), kontrol noktaları, tekrarla taç kazanma |
| **Konuşma + Yazma (AI)** | Defne: seviyeni, hedefini, ilgi alanlarını ve **kaydettiğin kelimeleri bilen** AI koç (tek persona dosyası: `frontend/src/lib/tutor.ts`). **Sesli arama ekranı**: 3B Defne portresi; konuşurken dudak senkronlu konuşma döngüsüne, dinlerken bekleme döngüsüne geçer, kelime kelime altyazı, eller serbest mod. Sesli/yazılı sohbet, rol-yapma senaryoları, Türkçe düzeltme kartı. **Yazma Atölyesi**: fotoğraflı görevler, hedef kelimeler, inceleme animasyonu, hatalar metnin üstünde işaretli, puan halkası + 4'lü rubrik, düzeltilmiş hali, deneme karşılaştırması |
| **Dört beceri takibi** | Her XP okuma/dinleme/konuşma/yazma arasında, yapılan alıştırma türüne göre bölünür (`App\Support\Skills`). Beceri seviyeleri, 7 günlük eğilim, denge puanı, en geride kalan beceri önerisi (`GET /me/skills`) ve her gün her beceriden bir görev içeren **günlük plan** (odak beceri önde) |
| **Sınav modu** | YDS, YÖKDİL, YKS-YDT, IELTS ve TOEFL. Onboarding'de sınav ve tarih seçilir; ÖSYM formatında (5 seçenek) kelime, dilbilgisi, cloze, cümle tamamlama, çeviri, okuma, diyalog, paragraf ve anlam bütünlüğü soruları. Cevap anahtarı istemciye gitmez, her cevap sunucuda değerlendirilir ve **Türkçe çözümle** döner; bölüm bazında isabet, en zayıf bölüm önerisi, geri sayım. Defne'nin sohbet ve yazı değerlendirmesi seçilen sınava göre ayarlanır (`App\Support\Exams`). Soru bankası yönetim panelinden düzenlenir |
| **Gölge Düellosu** | DilGO'ya özgü **blitz**: 4 tur × 3 soru, soru başı 12 saniye, hız bonusu ve üst üste doğrulara x2'ye kadar seri çarpanı (sunucu ve istemci aynı formülle puanlar), gerginleşen son saniyelerde kalp atışı sesi, canlı cevaplayan gölge, halat çekme skor çubuğu. 4 tur × 4 beceri, başka bir öğrencinin gerçek beceri seviyelerinden üretilen "gölgesine" karşı canlı yarış. Kupalar, 6 rütbe (Acemi → Efsane), sen yokken gölgenin kupa savunması + bildirim, 3 galibiyet serisinde sandık, günlük 5 ücretsiz hak (Premium sınırsız), sıralama, düello rozetleri ve görevleri |
| **Kurumlar (B2B)** | Okul/kurs/şirketlere koltuk bazlı anlaşma; e-posta daveti ya da katılım koduyla katılım (öğrenci koltuğu = Premium), kurum yöneticileri için yönetim paneli gibi **ayrı bir kurum paneli** (`/kurum`): kurumun logosu ve rengi, genel bakış (haftanın en çalışkanları, bir haftadır girmeyenler), öğrenciler, sınıf karneleri, davetler, kurum ayarları. Yalnızca kurum yöneticileri erişir; kişisel sohbetler ve yazılar kuruma açık değildir. Yönetim panelinden kurum oluşturma, rapor ve davet |
| **Kişisel onboarding** | 7-8 adım, fotoğraflı seçimler: ad, motivasyon, (sınav hedefi ve tarihi), ilgi alanları, odak beceri, seviye, çalışma saati + tempo. Sol tarafta cevaplar canlı dolan bir **biniş kartına** işlenir. Yarım kalan kayıt cihazda saklanır; seviye testine gidip dönen kişi kaldığı adımdan devam eder. İlk girişte gerçek menü öğelerini gösteren **rehber (coach mark)** turu |
| **Giriş** | Sade, ortalanmış giriş: Google ve Apple ile giriş (kimlik token'ı sunucuda doğrulanır, anahtarlar tanımlanınca açılır), "Beni hatırla" (işaretliyse 60 gün, değilse 1 günlük oturum), dil seçici |
| **Kelime pratiği** | Kelime defteri + SM-2 aralıklı tekrar ve beş oyun: **kaydırmalı kartlar** (sağa biliyorum, sola tekrar; mobilde parmakla, masaüstünde tuşlarla), hızlı eşleştirme (45 sn, seri), doğru mu (30 sn blitz), dinle ve yaz, harf karıştır. Defter dolana kadar seviyeye uygun başlangıç kelimeleri gelir, bilinmeyenler deftere eklenir. Oyun XP'si günlük sınırlıdır |
| **Ses kimliği** | DilGO'ya özgü tek tını ve tek motif: yükselen "Dil-GO" beşlisi (Sol→Re). Doğru cevap motifi çalar, seri motifi yukarı taşır, yanlış onu yumuşakça tersine çevirir, ders bitişi akorla çözer; bildirimler, düello geri sayımı ve kalp atışı aynı aileden (`scripts/gen-sfx.mjs` ile sentezlenir, `frontend/public/sfx`) |
| **Oyunlaştırma** | Ses efektleri (doğru, seri, yanlış, ders bitti, sandık, seviye, bildirim), XP ve seviyeler, günlük hedef, seri + seri dondurucu, 5 can (30 dk'da yenilenir), 10 kademeli haftalık lig (terfi/düşme), 38 rozet (bronz→efsane, gizli rozetler), günlük/haftalık görevler, elmas ekonomisi, mağaza, XP takviyesi, gizemli sandık, profil ısı haritası |
| **Ödül Kasası** | Kazanılan her şey bir kart olarak birikir ve kullanıcı istediğinde "açar": Premium günleri, elmas, XP takviyesi, indirim kuponu, **Bayrak Dil Okulları canlı ders kuponu** (BDO-XXXX kodu, şubede/online doğrulanır). Görevler, Kasa ve Mağaza tek "Ödüller" sekmesinde |
| **Gizemli sandık** | Anahtar kilide girip döner, sandık kalp atışıyla titrer, ışık patlamasıyla açılır ve ödül nadirlik renginde yükselir. **Olasılıklar açılmadan önce gösterilir.** Ağırlıklı havuz: elmas, kartlar, Premium ve **iş ortaklarından hediye/kupon** (her kazanana kişisel, tek kullanımlık kod; stok ve geçerlilik süresi). İş ortakları ve teklifleri yönetim panelinden yönetilir |
| **Büyüme** | Paketler, kupon kodları (yüzde/tutar, ilk sipariş, paket kısıtı, limitler), toplu hediye kodu üretimi (CSV), referans sistemi (doğrulamada elmas, ilk alışverişte Premium kartı), paylaşılabilir profil |
| **Ödeme** | iyzico Checkout Form (3D Secure), sandbox desteği, geliştirme için sahte ödeme ağ geçidi, %100 kuponla ücretsiz sipariş |
| **Yönetim paneli** | Adım-yukarı (step-up) OTP / TOTP korumalı; pano (KPI + 30 günlük grafikler), kullanıcı yönetimi (rol, askı, elmas, Premium, kart verme, kilit açma, 2FA sıfırlama), sipariş/iade, canlı ders kuponu doğrulama, tüm içerik ve oyun tablolarının CRUD'u, **site ayarları** (bakım, kayıt, duyuru, marka ve iletişim, sosyal medya, özellik aç/kapa: düello, lig, AI, hikâye, sınav, sandık iş ortakları, sosyal giriş; ekonomi ve limitler, oturum süresi), iş ortakları, sandık teklifleri, sınav soru bankası, denetim kaydı. Kapatılan özellik hem menüden kalkar hem API'de kapanır |
| **Dil** | Başlıkta şık dil seçici (Türkçe / English, arayüz); tema (açık/koyu/sistem) Ayarlar'da önizlemeli |
| **Özgün alıştırmalar** | 10 alıştırma tipi. Duolingo'da olmayan üçü: **Hata Avı** (Türk öğrencilerin tipik hatasını taşıyan cümlede hatalı kelimeye dokun, düzeltmeyi seç, Türkçe açıklamayı oku), **Sahne** (gerçek bir senaryoda senin repliğin eksik; doğru cevabı seç) ve **Sıralama** (bir işin ya da hikâyenin adımlarını doğru sıraya diz). Her tip kendi rengi, etiketi ve sahne tonuyla gelir; üst üste doğru yapınca kombo rozeti çıkar |
| **Ders yolu tasarımı** | "Kaldığın yer" kartı (kurs ilerleme halkası, ünite kupasına kalan durak), seri uyarısı, dört beceri planı; yürünen kısmı renklenen kıvrımlı patika, her durağın yanında okunabilir etiket, "Buradasın" işareti, ünite kupaları ve ekrandan çıktığında "Kaldığın yere dön" düğmesi |
| **Ödül yolu** | Tek seferlik, çift verilmeyen ödüller (`reward_claims`): günlük hedef +5 elmas, her seviye +20 elmas ve her 5 seviyede gizemli sandık, seri kilometre taşları (3 gün 30 elmas → 7 dondurucu → 14 XP takviyesi → 30 Premium 3 gün → 50 sandık → 100 canlı ders → 200 Premium 7 gün → 365 canlı ders + 1000 elmas), lig birincisine sandık. Ödüller sayfasındaki "Nasıl kazanırım?" sekmesi ilerlemeyi gösterir |
| **Tanıtım sayfaları** | Ana sayfa (otomatik dönen dört beceri modülü, canlanan Defne sohbeti, ödül yolu animasyonu, öğrenci yorumları kaydırıcısı, kayan yorum şeridi), Hakkımızda, Blog, İletişim formu (KVKK onayı, bal küpü, isteğe bağlı Turnstile). Kurumsal footer + 5 yasal belge (kullanım, gizlilik/KVKK, çerez, mesafeli satış, iptal-iade) |
| **Öğrenci yorumları** | Yönetim panelinden yönetilir (`testimonials`); ana sayfadaki kaydırıcı ve kayan şerit buradan beslenir. Kurulumda gelen örnek yorumlar yayına almadan önce gerçekleriyle değiştirilmelidir |
| **Görseller** | Tüm fotoğraflar ve 3B objeler Magnific ile üretildi (`frontend/public/img`). 12 parçalık ödül/para ikonu seti tek bir görselden bölünerek üretildi; hepsi aynı malzeme, ışık ve açıda. Her görselin 20px bulanık ön izlemesi pakete gömülüdür (`scripts/gen-lqip.mjs` → `src/lib/lqip.ts`), bu yüzden yavaş bağlantıda boş kutu yerine bulanık görsel çıkar |
| **Yükleme durumları** | HTML açılış ekranı (React yüklenmeden boyanır), markalı spinner ve sayfa iskeletleri (yol, liste, kart, okuma) |
| **Mikrofon** | Konuşma alıştırması açılır açılmaz izin sistem diyaloğuyla istenir; engelliyse tarayıcıya özel Türkçe yönerge gösterilir |
| **Hesap** | Kayıt (7 adımlı kişisel onboarding), e-posta OTP doğrulama, şifre sıfırlama (OTP), oturum listesi/kapatma, şifre değiştirme, tema (açık/koyu), ses, okuma hızı, KVKK uyumlu hesap silme (OTP onaylı) |

## Mimari

```
┌──────────────────────────┐        HTTPS / JSON (Bearer token)       ┌──────────────────────────────┐
│ frontend/  React 19 +    │  ─────────────────────────────────────▶  │ backend/  Laravel 12 API     │
│ Vite + Tailwind 4        │                                           │ Sanctum · MySQL · SMTP       │
│ ─ Web (public_html)      │                                           │ Scheduler (cron) · Queue(DB) │
│ ─ iOS/Android (Capacitor)│                                           │ Anthropic (Defne) · iyzico     │
└──────────────────────────┘                                           └──────────────────────────────┘
```

**Neden bu yığın?**
- **Hostinger Premium Web Hosting** Node.js sunucu çalıştırmaz; PHP + MySQL + cron + SSH sunar. Laravel bu ortamda sorunsuz çalışır (kuyruk ve zamanlayıcı tek bir cron ile).
- API **tamamen başsız (headless)** ve token tabanlıdır: aynı API web sitesine, iOS ve Android uygulamasına hizmet verir. Cookie/CSRF yok → mobil taşıma sıfır ek iş.
- Frontend statik dosya olarak derlenir; hem `public_html`'e yüklenir hem de **Capacitor** ile native uygulamaya paketlenir (tek kod tabanı).
- Büyüdüğünüzde: aynı kod VPS/Cloud'a taşınır, `QUEUE_CONNECTION=redis`, `CACHE_STORE=redis` yapılır, kod değişmez.

**Teknolojiler:** Laravel 12, Sanctum, PHP 8.2+ · React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, Motion, Lucide · Capacitor 8 · Anthropic Claude (resmî PHP SDK) · iyzico.

## Yerelde çalıştırma

Gereksinimler: PHP 8.2+, Composer 2, Node 20+.

```bash
# API
cd backend
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed          # örnek içerik + demo hesaplar
php artisan serve                   # http://127.0.0.1:8000

# Web uygulaması (ayrı terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                         # http://localhost:5173  (/api → :8000 proxy)
```

Demo hesaplar (yalnızca yerelde oluşturulur):

| Rol | E-posta | Şifre |
|---|---|---|
| Süper yönetici | `admin@dilgo.test` | `password1` |
| Öğrenci | `ogrenci@dilgo.test` | `password1` |

- Yerelde e-postalar `storage/logs/laravel-*.log` dosyasına yazılır (OTP kodlarını oradan görebilirsiniz).
- Ödemeler yerelde `PAYMENT_GATEWAY=fake` ile anında "ödendi" olur.
- Defne için `.env` dosyasına `ANTHROPIC_API_KEY` ekleyin; anahtar yoksa AI ekranları "bakımda" mesajı gösterir, uygulamanın geri kalanı çalışır.

Testler: `cd backend && php artisan test` (kayıt/OTP, kilitleme, admin 2FA, ders→XP→seri→rozet, lig kapanışı, mağaza, sandık, canlı ders kuponu, kupon+ödeme, hediye kodu, seviye testi, seri dondurucu).

## Demo önizleme (sunucusuz)

`cd frontend && VITE_DEMO=1 npx vite build` → `dist-demo/index.html` + `dist-demo/img/`. Bu derleme API yerine gerçek backend'den kaydedilmiş yanıtları (`src/demo/fixture.json`) kullanır; ders/hikaye tamamlama, görev ödülü, mağaza, kart açma ve Defne sohbeti tarayıcıda simüle edilir. Sol alttaki **Demo** çubuğundan öğrenci ya da yönetim paneline geçilir (yönetim doğrulama kodu olarak 6 haneli herhangi bir sayı yeterli).

## Klasör yapısı

```
backend/
  app/Services/          GamificationService (XP, seri, görev, rozet), LeagueService, RewardService (Ödül Kasası),
                         CheckoutService + Payments/ (iyzico, fake), CouponService, ReferralService,
                         AiTutorService (Defne), LessonService (sunucu tarafı puanlama), SrsService, OtpService
  app/Http/Controllers/Api/   Auth, Account, Learn, Story, Word, Ai, Game, Billing, Placement, Public, Admin/*
  app/Support/           Settings (panelden düzenlenebilir), Audit, Totp, Turnstile, TextMatch, Period
  config/dilgo.php       Tüm iş kuralları (ödüller, limitler, lig, güvenlik) tek dosyada
  database/data/         stories.json, placement.json      database/seeders/  müfredat, rozetler, paketler
  routes/api.php         /api/v1/*        routes/console.php  zamanlanmış görevler
frontend/
  src/pages/public|auth|app|admin     src/components/ui|game     src/lib (api, auth, speech, fx)
  capacitor.config.ts                  public/.htaccess (SPA + güvenlik başlıkları)
docs/   DEPLOY_HOSTINGER.md · PRODUCT.md
scripts/build-release.sh               Hostinger'a yüklenecek zip'leri üretir
```

## Güvenlik

- Şifreler bcrypt; kayıt/giriş/OTP uçlarında IP + hesap bazlı hız sınırı; 5 hatalı girişte 15 dk hesap kilidi (şifre sıfırlama kilidi açar); kullanıcı sayımı engellenmiş şifre sıfırlama.
- E-posta doğrulama ve şifre sıfırlama 6 haneli **OTP** ile (10 dk geçerli, 5 deneme, 60 sn yeniden gönderim bekleme, hash'lenmiş saklama).
- **Yönetim paneli adım-yukarı doğrulama:** normal oturum admin API'sine erişemez; e-posta OTP'si (veya TOTP + kurtarma kodları) ile 12 saatlik ayrı bir "admin" token'ı alınır.
- **Admin kurtarma:** SSH üzerinden `php artisan dilgo:admin eposta@okul.com --reset-password --reset-2fa --unlock` (kurulum için `--create`).
- Bal küpü (honeypot) + isteğe bağlı Cloudflare Turnstile; güvenlik başlıkları (HSTS, nosniff, frame-deny, permissions policy); CORS beyaz listesi; denetim kaydı (giriş, başarısız giriş, kilit, ödeme, tüm admin işlemleri).
- **Sosyal giriş:** Google/Apple ID token'ı sunucuda imza, hedef kitle (aud), yayıncı ve süre kontrolüyle doğrulanır; mevcut hesap yalnızca sağlayıcı e-postayı doğrulanmış işaretliyse bağlanır.
- **Oturum süresi:** "Beni hatırla" yoksa token 1 gün geçerlidir ve tarayıcıda yalnızca sekme oturumunda tutulur.
- **Özellik anahtarları** (`feature:*` ara katmanı) kapatılan özelliği API'de de kapatır. Sınav cevap anahtarı hiçbir öğrenci uç noktasında dönmez; oyun ve sınav XP'si tekrar gönderime ve günlük sınıra karşı korunur.
- XP/puan **sunucuda yeniden hesaplanır**; ödeme sunucudan-sunucuya doğrulanır (tutar ve sepet eşleşmesi kontrol edilir).
- KVKK: hesap silme verileri anonimleştirir; aydınlatma metni taslağı `/privacy`.

## Mobil uygulama (iOS / Android)

```bash
cd frontend
# .env içinde VITE_API_URL mutlaka mutlak https adresi olmalı: https://api.dilgo.app/api
npm run build
npx cap add android && npx cap add ios   # ilk sefer
npx cap sync
npx cap open android                      # Android Studio → imzala → Play Console
npx cap open ios                          # Xcode → App Store Connect
```
API'nin `.env` dosyasındaki `CORS_ALLOWED_ORIGINS` değeri `capacitor://localhost,https://localhost` içerir. Mikrofon için iOS'ta `NSMicrophoneUsageDescription` ve `NSSpeechRecognitionUsageDescription`, Android'de `RECORD_AUDIO` izni eklenmelidir (detay: docs/DEPLOY_HOSTINGER.md).

## Adı değiştirmek

- API: `backend/.env` → `APP_NAME`, `BRAND_SCHOOL`, `BRAND_SUPPORT_EMAIL` (e-postalar ve AI talimatları buradan beslenir).
- Web: `frontend/src/components/game/Logo.tsx`, `index.html` başlıkları, `public/manifest.webmanifest`, `capacitor.config.ts` (`appId`, `appName`).
