# Görev 09 — Elenen hisseleri görünür yap

**Atanan tier:** 2 (standart implementasyon) — Sonnet 5 subagent
**Ön koşul:** Görev 08 birleştirilmiş olmalı.
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin.

## Sorun (gerçek kullanıcı şikâyeti)

Kullanıcı ORZAX'ı Saatlik taramada gördü, Günlük'e geçti, hisse **sessizce kayboldu**.
Sebebini anlayamadı ve bunu hata sandı.

Hata değil: ORZAX yeni halka arz (ilk işlem 2026-07-07), günlükte 13 barı var, motor
göstergelerin ısınması için en az **120 bar** istiyor. Ama uygulama bunu hiçbir yerde
söylemiyor — sorun bu.

Ölçüldü (2026-07-27): 614 sembolün **68'i** üç dilimde birden yok. Baskın grup ~50 hisse
(HOROZ, KOTON, MOGAN, ALTNY gibi normal işlem gören şirketler) yalnızca **haftalıkta**
eksik, çünkü 2 yıldan yeni oldukları için ~104 haftalık barları var.

**Eşik DEĞİŞMEYECEK.** 120 bar kalıyor; bu görev yalnızca elemeyi görünür kılmakla ilgili.
Gerekçe: kullanıcı sinyallere bakarak gerçek para riske ediyor, "biraz daha az ısınmış
gösterge ama daha çok hisse" takası onun lehine değil.

## Kapsam

### A. Derleme zamanında eleme kaydı

`scripts/build-static.ts` her zaman dilimi için elenen sembolleri de yazsın:
`public/data/excluded-{tf}.json` →
`[{ "symbol": "ORZAX", "bars": 13, "minBars": 120, "reason": "az-bar" }, ...]`

Sebep kodları: `"az-bar"` (bar sayısı yetersiz), `"veri-yok"` (bar dosyası hiç yok),
`"hesap-hatasi"` (motor istisna attı veya sonuç sonlu değil). Şu an `computeRows` bunları
sessizce `continue` ile atlıyor — hangi sembolün hangi sebeple elendiğini topla.

Evrende olup hiç bar dosyası olmayan semboller de `"veri-yok"` olarak kaydedilsin.

### B. Aramada geri bildirim  ← EN ÖNEMLİ PARÇA

Kullanıcı bir sembol arayıp sonuç boş dönüyorsa ve o sembol **bu dilimde elenmişse**,
boş sonuç ekranında sebebi yazsın:

> **ORZAX** bu zaman diliminde taranamıyor.
> Yeterli geçmiş verisi yok: 13 bar var, en az 120 gerekiyor.
> ORZAX 07.07.2026'da işlem görmeye başladı.
> *Saatlik* diliminde mevcut → [Saatlik'e geç]

Son satır önemli: hisse başka bir dilimde varsa oraya geçiren bir düğme olsun.

Bu hem masaüstünde hem mobilde çalışsın.

### C. Zaman dilimi değişiminde

Detay paneli açıkken kullanıcı o hissenin bulunmadığı bir dilime geçerse, panel boş/bozuk
görünmesin; aynı açıklamayı göstersin ("Bu hisse Haftalık dilimde taranamıyor — …").

### D. Keşfedilebilir sayaç

Tarama başlığında (masaüstünde "Tarama sonuçları" satırı, mobilde liste üstü) elenen sayısı
görünsün ve tıklanınca listesi açılsın:

> 598 hisse tarandı · **16 hisse taranamadı** ›

Açılan listede sembol + sebep + bar sayısı olsun. Uzunsa kaydırılabilir.

## Kapsam dışı (YAPMA)

- MIN_BARS eşiğini değiştirmek
- Likidite filtresi (işlem görmeyen hisseleri evrenden çıkarmak) — ayrı konu
- `src/engine/` içinde değişiklik — eleme kuralı motorda değil, `lib/scan-data.ts`'te

## Sert kısıtlar

- **`src/engine/` DEĞİŞTİRİLMEZ**; `node scripts/parity.ts` geçmeli. `MIN_BARS` sabiti
  motordan içe aktarılsın, elle 120 yazılmasın.
- Yeni bağımlılık YOK.
- Türkçe arayüz; tarihler `Europe/Istanbul`, `Intl.NumberFormat("tr-TR")`.
- Mobilde dokunma hedefleri **≥44×44px** (bu projede üç kez atlandı — raporlamadan önce say).
- Statik export'ta çalışmalı; `${BASE_PATH}` kalıbını koru.
- Elenen listesi istek üzerine indirilsin, sayfaya gömülmesin.
- `ingest/`, `data/`, `reference/`, `scripts/parity.ts`, `scripts/atr-calibration.ts`,
  `scripts/prototype-source.ts`, `scripts/build-news.ts`, `.github/`,
  `../design_handoff_bist_radar/`, `components/charts/**` — dokunma.
- Commit atma.

## Kabul kriterleri

1. `npm run build:data` üç `excluded-{G,H,S}.json` dosyası üretiyor; içerik ölçülen
   gerçekle uyumlu: G'de ORZAX var (13 bar), H'de HOROZ/KOTON gibi hisseler var.
2. Elenen sayıları taranan sayılarıyla tutarlı: taranan + elenen = evrendeki
   ilgili sembol sayısı.
3. Masaüstünde "ORZAX" araması Günlük dilimde açıklayıcı mesaj gösteriyor; mesajda bar
   sayısı, gereken sayı ve ilk işlem tarihi var.
4. Mesajdaki "Saatlik'e geç" düğmesi çalışıyor ve ORZAX o dilimde görünüyor.
5. Aynı akış mobilde de çalışıyor.
6. Detay paneli açıkken bulunmayan bir dilime geçince açıklama görünüyor (boş/bozuk panel yok).
7. Elenen sayacı görünüyor ve tıklanınca liste açılıyor; listede sembol + sebep + bar sayısı var.
8. Elenmemiş bir sembol aranınca (ör. "THYAO") normal sonuç geliyor — regresyon yok.
9. Hiç eşleşmeyen bir metin aranınca (ör. "zzzz") eski boş-sonuç mesajı geliyor.
10. `node scripts/parity.ts` geçiyor; `npm run build` ve
    `NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build` hatasız.
11. Mobilde (375px) ilk render DOM düğümü < 2000; yatay kaydırma yok.
12. Konsolda hata yok (375×812, 812×375, 1280×800).

## Doğrulama

`preview_start` ile `out/` servis et; `resize_window` ile 375×812, 812×375, 1280×800.
Ekran görüntüsü alınamıyor, `computer` tıklamaları kaydedilmiyor, animasyonlar çalışmıyor —
`javascript_tool` ile gerçek `.click()`/`input` olayları gönder. Boyut değiştirince
`window.dispatchEvent(new Event('resize'))` göndermen gerekiyor.

Eleme sayılarını **bağımsız doğrula**: `data/bars/{tf}` altındaki dosyaları kendin sayıp
`excluded-{tf}.json` ile karşılaştır, sadece "üretildi" deme.

## İzin verilen değişiklikler

- OLUŞTUR: `components/ExcludedNotice.tsx`, `components/ExcludedList.tsx`,
  `lib/excluded.ts` (isimler serbest)
- DÜZENLE: `scripts/build-static.ts`, `lib/scan-data.ts`, `lib/types.ts`,
  `components/ScanScreen.tsx`, `components/ScanTable.tsx`, `components/MobileList.tsx`,
  `components/DetailDrawer.tsx`, `app/globals.css`
- DOKUNMA: sert kısıtlardaki dizinler

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce, değişen dosyalar, çalıştırılan kontroller **gerçek
sonuçlarıyla** (bağımsız saydığın eleme rakamlarını yaz), ölçülen DOM düğümü, varsayımlar,
çözülmemiş riskler.
