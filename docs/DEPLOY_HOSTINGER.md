# Hostinger Premium Web Hosting'e kurulum

> Genel kurulum, hazır SQL dosyası, güvenlik ve SEO kontrol listesi için: [KURULUM.md](KURULUM.md). SSH erişiminiz varsa `./scripts/install.sh` adımların çoğunu sizin yerinize yapar.

Hedef düzen (önerilen):

| Adres | Ne çalışır | Sunucudaki klasör |
|---|---|---|
| `https://dilgo.app` | Web uygulaması (React derlemesi) | `domains/dilgo.app/public_html` |
| `https://api.dilgo.app` | Laravel API | `domains/api.dilgo.app/dilgo-api` (kod) → `public_html` bu projenin `public/` klasörüne sembolik bağlantı |

> Alan adını henüz seçmediyseniz `dilgo.app` yerine kendi alan adınızı yazın. Aynı alan adı altında `dilgo.app/api` şeklinde de çalıştırılabilir (en altta).

---

## 1) hPanel hazırlığı

1. **PHP sürümü:** *Websites → api.dilgo.app → Advanced → PHP Configuration* → **PHP 8.3** (en az 8.2). Eklentiler: `pdo_mysql`, `mbstring`, `intl`, `fileinfo`, `openssl`, `curl`, `zip` açık olsun.
2. **Alt alan adı / web sitesi:** `api.dilgo.app`'i ayrı web sitesi ya da alt alan adı olarak ekleyin (Premium paket birden fazla siteye izin verir).
3. **SSL:** Her iki adres için *Security → SSL* üzerinden ücretsiz SSL'i etkinleştirin.
4. **SSH:** *Advanced → SSH Access* → etkinleştirin, bağlantı bilgisini not edin.
5. **MySQL:** *Databases → MySQL Databases* → veritabanı + kullanıcı oluşturun (ör. `u123456789_dilgo`). Şifreyi not edin.
6. **E-posta:** *Emails* → `no-reply@dilgo.app` (ve isterseniz `destek@dilgo.app`) posta kutusu oluşturun. DNS'te SPF/DKIM kayıtlarının "aktif" olduğundan emin olun (teslim edilebilirlik için kritik).

## 2) API'yi yükleme (SSH)

```bash
ssh -p 65002 u123456789@SUNUCU_IP
cd ~/domains/api.dilgo.app

# Seçenek A, GitHub'dan (önerilen, güncellemesi kolay)
git clone https://github.com/mustafacyzol/englishapp.git dilgo-src
ln -s dilgo-src/backend dilgo-api
# Seçenek B, scripts/build-release.sh ile üretilen dilgo-api.zip'i File Manager'dan yükleyip açın

cd dilgo-api
composer2 install --no-dev --optimize-autoloader     # Hostinger'da "composer" v1'dir, composer2 kullanın
cp .env.example .env
php artisan key:generate
```

`public_html`'i Laravel'in `public` klasörüne bağlayın:

```bash
cd ~/domains/api.dilgo.app
mv public_html public_html_old         # boş/örnek dosyaları yedekle
ln -s dilgo-api/public public_html
```

## 3) `.env` (üretim)

```dotenv
APP_NAME=DilGO
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.dilgo.app
FRONTEND_URL=https://dilgo.app
CORS_ALLOWED_ORIGINS=https://dilgo.app,https://www.dilgo.app,capacitor://localhost,https://localhost
LOG_CHANNEL=daily
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_dilgo
DB_USERNAME=u123456789_dilgo
DB_PASSWORD=********

CACHE_STORE=database
QUEUE_CONNECTION=database
SESSION_DRIVER=array

MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=no-reply@dilgo.app
MAIL_PASSWORD=********
MAIL_FROM_ADDRESS=no-reply@dilgo.app
MAIL_FROM_NAME="DilGO · Bayrak Dil Okulları"
BRAND_SUPPORT_EMAIL=destek@dilgo.app

ADMIN_REQUIRE_EMAIL_OTP=true
TURNSTILE_SECRET_KEY=               # Cloudflare Turnstile (isteğe bağlı ama önerilir)
AUTH_TOKEN_TTL_DAYS=60              # "Beni hatırla" süresi (panelden de değiştirilebilir)

# Google / Apple ile giriş (boşsa butonlar "yakında" der)
GOOGLE_CLIENT_ID=                   # Google Cloud Console > OAuth istemci kimliği (Web)
APPLE_CLIENT_ID=                    # Apple Developer > Services ID (ör. app.dilgo.web)

ANTHROPIC_API_KEY=sk-ant-...        # Defne (AI öğretmen)
AI_MODEL=claude-opus-5
AI_EFFORT=low

# Defne'nin gerçek sesi ve ağız senkronu (boşsa tarayıcının sesi kullanılır)
ELEVENLABS_API_KEY=                 # elevenlabs.io > Profile > API key
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

PAYMENT_GATEWAY=iyzico
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...
IYZICO_BASE_URL=https://api.iyzipay.com    # canlı; test için https://sandbox-api.iyzipay.com
```

Ardından:

```bash
php artisan migrate --force
php artisan db:seed --force          # müfredat, hikayeler, rozetler, görevler, paketler, AI senaryoları (demo hesap OLUŞTURMAZ)
# SSH yoksa bu iki komut yerine phpMyAdmin ile backend/database/sql/dilgo_install.sql dosyasını içe aktarabilirsiniz
php artisan storage:link             # admin panelinden yüklenen avatarlar için
php artisan dilgo:admin siz@bayrakdilokullari.com --create --name="Adınız" --role=super_admin
php artisan config:cache && php artisan route:cache && php artisan view:cache
chmod -R 775 storage bootstrap/cache
```

Komut geçici bir şifre yazdırır → web'den giriş yapıp **Ayarlar → Güvenlik**'ten değiştirin, ardından yönetim paneli için TOTP'yi etkinleştirin.

## 4) Cron (zamanlayıcı + kuyruk)

*Advanced → Cron Jobs* → **her dakika**:

```
/usr/bin/php /home/u123456789/domains/api.dilgo.app/dilgo-api/artisan schedule:run >> /dev/null 2>&1
```

Bu tek cron şunları çalıştırır: kuyruk (e-postalar), saatlik süre dolumları, 20:00 seri hatırlatmaları, pazartesi 00:05 lig kapanışı ve terfi/düşmeler, token temizliği.

## 5) Web uygulamasını yükleme

Kendi bilgisayarınızda:

```bash
VITE_API_URL=https://api.dilgo.app/api ./scripts/build-release.sh
```

`release/dilgo-web.zip` dosyasını *File Manager* ile `domains/dilgo.app/public_html` içine yükleyip açın. Zip içinde gelen `.htaccess` SPA yönlendirmesini, HTTPS zorlamasını, önbellek ve güvenlik başlıklarını ayarlar.

## 6) iyzico

1. iyzico üye işyeri panelinden canlı API anahtarlarını alın, `.env`'e yazın.
2. Geri dönüş adresi kod tarafından gönderilir: `https://api.dilgo.app/api/v1/payments/iyzico/callback` (ek ayar gerekmez).
3. Önce `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com` ile test kartlarıyla deneyin.
4. Not: Paketler şu an **tek seferlik** satın alma olarak çalışır (otomatik yenileme yok). Abonelik (iyzico Subscription API) sonraki aşamada eklenebilir.

## 7) Güncelleme (yeni sürüm)

```bash
cd ~/domains/api.dilgo.app/dilgo-src && git pull
cd ../dilgo-api && composer2 install --no-dev --optimize-autoloader
php artisan migrate --force && php artisan optimize:clear && php artisan config:cache && php artisan route:cache
```
Web için yeni `dilgo-web.zip`'i yükleyin.

## 8) Mobil uygulamalar

- `frontend/.env` → `VITE_API_URL=https://api.dilgo.app/api` (mutlak adres şart).
- `npm run build && npx cap add android && npx cap add ios && npx cap sync`
- **Android** `android/app/src/main/AndroidManifest.xml`: `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
- **iOS** `ios/App/App/Info.plist`: `NSMicrophoneUsageDescription` ve `NSSpeechRecognitionUsageDescription` açıklamaları.
- Konuşma tanıma WebView'de her cihazda desteklenmeyebilir; tam native deneyim için `@capacitor-community/speech-recognition` eklentisi `src/lib/speech.ts` içindeki `listen()` fonksiyonuna bağlanabilir (arayüz aynı kalır).

## Aynı alan adı altında çalıştırmak (alternatif)

Ayrı alt alan adı istemezseniz: kodu `~/dilgo-api`'ye koyun ve `public_html/api` → `~/dilgo-api/public` sembolik bağlantısını oluşturun. Bu durumda API adresi `https://dilgo.app/api/api/v1/...` olur; `APP_URL=https://dilgo.app/api` ve frontend'de `VITE_API_URL=https://dilgo.app/api/api` kullanın (web `.htaccess` dosyası `/api` yolunu SPA'ya yönlendirmez). Daha temiz adresler ve bağımsız ölçeklenme için yukarıdaki alt alan adı yöntemi önerilir.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| 500 hatası, boş sayfa | `storage/logs/laravel-*.log`'a bakın; `chmod -R 775 storage bootstrap/cache`; `php artisan optimize:clear` |
| E-posta gitmiyor | SMTP şifresi, `MAIL_SCHEME=smtps` + 465; hPanel'de SPF/DKIM; cron çalışıyor mu (e-postalar kuyruktan gider, OTP'ler anlık gönderilir) |
| CORS hatası | `CORS_ALLOWED_ORIGINS` web adresini tam olarak (https dahil) içermeli, sonra `php artisan config:cache` |
| Admin şifresi/2FA kayıp | SSH: `php artisan dilgo:admin eposta --reset-password --reset-2fa --unlock` |
| Defne "bakımda" diyor | `ANTHROPIC_API_KEY` eksik/geçersiz ya da `AI_ENABLED=false`; loglara bakın |

## Defne: konuşan yapay zekâ nasıl çalışır

Hiçbir parça göstermelik değildir. Hangi anahtar varsa o katman gerçek çalışır:

| Katman | Anahtar | Anahtar yoksa |
| --- | --- | --- |
| Sohbet, rol oyunu, yazı düzeltme | `ANTHROPIC_API_KEY` | AI ekranları "bakımda" der, uygulamanın geri kalanı çalışır |
| Defne'nin sesi | `ELEVENLABS_API_KEY` | Tarayıcının kendi İngilizce sesi okur |
| Ağız hareketi | (sesle birlikte gelir) | Kelime sınırlarında kısa ağız darbeleri (yaklaşık) |
| Konuşmayı yazıya çevirme | yok (tarayıcının Web Speech API'si) | Desteklemeyen tarayıcıda klavyeyle yazılır |

Ağız senkronu: `/api/v1/ai/tts` Defne'nin cümlesini ElevenLabs'e gönderir, MP3'ü `storage/app/tts/` altında
önbelleğe alır (aynı cümle ikinci kez ücretlendirilmez). Tarayıcı sesi çalarken Web Audio `AnalyserNode` ile
anlık ses şiddetini ölçer ve "konuşan" videonun görünürlüğünü bu şiddete bağlar. Ses yükseldikçe ağız açılır,
sustuğunda kapanır. Açılıştaki selamlama, sesle birebir eşlenmiş hazır bir videodur.

Heceye ve sese birebir uyan dudak hareketi (viseme) gerekirse, viseme zaman damgası döndüren bir TTS
(ör. Azure Speech) ile 2D veya 3D bir avatar gerekir. Bunun için `speakNeural` fonksiyonuna,
ses şiddeti (`onLevel`) yanında viseme olaylarını ileten bir geri çağırma eklenmesi yeterlidir.
