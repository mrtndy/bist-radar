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
import type { Bar, ScoreComponent, Timeframe, UniverseEntry } from "../src/engine/types.ts";
import type { ExcludedEntry, RowData, ScanResult } from "./types";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const NEWS_COUNTS_PATH = path.join(ROOT, "public", "data", "news", "_counts.json");

/** Sırayla TÜM zaman dilimleri — `getExcludedRows`teki çapraz-dilim "başka nerede mevcut" kontrolü için. */
const ALL_TFS: readonly Timeframe[] = ["G", "H", "S"];

/** `ExcludedEntry`nin `availableIn` alanı HARİÇ geri kalanı — bu, tek bir `tf` için ucuzca
 * hesaplanabilir/önbelleklenebilir; `availableIn` ise DİĞER dilimlerin taranmış satırlarına
 * bakmayı gerektirir, bu yüzden yalnızca `getExcludedRows` çağrıldığında (istek üzerine)
 * sonradan eklenir (bkz. aşağısı) — sayfaya gömülmeyen, istek üzerine indirilen tek şey bu
 * değil elbette (tasks/09 "Sert kısıtlar"), ama iç önbellek bu ayrımı yine de yapıyor ki
 * `computeScan` tek bir dilimin dosyalarını okuyarak çalışmaya devam etsin. */
type ExcludedEntryBase = Omit<ExcludedEntry, "availableIn">;

interface CacheEntry {
  fingerprint: string;
  rows: RowData[];
  excluded: ExcludedEntryBase[];
  fetchedAt: number | null;
}

const scanCache = new Map<Timeframe, CacheEntry>();
let universePromise: Promise<UniverseEntry[]> | null = null;
let sectorsPromise: Promise<string[]> | null = null;
let newsCountsPromise: Promise<Record<string, number>> | null = null;

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

/**
 * HABER kolonu için sembol -> son 7 gündeki KAP bildirim sayısı (bkz.
 * tasks/05-kap-haberler.md §C). `scripts/build-news.ts` üretir
 * (`public/data/news/_counts.json`); o script henüz hiç çalışmadıysa (ör. yerel
 * geliştirmede `build:news` atlanmışsa) dosya yoktur ve burada BOŞ MAP'e düşülür —
 * derleme bu yüzden hiçbir zaman bozulmaz, kolon yalnızca 0 gösterir. İki üretim
 * script'i (`build:news`, `build:data`) arasında sıra bağımlılığı YOKTUR: hangisi
 * önce çalışırsa çalışsın derleme başarılı olur, yalnızca `build:news` HENÜZ
 * çalışmamışsa sayaçlar bir sonraki derlemeye kadar 0 kalır.
 */
function getNewsCounts(): Promise<Record<string, number>> {
  if (!newsCountsPromise) {
    newsCountsPromise = readFile(NEWS_COUNTS_PATH, "utf8")
      .then((raw) => JSON.parse(raw) as Record<string, number>)
      .catch(() => ({}));
  }
  return newsCountsPromise;
}

/**
 * Mobil kart listesindeki tek satırlık gerekçe (bkz. tasks/04-mobil-gorunum.md §B,
 * `RowData.topReason`) — en güçlü (|p| en büyük) skor bileşeninin motor metni.
 * Skor burada YENİDEN HESAPLANMAZ; `scoreOf()`'un zaten ürettiği `breakdown`
 * dizisinden en etkili bileşen seçilir (eşitlikte dizideki ilk bileşen kazanır).
 */
function topReasonOf(breakdown: ScoreComponent[]): string {
  if (breakdown.length === 0) return "";
  let top = breakdown[0];
  for (const c of breakdown) {
    if (Math.abs(c.p) > Math.abs(top.p)) top = c;
  }
  return top.n;
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

/**
 * Bar dosyalarını okuyup hem satırları HEM de elenen sembolleri üretir (bkz.
 * tasks/09-eleme-gorunurlugu.md §A — `computeRows` eskiden bunları sessizce `continue`
 * ile atlıyordu). Satır üretim MANTIĞI (üç aşamalı kapı: parse -> bar sayısı -> motor)
 * ESKİ `computeRows` ile birebir AYNI — yalnızca her `continue` noktasında artık NEDEN
 * bilgisi de kaydediliyor. MIN_BARS burada DEĞİŞTİRİLMEZ, yalnızca motordan içe aktarılan
 * sabit karşılaştırma için kullanılır (görev "Sert kısıtlar").
 */
async function computeScan(
  tf: Timeframe,
  barDir: string,
  files: string[],
): Promise<{ rows: RowData[]; excluded: ExcludedEntryBase[] }> {
  const universe = await getUniverse();
  const meta = new Map(universe.map((u) => [u.symbol, u]));
  const newsCounts = await getNewsCounts();
  const rows: RowData[] = [];
  const excluded: ExcludedEntryBase[] = [];
  const seen = new Set<string>();

  for (const f of files) {
    const symbol = f.replace(/\.json$/, "");
    seen.add(symbol);
    const u = meta.get(symbol);
    const name = u?.name ?? symbol;

    let bars: Bar[];
    try {
      bars = JSON.parse(await readFile(path.join(barDir, f), "utf8")) as Bar[];
    } catch {
      // Dosya var ama okunamadı/bozuk JSON — brief'in 3 sebep kodunda ayrı bir karşılığı
      // yok; en yakını "veri-yok" (kullanılabilir bar verisi fiilen yok).
      excluded.push({ symbol, name, bars: 0, minBars: MIN_BARS, reason: "veri-yok", firstBarAt: null });
      continue;
    }
    if (!Array.isArray(bars) || bars.length < MIN_BARS) {
      const n = Array.isArray(bars) ? bars.length : 0;
      excluded.push({
        symbol,
        name,
        bars: n,
        minBars: MIN_BARS,
        reason: "az-bar",
        firstBarAt: n > 0 ? bars[0].t : null,
      });
      continue;
    }

    try {
      const ind = indicators(bars, tf);
      const { score, breakdown } = scoreOf(ind, tf);
      if (!Number.isFinite(ind.price) || !Number.isFinite(score)) {
        excluded.push({
          symbol,
          name,
          bars: bars.length,
          minBars: MIN_BARS,
          reason: "hesap-hatasi",
          firstBarAt: bars[0].t,
        });
        continue;
      }
      const signal = signalOf(score);
      rows.push({
        symbol,
        name,
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
        topReason: topReasonOf(breakdown),
        newsCount: newsCounts[symbol] ?? 0,
      });
    } catch {
      // Motor hatası (ör. dejenere seri) — bu sembolü atla, taramanın kalanını etkilemesin.
      excluded.push({
        symbol,
        name,
        bars: bars.length,
        minBars: MIN_BARS,
        reason: "hesap-hatasi",
        firstBarAt: bars[0].t,
      });
    }
  }

  // Evrende olup bu dilim için hiç bar dosyası olmayan semboller de "veri-yok" (görev §A
  // son cümlesi) — yukarıdaki döngü yalnızca VAR OLAN dosyaları görür, bu yüzden ayrı geçiş.
  for (const u of universe) {
    if (seen.has(u.symbol)) continue;
    excluded.push({ symbol: u.symbol, name: u.name, bars: 0, minBars: MIN_BARS, reason: "veri-yok", firstBarAt: null });
  }

  rows.sort((a, b) => a.symbol.localeCompare(b.symbol, "tr"));
  excluded.sort((a, b) => a.symbol.localeCompare(b.symbol, "tr"));
  return { rows, excluded };
}

/** Bar dizini fingerprint'ine göre önbellekli hesaplama — `getScanRows`/`getExcludedRows`
 * ORTAK bu fonksiyonu kullanır, dosyalar tek seferde okunur/hesaplanır. */
async function ensureComputed(tf: Timeframe): Promise<CacheEntry> {
  const barDir = path.join(DATA_DIR, "bars", tf);
  const files = (await readdir(barDir)).filter((f) => f.endsWith(".json"));
  const fingerprint = await fingerprintDir(barDir, files);

  const cached = scanCache.get(tf);
  if (cached && cached.fingerprint === fingerprint) return cached;

  const { rows, excluded } = await computeScan(tf, barDir, files);
  const fetchedAt = await readFetchedAt(tf);
  const entry: CacheEntry = { fingerprint, rows, excluded, fetchedAt };
  scanCache.set(tf, entry);
  return entry;
}

/** Bir zaman dilimi için tarama satırlarını döner; bar dosyaları değişmediyse önbellekten. */
export async function getScanRows(tf: Timeframe): Promise<ScanResult> {
  const { rows, fetchedAt } = await ensureComputed(tf);
  const sectors = await getSectorList();
  return { rows, total: rows.length, fetchedAt, sectors };
}

/**
 * Bir zaman diliminde elenen (taranamayan) sembolleri döner — `public/data/
 * excluded-{tf}.json` içeriği (bkz. `scripts/build-static.ts`). Her girdiye, sembolün
 * BAŞARIYLA tarandığı DİĞER dilimler (`availableIn`) de eklenir — bunun için diğer iki
 * dilimin `getScanRows`u çağrılır (zaten önbellekli; `scripts/build-static.ts` bu
 * fonksiyonu çağırmadan ÖNCE üç dilimi de bir kez hesapladığı için ekstra dosya okuması
 * OLMAZ) — tasks/09-eleme-gorunurlugu.md §B'deki "başka dilime geç" düğmesi bunu kullanır.
 */
export async function getExcludedRows(tf: Timeframe): Promise<ExcludedEntry[]> {
  const { excluded } = await ensureComputed(tf);
  if (excluded.length === 0) return [];

  const otherTfs = ALL_TFS.filter((t) => t !== tf);
  const otherResults = await Promise.all(otherTfs.map((t) => getScanRows(t)));
  const availableSets = otherTfs.map((t, i) => ({
    tf: t,
    symbols: new Set(otherResults[i].rows.map((r) => r.symbol)),
  }));

  return excluded.map((e) => ({
    ...e,
    availableIn: availableSets.filter(({ symbols }) => symbols.has(e.symbol)).map(({ tf: otf }) => otf),
  }));
}
