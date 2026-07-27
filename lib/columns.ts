"use client";

/**
 * Masaüstü tablo kolon düzeni (sıra + gizli olanlar) — bkz.
 * tasks/06-takip-listesi-ve-kolonlar.md §B. Yalnızca masaüstü `ScanTable` için;
 * mobil kart listesi (`MobileList`/`StockCard`) bu dosyayı hiç kullanmaz/import etmez.
 *
 * SEMBOL bu sistemin DIŞINDA tutulur (sabit, taşınamaz/gizlenemez, her zaman ilk
 * kolon — görev "SEMBOL kolonu sabit") — burada yalnızca "serbest" 11 kolonun
 * sırası/görünürlüğü tutulur. `ScanTable` render sırasında SEMBOL'ü kendisi en başa
 * ekler (bkz. o dosyadaki `visibleColumnDefs`).
 *
 * Hidrasyon: `isMobile`/takip listesi ile AYNI desen (bkz. lib/watchlist.ts, tasks/06
 * §"Sert kısıtlar"). İlk state DAİMA `DEFAULT_LAYOUT` — derleme zamanının/statik
 * export'un bileceği TEK durum — gerçek localStorage okuması yalnızca mount sonrası
 * bir efektte olur, aksi hâlde ilk istemci render'ı sunucudan farklı çıkar ve React
 * hydration hatası verir.
 */
import { useCallback, useEffect, useState } from "react";
import type { SortKey } from "./types";

const STORAGE_KEY = "bist-radar:kolonlar";

/** ScanTable'daki 12 kolonun kimliği — "signal" `SortKey`de yok (sıralanamaz kolon). */
export type ColumnId = SortKey | "signal";

/** Sabit ilk kolon — taşınamaz/gizlenemez (görev "SEMBOL kolonu sabit"). */
export const FIXED_COLUMN: ColumnId = "symbol";

/** Kalan 11 "serbest" kolon, ScanTable'ın VARSAYILAN sırasıyla (SEMBOL hariç). */
export const DEFAULT_FREE_ORDER: ColumnId[] = [
  "price",
  "chg",
  "score",
  "signal",
  "k",
  "hist",
  "rsi",
  "atrPct",
  "relVol",
  "pctB",
  "newsCount",
];

const KNOWN_IDS = new Set<ColumnId>(DEFAULT_FREE_ORDER);

/** Kolon başlığı etiketleri — TEK kaynak: hem `ScanTable` (hücre/başlık render'ı) hem
 * `ScanScreen`/`ColumnMenu` (göster/gizle listesi metni) buradan okur, iki yerde
 * birbirinden bağımsız Türkçe metin tutulmasın diye. */
export const COLUMN_LABELS: Record<ColumnId, string> = {
  symbol: "SEMBOL",
  price: "FİYAT",
  chg: "DEĞİŞİM",
  score: "SKOR",
  signal: "SİNYAL",
  k: "STOK %K",
  hist: "MACD",
  rsi: "RSI",
  atrPct: "ATR %",
  relVol: "R.HACİM",
  pctB: "%B",
  newsCount: "HABER",
};

export interface ColumnLayout {
  /** Yalnızca "serbest" 11 kolonun sırası (SEMBOL dahil değil, o her zaman en başta). */
  order: ColumnId[];
  /** Gizlenen serbest kolonlar. */
  hidden: ColumnId[];
}

export const DEFAULT_LAYOUT: ColumnLayout = { order: DEFAULT_FREE_ORDER, hidden: [] };

/**
 * Bozuk/eski/kısmi localStorage kayıtlarına karşı savunma: bilinmeyen id'leri at
 * (ör. gelecekte bir kolon kaldırılırsa eski kayıt hâlâ onu içerebilir), eksik
 * id'leri sona ekle (ör. yeni bir kolon eklenirse eski kayıtta yoktur — kaybolmasın),
 * yinelenenleri temizle, SEMBOL'ün `hidden`e ASLA sızmadığından emin ol.
 */
function sanitizeLayout(raw: unknown): ColumnLayout {
  const order: ColumnId[] = [];
  const seen = new Set<ColumnId>();
  const rawOrder = raw && typeof raw === "object" ? (raw as { order?: unknown }).order : undefined;
  if (Array.isArray(rawOrder)) {
    for (const id of rawOrder) {
      if (typeof id === "string" && KNOWN_IDS.has(id as ColumnId) && !seen.has(id as ColumnId)) {
        seen.add(id as ColumnId);
        order.push(id as ColumnId);
      }
    }
  }
  for (const id of DEFAULT_FREE_ORDER) {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }

  const hidden: ColumnId[] = [];
  const rawHidden = raw && typeof raw === "object" ? (raw as { hidden?: unknown }).hidden : undefined;
  if (Array.isArray(rawHidden)) {
    const hiddenSeen = new Set<ColumnId>();
    for (const id of rawHidden) {
      if (
        typeof id === "string" &&
        id !== FIXED_COLUMN &&
        KNOWN_IDS.has(id as ColumnId) &&
        !hiddenSeen.has(id as ColumnId)
      ) {
        hiddenSeen.add(id as ColumnId);
        hidden.push(id as ColumnId);
      }
    }
  }

  return { order, hidden };
}

function readStoredLayout(): ColumnLayout {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    return sanitizeLayout(JSON.parse(raw));
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function writeStoredLayout(layout: ColumnLayout): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Depolama engelliyse düzen kalıcı olmaz ama uygulama çalışmaya devam eder
    // (görev "Sert kısıtlar" — try/catch her yerde).
  }
}

export interface UseColumnLayoutResult {
  order: ColumnId[];
  hidden: ColumnId[];
  /** Sürükle-bırak sonrası YENİ TAM sırayı (11 serbest kolonun tamamı) kaydeder. */
  reorder: (order: ColumnId[]) => void;
  toggleHidden: (id: ColumnId) => void;
  reset: () => void;
}

export function useColumnLayout(): UseColumnLayoutResult {
  const [layout, setLayout] = useState<ColumnLayout>(DEFAULT_LAYOUT);

  // Mount sonrası TEK seferlik gerçek okuma — bkz. dosya başı yorumu.
  useEffect(() => {
    setLayout(readStoredLayout());
  }, []);

  const persist = useCallback((next: ColumnLayout) => {
    setLayout(next);
    writeStoredLayout(next);
  }, []);

  const reorder = useCallback(
    (order: ColumnId[]) => {
      // Fonksiyonel güncelleme: `toggleHidden`i art arda hızlı tıklamalarla AYNI
      // yarış durumuna karşı (bkz. lib/watchlist.ts `toggle` yorumu) — `prev.hidden`i
      // her zaman kuyruktaki en güncel değerle birleştirir.
      setLayout((prev) => {
        const next = { order, hidden: prev.hidden };
        writeStoredLayout(next);
        return next;
      });
    },
    [],
  );

  const toggleHidden = useCallback((id: ColumnId) => {
    if (id === FIXED_COLUMN) return;
    setLayout((prev) => {
      const has = prev.hidden.includes(id);
      const nextHidden = has ? prev.hidden.filter((h) => h !== id) : [...prev.hidden, id];
      const next = { order: prev.order, hidden: nextHidden };
      writeStoredLayout(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    persist(DEFAULT_LAYOUT);
  }, [persist]);

  return { order: layout.order, hidden: layout.hidden, reorder, toggleHidden, reset };
}
