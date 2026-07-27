# Görev 05 — KAP haber entegrasyonu

**Atanan tier:** 2 (standart implementasyon) — Sonnet 5 subagent
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin
(istisna: `.github/**` ana oturumda, ona dokunma).

## Amaç

KAP (Kamuyu Aydınlatma Platformu) bildirimlerini arayüze bağla. Veri sağlayıcısı
`src/providers/kap.ts` **zaten yazılmış ve çalışıyor** (`getDisclosures()`); eksik olan
derleme zamanı üretimi ve arayüz.

Bunun kullanıcı için değeri: **"bu hisse neden hareketlendi?"** sorusunun cevabı. Hacmi
patlamış bir hissenin yanında o gün gelen bir KAP bildirimi görmek, skorun kendisinden daha
açıklayıcı olabiliyor.

## ÖNCE OKU: gürültü sorunu

Ölçtüm — son 7 günde **1573 bildirim** geldi ve en sık çıkanlar sıradan kullanıcı için
tamamen anlamsız. Ham listeyi olduğu gibi göstermek özelliği işe yaramaz hâle getirir.
Ölçülen dağılım (7 gün):

| Adet | Konu | Önem |
|---|---|---|
| 301 | Pay Bazında Devre Kesici Bildirimi | orta (büyük hareket sinyali) |
| 204 | Pay Dışında Sermaye Piyasası Aracı (tahvil/sukuk) | **gizle** — hisseyle ilgisiz |
| 188 | Özel Durum Açıklaması (Genel) | **yüksek** |
| 107 | Şirket Genel Bilgi Formu | **gizle** — rutin form |
| 46 | İhraç Tavanına İlişkin Bildirim | gizle |
| 38 | İzahname | düşük |
| 34 | Payların Geri Alınması | **yüksek** |
| 30 | Finansal Rapor | **yüksek** |
| 30 | Kredi Derecelendirmesi | orta |
| 30 | Genel Kurul İşlemleri | orta |
| 25 | Pay Alım Satım Bildirimi | **yüksek** (içeriden işlem) |
| 24 | Bağımsız Denetim Kuruluşunun Belirlenmesi | gizle |
| 19 | Sermaye Artırımı - Azaltımı | **yüksek** |
| 18 | Sorumluluk Beyanı | gizle |
| 18 | Kar Payı Dağıtımı | **yüksek** |

`lib/news-importance.ts` gibi bir dosyada üç seviyeli sınıflandırma yap:
`"yuksek" | "orta" | "gizli"`. Eşleştirme `subject` alanındaki anahtar kelimelerle olsun
(birebir string eşleşmesi değil — KAP konu metinleri parantezli varyantlar taşıyor).
**Listelenmeyen bir konu varsayılan olarak "orta" olsun**, "gizli" değil — tanımadığımız ama
önemli bir bildirimi kaybetmektense biraz gürültüye katlanmak yeğdir.

## Kapsam

### A. Derleme zamanı veri üretimi

`scripts/build-news.ts` oluştur. `src/providers/kap.ts`'teki `getDisclosures()`'ı kullanarak
**son 7 günü** çeksin ve şunları yazsın:

- `public/data/news-feed.json` — piyasa akışı: önem sırası + zaman sırası, en fazla **80** öğe,
  `gizli` olanlar hariç.
- `public/data/news/{SEMBOL}.json` — hisse başına, en fazla **15** öğe, `gizli` dahil değil.
  Yalnızca `data/universe.json`'daki sembollere yaz.
- Her öğe: `{ index, publishedAt, title, subject, summary, symbols, importance }`.

`package.json`'a `"build:news": "node scripts/build-news.ts"` ekle.

**Ağ hatası derlemeyi düşürmemeli.** KAP erişilemezse script uyarı basıp **boş ama geçerli**
dosyalar üretsin ve sıfır çıkış koduyla dönsün — haber yoksa site yine yayınlanmalı.

### B. Detay panelinde şirket haberleri  ← EN ÖNEMLİ PARÇA

`components/DetailDrawer.tsx`'e, skor dökümünün ALTINA "Şirket haberleri" bölümü ekle
(tasarım şartnamesindeki 7. bölüm — Görev 03'te kapsam dışı bırakılmıştı, şimdi geliyor).

Her öğe: saat/tarih + kaynak etiketi (önem seviyesine göre renk) + konu + varsa özet.
Haber yoksa: "Son 7 günde KAP bildirimi yok" gibi sade bir metin.

`${BASE_PATH}/data/news/{SEMBOL}.json` istek üzerine indirilsin (panel açıldığında).

### C. Masaüstü haber paneli

Tasarım şartnamesi `../design_handoff_bist_radar/README.md` → **"Sağ haber paneli (292px…)"**.
Kapatılabilir. Her öğede hisse kodu varsa chip olsun; chip'e tıklayınca o hissenin detay paneli
açılsın (şartnamedeki davranış).

Tabloya **HABER kolonu** da ekle (Görev 01'de ertelenmişti): o hissenin son 7 gündeki bildirim
adedi. Sıralanabilir olsun.

### D. Mobil

Sağ panel mobilde olmaz. Bunun yerine liste üstünde iki sekmeli bir geçiş:
**[ Hisseler | Haberler ]**. "Haberler" sekmesi piyasa akışını kart listesi olarak göstersin;
hisse kodu olan öğelere dokununca o hissenin detay paneli açılsın.

Hisse kartlarında bildirim varsa küçük bir işaret olsun (ör. "3 bildirim") — kullanıcı hangi
hissede haber olduğunu listeden görebilsin.

## Kapsam dışı (YAPMA)

- `.github/**` — iş akışı adımını ana oturum ekleyecek
- `src/providers/kap.ts`'te değişiklik — çalışıyor, olduğu gibi kullan
- `src/engine/**`
- Haber metinlerini LLM ile özetlemek/yorumlamak — bildirimler olduğu gibi gösterilecek
- Genel piyasa haberleri (RSS) — bu görev yalnızca KAP

## Sert kısıtlar

- **`src/engine/` DEĞİŞTİRİLMEZ**; `node scripts/parity.ts` geçmeli.
- `scoreOf(ind, tf)` — tf zorunlu.
- Türkçe arayüz, `Intl.NumberFormat("tr-TR")`, tarihler `Europe/Istanbul`.
- Statik export'ta çalışmalı; `${BASE_PATH}` kalıbını koru.
- Tasarım token'ları: accent geniş dolgu olarak kullanılmaz; yükseliş/düşüş renkleri yalnızca
  fiyat/sinyal için — haber önem seviyelerinde yeşil/kırmızı KULLANMA (nötr tonlar + accent).
- Mobilde dokunma hedefleri ≥ 44×44px, ana metin ≥ 14px.
- Masaüstü tablo düzeni HABER kolonu dışında değişmesin.
- `ingest/`, `data/`, `reference/`, `scripts/parity.ts`, `scripts/atr-calibration.ts`,
  `scripts/prototype-source.ts`, `.github/`, `../design_handoff_bist_radar/` — dokunma.
- Commit atma.

## Kabul kriterleri

1. `npm run build:news` çalışıyor; `public/data/news-feed.json` ve `public/data/news/*.json`
   üretiliyor; feed'de `gizli` sınıfı yok.
2. Ağ kesikken (ör. geçersiz host ile dene) script **hata vermeden** boş geçerli dosya üretiyor.
3. `node scripts/parity.ts` geçiyor.
4. `npm run build` ve `NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build` hatasız.
5. **Masaüstü (1280px):** sağ haber paneli görünüyor, kapatılabiliyor; HABER kolonu var ve
   sıralıyor; haberdeki hisse chip'ine tıklayınca detay paneli açılıyor.
6. **Detay panelinde** şirket haberleri bölümü var; bildirimi olan bir sembolde öğeler
   listeleniyor, olmayanda sade boş mesaj çıkıyor.
7. **Mobil (375px):** Hisseler/Haberler sekmeleri çalışıyor; haber kartlarına dokununca ilgili
   hissenin detayı açılıyor; yatay kaydırma yok; ilk render DOM düğümü **< 2000**.
8. Sınıflandırma doğru: "Şirket Genel Bilgi Formu" ve tahvil bildirimleri feed'de görünmüyor;
   "Özel Durum Açıklaması", "Kar Payı Dağıtımı", "Finansal Rapor" görünüyor.
9. Konsolda hata yok (iki genişlikte de).

## Doğrulama

```bash
npm run build:news
node scripts/parity.ts
npm run build
NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build
```

Tarayıcı doğrulaması: `preview_start` ile `out/` servis et, `resize_window` ile 375 ve 1280.
Bu ortamda ekran görüntüsü alınamıyor, `computer` tıklamaları kaydedilmiyor, CSS animasyonları
ve IntersectionObserver çalışmıyor — `javascript_tool` ile gerçek `.click()` gönder ve
`getBoundingClientRect`/`getComputedStyle` oku. Alt sayfa/panel animasyonlarını
`element.getAnimations().forEach(a => a.finish())` ile bitirip ölç.

## İzin verilen değişiklikler

- OLUŞTUR: `scripts/build-news.ts`, `lib/news-importance.ts`, `lib/news.ts`,
  `components/NewsPanel.tsx`, `components/NewsList.tsx`, `public/data/news/**`
- DÜZENLE: `components/ScanScreen.tsx`, `components/DetailDrawer.tsx`,
  `components/ScanTable.tsx`, `components/StockCard.tsx`, `components/MobileList.tsx`,
  `lib/types.ts`, `lib/scan-data.ts`, `scripts/build-static.ts`, `app/globals.css`,
  `package.json`, `.gitignore`
- DOKUNMA: sert kısıtlardaki dizinler

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce, değişen dosyalar, çalıştırılan kontroller **gerçek
sonuçlarıyla**, üretilen haber dosyası sayısı ve feed öğe sayısı, ölçülen mobil DOM düğümü,
varsayımlar, çözülmemiş riskler.
