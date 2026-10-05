# Kullanıcıyı tutma (retention) ilkeleri ve uygulamadaki karşılıkları

Bu belge, dilgo'nun "her gün geri gelme" alışkanlığını hangi psikolojik ilkelere dayandırdığını ve her ilkenin üründe nerede çalıştığını özetler. Yeni bir özellik eklerken bu tabloya bakıp hangi ilkeye hizmet ettiğini, hangisini bozabileceğini kontrol edin.

Temel kural: **bağımlılık değil alışkanlık.** Hedef, öğrencinin istediği bir şeyi (İngilizce) her gün az ama düzenli yapmasıdır. Suçluluk, sahte aciliyet, kayıp korkusunu sömüren karanlık desenler (dark patterns) kullanılmaz. Çocuk hesapları için bildirim ve ödül yoğunluğu ayrıca yumuşatılır.

## 1. Kanca modeli (Hook: tetik → eylem → değişken ödül → yatırım)

| Adım | Ne demek | dilgo'da |
|---|---|---|
| Dış tetik | Kullanıcıyı geri çağıran sinyal | Seri hatırlatıcıları (`dilgo:streak-reminders`, kullanıcının seçtiği çalışma saatine göre 4 slot: sabah, öğle, akşam, gece), haftalık rapor e-postası (`dilgo:weekly-report`), geri dön e-postası (`dilgo:come-back`), arena davetleri |
| İç tetik | "Biraz boşluğum var, İngilizce yapayım" duygusu | Kısa ders süresi (2 ila 5 dk), "Kaldığın yer" işareti, Higo'nun günlük karşılaması |
| Eylem | Mümkün olan en küçük adım | Tek dokunuşla "Devam et", Pratik sekmesinde 60 saniyelik kelime oyunları |
| Değişken ödül | Her seferinde biraz farklı, tahmin edilemeyen ödül | Gizemli sandık (ağırlıklı olasılıklar, olasılıklar açıldıktan sonra görünür), günlük sandık, iş ortağı kuponları, düello kupaları |
| Yatırım | Kullanıcının bir sonraki dönüşü kolaylaştıran emeği | Kaydedilen kelimeler (aralıklı tekrar kuyruğu), profil çerçevesi ve kapakları, lig sıralaması, seri |

Kaynak: Nir Eyal'in Hook modeli özetleri (koji.so, Amplitude).

## 2. Alışkanlık oluşumu

- **Uygulama niyeti (implementation intention):** "Ne zaman çalışacağım?" sorusunu kayıt sırasında soruyoruz (sabah / öğle / akşam / gece). Hatırlatıcılar bu saate göre gider. "Her akşam yemekten sonra 5 dk" gibi somut bir plan, genel bir niyetten çok daha fazla tutar.
- **Küçük başla:** Günlük hedef varsayılanı düşük tutulur; ilk hafta "hedefi aşma" kutlaması sık görünür.
- **Bağlam istikrarı:** Mobil alt çubukta aynı 5 sekme, aynı yerde. Ana eylem (Öğren → Devam et) her zaman aynı noktada.

Kaynak: StriveCloud alışkanlık oluşumu yazısı.

## 3. Hedef eğimi ve ilerleme (goal gradient, endowed progress)

- İnsanlar hedefe yaklaştıkça hızlanır. Ünite ilerleme çubuğu, "1 ders kaldı" etiketleri ve sandığa giden yol bu yüzden görünür tutulur.
- **Bağışlanmış ilerleme:** Seviye testinden sonra puana göre açılan bölümler "açık ve seçilebilir" görünür; kullanıcı sıfırdan başlamadığını hisseder.
- Ünite pekiştirilmeden bir sonrakine geçilmez (PathService); bu, ilerlemenin anlamlı kalmasını sağlar.

## 4. Kayıptan kaçınma, ama adil biçimde

- **Seri (streak):** Kaybetme korkusu güçlü bir motivasyondur, bu yüzden aynı zamanda affedici olmalı: seri dondurucu, seri kurtarıcı ve "bugün hâlâ vaktin var" hatırlatıcısı.
- Kaybedilen seri suçlayıcı dille anılmaz; "yeniden başla" ekranı en uzun seriyi gururla gösterir.

## 5. Sosyal kanıt ve rekabet

- Haftalık ligler ve Gölge Düellosu (asenkron, eşleşme lige göre).
- Arena'da isim ya da sayı gösterilmez; yalnızca "rakipler sıra bekliyor" hissi (bulanık siluetler). Bu, gizliliği korurken canlılık hissi verir.
- Düello sıralaması 6 kişiyle sınırlı; kullanıcı daha aşağıdaysa kendi sırası altta sabitlenir. Uzun tablolar alt sıradakileri caydırır.

## 6. Özerklik, yeterlilik, aidiyet (öz-belirleme kuramı)

- **Özerklik:** Pratik sekmesinde hikâye, kelime oyunu ve sınav pratiği arasında seçim; yol haritasında başka bir konunun başına atlama esnekliği.
- **Yeterlilik:** Anında, açıklamalı geri bildirim; zorluk seviyeye göre; hikâye sonunda anlama testi.
- **Aidiyet:** Higo maskotu, adıyla hitap, okul ve sınıf ödevleri, arkadaş davetleri.

## 7. Kişiselleştirme

- Onboarding: hedef, sınıf/kitle, mevcut seviye (seviye testi), ilgi alanları, çalışma saati.
- Hikâyelerde kişisel giriş satırı ve Higo'nun ada göre ara mesajları.
- Sınav hedefi onboarding'den gelir ve 30 günde bir değiştirilebilir (sık değiştirme, ilerlemeyi dağıtır).

## 8. Gözden geçirme listesi (her yeni özellikte)

1. Bu özellik hangi tetiği, ödülü ya da yatırımı güçlendiriyor?
2. Kullanıcıyı suçlu hissettiren bir metin var mı? Varsa yumuşat.
3. İlk kullanımda 30 saniyede bir başarı anı yaşanıyor mu?
4. Ödül tahmin edilebilir mi? Tamamen tahmin edilebilir ödül çabuk sıkar; tamamen rastgele ödül güven kaybettirir. Karışık tutun.
5. Çocuk hesabında da uygun mu?

## Ölçülecek metrikler

- D1, D7, D30 tutma (cohort)
- Haftalık aktif gün sayısı (WAU içindeki gün dağılımı)
- Seri kırılma noktaları (hangi gün en çok kırılıyor)
- Bildirim → oturum dönüşümü (tetik başına)
- Sandık açma sonrası 24 saat içinde dönüş

## Kaynaklar

- Hook modeli: https://www.koji.so/docs/hooked-model-habit-forming-products , https://amplitude.com/blog/the-hook-model
- Alışkanlık oluşumu ve tutma: https://www.strivecloud.io/blog/habit-formation-user-retention
