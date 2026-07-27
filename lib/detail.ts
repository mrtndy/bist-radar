/**
 * Sunucu tarafı hisse detay veri katmanı — SADECE Server Component / Route Handler /
 * plain Node script içinden içe aktarılmalı ("use client" bileşenlerinden DEĞİL):
 * `node:fs` kullanır. Kullanan: `scripts/build-static.ts` (statik
 * `public/data/detail/{SEMBOL}-{tf}.json` üretimi için).
 *
 * `lib/scan-data.ts`teki `computeRows` ile AYNI başarı/atlama kuralları kasıtlı olarak
 * burada da uygulanır (bar sayısı < MIN_BARS, indicators()/scoreOf() hata verirse,
 * fiyat/skor sonlu değilse -> atla): bir sembol tarama tablosunda bir satır olarak
 * görünüyorsa (yani tıklanabilirse) bu modül de aynı zaman dilimi için bir detay
 * dosyası üretebilmelidir — aksi hâlde tabloda tıklanan bir satırın karşılığında
 * detay JSON'ı bulunamaz. Motor dosyalarına (`src/engine/**`) dokunulmaz, yalnızca
 * içe aktarılır.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { indicators, MIN_BARS } from "../src/engine/indicators.ts";
import { scoreOf, signalOf } from "../src/engine/scoring.ts";
import type { Bar, Timeframe, UniverseEntry } from "../src/engine/types.ts";
import type { DetailData } from "./types";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");

let universeMapPromise: Promise<Map<string, UniverseEntry>> | null = null;

function getUniverseMap(): Promise<Map<string, UniverseEntry>> {
  if (!universeMapPromise) {
    universeMapPromise = readFile(path.join(DATA_DIR, "universe.json"), "utf8").then((raw) => {
      const entries = JSON.parse(raw) as UniverseEntry[];
      return new Map(entries.map((e) => [e.symbol, e]));
    });
  }
  return universeMapPromise;
}

/** `data/bars/{tf}` dizinindeki sembol listesi (uzantısız dosya adları, sırasız). */
export async function listSymbols(tf: Timeframe): Promise<string[]> {
  const barDir = path.join(DATA_DIR, "bars", tf);
  const files = await readdir(barDir);
  return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}

/**
 * Bir sembol + zaman dilimi için detay panel verisini üretir.
 * Barlar eksik/kısa/dejenereyse (`lib/scan-data.ts`teki `computeRows` ile aynı kural) `null`.
 */
export async function getDetailData(symbol: string, tf: Timeframe): Promise<DetailData | null> {
  const barPath = path.join(DATA_DIR, "bars", tf, `${symbol}.json`);
  let bars: Bar[];
  try {
    bars = JSON.parse(await readFile(barPath, "utf8")) as Bar[];
  } catch {
    return null;
  }
  if (!Array.isArray(bars) || bars.length < MIN_BARS) return null;

  try {
    const ind = indicators(bars, tf);
    const { score, breakdown } = scoreOf(ind, tf);
    if (!Number.isFinite(ind.price) || !Number.isFinite(score)) return null;

    const universe = await getUniverseMap();
    const u = universe.get(symbol);

    const detail: DetailData = {
      symbol,
      name: u?.name ?? symbol,
      sector: u?.sector ?? "Diğer",
      price: ind.price,
      chg: ind.chg,
      k: ind.k,
      d: ind.d,
      rsi: ind.rsi,
      atrPct: ind.atrPct,
      relVol: ind.relVol,
      pctB: ind.pctB,
      macd: ind.macd,
      msig: ind.msig,
      hist: ind.hist,
      crossDir: ind.crossDir,
      crossBars: ind.crossBars,
      volTL: ind.volTL,
      hi70: ind.hi70,
      lo70: ind.lo70,
      score,
      signal: signalOf(score),
      breakdown,
      chart: ind.chart,
    };
    return detail;
  } catch {
    // Motor hatası (ör. dejenere seri) — bu sembol/dilim için detay üretilemez.
    return null;
  }
}
