/**
 * Derleme zamanı statik veri üretimi: her zaman dilimi için tarama satırlarını
 * hesaplayıp `public/data/scan-{G,H,S}.json` olarak yazar. Çıktının şekli
 * eski `/api/scan` yanıtıyla birebir aynıdır (`{tf, rows, total, fetchedAt, sectors}`)
 * — mantık burada tekrar yazılmaz, `lib/scan-data.ts`'teki `getScanRows` doğrudan
 * çağrılır (motor dosyalarına -- `src/engine/**` -- yalnızca o modül üzerinden,
 * dolaylı olarak dokunulur).
 *
 * İstemci (`components/ScanScreen.tsx`) bu dosyaları hem `npm run dev` hem de
 * statik export'ta doğrudan okur; bu script her iki durumda da önce çalıştırılmalı
 * (bkz. package.json: "build:data").
 *
 * Çalıştır:  node scripts/build-static.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDetailData, listSymbols } from "../lib/detail.ts";
import { getExcludedRows, getScanRows } from "../lib/scan-data.ts";
import type { ScanApiResponse } from "../lib/types.ts";
import type { Timeframe } from "../src/engine/types.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT_DIR = path.join(ROOT, "public", "data");
const DETAIL_DIR = path.join(OUT_DIR, "detail");

const TFS: readonly Timeframe[] = ["G", "H", "S"];
const TF_LABEL: Record<Timeframe, string> = { G: "Günlük", H: "Haftalık", S: "Saatlik" };

await mkdir(OUT_DIR, { recursive: true });

for (const tf of TFS) {
  const result = await getScanRows(tf);
  const body: ScanApiResponse = { tf, ...result };
  const outPath = path.join(OUT_DIR, `scan-${tf}.json`);
  await writeFile(outPath, JSON.stringify(body), "utf8");
  console.log(
    `${TF_LABEL[tf]} (${tf}): ${result.rows.length} satır -> ${path.relative(ROOT, outPath)}`,
  );
}

console.log("\nStatik tarama verisi üretildi.");

// Elenen (taranamayan) sembol listesi — her dilim için ayrı JSON (bkz.
// tasks/09-eleme-gorunurlugu.md §A/§D). `computeRows` (şimdiki adıyla `computeScan`,
// bkz. lib/scan-data.ts) artık MIN_BARS altında kalan/verisi olmayan/motor hatası veren
// sembolleri de topluyor; burada yalnızca yazılıyor. İSTEK ÜZERİNE indirilecek şekilde
// ana `scan-{tf}.json`a GÖMÜLMEZ (görev "Sert kısıtlar") — ayrı dosya, ayrı fetch.
console.log("\nElenen (taranamayan) sembol listesi üretiliyor (public/data/excluded-{G,H,S}.json)…");
let excludedTotal = 0;
for (const tf of TFS) {
  const excluded = await getExcludedRows(tf);
  excludedTotal += excluded.length;
  const outPath = path.join(OUT_DIR, `excluded-${tf}.json`);
  await writeFile(outPath, JSON.stringify(excluded), "utf8");
  console.log(`  ${TF_LABEL[tf]} (${tf}): ${excluded.length} sembol elendi -> ${path.relative(ROOT, outPath)}`);
}
console.log(`\nEleme verisi üretildi: ${excludedTotal} kayıt (3 dilim toplamı).`);

// Detay paneli verisi: her sembol × zaman dilimi için ayrı JSON (bkz.
// tasks/03-detail-drawer.md §A). İstek üzerine indirilecek şekilde tabloya
// gömülmez — ScanTable'da tıklanan satır bu dosyayı fetch eder
// (components/DetailDrawer.tsx). Bir sembol yukarıdaki taramada satır olarak
// göründüyse (computeRows ile aynı atlama kuralları -> lib/detail.ts) burada da
// bir dosya üretilir; aksi hâlde (dejenere seri, kısa bar geçmişi) o sembol/dilim
// için dosya oluşmaz ve tabloda zaten satırı yoktur.
console.log("\nDetay paneli verisi üretiliyor (public/data/detail/{SEMBOL}-{tf}.json)…");
await mkdir(DETAIL_DIR, { recursive: true });

let detailWritten = 0;
let detailSeen = 0;
for (const tf of TFS) {
  const symbols = await listSymbols(tf);
  let written = 0;
  for (const symbol of symbols) {
    const detail = await getDetailData(symbol, tf);
    if (!detail) continue;
    const outPath = path.join(DETAIL_DIR, `${symbol}-${tf}.json`);
    await writeFile(outPath, JSON.stringify(detail), "utf8");
    written++;
  }
  detailSeen += symbols.length;
  detailWritten += written;
  console.log(`  ${TF_LABEL[tf]} (${tf}): ${written}/${symbols.length} sembol -> detail/*-${tf}.json`);
}

console.log(`\nDetay verisi üretildi: ${detailWritten}/${detailSeen} dosya.`);
