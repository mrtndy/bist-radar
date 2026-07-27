# Görev 02 — Statik export'a geçiş

**Atanan tier:** 2 (standart implementasyon) — Sonnet 5 subagent
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin.

## Amaç

Uygulamayı sunucusuz çalışacak hâle getir: tarama verisi **derleme zamanında** statik JSON olarak
üretilsin, istemci onu okusun. Böylece site GitHub Pages / Cloudflare Pages gibi statik hostlarda
çalışır ve arkada sürekli açık bir sunucuya gerek kalmaz.

## Kapsam

1. **`scripts/build-static.ts`** — her zaman dilimi için `public/data/scan-{G,H,S}.json` üretir.
   İçerik `/api/scan` yanıtıyla **aynı şekle** sahip olmalı (`{tf, rows, total, fetchedAt, sectors}`);
   mantığı `lib/scan-data.ts`'ten devral, motoru içe aktararak kullan.
2. **İstemci statik dosyayı okusun** — `components/ScanScreen.tsx` şu an `/api/scan?tf=X` çağırıyor;
   `${basePath}/data/scan-X.json` okuyacak şekilde değiştir. Hem `npm run dev` hem export'ta
   aynı yolu kullan (iki ayrı kod yolu bırakma).
3. **`next.config.ts`** — `output: "export"`. `basePath` ve `assetPrefix` ortam değişkeninden
   okunsun (GitHub Pages alt dizinde servis eder: `kullanici.github.io/repo-adi`):
   ```
   const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
   ```
   `basePath` boşken (yerel geliştirme) da çalışmalı.
4. **`app/api/scan/route.ts` kaldırılsın** — statik export'ta çalışmaz ve iki kaynak bakım yükü
   yaratır. `lib/scan-data.ts` KALSIN (build script onu kullanacak).
5. `package.json`'a script ekle: `"build:data": "node scripts/build-static.ts"`.

## Kapsam dışı (YAPMA)

- Detay drawer'ı, grafikler, haber paneli (ayrı görevler)
- Mobil/responsive düzen (ayrı görev)
- GitHub Actions workflow dosyası (ana oturum yazıyor — `.github/` dizinine DOKUNMA)
- Görsel tasarımda hiçbir değişiklik — bu görev tamamen veri yolu değişikliği

## Sert kısıtlar

- **`src/engine/` dosyalarını DEĞİŞTİRME.** İçe aktar ve kullan. `scripts/parity.ts` bunu koruyor.
- `scoreOf()` artık zaman dilimi alıyor: **`scoreOf(ind, tf)`** diye çağır, `scoreOf(ind)` değil.
  (Argümansız hâli günlük eşiklerini kullanır ve haftalık/saatlikte yanlış skor üretir.)
- `ingest/`, `scripts/parity.ts`, `scripts/atr-calibration.ts`, `data/`, `.github/` ve
  `../design_handoff_bist_radar/` dizinlerine dokunma.
- Node >= 24; TypeScript doğrudan çalışıyor.
- Üretilen JSON'lar `public/data/` altına yazılsın ve **`.gitignore`'a eklensin** — bunlar türetilmiş
  veridir, repoya girmemeli (Actions her koşuda yeniden üretecek).

## Kabul kriterleri

1. `npm run build:data` üç JSON üretiyor; satır sayıları taramayla aynı: **G 598, H 548, S 611**.
2. `npm run build` statik export üretiyor (`out/` dizini), hata yok.
3. `npx serve out` (veya benzeri) ile açıldığında ekran gerçek veriyle çalışıyor: tablo dolu,
   zaman dilimi değişimi çalışıyor, filtreler ve sıralama çalışıyor, konsolda hata yok.
4. `NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build` ile üretilen çıktı da alt dizinde çalışıyor
   (varlık ve veri yolları kırılmıyor) — bunu fiilen dene, varsayma.
5. `node scripts/parity.ts` hâlâ geçiyor.
6. Sinyal dağılımı ATR düzeltmesi sonrasıyla uyumlu: **G AL 168 · H AL 115 · S AL 178**.
   (Bu sayıları tutturamıyorsan `scoreOf` çağrısında `tf` geçirmeyi unutmuşsundur.)

## Doğrulama komutları

```bash
npm run build:data
node scripts/parity.ts
npm run build
NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build
```

Not: `next dev` çalışırken `next build` çalıştırma — aynı `.next` dizinini bozuyor (önceki
görevde yaşandı). Önce dev sunucusunu durdur.

## İzin verilen değişiklikler

- OLUŞTUR: `scripts/build-static.ts`, `public/data/**`
- DÜZENLE: `next.config.ts`, `components/ScanScreen.tsx`, `lib/scan-data.ts` (gerekirse yeniden
  kullanılabilir hâle getirmek için), `package.json`, `.gitignore`
- SİL: `app/api/scan/route.ts`
- DOKUNMA: `src/engine/**`, `ingest/**`, `scripts/parity.ts`, `scripts/atr-calibration.ts`,
  `data/**`, `.github/**`, `../design_handoff_bist_radar/**`

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce, değişen dosyalar, çalıştırılan kontroller **gerçek
sonuçlarıyla** (geçti/kaldı/çalıştırılmadı — çalışmayan bir şeyi çalıştı diye bildirme),
varsayımlar, çözülmemiş riskler. Commit ATMA.
