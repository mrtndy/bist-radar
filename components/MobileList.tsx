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
  /**
   * Kart sütun sayısı (bkz. tasks/08-panel-gizleme-yatay-siralama.md §B "Ek
   * iyileştirme") — yan çevrilmiş telefon gibi geniş-ama-kısa mobil viewport'larda
   * (genişlik ≥600px) 2, dar dikey telefonda 1. Opsiyonel + varsayılan 1: bu prop'u
   * geçirmeyen çağıranlar (ör. WatchlistTab.tsx — bu görevin izin verilen dosya
   * listesinde değil) ESKİ tek sütun davranışını değişmeden korur.
   */
  columns?: 1 | 2;
  /**
   * Kısa viewport (yan çevrilmiş telefon, bkz. ScanScreen.tsx `isShortMobile`) —
   * kapsayıcının kendi dolgusu/aralığı daralır ki ikinci sıra kartlar kaydırmadan
   * önce en azından kısmen görünsün (ölçüldü: 812×375'te tek sıra bile tam
   * sığmıyordu). Kartın KENDİ iç boşluğu `.mobile-card` CSS medya sorgusuyla ayrı
   * daralır (bkz. app/globals.css — StockCard.tsx düzenlenemez). Opsiyonel +
   * varsayılan `false`: WatchlistTab.tsx bu prop'u hiç geçirmez, ESKİ davranış korunur.
   */
  compact?: boolean;
}

export default function MobileList({
  rows,
  visibleCount,
  onLoadMore,
  onSelectSymbol,
  isWatched,
  onToggleWatch,
  portfolio,
  columns = 1,
  compact = false,
}: MobileListProps) {
  const visible = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLButtonElement | null>(null);
  const isGrid = columns === 2;

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
        padding: compact ? "4px 14px 8px" : "10px 14px 18px",
        display: isGrid ? "grid" : "flex",
        flexDirection: isGrid ? undefined : "column",
        // minmax(0,1fr): düz "1fr" içerik genişliğine göre şişip sütunları eşitsiz
        // bırakıyordu (ölçüldü: 504px / 538px). minmax(0,…) taşmayı engelleyip
        // iki sütunu eşitler.
        gridTemplateColumns: isGrid ? "minmax(0, 1fr) minmax(0, 1fr)" : undefined,
        // Grid'de varsayılan `align-content` satırları kapsayıcının tüm yüksekliğine
        // GERDİRİR (içerik kısaysa dahi) — kartlar üstte toplu kalsın diye "start".
        alignContent: isGrid ? "start" : undefined,
        gap: compact ? 4 : 10,
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
        <button
          ref={sentinelRef}
          type="button"
          className="load-more-btn"
          style={isGrid ? { gridColumn: "1 / -1" } : undefined}
          onClick={onLoadMore}
        >
          Daha fazla göster ({rows.length - visibleCount} kaldı)
        </button>
      ) : null}
    </div>
  );
}
