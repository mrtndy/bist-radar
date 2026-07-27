/**
 * Prototip motorunun kaynağı — hem parity testi hem sektör tohumu bunu kullanır.
 *
 * Asıl dosya bu deponun DIŞINDA duruyor (`../design_handoff_bist_radar/bist-data.js`), o yüzden
 * CI'da erişilemez. Depo kendi kendine yeterli olsun diye `reference/` altına birebir kopyalandı.
 * Yerelde asıl dosya varsa kopyanın ondan sapmadığı da doğrulanır — böylece referans sessizce
 * eskimez.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Depo içindeki kopya — CI dahil her ortamda bulunur. */
export const VENDORED = path.join(ROOT, "reference/bist-data.original.js");

/** Asıl tasarım paketi — yalnızca geliştirme makinesinde bulunur. */
export const UPSTREAM = path.resolve(ROOT, "../design_handoff_bist_radar/bist-data.js");

/**
 * Prototip kaynağını döner. Asıl dosya erişilebilirse kopyayla birebir aynı olduğunu doğrular;
 * farklıysa hata verir (kopya elle güncellenmeli).
 */
export async function prototypeSource(): Promise<string> {
  const vendored = await readFile(VENDORED, "utf8");

  let upstream: string | null = null;
  try {
    upstream = await readFile(UPSTREAM, "utf8");
  } catch {
    // Tasarım paketi yok (CI) — kopya tek kaynak.
    return vendored;
  }

  if (upstream !== vendored) {
    throw new Error(
      `Referans kopya asıl dosyadan farklı.\n` +
        `  asıl : ${UPSTREAM}\n` +
        `  kopya: ${VENDORED}\n` +
        `Tasarım paketi güncellendiyse kopyayı tazele:\n` +
        `  cp "${UPSTREAM}" "${VENDORED}"\n` +
        `ardından parity testini yeniden çalıştır.`,
    );
  }
  return vendored;
}

/** Kaynağa export satırı ekleyip data: URL modülü olarak yükler (orijinali değiştirmeden). */
export async function importPrototype<T>(exportLine: string): Promise<T> {
  const src = await prototypeSource();
  const patched = `${src}\n${exportLine}\n`;
  const url = `data:text/javascript;base64,${Buffer.from(patched, "utf8").toString("base64")}`;
  return (await import(url)) as T;
}
