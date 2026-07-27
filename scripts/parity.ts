/**
 * Parity testi: TypeScript motoru (src/engine) ile handoff prototipindeki orijinal
 * `bist-data.js` motorunun AYNI barlar için AYNI çıktıyı ürettiğini doğrular.
 *
 * Orijinaldeki `indicators`/`scoreOf`/`genSeries` dışa aktarılmadığı için dosyanın
 * kaynağına export satırı eklenip data: URL modülü olarak yüklenir — referans
 * uygulamaya dokunmadan ona erişmenin yolu budur.
 *
 * Çalıştır:  node scripts/parity.ts
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indicators } from "../src/engine/indicators.ts";
import { scoreOf } from "../src/engine/scoring.ts";
import type { Bar, Timeframe } from "../src/engine/types.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGINAL = path.resolve(HERE, "../../design_handoff_bist_radar/bist-data.js");

/**
 * Kasıtlı farklar:
 * - `chart.labels` — orijinal demo tarihleri üretir, port gerçek zaman damgalarını biçimler.
 * - `chart.bars[*].t` — orijinal barlarda zaman damgası yok, testte biz ekliyoruz.
 */
const IGNORED = [/^chart\.labels/, /^chart\.bars\[\d+\]\.t$/];
const isIgnored = (p: string) => IGNORED.some((re) => re.test(p));

type AnyRec = Record<string, unknown>;

async function loadOriginal() {
  const src = await readFile(ORIGINAL, "utf8");
  const patched = `${src}\nexport { indicators as _indicators, scoreOf as _scoreOf, genSeries as _genSeries, hash as _hash };\n`;
  const url = `data:text/javascript;base64,${Buffer.from(patched, "utf8").toString("base64")}`;
  return (await import(url)) as {
    _indicators: (bars: unknown[], tf: string) => AnyRec;
    _scoreOf: (d: AnyRec) => AnyRec;
    _genSeries: (sym: string, tf: string, tier: number, arch: number) => AnyRec[];
    _hash: (s: string) => number;
  };
}

const diffs: string[] = [];
interface Comp { k: string; p: number; n: string }
/** ATR ölçeklemesinin fiilen etkin olduğunu doğrulamak için sayaçlar. */
const atrChecked: Record<string, number> = {};
const atrChanged: Record<string, number> = {};

function compare(a: unknown, b: unknown, trail: string): void {
  if (isIgnored(trail)) return;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return void diffs.push(`${trail}: dizi/tip uyuşmazlığı`);
    if (a.length !== b.length) return void diffs.push(`${trail}: uzunluk ${a.length} != ${b.length}`);
    a.forEach((x, i) => compare(x, b[i], `${trail}[${i}]`));
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a as AnyRec), ...Object.keys(b as AnyRec)]);
    for (const k of keys) compare((a as AnyRec)[k], (b as AnyRec)[k], trail ? `${trail}.${k}` : k);
    return;
  }
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return;
    // Aynı işlem sırası -> bit düzeyinde aynı olmalı; kayan nokta payı yine de bırakıldı.
    if (Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))) {
      diffs.push(`${trail}: ${a} != ${b}`);
    }
    return;
  }
  if (a !== b) diffs.push(`${trail}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

const orig = await loadOriginal();

// Prototipteki gerçek evrenden örnek semboller + her zaman dilimi + her "arketip".
const SYMBOLS = ["AKBNK", "THYAO", "ASELS", "TCELL", "SASA", "KOZAL", "BIMAS", "EREGL", "PGSUS", "SISE", "TUPRS", "MGROS"];
const TFS: Timeframe[] = ["G", "H", "S"];

let cases = 0;
for (const sym of SYMBOLS) {
  const h = orig._hash(sym);
  const arch = h % 5;
  for (const tier of [0, 1, 2, 3]) {
    for (const tf of TFS) {
      const raw = orig._genSeries(sym, tf, tier, arch);
      // Orijinal barlarda zaman damgası yok; port `t` bekliyor (yalnızca etiketleme için kullanılır).
      const bars: Bar[] = raw.map((b, i) => ({
        t: Date.UTC(2026, 0, 1) + i * 86_400_000,
        o: b.o as number,
        h: b.h as number,
        l: b.l as number,
        c: b.c as number,
        v: b.v as number,
      }));

      const expectedInd = orig._indicators(raw, tf);
      const actualInd = indicators(bars, tf);
      compare(expectedInd, actualInd as unknown as AnyRec, "");

      // (a) Günlük skorlama prototiple BİREBİR aynı kalmalı.
      const expectedScore = orig._scoreOf(expectedInd) as { score: number; breakdown: Comp[] };
      compare(expectedScore, scoreOf(actualInd, "G") as unknown as AnyRec, "score");

      // (b) Haftalık/saatlik yalnızca ATR bileşeninde ayrışabilir (ATR_TIMEFRAME_SCALE).
      //     Diğer beş bileşen prototiple aynı kalmalı — ölçekleme sızıntı yapmamalı.
      const scaled = scoreOf(actualInd, tf);
      const expNonAtr = expectedScore.breakdown.filter((b) => b.k !== "ATR");
      const actNonAtr = scaled.breakdown.filter((b) => b.k !== "ATR");
      compare(expNonAtr, actNonAtr as unknown as AnyRec, `score.breakdown[!ATR](${tf})`);
      if (tf !== "G" && expectedScore.breakdown.length !== scaled.breakdown.length) {
        diffs.push(`score.breakdown(${tf}): bileşen sayısı değişti`);
      }
      // Ölçeklemenin gerçekten etkin olduğunu say (aşağıda sıfırsa katsayı ölü demektir).
      if (tf !== "G") {
        const a = expectedScore.breakdown.find((b) => b.k === "ATR");
        const b = scaled.breakdown.find((b) => b.k === "ATR");
        atrChecked[tf] = (atrChecked[tf] ?? 0) + 1;
        if (a && b && (a.p !== b.p || a.n !== b.n)) atrChanged[tf] = (atrChanged[tf] ?? 0) + 1;
      }
      cases++;
    }
  }
}

const uniq = [...new Set(diffs)];
if (uniq.length) {
  console.error(`PARITY FAIL — ${cases} vaka, ${uniq.length} farklı alan:`);
  for (const d of uniq.slice(0, 25)) console.error("  " + d);
  if (uniq.length > 25) console.error(`  … +${uniq.length - 25} daha`);
  process.exit(1);
}
// Ölçekleme hiç devreye girmiyorsa katsayı ölüdür — testin sessizce geçmesine izin verme.
for (const tf of ["H", "S"]) {
  if (!atrChanged[tf]) {
    console.error(
      `PARITY FAIL — ${tf} diliminde ATR ölçeklemesi hiçbir vakada etkili olmadı ` +
        `(${atrChecked[tf] ?? 0} vaka). ATR_TIMEFRAME_SCALE bağlanmamış olabilir.`,
    );
    process.exit(1);
  }
}

console.log(`PARITY OK — ${cases} vaka (${SYMBOLS.length} sembol x 4 tier x 3 zaman dilimi).`);
console.log(`  günlük skorlama prototiple birebir; ATR dışı bileşenler her dilimde birebir.`);
console.log(
  `  ATR ölçeklemesi etkin: H ${atrChanged.H ?? 0}/${atrChecked.H ?? 0} vakada, ` +
    `S ${atrChanged.S ?? 0}/${atrChecked.S ?? 0} vakada farklılaştı (beklenen).`,
);
