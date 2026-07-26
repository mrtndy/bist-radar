/**
 * KAP bildirim akışını çeker ve evrendeki hisselerle eşleştirir.
 * Üretimde bu, seans içi 15-30 sn'de bir çalışan bir poller olacak; burada tek atışlık
 * doğrulama amaçlı.
 *
 * Çalıştır:  node scripts/news.ts [--days 3] [--top 15]
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDisclosures } from "../src/providers/kap.ts";
import type { UniverseEntry } from "../src/engine/types.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const argv = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const days = Number(arg("--days", "3"));
const top = Number(arg("--top", "15"));

const universe: UniverseEntry[] = JSON.parse(
  await readFile(path.join(ROOT, "data/universe.json"), "utf8"),
);
const known = new Map(universe.map((u) => [u.symbol, u]));

const to = Date.now();
const from = to - days * 86_400_000;
const t0 = Date.now();
const items = await getDisclosures({ from, to });
const ms = Date.now() - t0;

const withSym = items.filter((d) => d.symbols.length > 0);
const matched = items.filter((d) => d.symbols.some((s) => known.has(s)));
const unknown = new Set(
  items.flatMap((d) => d.symbols).filter((s) => !known.has(s)),
);

console.log(
  `KAP: ${items.length} bildirim (son ${days} gün), ${ms} ms\n` +
    `  hisse kodu olan : ${withSym.length}\n` +
    `  evrende eşleşen : ${matched.length}\n` +
    `  tanınmayan kod  : ${unknown.size}${unknown.size ? " -> " + [...unknown].slice(0, 8).join(", ") : ""}`,
);

const fmt = (ms: number) =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));

console.log(`\nEN YENİ ${top}:`);
for (const d of items.slice(0, top)) {
  const syms = d.symbols.length ? d.symbols.join("/") : "—";
  const name = d.symbols.map((s) => known.get(s)?.name).find(Boolean) ?? "";
  console.log(
    `  ${fmt(d.publishedAt)}  ${syms.padEnd(12)} ${d.subject.slice(0, 62)}${name ? `  [${name}]` : ""}`,
  );
}

// En çok bildirim alan hisseler — tabloda "HABER" kolonunu besleyecek sayaç.
const counts = new Map<string, number>();
for (const d of matched) for (const s of d.symbols) if (known.has(s)) counts.set(s, (counts.get(s) ?? 0) + 1);
const busiest = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`\nEN ÇOK BİLDİRİM: ${busiest.map(([s, c]) => `${s} (${c})`).join(", ")}`);
