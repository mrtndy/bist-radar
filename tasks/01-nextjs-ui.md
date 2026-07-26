# Görev 01 — Next.js iskeleti + Tarama ana ekranı

**Atanan tier:** 2 (standart implementasyon) — `gpt-5.6-sol`, effort `medium`
**Kota durumu:** Claude Max havuzu normal, uyarı yok. Codex tercih edilen havuz; geri dönüş Claude Sonnet subagent.
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin.

## Amaç

`../design_handoff_bist_radar/` altındaki prototipin **Tarama ana ekranını** Next.js + TypeScript
ile üretim kalitesinde yeniden inşa et. Veri katmanı hazır ve doğrulanmış; senin işin onu
arayüze bağlamak.

## Kapsam (bu görev)

1. Next.js (App Router) + TypeScript iskeleti — `bist-radar/` içinde, mevcut `src/` korunarak.
2. Tarama satırlarını dönen bir API rotası: diskteki barları okur, **mevcut motoru çağırır**,
   satırları döner. Her istekte 600 hisseyi yeniden hesaplama — süreç içi önbellek yeterli
   (bar dosyalarının mtime'ı ile geçersizleştir).
3. Ana ekran: üst bar, sol filtre paneli, tablo. Prototiple **birebir** görünüm.

## Kapsam dışı (sonraki görevler — YAPMA)

- Hisse detay drawer'ı ve grafikler (Görev 02)
- Sağ haber paneli (Görev 03)
- Kimlik doğrulama, dağıtım, Docker
- `src/engine/` içinde **hiçbir değişiklik** (aşağıya bak)

## Sert kısıtlar

- **`src/engine/` dosyalarını DEĞİŞTİRME.** Gösterge/skor matematiği prototiple birebir
  eşleşmek zorunda ve bunu `scripts/parity.ts` koruyor. Göstergeleri yeniden yazma, kendi
  RSI/MACD'ini ekleme, eşikleri "düzeltme". İçe aktar ve kullan:
  `import { indicators } from "../src/engine/indicators.ts"` , `scoreOf`, `signalOf`.
- **Node >= 24.** TypeScript build adımı yok; `.ts` dosyaları doğrudan çalışıyor.
- Arayüz dili **Türkçe**. Tüm sayı biçimleri `Intl.NumberFormat("tr-TR")` (virgül ondalık):
  fiyat `"12,34 ₺"`, değişim `"%+1,23"`. Arama `toLocaleLowerCase("tr")` ile.
- Sıralama: sembol `localeCompare(…, "tr")`, diğerleri sayısal.
- Yatırım tavsiyesi olmadığı uyarısı filtre panelinin altında kalmalı.

## İlgili dosyalar

| Dosya | Rolü |
|---|---|
| `../design_handoff_bist_radar/README.md` | **Tasarım şartnamesi** — ekran yerleşimi, piksel ölçüleri, tasarım token'ları. §"1. Tarama (ana ekran)" ve §"Design Tokens" bölümleri bu görevin kaynağı. |
| `../design_handoff_bist_radar/BIST Radar.html` | Çalışan prototip — tarayıcıda aç, davranışı buradan doğrula. |
| `../design_handoff_bist_radar/BIST Radar.dc.html` | Kaynak markup + inline stiller — birebir görünüm için referans. |
| `src/engine/*.ts` | Motor — **salt okunur**, içe aktar. |
| `src/engine/types.ts` | `Bar`, `Indicators`, `Score`, `Signal`, `UniverseEntry` tipleri. |
| `scripts/scan.ts` | Barları okuyup motoru çağıran çalışan örnek — API rotan bunun mantığını devralsın. |
| `data/universe.json` | 639 hisse: `{symbol, name, sector}`. |
| `data/bars/{G,H,S}/SEMBOL.json` | `Bar[]` — eskiden yeniye sıralı. |

## Tasarım token'ları (handoff README §Design Tokens)

- Zemin `#161826`, metin `#e9e9ed`, accent `#9184d9`
- Yükseliş/AL `oklch(0.75 0.1 158)`, düşüş/SAT `oklch(0.69 0.13 24)` — başka yerde yeşil/kırmızı kullanma
- Font Inter (başlık 500, gövde 400); tablo 12,5px; mikro etiketler 10,5–11px uppercase + `letter-spacing: 0.05em`; rakamlar `tabular-nums`
- Radius 8px (chip/pill 99px); ikonlar Phosphor
- **Accent asla geniş dolgu değildir** — çizgi, tint (%7–18) ve glow olarak kullanılır
- Sayfa scroll etmez: `grid-template-rows: 54px 1fr`, tam yükseklik; yalnızca tablo ve paneller scroll eder

## Ekran gereksinimleri

**Üst bar (54px):** marka (döndürülmüş accent kare + "BIST Radar" + outline tag) · zaman dilimi
segmented control (Günlük/Haftalık/Saatlik) · arama kutusu (sembol+isim, anlık filtre) ·
sağda: yükselen/düşen sayaçları, son güncelleme zamanı.
*Not: prototipteki BIST100 endeks değeri demo veriydi; gerçek endeks kaynağı yok — bu göstergeyi
şimdilik ATLA, yerine taranan hisse sayısını göster.*

**Sol filtre paneli (236px, scroll):** Sinyal chip'leri (Tümü/AL/SAT/Nötr; seçili = accent %14
dolgu + accent border) · Sektör select · Min. skor slider (0–90) · Min. relatif hacim slider
(0–3×) · ATR % min/maks · Fiyat ₺ min/maks · Min. hacim (Mn ₺) · "Filtreleri sıfırla" ghost
buton · "N / M hisse eşleşti" sayacı · yasal uyarı.

**Tablo (iki eksende scroll, min-width 1060px):** sticky başlık. Kolonlar: SEMBOL (kod + altta
gri şirket adı) · FİYAT · DEĞİŞİM (%, renkli) · SKOR (44px mini progress bar + sayı, renk skora
göre) · SİNYAL (tag) · STOK %K (≤20 yeşil, ≥80 kırmızı) · MACD (▲/▼ + histogram/fiyat oranı %) ·
RSI (≥70 kırmızı, ≤30 yeşil) · ATR % · R.HACİM (≥1,5× accent + bold) · %B.
*Not: prototipteki HABER kolonu Görev 03'e bırakıldı — şimdilik ekleme.*
Başlığa tıklayınca sıralar (ok ▾/▴; sayısal kolonlarda ilk tık azalan). Satır hover accent %7.
Boş sonuç: ortalanmış mesaj + sıfırla butonu.

## Kabul kriterleri

1. `npm run dev` çalışıyor, ana ekran açılıyor, **gerçek** veriyle 590+ hisse listeleniyor.
2. `node scripts/parity.ts` hâlâ geçiyor (motor dokunulmamış olmalı).
3. Zaman dilimi değişimi tabloyu o dilimin verisine geçiriyor; üç dilim de çalışıyor.
4. Her filtre tek tek ve birlikte doğru daraltıyor; eşleşme sayacı doğru; sıfırlama çalışıyor.
5. Her kolon başlığı iki yöne de sıralıyor; sembol Türkçe alfabetik.
6. Arama "tcell", "TCELL", "turkcell", "türk" için doğru sonuç veriyor (tr locale).
7. Sayfa gövdesi yatay/dikey scroll ETMİYOR; yalnızca tablo ve filtre paneli scroll ediyor.
8. Tarayıcı konsolunda hata yok.
9. 1280x800'de prototiple yan yana konduğunda görsel olarak ayırt edilemiyor.

## Doğrulama komutları

```bash
node scripts/parity.ts        # motor bozulmamış mı
npm run build                 # tip hataları
npm run dev                   # elle görsel karşılaştırma
```

Barlar eskiyse tazele:
```bash
node scripts/build-universe.ts
./.venv/bin/python ingest/ingest.py --timeframe G
```

## İzin verilen değişiklikler

- OLUŞTUR: `app/**`, `components/**`, `lib/**`, `public/**`, `next.config.*`, `tsconfig.json`, `app/globals.css`
- DÜZENLE: `package.json` (bağımlılıklar + script'ler)
- DOKUNMA: `src/engine/**`, `ingest/**`, `scripts/parity.ts`, `data/**`, `../design_handoff_bist_radar/**`

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce, sonra değişen dosyalar, çalıştırılan kontroller
**sonuçlarıyla**, varsayımlar, çözülmemiş riskler, inceleme notları, kota durumu.
Commit ATMA — diff çalışma ağacında kalsın; Claude inceleyip birleştirecek.
