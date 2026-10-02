# DilGO kurulum rehberi

Bu belge DilGO'yu sıfırdan çalışır hale getirmek için gereken her şeyi tek yerde toplar: gereksinimler, veritabanı (MySQL bağlama ve hazır SQL dosyasını içe aktarma), ortam ayarları, yönetici hesabı, zamanlanmış görevler, güvenlik ve SEO kontrol listesi. Hostinger'a özel adımlar için ayrıca [DEPLOY_HOSTINGER.md](DEPLOY_HOSTINGER.md) dosyasına bakın.

> Tek komutla kurulum: `./scripts/install.sh` (aşağıda 7. bölüm). Betik aynı adımları sırayla sorarak uygular.

---

## 1) Gereksinimler

| Bileşen | Sürüm | Not |
|---|---|---|
| PHP | 8.2 veya üzeri (8.3 önerilir) | Eklentiler: `pdo_mysql`, `mbstring`, `intl`, `fileinfo`, `openssl`, `curl`, `zip` |
| Composer | 2.x | Hostinger'da `composer2` komutu |
| MySQL / MariaDB | MySQL 8.0+ veya MariaDB 10.6+ | Karakter seti `utf8mb4`, sıralama `utf8mb4_unicode_ci` |
| Node.js | 20+ | Yalnızca web uygulamasını derlemek için (sunucuda gerekmez) |

Klasörler:

```
backend/    Laravel API (sunucuya giden kısım)
frontend/   React web uygulaması (derlenip public_html'e giden kısım)
docs/       belgeler
scripts/    kurulum ve paketleme betikleri
backend/database/sql/dilgo_install.sql   hazır veritabanı (tablolar + başlangıç içerikleri)
backend/database/sql/dilgo_schema.sql    yalnızca tablo yapısı (inceleme için)
```

## 2) Veritabanını oluşturma

Sunucu panelinizde (hPanel, cPanel, Plesk) ya da komut satırında:

```sql
CREATE DATABASE dilgo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dilgo'@'localhost' IDENTIFIED BY 'GÜÇLÜ_BİR_ŞİFRE';
GRANT ALL PRIVILEGES ON dilgo.* TO 'dilgo'@'localhost';
FLUSH PRIVILEGES;
```

Uygulama kullanıcısına yalnızca kendi veritabanında yetki verin; `root` ile bağlanmayın.

## 3) Veritabanını doldurma: iki yol

**Yol A, önerilen (komut satırı varsa):** Laravel tabloları kendisi kurar ve başlangıç içeriklerini yükler.

```bash
cd backend
php artisan migrate --force
php artisan db:seed --force
```

**Yol B, hazır SQL dosyası (yalnızca phpMyAdmin varsa):** `backend/database/sql/dilgo_install.sql` dosyasını içe aktarın.

- phpMyAdmin: veritabanını seçin, *İçe aktar* sekmesi, dosyayı seçin, karakter seti `utf8mb4`, *Git*.
- Komut satırı: `mysql -u dilgo -p dilgo < backend/database/sql/dilgo_install.sql`

Dosya; 60 tablonun tamamını, kursları ve dersleri, hikâyeleri, rozetleri, görevleri, mağaza ürünlerini, Premium paketlerini, sınav sorularını, avatarları ve migration kayıtlarını içerir. **Hiçbir kullanıcı hesabı içermez.** Migration kayıtları dahil olduğu için sonradan `php artisan migrate` çalıştırırsanız yalnızca yeni sürümlerde eklenen değişiklikler uygulanır.

> Bu SQL dosyası gerçek bir MariaDB üzerinde tüm migration'lar çalıştırılarak üretildi ve geri içe aktarılarak doğrulandı. Test takımı (66 test) hem SQLite hem MySQL üzerinde geçiyor.

## 4) Backend ayarları (`backend/.env`)

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

`.env` içinde en az şunları doldurun:

```dotenv
APP_ENV=production
APP_DEBUG=false                       # üretimde asla true bırakmayın
APP_URL=https://api.dilgo.app         # API'nin adresi
FRONTEND_URL=https://dilgo.app        # web uygulamasının adresi (e-posta bağlantıları, sitemap)
CORS_ALLOWED_ORIGINS=https://dilgo.app,https://www.dilgo.app,capacitor://localhost,https://localhost

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=dilgo
DB_USERNAME=dilgo
DB_PASSWORD=GÜÇLÜ_BİR_ŞİFRE

CACHE_STORE=database
QUEUE_CONNECTION=database
MAIL_MAILER=smtp                      # SMTP bilgileri: DEPLOY_HOSTINGER.md 3. bölüm
```

İsteğe bağlı anahtarlar (boş bırakılırsa ilgili özellik zarif biçimde kapanır): `ANTHROPIC_API_KEY` (Defne AI), `ELEVENLABS_API_KEY` (Defne'nin sesi), `IYZICO_*` (ödeme), `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` (sosyal giriş), `TURNSTILE_SECRET_KEY` (robot koruması).

Sonra:

```bash
php artisan storage:link              # admin panelinden yüklenen avatarlar için ŞART
php artisan config:cache && php artisan route:cache && php artisan view:cache
chmod -R 775 storage bootstrap/cache
```

### Ödeme, Defne'nin sesi ve AI anahtarları: panelden

Bu anahtarları .env'e yazmak zorunda değilsiniz. **Yönetim → Sistem → Entegrasyonlar** sayfasında süper yönetici:

- **Ödeme:** "Test ödemesi" ↔ "iyzico" seçer, ortamı (Sandbox / Canlı) belirler, API anahtarı ve gizli anahtarı girer. Canlıya geçmeden önce sandbox anahtarlarıyla bir deneme satın alma yapın (https://sandbox-merchant.iyzipay.com). Geri dönüş adresi otomatiktir: `https://API_ALAN_ADI/api/v1/payments/iyzico/callback`.
- **Defne'nin sesi:** ElevenLabs anahtarı, ses kimliği (voice ID), model, kararlılık ve benzerlik.
- **Kelime ve ders sesi (anlatıcı):** Kelimeler, örnek cümleler, dersler ve hikâyeler sunucuda üretilen doğal İngilizce sesle okunur; telefonun dili Türkçe olsa bile. Google Cloud TTS, OpenAI veya ElevenLabs'tan **biri** yeterli. Her ses bir kez üretilip `storage/app/tts` altında saklanır, aynı kelime tekrar ücretlendirilmez. Hiçbiri girilmezse cihazın İngilizce sesi kullanılır (bazı Türkçe Android telefonlarda yüklü değildir, bu yüzden canlıda bir sağlayıcı önerilir).

#### Ses sağlayıcısı kurulumu (adım adım)

1. **Google Cloud TTS (önerilen, en ucuz):** console.cloud.google.com → yeni proje → "Cloud Text-to-Speech API"yi etkinleştir → API ve Hizmetler → Kimlik bilgileri → API anahtarı oluştur → anahtarı yalnızca Text-to-Speech API ile sınırla. Panele "Google Cloud TTS anahtarı" olarak yapıştır. Ses: `en-GB-Neural2-C` (İngiliz) veya `en-US-Neural2-F` (Amerikan).
2. **OpenAI:** platform.openai.com → API keys → yeni anahtar. Panele "OpenAI API anahtarı", ses `nova`.
3. **ElevenLabs (Defne için):** elevenlabs.io → Profile → API key. Voice Library'den bir ses seç, "voice ID"yi kopyala. Kelimeler için ayrı bir anlatıcı sesi istersen "ElevenLabs anlatıcı sesi"ne ikinci bir voice ID gir.
4. Kaydet, ardından iki kartta da **"Kayıtlı ayarlarla dinle"** ile dene. Sunucunun dışarıya `texttospeech.googleapis.com`, `api.openai.com` ve `api.elevenlabs.io` adreslerine HTTPS ile çıkabildiğinden emin ol (Hostinger'da varsayılan olarak açık).
5. `.env` ile kurmak istersen: `GOOGLE_TTS_KEY`, `GOOGLE_TTS_VOICE`, `OPENAI_TTS_KEY`, `OPENAI_TTS_VOICE`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_NARRATOR_VOICE_ID`.
- **Dudak senkronu:** aç / kapat, ağız açıklığı (1 ila 8) ve konuşma hızı (0.80x ila 1.15x). "Kayıtlı ayarlarla dinle" düğmesiyle hemen denenir.
- **Yapay zekâ:** Anthropic API anahtarı ve model adı.

Panelde girilen değer .env'deki değerin önüne geçer. Anahtarlar `APP_KEY` ile şifrelenmiş olarak `settings` tablosunda saklanır ve panelde yalnızca son 4 karakteri görünür. **`APP_KEY` değişirse kayıtlı anahtarlar okunamaz, panelden yeniden girilmelidir.** Ürün adını değiştirme adımları için `docs/RENAME.md`, kullanıcıyı tutma ilkeleri için `docs/RETENTION.md`.

## 5) Yönetici hesabı

```bash
php artisan dilgo:admin siz@kurumunuz.com --create --name="Adınız" --role=super_admin
```

Komut geçici bir şifre yazdırır. Giriş yapıp **Ayarlar → Güvenlik** bölümünden şifreyi değiştirin ve yönetim paneli için iki adımlı doğrulamayı açın. Ekibinizi (editör, destek, yönetici) sonra **Yönetim → Ekip, roller ve yetkiler** ekranından ekleyebilirsiniz.

## 6) Zamanlanmış görevler (cron)

Her dakika çalışacak tek bir cron yeterlidir:

```
* * * * * /usr/bin/php /YOL/backend/artisan schedule:run >> /dev/null 2>&1
```

Bu cron; e-posta kuyruğunu, lig kapanışlarını (pazartesi 00:05), seri hatırlatmalarını, pazartesi sabahı haftalık karne e-postasını, bir süredir girmeyen öğrencilere en fazla üç nazik "geri dön" notunu (2, 5 ve 14. gün), süresi dolan kartları ve token temizliğini yürütür.

## 7) Otomatik kurulum betiği

```bash
./scripts/install.sh
```

Betik sırasıyla: gereksinimleri kontrol eder, `.env` dosyasını oluşturur, veritabanı bilgilerini sorup bağlantıyı dener, tabloları kurar (migrate + seed ya da SQL dosyasını içe aktarma, seçiminize göre), `storage:link` ve önbellekleri hazırlar, isterseniz yönetici hesabı açar ve web uygulamasını derler. Her adım tekrar çalıştırılabilir; mevcut veriyi silmez.

## 8) Web uygulaması (frontend)

```bash
cd frontend
npm ci
VITE_API_URL=https://api.dilgo.app/api VITE_SITE_URL=https://dilgo.app npm run build
```

`frontend/dist` içeriğini web sitesinin kök klasörüne (`public_html`) yükleyin. Paketlenmiş hali için: `VITE_API_URL=... ./scripts/build-release.sh`.

## 9) Güvenlik kontrol listesi

Kodda hazır olanlar:

- **SQL enjeksiyonu:** tüm sorgular parametreli (Eloquent/Query Builder bağlamaları). Arama ve filtre parametreleri yalnızca metin olarak kabul edilir, sıralama sütunları beyaz listeden seçilir. Testlerde `' OR 1=1 --` gibi girdiler denenir.
- **XSS:** React tüm metni kaçışlar; blog ve rehber içeriği kendi güvenli markdown işleyicimizle gösterilir (HTML kabul etmez, yalnızca `http(s)` ve site içi bağlantılar). Kullanıcı adı, biyografi ve form alanlarından etiketler temizlenir.
- **Kimlik doğrulama:** Sanctum token'ları (çerez yok, dolayısıyla CSRF yüzeyi yok), süreli token'lar, aynı anda en fazla 3 oturum, başarısız girişte kilitlenme, yönetim paneli için ek e-posta/TOTP doğrulaması, bölüm bazında yetkiler.
- **İstek sınırlama:** giriş, OTP, kayıt, satın alma, kod kullanma, yükleme ve bülten uçlarında throttle.
- **Dosya yükleme:** yalnızca PNG/JPG/WebP, içerikten tür denetimi, boyut ve piksel sınırı, rastgele dosya adı, SVG kabul edilmez.
- **Güvenlik başlıkları:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HTTPS'te HSTS; web tarafında ayrıca sıkı bir Content-Security-Policy.
- **Uygulama güvenlik duvarı (WAF):** tarayıcı yolları, saldırı desenleri, tarama araçları ve büyük gövdeler daha uygulamaya ulaşmadan engellenir; tekrar eden IP'ler geçici olarak yasaklanır. Ayrıntılar ve Cloudflare WAF kurulumu: [`docs/SECURITY.md`](SECURITY.md).
- **Toplu atama:** tüm yazma uçları doğrulanmış alanlarla çalışır; rol ve yetki gibi alanlar yalnızca süper yönetici tarafından değiştirilebilir.

Sizin yapmanız gerekenler:

- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] Her iki alan adında SSL açık, HTTP → HTTPS yönlendirmesi (web `.htaccess` dosyası bunu yapar)
- [ ] Veritabanı kullanıcısı yalnızca kendi veritabanında yetkili, güçlü şifre
- [ ] `storage/` ve `.env` web'den erişilemez (API'nin kökü `backend/public` olmalı)
- [ ] Cloudflare Turnstile anahtarı (bot kayıtlarına karşı), isteğe bağlı ama önerilir
- [ ] Cloudflare WAF ve rate limiting kuralları ([`docs/SECURITY.md`](SECURITY.md))
- [ ] Düzenli veritabanı yedeği (hPanel otomatik yedek ya da günlük `mysqldump`)

## 10) SEO kontrol listesi

Kodda hazır olanlar: sayfa başına başlık ve açıklama, canonical bağlantı, Open Graph ve Twitter kartı (1200×630 paylaşım görseli), yapılandırılmış veri (Organization, WebSite, SoftwareApplication), blog yazılarında SEO başlığı/açıklaması ve kapak görseli, uygulama içi sayfalarda `noindex`, favicon seti (SVG, 16, 32, 180, 192, 512 ve maskable), web uygulaması manifesti, `robots.txt` ve API'de otomatik `sitemap.xml` (yayındaki blog yazıları dahil).

Sizin yapmanız gerekenler:

- [ ] `frontend/.env` içinde `VITE_SITE_URL` gerçek alan adınız olmalı (canonical ve paylaşım kartları bunu kullanır)
- [ ] `frontend/public/robots.txt` içindeki `Sitemap:` satırını API adresinize göre düzeltin
- [ ] Google Search Console'a siteyi ekleyip `https://api.ALANADINIZ/sitemap.xml` adresini gönderin

## 11) Kurulumu doğrulama

```bash
cd backend
php artisan migrate:status        # hepsi "Ran" olmalı
php artisan test                  # geliştirme ortamında: 66 test geçmeli
curl https://api.dilgo.app/up     # 200 dönmeli
curl https://api.dilgo.app/api/v1/config
curl https://api.dilgo.app/sitemap.xml
```

Tarayıcıda web adresini açın, kayıt olun, bir ders bitirin, yönetim paneline girin (`/admin`).

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| 500 hatası | `storage/logs` dosyalarına bakın; `chmod -R 775 storage bootstrap/cache`; `php artisan optimize:clear` |
| `SQLSTATE[HY000] [1045]` | `.env` veritabanı adı, kullanıcı veya şifre yanlış; sonra `php artisan config:cache` |
| `Specified key was too long` | MySQL 5.7 kullanıyorsunuz; MySQL 8 / MariaDB 10.6+ kullanın |
| Yüklenen avatar görünmüyor | `php artisan storage:link` çalıştırılmamış ya da `APP_URL` yanlış |
| CORS hatası | `CORS_ALLOWED_ORIGINS` web adresini tam olarak içermeli, sonra `php artisan config:cache` |
| E-posta gitmiyor | SMTP ayarları ve cron'un çalıştığını kontrol edin |
