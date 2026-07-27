"use client";

/**
 * Portföy: adet + ortalama maliyet, kâr/zarar hesabı — bkz.
 * tasks/07-portfoy-kar-zarar.md.
 *
 * Takip listesinden (lib/watchlist.ts) BİLEREK BAĞIMSIZ bir localStorage anahtarı
 * (`bist-radar:portfoy`). Ayrı tutulma nedeni: bir sembol takipten çıkarılıp
 * yıldızı kapatılınca portföy kaydı SİLİNMEMELİ (görev metni — yanlışlıkla
 * yıldızı kapatan yaşlıca kullanıcı verisini kaybetmesin; tekrar yıldızlayınca
 * geri gelmeli). Kaydın GÖSTERİMİ yine de yalnızca takip edilen sembollerle
 * sınırlıdır — bu sınırlama burada değil, çağıran tarafta (WatchlistTab'a
 * yalnızca `watchedRows` geçilir) uygulanır.
 *
 * GİZLİLİK (sert kural, görev metni "GİZLİLİK — sert kural"): bu veri ASLA
 * `?takip=` paylaşım bağlantısına girmez, ağa çıkan HİÇBİR kod yolu yoktur —
 * yalnızca localStorage. bkz. lib/watchlist.ts `buildShareUrl` (yalnızca
 * sembol listesini okur, bu dosyaya hiç bakmaz).
 *
 * Hidrasyon + depolama erişimi: lib/watchlist.ts `useWatchlist` ile BİREBİR
 * AYNI desen (ilk state her zaman "boş" `{}`, gerçek okuma yalnızca mount
 * sonrası bir efektte; her erişim try/catch içinde) — gerekçe için oradaki
 * yorumlara bakın, burada tekrar edilmiyor.
 */
import { useCallback, useEffect, useState } from "react";
import type { RowData } from "./types";

const STORAGE_KEY = "bist-radar:portfoy";

/** Tek bir hissedeki pozisyon: kaç lot, ortalama alış fiyatı (₺). */
export interface Position {
  lot: number;
  maliyet: number;
}

export type PortfolioMap = Record<string, Position>;

/**
 * Bir pozisyonun hesaba katılabilir ("geçerli") olup olmadığı — görev "Boş/kısmi
 * durumlar": lot veya maliyet 0/boş ise o hisse hesaba katılmaz, kartta yalnızca
 * fiyat görünür. `NaN`/negatif değerler de (bozuk/elle düzenlenmiş localStorage
 * verisi ihtimaline karşı) burada elenir.
 */
export function isValidPosition(p: Position | null | undefined): p is Position {
  return !!p && Number.isFinite(p.lot) && p.lot > 0 && Number.isFinite(p.maliyet) && p.maliyet > 0;
}

type RawRecord = Record<string, unknown>;

/** localStorage'dan gelen ham JSON'u güvenli bir `PortfolioMap`'e indirger —
 * beklenmeyen şekil/tip sessizce atlanır (bozuk veri uygulamayı çökertmez). */
function sanitizeMap(raw: unknown): PortfolioMap {
  if (!raw || typeof raw !== "object") return {};
  const out: PortfolioMap = {};
  for (const [symbol, value] of Object.entries(raw as RawRecord)) {
    if (!symbol || typeof value !== "object" || value === null) continue;
    const lot = (value as RawRecord).lot;
    const maliyet = (value as RawRecord).maliyet;
    if (typeof lot !== "number" || typeof maliyet !== "number") continue;
    if (!Number.isFinite(lot) || !Number.isFinite(maliyet)) continue;
    out[symbol] = { lot, maliyet };
  }
  return out;
}

/** localStorage'dan oku — engelliyse (gizli sekme/kota/izin) veya JSON bozuksa sessizce {}. */
function readStoredPortfolio(): PortfolioMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return sanitizeMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** localStorage'a yaz — başarısız olursa sessizce yut (özellik pasifleşir, çökmez). */
function writeStoredPortfolio(map: PortfolioMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Kasıtlı: depolama engelliyse portföy kalıcı olmaz ama uygulama çalışmaya devam eder.
  }
}

export interface UsePortfolioResult {
  /** Sembol -> pozisyon. Mount öncesi / sunucuda her zaman `{}` (hidrasyon güvenliği). */
  positions: PortfolioMap;
  getPosition: (symbol: string) => Position | null;
  /** Kaydet. lot/maliyet <=0 veya sayı değilse SESSİZCE hiçbir şey yapmaz — form
   * zaten bu durumda "Kaydet"i devre dışı bırakır (bkz. components/PositionForm.tsx),
   * bu yalnızca ikinci bir güvenlik katmanı. */
  savePosition: (symbol: string, lot: number, maliyet: number) => void;
  removePosition: (symbol: string) => void;
}

export function usePortfolio(): UsePortfolioResult {
  const [positions, setPositions] = useState<PortfolioMap>({});

  // Mount sonrası TEK seferlik okuma — `useWatchlist`teki `isMobile` deseniyle AYNI
  // gerekçe: ilk render sunucu/derleme çıktısıyla ({}) aynı kalsın, hydration hatası
  // vermesin.
  useEffect(() => {
    setPositions(readStoredPortfolio());
  }, []);

  const getPosition = useCallback((symbol: string) => positions[symbol] ?? null, [positions]);

  const savePosition = useCallback((symbol: string, lot: number, maliyet: number) => {
    if (!Number.isFinite(lot) || lot <= 0 || !Number.isFinite(maliyet) || maliyet <= 0) return;
    setPositions((prev) => {
      const next = { ...prev, [symbol]: { lot, maliyet } };
      writeStoredPortfolio(next);
      return next;
    });
  }, []);

  const removePosition = useCallback((symbol: string) => {
    setPositions((prev) => {
      if (!(symbol in prev)) return prev;
      const next = { ...prev };
      delete next[symbol];
      writeStoredPortfolio(next);
      return next;
    });
  }, []);

  return { positions, getPosition, savePosition, removePosition };
}

/** Bir pozisyonun güncel fiyata göre kâr/zarar metrikleri. */
export interface PositionMetrics {
  /** Güncel değer: lot × son fiyat. */
  value: number;
  /** Maliyet: lot × ortalama maliyet. */
  cost: number;
  /** Kâr/zarar tutarı (₺): value - cost. */
  pnl: number;
  /** Kâr/zarar yüzdesi: pnl / cost × 100. */
  pnlPct: number;
}

/**
 * `position` geçersizse (lot/maliyet 0/boş/negatif) veya `price` sayı değilse
 * `null` — çağıran taraf bu durumda "yalnızca fiyat görünsün" kuralını uygular
 * (görev "Boş/kısmi durumlar").
 */
export function computeMetrics(position: Position | null | undefined, price: number): PositionMetrics | null {
  if (!isValidPosition(position) || !Number.isFinite(price)) return null;
  const value = position.lot * price;
  const cost = position.lot * position.maliyet;
  const pnl = value - cost;
  const pnlPct = cost !== 0 ? (pnl / cost) * 100 : 0;
  return { value, cost, pnl, pnlPct };
}

export interface PortfolioSummary {
  totalCost: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  /** Toplamlara katılan (geçerli lot+maliyetli) hisse sayısı. */
  includedCount: number;
  /** Takip edilen ama lot/maliyet girilmemiş (toplamlara katılmayan) hisse sayısı. */
  excludedCount: number;
}

/**
 * Takip edilen satırlardan (`rows` — ÇAĞIRAN TARAF zaten yalnızca takip edilenleri
 * geçmeli, bkz. WatchlistTab `watchedRows`) özet toplamları. Yalnızca geçerli
 * pozisyonlar toplama katılır (görev "Gösterim" — "Yalnızca adet/maliyet girilmiş
 * hisseler toplama katılsın"); `rows` PAGINATION'DAN (visibleCount) BAĞIMSIZ tam
 * liste olmalı, yoksa özet kullanıcının ne kadar kaydırdığına göre değişen yanlış
 * bir toplam gösterir.
 */
export function computePortfolioSummary(rows: RowData[], positions: PortfolioMap): PortfolioSummary {
  let totalCost = 0;
  let totalValue = 0;
  let includedCount = 0;
  let excludedCount = 0;

  for (const row of rows) {
    const metrics = computeMetrics(positions[row.symbol], row.price);
    if (!metrics) {
      excludedCount++;
      continue;
    }
    totalCost += metrics.cost;
    totalValue += metrics.value;
    includedCount++;
  }

  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost !== 0 ? (totalPnl / totalCost) * 100 : 0;

  return { totalCost, totalValue, totalPnl, totalPnlPct, includedCount, excludedCount };
}
