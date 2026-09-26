# Ürün stratejisi — DilGO

## HikayeGO'dan öğrendiklerimiz

hikayego.com'un canlı sürümü incelendi (Hostinger Horizons üzerinde React + Supabase, iyzico ödeme). Sunulanlar: seviyeli hikayeler (A1–C1), okuma sayfası, kelime kaydetme, flashcard, eşleştirme oyunu, quiz, Wordle, dersler, blog, Premium paketler (₺149/ay'dan başlayan), OTP doğrulama, admin paneli. Güçlü yanı: **hikaye kütüphanesi ve okuma deneyimi**. Eksik yanları: konuşma ve yazma becerisi yok, oyunlaştırma yüzeysel (seri/lig/rozet/görev ekonomisi yok), içerik ve pratik araçları birbirinden kopuk, hazır site oluşturucu kısıtları nedeniyle büyümeye kapalı bir altyapı.

DilGO, HikayeGO'nun hikaye DNA'sını korur ve onu **dört becerili, oyunlaştırılmış, okul destekli** bir platforma dönüştürür. HikayeGO içerikleri admin panelinden (Hikayeler → JSON alanları) ya da bir aktarma betiğiyle DilGO'ya taşınabilir.

## Pazar ve konumlandırma

| Kategori | Güçlü | Zayıf (bizim fırsatımız) |
|---|---|---|
| Oyun tabanlı uygulamalar | Alışkanlık, seri, lig | Konuşma/yazma sığ; Türkçe'ye özgü açıklama yok; gerçek öğretmen yok |
| AI konuşma öğretmenleri | Konuşma pratiği | Okuma/dinleme içeriği yok; oyunlaştırma zayıf; kelime takibi yok |
| Okuma/dinleme uygulamaları | İçerik | Pratik ve üretim (konuşma/yazma) yok |
| Klasik dil kursları | Öğretmen, sertifika | Pahalı, esnek değil, günlük alışkanlık yaratmıyor |

**Konumlandırma cümlesi:** *"İngilizceyi dört yönden yakala: oyun kadar eğlenceli, okul kadar ciddi."*

## 7 farkımız (reklam mesajları için)

1. **Dört beceri tek döngüde:** okuduğun hikayedeki kelime → kelime defterine → aralıklı tekrara → Defne'yla sohbette tekrar kullanılır. Beceriler birbirini besler.
2. **Defne seni tanıyor:** seviyeni, hedefini ve kaydettiğin kelimeleri bilen AI öğretmen.
3. **Türkçe konuşanlara özel:** hatalar Türk öğrencilerin tipik yanlışlarına (a/the, "I am agree", zamanlar, edatlar) göre Türkçe açıklanır; ünite rehberleri Türkçe.
4. **Gerçek ödüller:** Ödül Kasası'ndaki canlı ders kuponları Bayrak Dil Okulları'nda gerçek öğretmenle kullanılır — dijital motivasyon fiziksel okula köprü olur (ve okula öğrenci kazandırır).
5. **Tam oyunlaştırma:** seri + dondurucu, 10 kademeli lig, 38 rozet, günlük/haftalık görevler, elmas ekonomisi, sandıklar.
6. **Okul güvencesi:** CEFR uyumlu müfredat, yıllık pakette seviye sertifikası.
7. **Her yerde:** web + iOS + Android, tek hesap.

## Gelir modeli

- Freemium: sınırsız ders yolu, seçili hikayeler, günde 10 AI mesajı, 5 can.
- Premium (aylık/3 aylık/yıllık): sınırsız can, tüm hikayeler, 200 AI mesajı/gün, premium senaryolar, bonus elmas, canlı ders kuponları.
- Okul/kurum: toplu hediye kodu (kampanya, fuar, kurumsal anlaşma, sınıf ödülü) — admin panelinden CSV olarak üretilir.
- Kanal: referans sistemi (iki taraflı ödül), paylaşılabilir profil ve seri.

## Sonraki adımlar (yol haritası)

1. **İçerik:** HikayeGO hikayelerinin aktarılması; A2–B2 ünitelerinin genişletilmesi; hikayeler için insan seslendirmesi (`audio_url` alanı hazır).
2. **Abonelik yenileme** (iyzico Subscription API) ve App Store / Google Play uygulama içi satın alma.
3. **Push bildirimleri** (Capacitor Push + FCM) — seri hatırlatmaları için e-postaya ek.
4. **Sınıf modu:** Bayrak Dil Okulları öğretmenleri için sınıf oluşturma, ödev atama, öğrenci ilerleme raporu.
5. **Telaffuz puanlama** (fonem düzeyinde) ve native konuşma tanıma eklentisi.
6. **Arkadaş ekleme ve arkadaş görevleri** (sosyal döngü).
7. **Sertifika PDF üretimi** ve CEFR ara sınavları.

## Açık sorular (karar bekleyen)

- Nihai marka adı ve alan adı (şu an çalışma adı: **DilGO**).
- Canlı ders kuponlarının operasyonu: hangi şubeler / online ders takvimi / kupon başına ders süresi.
- Fiyatlar (seed verisi: 149 / 349 / 999 TL) ve Premium'a dahil edilecek canlı ders sayısı.
- Gerçek logo/maskot illüstrasyonları: mevcut SVG kimlik (DilGO logosu, Defne, rozetler, lig amblemleri) koddan üretilmiştir; bir illüstratörle ya da Magnific üzerinden stok/üretim görsellerle zenginleştirilebilir.
