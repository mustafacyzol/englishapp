# DilGO — Bayrak Dil Okulları

**Oku · Dinle · Konuş · Yaz.** Dört beceriyi tek uygulamada birleştiren, tamamen oyunlaştırılmış İngilizce öğrenme platformu.
HikayeGO'nun hikaye tabanlı okuma deneyimini; Duolingo tarzı ders yolu ve oyunlaştırmayla, yapay zekâ öğretmen **Ada** ile konuşma/yazma pratiğiyle ve Bayrak Dil Okulları'nın gerçek öğretmenleriyle birleştirir.

> "DilGO" çalışma adıdır; marka adı tek yerden değişir (bkz. [Adı değiştirmek](#adı-değiştirmek)).

---

## İçindekiler
- [Ne var?](#ne-var)
- [Mimari](#mimari)
- [Yerelde çalıştırma](#yerelde-çalıştırma)
- [Klasör yapısı](#klasör-yapısı)
- [Güvenlik](#güvenlik)
- [Mobil uygulama (iOS / Android)](#mobil-uygulama-ios--android)
- [Yayına alma (Hostinger)](docs/DEPLOY_HOSTINGER.md)
- [Ürün stratejisi ve farkımız](docs/PRODUCT.md)

## Ne var?

| Alan | Özellikler |
|---|---|
| **Okuma + Dinleme** | Seviyeli (A1–C2) hikaye kütüphanesi, dokun-çevir kelime kartı, paragraf/tüm hikaye sesli okuma (kelime kelime vurgulu), Türkçe çeviri katmanı, kavrama quizi, kaldığın yerden devam, yer imi |
| **Ders yolu** | Kurs → ünite → ders; 7 alıştırma tipi (seçmeli, boşluk doldurma, dinle-seç, kutucukla çeviri, dinle-yaz, sesli söyle, eşleştir), yanlışlar sona tekrar gelir, ünite rehberleri (Türkçe dilbilgisi notları), kontrol noktaları, tekrarla taç kazanma |
| **Konuşma + Yazma (AI)** | Ada: seviyeni, hedefini ve **kaydettiğin kelimeleri bilen** AI öğretmen. Sesli/yazılı sohbet, 8 rol-yapma senaryosu (görev listeli), tek önemli hatayı Türkçe açıklayan düzeltme kartı, yeni kelimeleri tek dokunuşla deftere ekleme, Yazma Atölyesi (CEFR tahmini + puan + hata listesi + düzeltilmiş metin) |
| **Kelime** | Kelime defteri, SM-2 aralıklı tekrar kartları, ustalık seviyeleri, tekrarla can kazanma |
| **Oyunlaştırma** | XP ve seviyeler, günlük hedef, seri + seri dondurucu, 5 can (30 dk'da yenilenir), 10 kademeli haftalık lig (terfi/düşme), 38 rozet (bronz→efsane, gizli rozetler), günlük/haftalık görevler, elmas ekonomisi, mağaza, XP takviyesi, gizemli sandık, profil ısı haritası |
| **Ödül Kasası** | Kazanılan her şey bir kart olarak birikir ve kullanıcı istediğinde "açar": Premium günleri, elmas, XP takviyesi, indirim kuponu, **Bayrak Dil Okulları canlı ders kuponu** (BDO-XXXX kodu, şubede/online doğrulanır) |
| **Büyüme** | Paketler, kupon kodları (yüzde/tutar, ilk sipariş, paket kısıtı, limitler), toplu hediye kodu üretimi (CSV), referans sistemi (doğrulamada elmas, ilk alışverişte Premium kartı), paylaşılabilir profil |
| **Ödeme** | iyzico Checkout Form (3D Secure), sandbox desteği, geliştirme için sahte ödeme ağ geçidi, %100 kuponla ücretsiz sipariş |
| **Yönetim paneli** | Adım-yukarı (step-up) OTP / TOTP korumalı; pano (KPI + 30 günlük grafikler), kullanıcı yönetimi (rol, askı, elmas, Premium, kart verme, kilit açma, 2FA sıfırlama), sipariş/iade, canlı ders kuponu doğrulama, tüm içerik ve oyun tablolarının CRUD'u, ayarlar (bakım modu, duyuru, limitler), denetim kaydı |
| **Hesap** | Kayıt (3 adımlı onboarding), e-posta OTP doğrulama, şifre sıfırlama (OTP), oturum listesi/kapatma, şifre değiştirme, tema (açık/koyu), ses, okuma hızı, KVKK uyumlu hesap silme (OTP onaylı) |

## Mimari

```
┌──────────────────────────┐        HTTPS / JSON (Bearer token)       ┌──────────────────────────────┐
│ frontend/  React 19 +    │  ─────────────────────────────────────▶  │ backend/  Laravel 12 API     │
│ Vite + Tailwind 4        │                                           │ Sanctum · MySQL · SMTP       │
│ ─ Web (public_html)      │                                           │ Scheduler (cron) · Queue(DB) │
│ ─ iOS/Android (Capacitor)│                                           │ Anthropic (Ada) · iyzico     │
└──────────────────────────┘                                           └──────────────────────────────┘
```

**Neden bu yığın?**
- **Hostinger Premium Web Hosting** Node.js sunucu çalıştırmaz; PHP + MySQL + cron + SSH sunar. Laravel bu ortamda sorunsuz çalışır (kuyruk ve zamanlayıcı tek bir cron ile).
- API **tamamen başsız (headless)** ve token tabanlıdır: aynı API web sitesine, iOS ve Android uygulamasına hizmet verir. Cookie/CSRF yok → mobil taşıma sıfır ek iş.
- Frontend statik dosya olarak derlenir; hem `public_html`'e yüklenir hem de **Capacitor** ile native uygulamaya paketlenir (tek kod tabanı).
- Büyüdüğünüzde: aynı kod VPS/Cloud'a taşınır, `QUEUE_CONNECTION=redis`, `CACHE_STORE=redis` yapılır — kod değişmez.

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
- Ada için `.env` dosyasına `ANTHROPIC_API_KEY` ekleyin; anahtar yoksa AI ekranları "bakımda" mesajı gösterir, uygulamanın geri kalanı çalışır.

Testler: `cd backend && php artisan test` (kayıt/OTP, kilitleme, admin 2FA, ders→XP→seri→rozet, lig kapanışı, mağaza, sandık, canlı ders kuponu, kupon+ödeme, hediye kodu, seviye testi, seri dondurucu).

## Klasör yapısı

```
backend/
  app/Services/          GamificationService (XP, seri, görev, rozet), LeagueService, RewardService (Ödül Kasası),
                         CheckoutService + Payments/ (iyzico, fake), CouponService, ReferralService,
                         AiTutorService (Ada), LessonService (sunucu tarafı puanlama), SrsService, OtpService
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
