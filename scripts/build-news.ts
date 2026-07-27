/**
 * KAP bildirimlerinden derleme zamanı haber verisi üretir — bkz.
 * tasks/05-kap-haberler.md §A. `src/providers/kap.ts`teki `getDisclosures()`'ı
 * kullanarak SON 7 GÜNÜ çeker, `lib/news-importance.ts`teki üç seviyeli
 * sınıflandırıcıdan geçirir ve şu dosyaları yazar:
 *
 * - public/data/news-feed.json      — piyasa akışı: önem sırası + zaman sırası
 *                                      (yuksek önce, eşitlikte en yeni önce), en fazla
 *                                      80 öğe, "gizli" hariç.
 * - public/data/news/{SEMBOL}.json  — hisse başına, zaman sırası (en yeni önce), en
 *                                      fazla 15 öğe, "gizli" hariç, YALNIZCA
 *                                      data/universe.json'daki sembollere.
 * - public/data/news/_counts.json   — { SEMBOL: adet } — brief'in kendisi bu dosyayı
 *                                      istemiyor; ScanTable'daki sıralanabilir HABER
 *                                      kolonu (tasks/05 §C) için eklendi: o kolonun
 *                                      "son 7 gündeki bildirim adedi"ni doğru
 *                                      göstermesi için 15'lik kapağa TABİ DEĞİL
 *                                      (bir hissede 15'ten fazla görünür bildirim
 *                                      varsa kolon gerçek sayıyı göstermeli, hepsi
 *                                      "15" görünüp ayrım kaybolmamalı) — bkz.
 *                                      `lib/scan-data.ts` `getNewsCounts()`. "gizli"
 *                                      buradan da hariç: sayaç rozetine gürültünün
 *                                      geri sızmaması için (bkz. görev "ÖNCE OKU").
 *
 * Ağ hatası derlemeyi DÜŞÜRMEZ: KAP'a erişilemezse uyarı basılır, boş ama geçerli
 * dosyalar üretilir (public/data/news/ dizini var olur ama hiç sembol dosyası
 * içermez — "hiçbir hissede haber yok" durumuyla AYNI, ayrım gerekmiyor), script yine
 * sıfır çıkış koduyla döner (bkz. görev "Sert kısıtlar" ve kabul kriteri 2).
 *
 * Çalıştır:  node scripts/build-news.ts
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyImportance, IMPORTANCE_RANK } from "../lib/news-importance.ts";
import type { NewsItem } from "../lib/types.ts";
import { getDisclosures, type Disclosure } from "../src/providers/kap.ts";
import type { UniverseEntry } from "../src/engine/types.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "public", "data");
const NEWS_DIR = path.join(OUT_DIR, "news");

const DAYS = 7;
const FEED_MAX = 80;
const PER_SYMBOL_MAX = 15;

await mkdir(NEWS_DIR, { recursive: true });

// Önceki koşudan kalan sembol dosyalarını temizle (IDEMPOTENCY): bu script yalnızca
// haberi OLAN semboller için dosya YAZAR, artık haberi olmayan bir sembolün dosyasını
// SİLMEZ — temizlik yapılmazsa önceki koşudan kalan eski bir dosya (ör. bir önceki
// haftanın haberi) o hissede hâlâ güncel haber varmış gibi sızabilir. Ağ hatası
// durumunda da bu, "hiç sembol dosyası yok" hâlini garantiler (bkz. dosya başı notu).
for (const f of await readdir(NEWS_DIR)) {
  if (f.endsWith(".json")) await rm(path.join(NEWS_DIR, f));
}

const universe = JSON.parse(
  await readFile(path.join(DATA_DIR, "universe.json"), "utf8"),
) as UniverseEntry[];
const knownSymbols = new Set(universe.map((u) => u.symbol));

const to = Date.now();
const from = to - DAYS * 86_400_000;

let disclosures: Disclosure[] = [];
try {
  const t0 = Date.now();
  disclosures = await getDisclosures({ from, to });
  console.log(`KAP: ${disclosures.length} bildirim (son ${DAYS} gün), ${Date.now() - t0} ms`);
} catch (err) {
  console.warn(
    `UYARI: KAP bildirimleri alınamadı (${err instanceof Error ? err.message : String(err)}). ` +
      `Boş ama geçerli haber dosyaları üretiliyor, derleme durmuyor.`,
  );
  disclosures = [];
}

function toNewsItem(d: Disclosure): NewsItem {
  return {
    index: d.index,
    publishedAt: d.publishedAt,
    title: d.title,
    subject: d.subject,
    summary: d.summary,
    symbols: d.symbols,
    importance: classifyImportance(d.subject),
  };
}

const classified = disclosures.map(toNewsItem);
const visible = classified.filter((n) => n.importance !== "gizli");

const importanceCounts = { yuksek: 0, orta: 0, gizli: 0 };
for (const n of classified) importanceCounts[n.importance]++;
console.log(
  `  Sınıflandırma: yuksek ${importanceCounts.yuksek}, orta ${importanceCounts.orta}, ` +
    `gizli ${importanceCounts.gizli} (gizli = feed'e ve hisse dosyalarına girmez)`,
);

// --- piyasa akışı: önem sırası + zaman sırası, en fazla 80 (bkz. görev §A) ---
const feed = [...visible]
  .sort((a, b) => {
    const rankDiff = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
    return rankDiff !== 0 ? rankDiff : b.publishedAt - a.publishedAt;
  })
  .slice(0, FEED_MAX);

await writeFile(path.join(OUT_DIR, "news-feed.json"), JSON.stringify(feed), "utf8");
console.log(`Piyasa akışı: ${feed.length} öğe -> public/data/news-feed.json`);

// --- hisse başına (yalnızca evrendeki semboller, en fazla 15, gizli hariç) + kapsız sayaç ---
const perSymbol = new Map<string, NewsItem[]>();
const counts = new Map<string, number>();

for (const item of visible) {
  for (const sym of item.symbols) {
    if (!knownSymbols.has(sym)) continue;
    counts.set(sym, (counts.get(sym) ?? 0) + 1);
    const list = perSymbol.get(sym);
    if (list) list.push(item);
    else perSymbol.set(sym, [item]);
  }
}

let symbolFilesWritten = 0;
for (const [symbol, items] of perSymbol) {
  // `visible` zaten publishedAt azalan sırada (`getDisclosures()` garantisi, bkz.
  // src/providers/kap.ts) — burada yeniden sıralamaya gerek yok.
  await writeFile(
    path.join(NEWS_DIR, `${symbol}.json`),
    JSON.stringify(items.slice(0, PER_SYMBOL_MAX)),
    "utf8",
  );
  symbolFilesWritten++;
}
console.log(`Hisse başına haber: ${symbolFilesWritten} sembol dosyası -> public/data/news/*.json`);

const countsObj = Object.fromEntries(counts);
await writeFile(path.join(NEWS_DIR, "_counts.json"), JSON.stringify(countsObj), "utf8");
console.log(`Bildirim sayaçları (kapsız): ${counts.size} sembol -> public/data/news/_counts.json`);

console.log(
  `\nToplam ${classified.length} bildirim işlendi: ${visible.length} görünür ` +
    `(feed'de ${feed.length}), ${classified.length - visible.length} gizli.`,
);
