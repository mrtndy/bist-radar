# Görev 04 — Mobil görünüm (telefonda kullanılabilir hâle getirme)

**Atanan tier:** 2 (standart implementasyon) — Sonnet 5 subagent
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin.

## Amaç

Aracı telefonda gerçekten kullanılabilir hâle getir. Şu an masaüstü için tasarlanmış 11 teknik
kolonluk bir tablo var; 375px'te kullanılamıyor.

## Kimin kullanacağı — tasarım kararlarını bu belirlesin

Kullanıcı, borsa terminolojisine hâkim olmayan yaşlıca bir kişi. Telefonundan açacak, gördüğü
sinyallere bakarak **kendi parasıyla** işlem yapacak (emri kendi aracı kurum uygulamasından
verecek — burası karar destek aracı, emir ekranı değil).

Bunun somut sonuçları:

- **%B, ATR%, STOK %K, MACD gibi kolonlar telefonda GÖRÜNMEMELİ.** Ona hiçbir şey ifade etmiyor.
  Detay panelinde kalsınlar, listede yer kaplamasınlar.
- **Motorun ürettiği Türkçe gerekçe en değerli bilgi.** ("Ortalamanın 2,4 katı hacim",
  "Aşırı satımdan yukarı dönüyor".) Listede her hissenin yanında en güçlü gerekçe görünmeli.
- **Dokunma hedefleri büyük olmalı** (min 44×44px), yazılar okunaklı (gövde ≥ 14px).
- **Gecikme uyarısı sürekli görünür olmalı**, tıklanınca kaybolan bir ipucu değil.

## Kapsam

### A. Kırılma noktası
`< 720px` mobil düzen. (Tablo min-width 1060px, ondan aşağısı zaten kullanılamıyor.)
Üstü mevcut masaüstü düzeni — **masaüstü görünümü DEĞİŞTİRME.**

### B. Tablo yerine kart listesi
Her hisse bir kart:

```
SEMBOL            fiyat ₺
Şirket adı         %+1,23        [AL]  94
──────────────────────────────────────
MACD +10 · AL kesişimi (2 bar önce)
```

- Sembol büyük ve kalın, şirket adı altında sönük
- Fiyat ve değişim sağda, değişim renkli (yükseliş/düşüş token renkleri)
- Sinyal tag'i + skor (mini bar + sayı)
- Altta **en yüksek puanlı bileşenin gerekçesi** tek satır
- Karta dokununca mevcut detay paneli açılır (`DetailDrawer` zaten mobilde tam ekran)

### C. Sıralama
Kolon başlığı yok, bunun yerine listenin üstünde basit bir **açılır menü**:
"Skora göre (yüksek→düşük)", "Değişime göre", "Fiyata göre", "Sembole göre (A-Z)".
Varsayılan: skora göre azalan.

### D. Filtreler → alt sayfa (bottom sheet)
Sol panel telefonda yer kaplamamalı. Yerine listenin üstünde bir **"Filtrele"** düğmesi;
basınca alttan açılan bir sayfa.

İçinde önce **hazır setler** (tek dokunuşla), ham slider'lar değil:

| Buton | Ne yapar |
|---|---|
| Tümü | filtre yok |
| Güçlü AL sinyalleri | sadece AL |
| Yüksek hacimli | relVol ≥ 1,5 |
| Yükselenler | değişim > 0 |
| Düşenler | değişim < 0 |

Altında "Ayrıntılı filtreler" başlığı açılır-kapanır olsun; mevcut sektör/skor/ATR/fiyat/hacim
filtreleri oraya girsin. Varsayılan **kapalı** — teyzenin karşısına slider çıkmasın.

Aktif filtre varsa "Filtrele" düğmesinde sayı rozeti göster ve "N / M hisse" sayacı görünsün.

### E. Performans — ZORUNLU
Şu an 611 satırın tamamı DOM'a basılıyor: **14.796 düğüm** (ölçüldü). Düşük donanımlı telefonda
kaydırma takılır.

İlk **50 kart** render edilsin, kullanıcı alta yaklaştıkça 50'şer eklensin (IntersectionObserver
ile) veya "Daha fazla göster" düğmesi. Hangisini seçersen seç, ölçülebilir olsun: 375px'te ilk
render sonrası DOM düğüm sayısı **2000'in altında** kalmalı.

### F. Üst bar
375px'de marka + zaman dilimi + arama + sayaçlar + güncelle düğmesi sığmıyor. Mobilde:
- Üst satır: marka (kısaltılabilir) + **Güncelle** düğmesi + veri zamanı
- Alt satır: zaman dilimi segmented control (Günlük/Haftalık/Saatlik) + arama

### G. Gecikme uyarısı
Listenin üstünde, sürekli görünür, sade bir şerit:
> ⓘ Veriler ~15 dakika gecikmelidir. Emir vermeden önce aracı kurumunuzdaki canlı fiyata bakın.

Metni uydurma; `DetailDrawer`'daki mevcut uyarı metniyle tutarlı olsun.

## Kapsam dışı (YAPMA)

- Masaüstü düzeninde herhangi bir değişiklik
- `src/engine/` içinde herhangi bir değişiklik
- Detay panelinin içeriği (zaten mobil uyumlu yapıldı — sadece kartlardan açıldığını doğrula)
- Haber paneli
- Yeni bağımlılık ekleme (sanallaştırma kütüphanesi dahil — elle yaz, 50'şer render basit)

## Sert kısıtlar

- **`src/engine/` DEĞİŞTİRİLMEZ.** `node scripts/parity.ts` geçmeli.
- `scoreOf(ind, tf)` — tf zorunlu (bu görevde motoru çağırman gerekmeyebilir ama bilmiş ol).
- Türkçe arayüz, `Intl.NumberFormat("tr-TR")`.
- Tasarım token'ları: yükseliş `oklch(0.75 0.1 158)`, düşüş `oklch(0.69 0.13 24)`,
  accent `#9184d9` — accent geniş dolgu olarak KULLANILMAZ (çizgi/tint/glow).
- Statik export'ta çalışmalı; `${BASE_PATH}` kalıbını bozma.
- `ingest/`, `data/`, `reference/`, `scripts/`, `.github/`, `../design_handoff_bist_radar/` —
  dokunma.
- Commit atma.

## Kabul kriterleri (hepsi 375×812'de ölçülecek)

1. Yatay scroll **yok** (`document.documentElement.scrollWidth <= clientWidth`).
2. İlk render sonrası DOM düğüm sayısı **< 2000**; aşağı kaydırınca daha fazla kart yükleniyor.
3. Kart listesi görünüyor; tablo/teknik kolonlar (%B, ATR, STOK %K, MACD) mobilde **görünmüyor**.
4. Her kartta gerekçe satırı var ve metin motordan geliyor.
5. Karta dokununca detay paneli tam ekran açılıyor; Esc/✕ ile kapanıyor.
6. "Filtrele" alt sayfası açılıyor; 5 hazır set de doğru sonuç veriyor
   (ör. "Güçlü AL sinyalleri" → yalnızca AL sinyalli hisseler, sayaç doğru).
7. Sıralama menüsü dört seçenekte de doğru sıralıyor.
8. Zaman dilimi değişimi çalışıyor (G/H/S).
9. Gecikme şeridi görünür.
10. Dokunulabilir öğeler ≥ 44×44px.
11. Masaüstü (1280px) görünümü **değişmemiş**: tablo, sol filtre paneli, kolonlar aynı.
12. `npm run build` ve `NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build` hatasız;
    `node scripts/parity.ts` geçiyor; konsolda hata yok.

## Doğrulama

Claude_Browser araçlarıyla: `preview_start`, sonra `resize_window` ile **mobile (375x812)** ve
**desktop (1280x800)** ikisini de dene. Bu ortamda ekran görüntüsü alınamıyor ve `computer`
tıklamaları kaydedilmiyor — `javascript_tool` ile gerçek `.click()` göndererek ve
`getComputedStyle`/`getBoundingClientRect` okuyarak doğrula. `read_console_messages` ile hata
kontrolü yap.

`next dev` çalışırken `next build` çalıştırma.

## İzin verilen değişiklikler

- OLUŞTUR: `components/MobileList.tsx`, `components/StockCard.tsx`, `components/FilterSheet.tsx`,
  `components/SortMenu.tsx` (isimler serbest)
- DÜZENLE: `components/ScanScreen.tsx`, `components/TopBar.tsx`, `app/globals.css`,
  `lib/types.ts`, `lib/format.ts`
- DOKUNMA: sert kısıtlardaki dizinler, `components/ScanTable.tsx` (masaüstü tablosu — aynen kalsın),
  `components/DetailDrawer.tsx` ve `components/charts/**`

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce, değişen dosyalar, çalıştırılan kontroller **gerçek
sonuçlarıyla**, ölçülen DOM düğüm sayısı, varsayımlar, çözülmemiş riskler.
