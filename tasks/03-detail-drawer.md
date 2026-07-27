# Görev 03 — Hisse detay paneli ve grafikler

**Atanan tier:** 2 (standart implementasyon) — Sonnet 5 subagent
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin.

## Amaç

Tabloda bir satıra tıklayınca sağdan açılan **hisse detay paneli**ni yap: mum grafik + Bollinger,
hacim, MACD, Stokastik grafikleri, gösterge kartları ve skor dökümü. Şu an satırlar tıklanabilir
değil ve detay verisi hiç üretilmiyor — ikisini de bu görev getirecek.

## Kimin kullanacağı (tasarım kararlarını bu belirlesin)

Bu aracı, borsa terminolojisine hâkim olmayan bir kullanıcı telefonundan açacak ve gördüğü
sinyallere bakarak **kendi parasıyla** işlem yapacak. Bunun iki sonucu var:

1. **Skor dökümü panelin en değerli parçası.** Motor her bileşen için düz Türkçe gerekçe
   üretiyor ("Aşırı satımdan yukarı dönüyor", "Ortalamanın 2,4 katı hacim"). Bu metinler
   grafiklerden daha anlaşılır — küçük bir dipnot gibi değil, okunaklı biçimde göster.
2. **Verinin gecikmeli olduğu gizlenmemeli.** Panel başlığının altında, göz ardı edilemeyecek
   şekilde yaz: veri ~15 dakika gecikmeli (2026-07-27'de ölçüldü) ve gösterilen fiyat canlı değil.
   Seans sırasındaysa son bar henüz kapanmamış olabilir — o durumda göstergeler geçicidir.

## Kapsam

### A. Detay verisi üretimi

`scripts/build-static.ts`'i genişlet: her sembol × zaman dilimi için
`public/data/detail/{SEMBOL}-{tf}.json` üret. İçerik (motordan doğrudan):

- `chart` — `indicators()`'ın döndürdüğü seri (bars, K, D, macd, sig, hist, bbU, bbM, bbL,
  volSMA, labels)
- Skaler göstergeler: `rsi, atrPct, relVol, pctB, hi70, lo70, volTL, macd, msig, hist,
  crossDir, crossBars, price, chg`
- `score` ve `breakdown` (`scoreOf(ind, tf)` — **tf'yi geçmeyi unutma**)
- `name`, `sector` (universe'ten)

Ölçüldü: dosya başına ~16 KB ham / 7,4 KB gzip; 619 × 3 = ~13,5 MB gzip. Pages limiti 1 GB,
sorun yok. Dosyalar **istek üzerine** indirilecek — hepsini sayfaya gömme.

### B. Detay paneli (drawer)

Tablo satırına tıklayınca açılır. Tasarım şartnamesi:
`../design_handoff_bist_radar/README.md` → **"### 2. Hisse detay paneli"** bölümü. Prototipi
(`BIST Radar.html`) tarayıcıda açıp satıra tıklayarak davranışı gör; birebir eşle.

Özet (şartname asıl kaynak):
- Overlay `rgba(9,10,18,0.58)`, drawer `min(680px, 95vw)`, sağdan 260ms
  `cubic-bezier(0.2,0.8,0.2,1)`. Overlay'e veya ✕'e tıklayınca kapanır. **Esc de kapatmalı.**
- Başlık: sembol (26px) + şirket adı + sektör tag'i + kapat. Altında fiyat (23px) + değişim +
  sinyal tag'i + skor bar'ı, sonra gecikme uyarısı (yukarıya bak).
- İçerik sırası: **1)** Fiyat + Bollinger(20,2) mum grafik · **2)** Hacim + 20 bar SMA ·
  **3)** MACD(12,26,9) · **4)** Stokastik(14,3,3) · **5)** Gösterge kartları (3 sütun) ·
  **6)** Skor bileşenleri.
- **Şirket haberleri (şartnamedeki 7. bölüm) BU GÖREVDE YOK** — KAP entegrasyonu ayrı görev.

### C. Grafikler

**Kütüphane KULLANMA.** Prototip satır içi SVG + `<path>` ile çiziyor; aynısını yap. Recharts,
Chart.js, d3 vb. eklemek hem tasarımdan sapar hem paket boyutunu şişirir.

Her grafiğin ayrıntısı şartnamede yazılı (mum gövde/fitil renkleri, bant dolgusu %6 accent,
orta bant kesikli, son fiyat kesikli çizgi + etiket, MACD son kesişimine halka, Stokastik 20/80
kesikli seviyeler…). Oradan çalış.

### D. Mobil

Drawer dar ekranda (< 640px) **tam ekran** açılsın, sağdan kayan panel değil. Grafikler
kapsayıcı genişliğine uysun (`viewBox` + `width: 100%`), yatay taşma olmasın. Kapatma düğmesi
parmakla rahat basılacak boyutta olsun (min 44×44px).

## Kapsam dışı (YAPMA)

- Şirket haberleri bölümü (KAP — ayrı görev)
- Ana tablonun mobil kart görünümü (ayrı görev) — bu görevde sadece **drawer** mobil uyumlu olsun
- Tablo satırlarının sanallaştırılması (ayrı görev)
- `src/engine/` içinde hiçbir değişiklik

## Sert kısıtlar

- **`src/engine/` DEĞİŞTİRİLMEZ.** İçe aktar. `node scripts/parity.ts` bunu koruyor ve geçmeli.
- **`scoreOf(ind, tf)` — tf zorunlu.** Argümansız çağırırsan haftalık/saatlik skorlar yanlış olur
  (günlük ATR eşikleri uygulanır). Bu görevdeki en olası hata bu.
- Statik export'ta çalışmalı: veri yolları `${BASE_PATH}/data/...` biçiminde olmalı
  (`components/ScanScreen.tsx`'teki `BASE_PATH` kalıbına bak). Alt dizinli derlemeyi de dene.
- Türkçe arayüz, `Intl.NumberFormat("tr-TR")` (virgül ondalık).
- Tasarım token'ları: yükseliş `oklch(0.75 0.1 158)`, düşüş `oklch(0.69 0.13 24)`, accent
  `#9184d9` — accent asla geniş dolgu değil, çizgi/tint/glow olarak.
- `ingest/`, `data/`, `reference/`, `scripts/parity.ts`, `scripts/atr-calibration.ts`,
  `scripts/prototype-source.ts`, `.github/` ve `../design_handoff_bist_radar/` — dokunma.
- Commit atma.

## Kabul kriterleri

1. `npm run build:data` detay dosyalarını üretiyor; `public/data/detail/` içinde 619×3 civarı
   dosya var ve örnek bir tanesi geçerli JSON.
2. `node scripts/parity.ts` geçiyor.
3. `npm run build` ve `NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build` ikisi de hatasız.
4. Dışa aktarılmış siteyi servis edip: bir satıra tıklayınca panel açılıyor, altı bölüm de
   görünüyor, grafikler çiziliyor (boş/bozuk SVG değil), konsolda hata yok.
5. Panel kapanıyor: ✕, overlay tıklama ve **Esc** ile.
6. Farklı zaman dilimlerinde açılan panel o dilimin verisini gösteriyor (G/H/S üçünü de dene).
7. 375px genişlikte panel tam ekran, yatay taşma yok.
8. Skor dökümündeki gerekçe metinleri motordan geliyor (elle yazılmış metin YOK) ve
   bileşen puanlarının toplamı + 50, gösterilen skora eşit.

## Doğrulama komutları

```bash
npm run build:data
node scripts/parity.ts
npm run build
NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build
```

Tarayıcı doğrulaması için Claude_Browser araçlarını kullan (`preview_start` ile `out/`'u servis
et, `read_page` / `javascript_tool` / `read_console_messages`). Not: bu ortamda ekran görüntüsü
alınamıyor ve `computer` tıklamaları kaydedilmiyor — DOM üzerinden gerçek `.click()` göndererek
doğrula. `next dev` çalışırken `next build` çalıştırma.

## İzin verilen değişiklikler

- OLUŞTUR: `components/DetailDrawer.tsx` (ve gerekiyorsa `components/charts/*.tsx`),
  `lib/detail.ts`, `public/data/detail/**`
- DÜZENLE: `scripts/build-static.ts`, `components/ScanTable.tsx`, `components/ScanScreen.tsx`,
  `lib/types.ts`, `app/globals.css`, `package.json`
- DOKUNMA: yukarıdaki sert kısıtlardaki dizinler

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce, değişen dosyalar, çalıştırılan kontroller **gerçek
sonuçlarıyla** (geçti/kaldı/çalıştırılmadı — çalışmayanı çalıştı diye bildirme), varsayımlar,
çözülmemiş riskler, inceleme notları.
