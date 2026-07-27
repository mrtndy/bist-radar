/**
 * Sunucu tarafı veri katmanı — SADECE Server Component / Route Handler / plain
 * Node script içinden içe aktarılmalı ("use client" bileşenlerinden DEĞİL):
 * `node:fs` kullanır. Kullananlar: `app/page.tsx` (ilk G verisini gömmek için)
 * ve `scripts/build-static.ts` (statik `public/data/scan-*.json` üretimi için).
 *
 * `scripts/scan.ts` ile aynı mantık (barları oku -> motoru çağır -> satır üret),
 * farkı: süreç içi önbellek + zaman dilimi başına barların mtime imzasıyla
 * geçersizleştirme (bkz. tasks/01-nextjs-ui.md "Kapsam" §2). Motor dosyalarına
 * (`src/engine/**`) dokunulmaz, yalnızca içe aktarılır.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { indicators, MIN_BARS } from "../src/engine/indicators.ts";
import { scoreOf, signalOf } from "../src/engine/scoring.ts";
import type { Bar, Timeframe, UniverseEntry } from "../src/engine/types.ts";
import type { RowData, ScanResult } from "./types";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");

interface CacheEntry {
  fingerprint: string;
  rows: RowData[];
  fetchedAt: number | null;
}

const scanCache = new Map<Timeframe, CacheEntry>();
let universePromise: Promise<UniverseEntry[]> | null = null;
let sectorsPromise: Promise<string[]> | null = null;

function getUniverse(): Promise<UniverseEntry[]> {
  if (!universePromise) {
    universePromise = readFile(path.join(DATA_DIR, "universe.json"), "utf8").then(
      (raw) => JSON.parse(raw) as UniverseEntry[],
    );
  }
  return universePromise;
}

function getSectorList(): Promise<string[]> {
  if (!sectorsPromise) {
    sectorsPromise = getUniverse().then((universe) => {
      const set = new Set(universe.map((u) => u.sector));
      return [...set].sort((a, b) => a.localeCompare(b, "tr"));
    });
  }
  return sectorsPromise;
}

/** Bar dizinindeki her dosyanın mtime'ını okuyup tekil bir imza üretir — içerik değişmediyse önbellek geçerli kalır. */
async function fingerprintDir(dir: string, files: string[]): Promise<string> {
  const stats = await Promise.all(
    files.map(async (f) => {
      const st = await stat(path.join(dir, f));
      return `${f}:${st.mtimeMs}:${st.size}`;
    }),
  );
  stats.sort();
  return stats.join("|");
}

async function readFetchedAt(tf: Timeframe): Promise<number | null> {
  try {
    const raw = await readFile(path.join(DATA_DIR, "bars", `${tf}.meta.json`), "utf8");
    const meta = JSON.parse(raw) as { fetchedAt?: unknown };
    return typeof meta.fetchedAt === "number" ? meta.fetchedAt : null;
  } catch {
    return null;
  }
}

async function computeRows(tf: Timeframe, barDir: string, files: string[]): Promise<RowData[]> {
  const universe = await getUniverse();
  const meta = new Map(universe.map((u) => [u.symbol, u]));
  const rows: RowData[] = [];

  for (const f of files) {
    const symbol = f.replace(/\.json$/, "");
    let bars: Bar[];
    try {
      bars = JSON.parse(await readFile(path.join(barDir, f), "utf8")) as Bar[];
    } catch {
      continue;
    }
    if (!Array.isArray(bars) || bars.length < MIN_BARS) continue;

    try {
      const ind = indicators(bars, tf);
      const { score } = scoreOf(ind, tf);
      if (!Number.isFinite(ind.price) || !Number.isFinite(score)) continue;
      const u = meta.get(symbol);
      const signal = signalOf(score);
      rows.push({
        symbol,
        name: u?.name ?? symbol,
        sector: u?.sector ?? "Diğer",
        price: ind.price,
        chg: ind.chg,
        score,
        signal,
        k: ind.k,
        d: ind.d,
        rsi: ind.rsi,
        atrPct: ind.atrPct,
        relVol: ind.relVol,
        pctB: ind.pctB,
        hist: ind.hist,
        histPct: (ind.hist / ind.price) * 100,
        volTL: ind.volTL,
      });
    } catch {
      // Motor hatası (ör. dejenere seri) — bu sembolü atla, taramanın kalanını etkilemesin.
      continue;
    }
  }

  rows.sort((a, b) => a.symbol.localeCompare(b.symbol, "tr"));
  return rows;
}

/** Bir zaman dilimi için tarama satırlarını döner; bar dosyaları değişmediyse önbellekten. */
export async function getScanRows(tf: Timeframe): Promise<ScanResult> {
  const barDir = path.join(DATA_DIR, "bars", tf);
  const files = (await readdir(barDir)).filter((f) => f.endsWith(".json"));
  const fingerprint = await fingerprintDir(barDir, files);

  const cached = scanCache.get(tf);
  let rows: RowData[];
  let fetchedAt: number | null;

  if (cached && cached.fingerprint === fingerprint) {
    rows = cached.rows;
    fetchedAt = cached.fetchedAt;
  } else {
    rows = await computeRows(tf, barDir, files);
    fetchedAt = await readFetchedAt(tf);
    scanCache.set(tf, { fingerprint, rows, fetchedAt });
  }

  const sectors = await getSectorList();
  return { rows, total: rows.length, fetchedAt, sectors };
}
