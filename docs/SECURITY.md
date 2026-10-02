# Güvenlik ve WAF

DilGO üç katmanla korunur: önde **Cloudflare WAF** (veya Hostinger'ın kendi güvenlik katmanı), sunucuda **.htaccess kuralları**, uygulamada **Laravel güvenlik katmanı (Firewall)**. Biri atlanırsa diğeri yine korur.

## 1. Cloudflare (önerilen ön katman)

1. Alan adını Cloudflare'e ekle, DNS kayıtlarını **Proxied** (turuncu bulut) yap: `dilgo.app`, `www`, `api`.
2. **SSL/TLS > Overview:** `Full (strict)`. **Edge Certificates:** Always Use HTTPS açık, Minimum TLS 1.2, HSTS açık (max-age 12 ay).
3. **Security > WAF > Managed rules:** Cloudflare Managed Ruleset ve OWASP Core Ruleset açık (Pro ve üstü). Ücretsiz planda "Free Managed Ruleset" açık kalsın.
4. **Security > WAF > Custom rules** (ücretsiz planda 5 kural):
   - *Tarayıcı yolları:* `(http.request.uri.path contains "/wp-" or http.request.uri.path contains "/.env" or http.request.uri.path contains "/.git" or http.request.uri.path contains "phpmyadmin" or http.request.uri.path contains "xmlrpc.php")` → **Block**
   - *Admin API'ye ülke kısıtı (isteğe bağlı):* `(http.request.uri.path contains "/api/v1/admin" and ip.src.country ne "TR")` → **Managed Challenge**
   - *Bot puanı (Pro):* `(cf.bot_management.score lt 10 and not cf.bot_management.verified_bot)` → **Managed Challenge**
5. **Security > WAF > Rate limiting rules:**
   - `/api/v1/auth/*` için IP başına 10 sn'de 20 istek → Block 10 dk.
   - `/api/v1/*` için IP başına 1 dk'da 600 istek → Managed Challenge.
6. **Security > Bots:** Bot Fight Mode açık. **Security > Settings:** Security Level `Medium`, Browser Integrity Check açık.
7. **Turnstile:** Cloudflare panelinden site anahtarı al; `.env`'e `TURNSTILE_SECRET_KEY`, ön yüze `VITE_TURNSTILE_SITE_KEY` yaz. Kayıt, giriş ve iletişim formları robot doğrulaması yapar.
8. Laravel gerçek IP'yi `CF-Connecting-IP` / `X-Forwarded-For` başlığından okur (`trustProxies` açık). Sunucuyu yalnızca Cloudflare IP'lerinden erişilebilir yapmak en sağlamıdır (Hostinger'da mümkünse).

## 2. Sunucu (.htaccess)

`frontend/public/.htaccess` derlemede `dist/` içine kopyalanır ve şunları yapar:

- HTTPS'e yönlendirme, dizin listelemeyi kapatma.
- Gizli dosyalar (`.env`, `.git`), yedek ve log dosyaları için **403**; WordPress/phpMyAdmin tarayıcı yolları için **404**.
- Güvenlik başlıkları: HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- **Content-Security-Policy:** yalnızca kendi alan adımız, Turnstile ve Google/Apple girişi. Satır içi tek betik (tema) hash ile izinlidir; hash'i `vite build` otomatik hesaplar (`vite.config.ts` içindeki `csp-hashes`). API başka bir alan adındaysa `connect-src` içindeki `https://api.dilgo.app` değerini kendi adresinle değiştir.

## 3. Uygulama (Laravel)

- **Firewall** (`app/Http/Middleware/Firewall.php`), her istekten önce çalışır:
  - Tarayıcı yolları → 404.
  - URL ve sorgu dizesinde SQL enjeksiyonu, dizin gezinme, betik enjeksiyonu, JNDI/PHP sarmalayıcıları → 403.
  - Bilinen tarama araçları (sqlmap, nikto, wpscan...) → 403.
  - Büyük gövde (varsayılan 1 MB, dosya yüklemede 8 MB) → 413.
  - Her engelleme bir "ihlal"dir. 10 dakikada 8 ihlal yapan IP 60 dakika engellenir. Engeller `storage/logs` içine `waf.block` olarak yazılır.
  - İstek gövdeleri desenle taranmaz: öğrenciler serbest metin yazar. Gövdeler doğrulama kuralları, Eloquent parametre bağlama ve çıktı kaçışıyla korunur.
- Ayarlar `.env` üzerinden:

| Değişken | Varsayılan | Anlamı |
|---|---|---|
| `WAF_ENABLED` | `true` | Katmanı aç/kapat |
| `WAF_MAX_BODY_KB` | `1024` | JSON gövde sınırı |
| `WAF_MAX_UPLOAD_KB` | `8192` | Dosya yükleme sınırı |
| `WAF_STRIKES` | `8` | Engellemeden önce izin verilen ihlal |
| `WAF_STRIKE_WINDOW` | `10` | İhlallerin sayıldığı süre (dk) |
| `WAF_BAN_MINUTES` | `60` | Engel süresi (dk) |
| `WAF_ALLOW_IPS` | boş | Virgülle ayrılmış, hiç engellenmeyecek IP'ler (ofis, izleme) |

- Diğer korumalar: oran sınırlama (giriş, OTP, AI, kod kullanma), hesap kilitleme, yöneticiler için e-posta OTP ve 2FA, Sanctum token ömrü ve cihaz sınırı, güvenlik başlıkları (`SecurityHeaders`), denetim kaydı (Admin > Denetim kaydı).

## Kontrol listesi (yayına almadan önce)

- [ ] `APP_DEBUG=false`, `APP_ENV=production`, güçlü `APP_KEY`.
- [ ] `CORS_ALLOWED_ORIGINS` yalnızca gerçek alan adların.
- [ ] Cloudflare: Full (strict), WAF kuralları, rate limiting, Bot Fight Mode.
- [ ] Turnstile anahtarları girildi.
- [ ] `storage/` ve `bootstrap/cache/` yazılabilir, `public/` dışı web'den erişilemez.
- [ ] İlk yönetici 2FA'yı açtı.
