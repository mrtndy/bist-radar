/**
 * Elenen (taranamayan) semboller — istemci tarafı fetch + biçimlendirme yardımcıları
 * (bkz. tasks/09-eleme-gorunurlugu.md). Veri derleme zamanında `scripts/build-static.ts`
 * tarafından üretilir (`public/data/excluded-{tf}.json`, bkz. `lib/scan-data.ts`
 * `getExcludedRows`) — İSTEK ÜZERİNE indirilir, hiçbir sayfaya gömülmez (görev "Sert
 * kısıtlar"). `lib/news.ts` ile AYNI desen: fetch hiçbir zaman reddetmez (throw etmez),
 * dosya yoksa/ağ hatasında boş diziye düşülür — bu özellik başarısız olursa uygulama
 * eski (açıklamasız) boş-sonuç/hata davranışına geri döner, çökmez.
 *
 * `lib/columns.ts`/`lib/watchlist.ts` ile AYNI desen: hook'lar burada, "use client"
 * bileşenlerinden içe aktarılır (bu dosyanın kendisi "use client" İÇERMEZ — yalnızca
 * client bileşenlerinden kullanıldığı için gerekmiyor, bkz. o dosyalardaki örnek).
 */
import { useEffect, useState } from "react";
import type { ExcludedEntry, ExcludedReason, Timeframe } from "./types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const TF_LABEL: Record<Timeframe, string> = { G: "Günlük", H: "Haftalık", S: "Saatlik" };

/** Yönelme hâli ("…'e/…'a geç" düğmeleri) — Türkçe ünlü uyumu sembol bazında elle
 * çözülür (Günlük'e/Haftalık'a/Saatlik'e), otomatik türetilmez — üç sabit değer için
 * bir kural motoru gereksiz karmaşıklık olurdu. */
export const TF_DATIVE: Record<Timeframe, string> = { G: "Günlük'e", H: "Haftalık'a", S: "Saatlik'e" };

/** Elenen liste modalındaki (bkz. components/ExcludedList.tsx) kısa sebep etiketleri —
 * `excludedReasonText`teki tam cümlelerden AYRI: liste satırı dar, tek/iki kelime gerekir. */
export const REASON_LABEL: Record<ExcludedReason, string> = {
  "az-bar": "Yetersiz geçmiş veri",
  "veri-yok": "Veri yok",
  "hesap-hatasi": "Hesap hatası",
};

const nfInt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** tf -> [önbelleklenmiş fetch Promise'i] — aynı dilim için birden çok bileşen (sayaç,
 * boş-sonuç açıklaması, detay paneli, liste modalı) AYNI isteği paylaşsın diye (bkz.
 * dosya başı yorumu — `scanCache`teki sunucu tarafı önbelleğin istemci karşılığı,
 * ama TEK oturum ömürlü/basit: `Map`, invalidation yok — "Güncelle" düğmesi yalnızca
 * `scan-{tf}.json`ı tazeler, bu bilerek kapsam dışı bırakılmıştır, bkz. görev metni). */
const cache = new Map<Timeframe, Promise<ExcludedEntry[]>>();

function fetchExcludedList(tf: Timeframe): Promise<ExcludedEntry[]> {
  let p = cache.get(tf);
  if (!p) {
    p = fetch(`${BASE_PATH}/data/excluded-${tf}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<ExcludedEntry[]>) : []))
      .catch(() => []);
    cache.set(tf, p);
  }
  return p;
}

/** Bir zaman dilimi için elenen listesini getirir (istek üzerine, önbellekli).
 * `null` = henüz yüklenmedi (istemci tarafı fetch her zaman mount SONRASI başlar). */
export function useExcludedList(tf: Timeframe): ExcludedEntry[] | null {
  const [entries, setEntries] = useState<ExcludedEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    fetchExcludedList(tf).then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [tf]);

  return entries;
}

/** Belirli bir sembolün bu dilimde elenip elenmediğini arar (bkz.
 * components/DetailDrawer.tsx §C — zaman dilimi değişince panel). */
export function useExcludedEntry(
  tf: Timeframe,
  symbol: string,
): { loading: boolean; entry: ExcludedEntry | null } {
  const list = useExcludedList(tf);
  if (list === null) return { loading: true, entry: null };
  return { loading: false, entry: list.find((e) => e.symbol === symbol) ?? null };
}

/** Ana tablo arama kuralıyla AYNI (sembol/isim, tr-locale, alt dize) — bkz.
 * components/ScanScreen.tsx `filteredRows`. Sorgu boşsa boş dizi (arama YOKSA eşleşme
 * de yok — çağıran zaten bunu kendi kontrol ediyor olsa da savunma amaçlı). */
export function matchExcluded(entries: ExcludedEntry[], query: string): ExcludedEntry[] {
  const q = query.trim().toLocaleLowerCase("tr");
  if (!q) return [];
  return entries.filter(
    (e) => e.symbol.toLocaleLowerCase("tr").includes(q) || e.name.toLocaleLowerCase("tr").includes(q),
  );
}

/** "Yeterli geçmiş verisi yok: 13 bar var, en az 120 gerekiyor." (görev §B örneği). */
export function excludedReasonText(e: ExcludedEntry): string {
  switch (e.reason) {
    case "az-bar":
      return `Yeterli geçmiş verisi yok: ${nfInt.format(e.bars)} bar var, en az ${nfInt.format(e.minBars)} gerekiyor.`;
    case "veri-yok":
      return "Bu sembol için hiç fiyat verisi bulunamadı.";
    case "hesap-hatasi":
      return "Bu sembol için göstergeler hesaplanamadı (veri sorunu).";
    default:
      return "";
  }
}

/** "ORZAX 07.07.2026'da işlem görmeye başladı." — bar verisi hiç yoksa `null`. */
export function firstTradeText(e: ExcludedEntry): string | null {
  if (e.firstBarAt == null) return null;
  return `${e.symbol} ${dateFmt.format(new Date(e.firstBarAt))}'da işlem görmeye başladı.`;
}
