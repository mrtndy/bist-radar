"use client";

import {
  changeColor,
  macdColor,
  relVolColor,
  rsiColor,
  scoreColor,
  signalTagColor,
  stochKColor,
} from "../lib/colors";
import {
  formatDecimal2,
  formatInt,
  formatMacdCell,
  formatPercent1,
  formatPrice,
  formatRatio1,
  formatChange,
} from "../lib/format";
import type { RowData, SortDir, SortKey } from "../lib/types";

interface Column {
  key: SortKey | "signal";
  label: string;
  align: "left" | "right" | "center";
  title?: string;
  sortable: boolean;
  className?: string;
}

const COLUMNS: Column[] = [
  { key: "symbol", label: "SEMBOL", align: "left", sortable: true, className: "col-symbol" },
  { key: "price", label: "FİYAT", align: "right", sortable: true },
  { key: "chg", label: "DEĞİŞİM", align: "right", sortable: true },
  { key: "score", label: "SKOR", align: "right", sortable: true, title: "Bileşik teknik skor (0-100)" },
  { key: "signal", label: "SİNYAL", align: "center", sortable: false, className: "col-signal" },
  { key: "k", label: "STOK %K", align: "right", sortable: true, title: "Stokastik %K (14,3,3)" },
  { key: "hist", label: "MACD", align: "right", sortable: true, title: "MACD histogram (fiyata oranla %)" },
  { key: "rsi", label: "RSI", align: "right", sortable: true },
  { key: "atrPct", label: "ATR %", align: "right", sortable: true, title: "ATR / fiyat" },
  { key: "relVol", label: "R.HACİM", align: "right", sortable: true, title: "Hacim / 20 bar ortalaması" },
  { key: "pctB", label: "%B", align: "right", sortable: true, title: "Bollinger %B", className: "col-pctb" },
];

interface ScanTableProps {
  rows: RowData[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onResetFilters: () => void;
  /** Bir satıra tıklanınca hisse detay panelini açar (bkz. components/DetailDrawer.tsx). */
  onSelectSymbol: (symbol: string) => void;
  /** Panelde açık olan sembol — satır vurgusu için (prototipteki `rowStyle` ile aynı). */
  selectedSymbol?: string | null;
}

export default function ScanTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onResetFilters,
  onSelectSymbol,
  selectedSymbol,
}: ScanTableProps) {
  return (
    <table className="scan-table">
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th
              key={col.key}
              className={[col.sortable ? "sortable" : "", col.className ?? ""].filter(Boolean).join(" ")}
              style={{ textAlign: col.align }}
              title={col.title}
              onClick={col.sortable ? () => onSort(col.key as SortKey) : undefined}
            >
              {col.label}
              {col.sortable && col.key === sortKey ? (sortDir < 0 ? " ▾" : " ▴") : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.symbol}
            onClick={() => onSelectSymbol(r.symbol)}
            style={{
              cursor: "pointer",
              background:
                selectedSymbol === r.symbol ? "color-mix(in oklab, var(--color-accent) 10%, transparent)" : undefined,
            }}
          >
            <td className="col-symbol">
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 12.5, letterSpacing: "0.02em" }}>
                {r.symbol}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--color-neutral-400)",
                  maxWidth: 150,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
              </div>
            </td>
            <td style={{ textAlign: "right" }}>{formatPrice(r.price)}</td>
            <td style={{ textAlign: "right" }}>
              <span style={{ color: changeColor(r.chg), fontWeight: 600, fontSize: 12.5 }}>
                {formatChange(r.chg)}
              </span>
            </td>
            <td style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                <div
                  style={{
                    width: 44,
                    height: 4,
                    borderRadius: 99,
                    background: "var(--color-neutral-800)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${r.score}%`,
                      height: "100%",
                      background: scoreColor(r.signal),
                      borderRadius: 99,
                    }}
                  />
                </div>
                <span
                  style={{
                    color: scoreColor(r.signal),
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: 12.5,
                    minWidth: 20,
                    textAlign: "right",
                  }}
                >
                  {formatInt(r.score)}
                </span>
              </div>
            </td>
            <td className="col-signal">
              <span
                className="tag"
                style={{
                  background: `color-mix(in oklab, ${signalTagColor(r.signal)} 13%, transparent)`,
                  color: signalTagColor(r.signal),
                  border: `1px solid color-mix(in oklab, ${signalTagColor(r.signal)} 35%, transparent)`,
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                {r.signal}
              </span>
            </td>
            <td style={{ textAlign: "right" }}>
              <span style={{ color: stochKColor(r.k) }}>{formatInt(r.k)}</span>
            </td>
            <td style={{ textAlign: "right" }}>
              <span style={{ color: macdColor(r.hist), fontSize: 11.5 }}>{formatMacdCell(r.hist, r.histPct)}</span>
            </td>
            <td style={{ textAlign: "right" }}>
              <span style={{ color: rsiColor(r.rsi) }}>{formatInt(r.rsi)}</span>
            </td>
            <td style={{ textAlign: "right", color: "var(--color-neutral-300)" }}>{formatPercent1(r.atrPct)}</td>
            <td style={{ textAlign: "right" }}>
              <span style={{ color: relVolColor(r.relVol), fontWeight: r.relVol >= 1.5 ? 600 : 400 }}>
                {formatRatio1(r.relVol)}
              </span>
            </td>
            <td className="col-pctb" style={{ textAlign: "right", color: "var(--color-neutral-300)" }}>
              {formatDecimal2(r.pctB)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ padding: 48, textAlign: "center", color: "var(--color-neutral-400)", fontSize: 13 }}>
      <div style={{ marginBottom: 12 }}>Filtrelerle eşleşen hisse yok.</div>
      <button type="button" className="btn btn-secondary" onClick={onReset}>
        Filtreleri sıfırla
      </button>
    </div>
  );
}
