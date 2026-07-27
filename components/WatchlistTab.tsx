"use client";

/**
 * Mobil "Takibim" sekmesi — bkz. tasks/06-takip-listesi-ve-kolonlar.md §A. Mevcut
 * `[Hisseler | Haberler]` sekmelerine üçüncü olarak eklenir (bkz. ScanScreen.tsx).
 * AYNI `MobileList`/`StockCard` bileşenlerini kullanır (görev metni: "aynı kart
 * bileşeniyle") — ayrı bir liste implementasyonu YOK.
 *
 * Bu dosya ayrıca iki paylaşılan parça dışa aktarır:
 *  - `WatchlistEmptyState`: hem burada (liste boşken) hem masaüstünde ("Takip
 *    listem" çipi açıkken liste boşsa, bkz. ScanScreen.tsx) AYNI metin kullanılsın
 *    diye tek yerde tutulur.
 *  - `ShareWatchlistButton`: hem mobil (burada) hem masaüstü (FilterPanel, "Takip
 *    listem" çipinin yanında — brief §A "Paylaş düğmesi" bir breakpoint'e
 *    bağlanmamış) tarafından kullanılır.
 */
import { useState } from "react";
import { Check, Copy, Star } from "@phosphor-icons/react";
import MobileList from "./MobileList";
import type { RowData } from "../lib/types";
import { buildShareUrl } from "../lib/watchlist";

export function WatchlistEmptyState() {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--color-neutral-400)",
        fontSize: 13.5,
        lineHeight: 1.6,
      }}
    >
      <Star size={26} weight="regular" style={{ color: "var(--color-accent-300)", marginBottom: 10 }} />
      <div>Bir hissenin yanındaki ★ işaretine dokunarak takip listenize ekleyin.</div>
    </div>
  );
}

interface ShareWatchlistButtonProps {
  symbols: string[];
  className?: string;
}

/**
 * "Listeyi paylaş" — panoya bağlantı kopyalar ("Bağlantı kopyalandı" geri bildirimi).
 * `navigator.clipboard` yoksa (veya izin reddedilirse) bağlantıyı seçilebilir bir
 * metin kutusunda gösterir (görev metni §A "Paylaş düğmesi"). Liste boşken hiç
 * render edilmez (görev metni: "takip listesi doluyken").
 */
export function ShareWatchlistButton({ symbols, className }: ShareWatchlistButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "fallback">("idle");
  const [link, setLink] = useState("");

  if (symbols.length === 0) return null;

  async function handleClick() {
    let url: string;
    try {
      url = buildShareUrl(symbols);
    } catch {
      return;
    }
    try {
      if (!navigator.clipboard) throw new Error("clipboard API yok");
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState((s) => (s === "copied" ? "idle" : s)), 3000);
    } catch {
      setLink(url);
      setState("fallback");
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => void handleClick()}
        style={{ gap: 6, width: "100%" }}
      >
        {state === "copied" ? <Check size={14} /> : <Copy size={14} />}
        {state === "copied" ? "Bağlantı kopyalandı" : "Listeyi paylaş"}
      </button>
      {state === "fallback" ? (
        <input
          className="input"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          style={{ width: "100%", marginTop: 8, fontSize: 11.5, boxSizing: "border-box" }}
          aria-label="Paylaşım bağlantısı"
        />
      ) : null}
    </div>
  );
}

interface WatchlistTabProps {
  /** Takip edilen semboller için ZATEN filtrelenmiş+sıralanmış satırlar (bkz. ScanScreen.tsx `watchedRows`). */
  rows: RowData[];
  visibleCount: number;
  onLoadMore: () => void;
  onSelectSymbol: (symbol: string) => void;
  isWatched: (symbol: string) => boolean;
  onToggleWatch: (symbol: string) => void;
  /** Ham takip listesi (paylaşım düğmesi + boş durum kararı için — `rows.length` ile
   * karıştırılmamalı: `rows` her zaman zaten yalnızca takip edilenlerdir). */
  symbols: string[];
}

export default function WatchlistTab({
  rows,
  visibleCount,
  onLoadMore,
  onSelectSymbol,
  isWatched,
  onToggleWatch,
  symbols,
}: WatchlistTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      {symbols.length > 0 ? (
        <div style={{ padding: "10px 14px 0", flex: "none" }}>
          <ShareWatchlistButton symbols={symbols} />
        </div>
      ) : null}
      {rows.length === 0 ? (
        <WatchlistEmptyState />
      ) : (
        <MobileList
          rows={rows}
          visibleCount={visibleCount}
          onLoadMore={onLoadMore}
          onSelectSymbol={onSelectSymbol}
          isWatched={isWatched}
          onToggleWatch={onToggleWatch}
        />
      )}
    </div>
  );
}
