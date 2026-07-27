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
import { getScanRows } from "../lib/scan-data.ts";
import type { ScanApiResponse } from "../lib/types.ts";
import type { Timeframe } from "../src/engine/types.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT_DIR = path.join(ROOT, "public", "data");

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
