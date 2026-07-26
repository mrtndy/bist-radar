/**
 * Hisse evrenini KAP'tan çeker, sektör bilgisini prototipin küratörlü listesinden tohumlar
 * ve `data/universe.json` olarak yazar.
 *
 * SEKTÖR SINIRI: KAP'ta ve İş Yatırım'ın açık uçlarında makinece okunabilir sektör alanı
 * bulunamadı (2026-07-27 denemesi: İş Yatırım sektör uçları HTTP 401). Bu yüzden sektör,
 * prototipteki 158 hisselik elle hazırlanmış listeden eşlenir; eşleşmeyenler "Diğer" olur.
 * Kalıcı çözüm için BIST sektör endeksi (XBANK, XHOLD, …) üyelik listesi bağlanmalı.
 *
 * Çalıştır:  node scripts/build-universe.ts
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getUniverse } from "../src/providers/kap.ts";
import type { UniverseEntry } from "../src/engine/types.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PROTOTYPE = path.resolve(ROOT, "../design_handoff_bist_radar/bist-data.js");

/** Prototipteki `TICKERS` dizisinden [sembol, ad, sektör] tohumu okur. */
async function sectorSeed(): Promise<Map<string, { name: string; sector: string }>> {
  const src = await readFile(PROTOTYPE, "utf8");
  const patched = `${src}\nexport { TICKERS as _TICKERS };\n`;
  const url = `data:text/javascript;base64,${Buffer.from(patched, "utf8").toString("base64")}`;
  const mod = (await import(url)) as { _TICKERS: [string, string, string, number][] };
  return new Map(mod._TICKERS.map(([sym, name, sector]) => [sym, { name, sector }]));
}

const seed = await sectorSeed();
const universe = await getUniverse();

let enriched = 0;
const merged: UniverseEntry[] = universe.map((u) => {
  const s = seed.get(u.symbol);
  if (!s) return u;
  enriched++;
  return { symbol: u.symbol, name: s.name, sector: s.sector };
});

await mkdir(path.join(ROOT, "data"), { recursive: true });
await writeFile(
  path.join(ROOT, "data/universe.json"),
  JSON.stringify(merged, null, 0),
  "utf8",
);

const sectors = new Set(merged.map((m) => m.sector));
console.log(`evren: ${merged.length} hisse (KAP, işlem gören)`);
console.log(`sektör tohumu: ${enriched} eşleşti, ${merged.length - enriched} "Diğer"`);
console.log(`sektör sayısı: ${sectors.size}`);
console.log(`-> data/universe.json`);
