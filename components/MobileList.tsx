"use client";

/**
 * Mobil kart listesi kapsayıcısı — bkz. tasks/04-mobil-gorunum.md §B, §E.
 *
 * Performans (§E, ZORUNLU): aynı anda TÜM satırlar DOM'a basılmaz. Yalnızca ilk
 * `visibleCount` kadarı render edilir; `rows` zaten filtrelenmiş+sıralanmış tam
 * listedir (bkz. ScanScreen.tsx `sortedRows`), dilimleme burada yapılır.
 *
 * Kullanıcı listenin sonuna yaklaşınca (IntersectionObserver) veya "Daha fazla
 * göster"e basınca `onLoadMore` çağrılır — ikisi de AYNI DOM düğümüne (düğme)
 * bağlıdır, yani otomatik kaydırma tetiklemesi olmasa bile elle basılabilir.
 *
 * Kaydırma, sayfanın kendisinde değil bu bileşenin kendi `overflow-y:auto`
 * kapsayıcısında olur (bkz. app/globals.css `html,body{overflow:hidden}` — mevcut
 * masaüstü mimarisiyle aynı desen). IntersectionObserver'ın `root`'u bu yüzden
 * bilerek o kapsayıcıya (viewport'a değil) verilir.
 */
import { useEffect, useRef } from "react";
import StockCard from "./StockCard";
import type { Position, PositionMetrics } from "../lib/portfolio";
import type { RowData } from "../lib/types";

interface MobileListProps {
  rows: RowData[];
  visibleCount: number;
  onLoadMore: () => void;
  onSelectSymbol: (symbol: string) => void;
  /** Takip listesi (tasks/06-takip-listesi-ve-kolonlar.md §A) — karta iletilir, StockCard'daki yıldız için. */
  isWatched: (symbol: string) => boolean;
  onToggleWatch: (symbol: string) => void;
  /**
   * Portföy (tasks/07-portfoy-kar-zarar.md) — YALNIZCA Takibim sekmesi (WatchlistTab)
   * geçirir. Hisseler sekmesindeki çağrıda bu prop `undefined` kalır, bu yüzden
   * StockCard'ın portföy bölümü orada hiç render edilmez — "AYNI kart bileşeni" iki
   * sekmede de kullanılmaya devam eder (tasks/06 yorumu), yalnızca bu prop farklı.
   */
  portfolio?: {
    getPosition: (symbol: string) => Position | null;
    getMetrics: (row: RowData) => PositionMetrics | null;
    onEdit: (symbol: string) => void;
  };
}

export default function MobileList({
  rows,
  visibleCount,
  onLoadMore,
  onSelectSymbol,
  isWatched,
  onToggleWatch,
  portfolio,
}: MobileListProps) {
  const visible = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!hasMore) return;
    const target = sentinelRef.current;
    const root = scrollRef.current;
    if (!target || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { root, rootMargin: "400px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "10px 14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {visible.map((row) => (
        <StockCard
          key={row.symbol}
          row={row}
          onSelect={onSelectSymbol}
          isWatched={isWatched(row.symbol)}
          onToggleWatch={() => onToggleWatch(row.symbol)}
          portfolio={
            portfolio
              ? {
                  position: portfolio.getPosition(row.symbol),
                  metrics: portfolio.getMetrics(row),
                  onEdit: () => portfolio.onEdit(row.symbol),
                }
              : undefined
          }
        />
      ))}
      {hasMore ? (
        <button ref={sentinelRef} type="button" className="load-more-btn" onClick={onLoadMore}>
          Daha fazla göster ({rows.length - visibleCount} kaldı)
        </button>
      ) : null}
    </div>
  );
}
