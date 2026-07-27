/**
 * Uçtan uca tarama: diskteki gerçek barlar -> göstergeler -> skor -> sıralı tablo.
 * Üretimde bu iş bir API rotası/işçi tarafından yapılacak; bu script motorun gerçek
 * BIST verisiyle çalıştığını doğrulamak ve çıktıyı gözle kontrol etmek içindir.
 *
 * Çalıştır:  node scripts/scan.ts [--tf G] [--top 20]
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indicators, MIN_BARS } from "../src/engine/indicators.ts";
import { scoreOf, signalOf } from "../src/engine/scoring.ts";
import type { Bar, Timeframe, UniverseEntry } from "../src/engine/types.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const argv = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const tf = arg("--tf", "G") as Timeframe;
const top = Number(arg("--top", "20"));

const universe: UniverseEntry[] = JSON.parse(
  await readFile(path.join(ROOT, "data/universe.json"), "utf8"),
);
const meta = new Map(universe.map((u) => [u.symbol, u]));

const barDir = path.join(ROOT, "data/bars", tf);
const files = (await readdir(barDir)).filter((f) => f.endsWith(".json"));

interface Row {
  sym: string;
  name: string;
  sector: string;
  price: number;
  chg: number;
  score: number;
  signal: string;
  k: number;
  rsi: number;
  atrPct: number;
  relVol: number;
  pctB: number;
  volTL: number;
  top: string;
}

const rows: Row[] = [];
const skipped: Record<string, number> = {};

for (const f of files) {
  const sym = f.replace(/\.json$/, "");
  let bars: Bar[];
  try {
    bars = JSON.parse(await readFile(path.join(barDir, f), "utf8"));
  } catch {
    skipped.parse = (skipped.parse ?? 0) + 1;
    continue;
  }
  if (bars.length < MIN_BARS) {
    skipped.tooFewBars = (skipped.tooFewBars ?? 0) + 1;
    continue;
  }
  try {
    const ind = indicators(bars, tf);
    const { score, breakdown } = scoreOf(ind, tf);
    if (!Number.isFinite(ind.price) || !Number.isFinite(score)) {
      skipped.nonFinite = (skipped.nonFinite ?? 0) + 1;
      continue;
    }
    const u = meta.get(sym);
    const best = [...breakdown].sort((a, b) => b.p - a.p)[0];
    rows.push({
      sym,
      name: u?.name ?? sym,
      sector: u?.sector ?? "Diğer",
      price: ind.price,
      chg: ind.chg,
      score,
      signal: signalOf(score),
      k: ind.k,
      rsi: ind.rsi,
      atrPct: ind.atrPct,
      relVol: ind.relVol,
      pctB: ind.pctB,
      volTL: ind.volTL,
      top: `${best.k} ${best.p >= 0 ? "+" : ""}${best.p} · ${best.n}`,
    });
  } catch (e) {
    skipped.engineError = (skipped.engineError ?? 0) + 1;
  }
}

rows.sort((a, b) => b.score - a.score);

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - [...s].length));
const padL = (s: string, n: number) => " ".repeat(Math.max(0, n - [...s].length)) + s;

const counts = rows.reduce<Record<string, number>>((a, r) => ((a[r.signal] = (a[r.signal] ?? 0) + 1), a), {});
console.log(
  `\nBIST Radar — ${tf === "G" ? "Günlük" : tf === "H" ? "Haftalık" : "Saatlik"} tarama` +
    `  |  ${rows.length} hisse hesaplandı  |  AL ${counts["AL"] ?? 0} · NÖTR ${counts["NÖTR"] ?? 0} · SAT ${counts["SAT"] ?? 0}`,
);
if (Object.keys(skipped).length) console.log(`atlanan: ${JSON.stringify(skipped)}`);
console.log(
  "\n" +
    pad("SEMBOL", 8) + padL("FİYAT", 10) + padL("DEĞ%", 8) + padL("SKOR", 6) +
    "  " + pad("SİNYAL", 7) + padL("%K", 6) + padL("RSI", 6) + padL("ATR%", 7) +
    padL("R.HAC", 7) + padL("%B", 6) + "  EN GÜÇLÜ BİLEŞEN",
);
console.log("─".repeat(140));
for (const r of rows.slice(0, top)) {
  console.log(
    pad(r.sym, 8) +
      padL(nf.format(r.price), 10) +
      padL((r.chg >= 0 ? "+" : "") + nf.format(r.chg), 8) +
      padL(String(r.score), 6) +
      "  " + pad(r.signal, 7) +
      padL(r.k.toFixed(0), 6) +
      padL(r.rsi.toFixed(0), 6) +
      padL(r.atrPct.toFixed(1), 7) +
      padL(r.relVol.toFixed(2), 7) +
      padL(r.pctB.toFixed(2), 6) +
      "  " + r.top,
  );
}

const worst = rows.slice(-5).reverse();
console.log("\nEN DÜŞÜK 5:");
for (const r of worst) {
  console.log(`  ${pad(r.sym, 8)} skor ${padL(String(r.score), 3)}  ${r.signal.padEnd(5)}  ${r.top}`);
}
