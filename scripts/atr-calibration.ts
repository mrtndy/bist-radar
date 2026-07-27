/**
 * ATR eşik kalibrasyonu — `ATR_TIMEFRAME_SCALE` katsayılarını gerçek veriden türetir ve
 * mevcut katsayıların ürettiği dağılımı günlük referansıyla karşılaştırır.
 *
 * Neden var: prototipin ATR bandı (%2-6) günlük barlara göreydi; haftalık ve saatlik barların
 * volatilitesi bambaşka ölçekte olduğu için bant dışarıda kalıyor ve ATR bileşeni ayırt etmeyi
 * bırakıyordu. Katsayılar bu script'le ölçülür — piyasa rejimi kalıcı olarak değişirse yeniden
 * çalıştırıp `src/engine/scoring.ts` içindeki değerleri güncelle.
 *
 * Çalıştır:  node scripts/atr-calibration.ts
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indicators, MIN_BARS } from "../src/engine/indicators.ts";
import { scoreOf, ATR_TIMEFRAME_SCALE } from "../src/engine/scoring.ts";
import type { Bar, Timeframe } from "../src/engine/types.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TFS: Timeframe[] = ["G", "H", "S"];
const q = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
const pct = (n: number, t: number) => `${((n / t) * 100).toFixed(0).padStart(3)}%`;

interface Sample {
  atr: number[];
  buckets: Record<string, number>;
}

const data: Record<string, Sample> = {};

for (const tf of TFS) {
  const dir = path.join(ROOT, "data/bars", tf);
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`${tf}: bar dizini yok (${dir}) — önce ingest çalıştır`);
    continue;
  }
  const atr: number[] = [];
  const buckets: Record<string, number> = {};
  for (const f of files) {
    try {
      const bars = JSON.parse(await readFile(path.join(dir, f), "utf8")) as Bar[];
      if (bars.length < MIN_BARS) continue;
      const ind = indicators(bars, tf);
      if (!Number.isFinite(ind.atrPct)) continue;
      atr.push(ind.atrPct);
      const c = scoreOf(ind, tf).breakdown.find((b) => b.k === "ATR")!;
      const label = `${c.n.split(" (")[0]} (${c.p >= 0 ? "+" : ""}${c.p})`;
      buckets[label] = (buckets[label] ?? 0) + 1;
    } catch {
      /* dejenere seri — atla */
    }
  }
  data[tf] = { atr, buckets };
}

const medG = data.G ? q(data.G.atr, 0.5) : Number.NaN;

console.log("ÖLÇÜLEN ATR% DAĞILIMI");
console.log("dilim    n     p10   medyan    p90   | medyan/günlük | kullanılan katsayı");
console.log("─".repeat(84));
for (const tf of TFS) {
  const s = data[tf];
  if (!s) continue;
  const med = q(s.atr, 0.5);
  console.log(
    `${tf}     ${String(s.atr.length).padStart(4)}  ${q(s.atr, 0.1).toFixed(2).padStart(6)} ` +
      `${med.toFixed(2).padStart(7)} ${q(s.atr, 0.9).toFixed(2).padStart(7)}   |` +
      `${(med / medG).toFixed(3).padStart(11)}    |${String(ATR_TIMEFRAME_SCALE[tf]).padStart(12)}`,
  );
}

console.log("\nATR BİLEŞENİ DAĞILIMI (hedef: her dilim günlüğe benzesin)");
const order = ["İdeal volatilite bandı (+6)", "Yüksek volatilite (+1)", "Aşırı volatil (-5)", "Düşük volatilite (-2)"];
console.log("dilim  " + order.map((o) => o.padStart(26)).join(""));
console.log("─".repeat(110));
for (const tf of TFS) {
  const s = data[tf];
  if (!s) continue;
  const t = s.atr.length;
  console.log(
    `${tf}      ` +
      order.map((o) => `${String(s.buckets[o] ?? 0).padStart(4)} ${pct(s.buckets[o] ?? 0, t)}`.padStart(26)).join(""),
  );
}

// Sapma uyarısı: bir dilimde tek bir kova %95'i aşıyorsa bileşen ayırt etmiyor demektir.
console.log();
for (const tf of TFS) {
  const s = data[tf];
  if (!s) continue;
  const top = Object.entries(s.buckets).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] / s.atr.length > 0.95) {
    console.log(`UYARI  ${tf}: hisselerin %${((top[1] / s.atr.length) * 100).toFixed(0)}'i "${top[0]}" — ATR bileşeni ayırt etmiyor, katsayı gözden geçirilmeli.`);
  }
}
