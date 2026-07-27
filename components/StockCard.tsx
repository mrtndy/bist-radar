"use client";

/**
 * Mobil tarama listesindeki tek hisse kartı — bkz. tasks/04-mobil-gorunum.md §B.
 * Masaüstü `ScanTable` satırının 11 teknik kolonluk görünümünün yerini alır: burada
 * yalnızca sembol/fiyat/değişim/sinyal/skor + motorun ürettiği en güçlü gerekçe
 * metni var. %B, ATR%, STOK %K, MACD gibi ham gösterge değerleri KASITLI OLARAK
 * YOK — hedef kullanıcı (tasks/04 "Kimin kullanacağı") bunları yorumlayamaz; aynı
 * veriler `DetailDrawer`'da (karta dokununca açılır) kalmaya devam ediyor.
 */
import { changeColor, scoreColor, signalTagColor } from "../lib/colors";
import { formatChange, formatInt, formatPrice } from "../lib/format";
import type { RowData } from "../lib/types";
import StarButton from "./StarButton";

interface StockCardProps {
  row: RowData;
  onSelect: (symbol: string) => void;
  /** Takip listesi (tasks/06-takip-listesi-ve-kolonlar.md §A). */
  isWatched: boolean;
  onToggleWatch: () => void;
}

export default function StockCard({ row, onSelect, isWatched, onToggleWatch }: StockCardProps) {
  return (
    // `<button>` DEĞİL: içinde StarButton (kendi `<button>`'ı) var, buton içinde buton
    // geçersiz HTML olurdu. `role="button"` + `tabIndex`/`onKeyDown` ile klavye
    // erişilebilirliği (Enter/Boşluk) native butonla AYNI kalır.
    <div
      className="mobile-card"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(row.symbol)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(row.symbol);
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, letterSpacing: "0.01em" }}>
            {row.symbol}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--color-neutral-400)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.name}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flex: "none" }}>
          <StarButton active={isWatched} onToggle={onToggleWatch} large />
          <div style={{ textAlign: "right", flex: "none" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 15,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatPrice(row.price)}
            </div>
            <div style={{ color: changeColor(row.chg), fontWeight: 600, fontSize: 13.5, marginTop: 2 }}>
              {formatChange(row.chg)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span
            className="tag"
            style={{
              background: `color-mix(in oklab, ${signalTagColor(row.signal)} 13%, transparent)`,
              color: signalTagColor(row.signal),
              border: `1px solid color-mix(in oklab, ${signalTagColor(row.signal)} 35%, transparent)`,
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {row.signal}
          </span>
          {/* Son 7 gündeki KAP bildirim sayısı (bkz. tasks/05-kap-haberler.md §D) —
              kullanıcı hangi hissede haber olduğunu listeden görebilsin. Yeşil/kırmızı
              KULLANILMAZ (nötr + accent tonu, bkz. görev "Sert kısıtlar"). */}
          {row.newsCount > 0 ? (
            <span
              className="tag tag-neutral"
              style={{ fontSize: 11, color: "var(--color-accent-200)", whiteSpace: "nowrap" }}
            >
              {row.newsCount} bildirim
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 56,
              height: 5,
              borderRadius: 99,
              background: "var(--color-neutral-800)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${row.score}%`,
                height: "100%",
                background: scoreColor(row.signal),
                borderRadius: 99,
              }}
            />
          </div>
          <span
            style={{
              color: scoreColor(row.signal),
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: 13.5,
              minWidth: 22,
              textAlign: "right",
            }}
          >
            {formatInt(row.score)}
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--color-neutral-800)", flex: "none" }} />

      {/* Motorun ürettiği Türkçe gerekçe — bkz. RowData.topReason (lib/scan-data.ts).
          Dipnot değil, listenin en değerli bilgisi: brief "gövde ≥ 14px" kısıtı
          burada tam olarak uygulanır (14px, tesadüf değil). */}
      <div style={{ fontSize: 14, lineHeight: 1.45, color: "var(--color-neutral-200)" }}>{row.topReason}</div>
    </div>
  );
}
