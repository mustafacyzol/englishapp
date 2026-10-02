# Ürün adını değiştirme (DilGO → yeni ad)

Ad büyük ölçüde tek yerden gelir. Yeni ad kesinleştiğinde aşağıdaki adımları sırayla izleyin.

## 1. Tek satırla değişenler

| Nerede | Ne yapılır |
|---|---|
| `frontend/.env` (ve `.env.example`) | `VITE_APP_NAME=YeniAd`, isteğe bağlı `VITE_WORDMARK_A=yeni` `VITE_WORDMARK_B=ad` (logodaki iki renkli parça), `VITE_SUPPORT_EMAIL=destek@yeniad.com`, `VITE_SITE_URL=https://yeniad.com` |
| `backend/.env` | `APP_NAME=YeniAd`, `APP_URL`, `FRONTEND_URL`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` |

`VITE_APP_NAME` şunları besler: `src/lib/brand.ts` (uygulamadaki tüm görünen ad metinleri, logo, alt bilgi kelime işareti, paylaşım başlıkları, yasal metinler), `src/lib/seo.ts` (sayfa başlıkları ve açıklamalar) ve `index.html` (`%VITE_APP_NAME%`: başlık, Open Graph, Twitter kartı, JSON-LD).

`APP_NAME` şunları besler: `config/dilgo.php → brand.name`, e-posta şablonları, iyzico sepet adı, AI öğretmenin sistem talimatı.

## 2. Elle değiştirilecek dosyalar

| Dosya | Alan |
|---|---|
| `frontend/public/manifest.webmanifest` | `name`, `short_name` |
| `frontend/capacitor.config.ts` | `appName`. `appId` mağazaya yüklendikten sonra **değiştirilmez**; henüz yüklenmediyse `com.bayrakdilokullari.yeniad` yapılabilir |
| `frontend/public/robots.txt` | sitemap adresi (alan adı) |
| `frontend/public/.htaccess` | Content-Security-Policy satırındaki `api.dilgo.app` (API alan adı) |
| `frontend/public/favicon*`, `og-image` | yeni logo |
| `docs/*.md` | metin içindeki ad (zorunlu değil) |
| `backend/database/seeders/BlogSeeder.php` | örnek blog yazılarındaki ad (yalnızca ilk kurulum içeriği) |

## 3. Değiştirilmemesi gerekenler

Aşağıdakiler iç anahtardır, kullanıcı görmez; değiştirmek mevcut kullanıcıların ayarlarını ve verilerini bozar:

- `config('dilgo.*')` anahtarları ve `config/dilgo.php` dosya adı
- tarayıcı depolama anahtarları (`dilgo.theme`, `dilgo.best.*`, `dilgo-token` vb.)
- `prose-dilgo` CSS sınıfı, `dilgo:*` artisan komut adları
- veritabanı tablo ve sütun adları

## 4. Kontrol

```bash
# görünen ad kalıntısı kalmış mı (iç anahtarlar hariç)
grep -rn "DilGO" frontend/src frontend/index.html backend/app backend/resources | grep -v fixture
```

Ardından `npm run build` ve `php artisan config:clear` çalıştırın.
