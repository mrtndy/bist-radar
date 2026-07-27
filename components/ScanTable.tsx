"use client";

import { useState } from "react";
import type { ReactNode } from "react";
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
import { COLUMN_LABELS, FIXED_COLUMN, type ColumnId } from "../lib/columns";
import StarButton from "./StarButton";

interface ColumnDef {
  key: ColumnId;
  label: string;
  align: "left" | "right" | "center";
  title?: string;
  sortable: boolean;
  className?: string;
  renderCell: (r: RowData) => ReactNode;
}

/**
 * Kolonların TAM tanımı (hizalama/tooltip/sıralanabilirlik + hücre render'ı) —
 * `lib/columns.ts`teki `COLUMN_LABELS` yalnızca ETİKETLERİ tutar (ColumnMenu'nün de
 * ihtiyaç duyduğu tek şey); burası JSX/görsel ayrıntıları barındıran render katmanı.
 * `Record<ColumnId, ...>` olması, sürükle-bırak sonrası HERHANGİ bir sırada bu
 * tanımlara `id` ile erişilebilmesini sağlar (bkz. aşağıdaki `visibleColumns`).
 */
const COLUMN_DEFS: Record<ColumnId, ColumnDef> = {
  symbol: {
    key: "symbol",
    label: COLUMN_LABELS.symbol,
    align: "left",
    sortable: true,
    className: "col-symbol",
    renderCell: (r) => (
      <>
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
      </>
    ),
  },
  price: {
    key: "price",
    label: COLUMN_LABELS.price,
    align: "right",
    sortable: true,
    renderCell: (r) => formatPrice(r.price),
  },
  chg: {
    key: "chg",
    label: COLUMN_LABELS.chg,
    align: "right",
    sortable: true,
    renderCell: (r) => (
      <span style={{ color: changeColor(r.chg), fontWeight: 600, fontSize: 12.5 }}>{formatChange(r.chg)}</span>
    ),
  },
  score: {
    key: "score",
    label: COLUMN_LABELS.score,
    align: "right",
    sortable: true,
    title: "Bileşik teknik skor (0-100)",
    renderCell: (r) => (
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
    ),
  },
  signal: {
    key: "signal",
    label: COLUMN_LABELS.signal,
    align: "center",
    sortable: false,
    className: "col-signal",
    renderCell: (r) => (
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
    ),
  },
  k: {
    key: "k",
    label: COLUMN_LABELS.k,
    align: "right",
    sortable: true,
    title: "Stokastik %K (14,3,3)",
    renderCell: (r) => <span style={{ color: stochKColor(r.k) }}>{formatInt(r.k)}</span>,
  },
  hist: {
    key: "hist",
    label: COLUMN_LABELS.hist,
    align: "right",
    sortable: true,
    title: "MACD histogram (fiyata oranla %)",
    renderCell: (r) => (
      <span style={{ color: macdColor(r.hist), fontSize: 11.5 }}>{formatMacdCell(r.hist, r.histPct)}</span>
    ),
  },
  rsi: {
    key: "rsi",
    label: COLUMN_LABELS.rsi,
    align: "right",
    sortable: true,
    renderCell: (r) => <span style={{ color: rsiColor(r.rsi) }}>{formatInt(r.rsi)}</span>,
  },
  atrPct: {
    key: "atrPct",
    label: COLUMN_LABELS.atrPct,
    align: "right",
    sortable: true,
    title: "ATR / fiyat",
    renderCell: (r) => <span style={{ color: "var(--color-neutral-300)" }}>{formatPercent1(r.atrPct)}</span>,
  },
  relVol: {
    key: "relVol",
    label: COLUMN_LABELS.relVol,
    align: "right",
    sortable: true,
    title: "Hacim / 20 bar ortalaması",
    renderCell: (r) => (
      <span style={{ color: relVolColor(r.relVol), fontWeight: r.relVol >= 1.5 ? 600 : 400 }}>
        {formatRatio1(r.relVol)}
      </span>
    ),
  },
  pctB: {
    key: "pctB",
    label: COLUMN_LABELS.pctB,
    align: "right",
    sortable: true,
    title: "Bollinger %B",
    className: "col-pctb",
    renderCell: (r) => <span style={{ color: "var(--color-neutral-300)" }}>{formatDecimal2(r.pctB)}</span>,
  },
  newsCount: {
    key: "newsCount",
    label: COLUMN_LABELS.newsCount,
    align: "right",
    sortable: true,
    title: "Son 7 gündeki KAP bildirim sayısı (rutin/ilgisiz bildirimler hariç)",
    renderCell: (r) => (
      <span style={{ color: r.newsCount > 0 ? "var(--color-accent-200)" : "var(--color-neutral-500)" }}>
        {formatInt(r.newsCount)}
      </span>
    ),
  },
};

/** Sürükle-bırak sırasında taşınan `DataTransfer` MIME tipi (özel/rastgele bir dize —
 * sayfadaki başka hiçbir sürüklenebilir öğeyle çakışmasın diye ad alanlı). */
const DND_MIME = "application/x-bist-radar-column";

/** `sourceId`yi `order` içinde `targetId`nin (kaldırıldıktan sonraki) konumuna taşır. */
function reorderColumns(order: ColumnId[], sourceId: ColumnId, targetId: ColumnId): ColumnId[] {
  if (sourceId === targetId) return order;
  const next = order.filter((id) => id !== sourceId);
  const targetIndex = next.indexOf(targetId);
  if (targetIndex === -1) return order;
  next.splice(targetIndex, 0, sourceId);
  return next;
}

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
  /** Takip listesi (tasks/06-takip-listesi-ve-kolonlar.md §A) — en soldaki dar yıldız kolonu. */
  isWatched: (symbol: string) => boolean;
  onToggleWatch: (symbol: string) => void;
  /** Kolon düzeni (tasks/06 §B) — serbest 11 kolonun GÜNCEL sırası (SEMBOL hariç). */
  columnOrder: ColumnId[];
  hiddenColumns: ColumnId[];
  onReorderColumns: (order: ColumnId[]) => void;
}

export default function ScanTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onResetFilters,
  onSelectSymbol,
  selectedSymbol,
  isWatched,
  onToggleWatch,
  columnOrder,
  hiddenColumns,
  onReorderColumns,
}: ScanTableProps) {
  // Sürüklenmekte olan kolonun id'si — yalnızca görsel geri bildirim (opacity) için;
  // taşıma MANTIĞI `dataTransfer`den okunur (bkz. handleDrop), bu state ona YEDEK.
  const [draggingId, setDraggingId] = useState<ColumnId | null>(null);

  const visibleColumns: ColumnDef[] = [
    COLUMN_DEFS[FIXED_COLUMN],
    ...columnOrder.filter((id) => !hiddenColumns.includes(id)).map((id) => COLUMN_DEFS[id]),
  ];

  function handleDragStart(e: React.DragEvent<HTMLTableCellElement>, id: ColumnId) {
    if (id === FIXED_COLUMN) return;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(DND_MIME, id);
    // Bazı tarayıcılar `getData` sonucunu yalnızca `drop`ta tanınan bir MIME tipi
    // için verir; `text/plain` yedek olarak da yazılır (test/otomasyon uyumluluğu).
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: React.DragEvent<HTMLTableCellElement>, id: ColumnId) {
    if (id === FIXED_COLUMN) return;
    e.preventDefault(); // ZORUNLU: preventDefault olmadan `drop` hiç ateşlenmez.
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent<HTMLTableCellElement>, targetId: ColumnId) {
    e.preventDefault();
    if (targetId === FIXED_COLUMN) {
      setDraggingId(null);
      return;
    }
    const fromTransfer = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData("text/plain");
    const sourceId = (fromTransfer || draggingId) as ColumnId | "" | null;
    setDraggingId(null);
    if (!sourceId || sourceId === FIXED_COLUMN || sourceId === targetId) return;
    if (!columnOrder.includes(sourceId)) return; // savunma: bilinmeyen/eski bir id sızmasın.
    onReorderColumns(reorderColumns(columnOrder, sourceId, targetId));
  }

  return (
    <table className="scan-table">
      <thead>
        <tr>
          {/* Yıldız kolonu: veri kolonu DEĞİL, bir eylem kolonu — sıralanamaz, taşınamaz,
              gizlenemez, 12 kolonluk sıra/görünürlük sisteminin (tasks/06 §B) tamamen
              DIŞINDA, her zaman en solda. Başlık görsel olarak boş (dar kolon) ama ekran
              okuyucular için `sr-only` etiket taşır. */}
          <th className="col-star">
            <span className="sr-only">Takip</span>
          </th>
          {visibleColumns.map((col) => {
            const draggable = col.key !== FIXED_COLUMN;
            return (
              <th
                key={col.key}
                className={[
                  col.sortable ? "sortable" : "",
                  col.className ?? "",
                  draggingId === col.key ? "col-dragging" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ textAlign: col.align, cursor: draggable ? "grab" : undefined }}
                title={
                  draggable
                    ? [col.title, "Sürükleyerek yeniden sırala"].filter(Boolean).join(" — ")
                    : col.title
                }
                onClick={col.sortable ? () => onSort(col.key as SortKey) : undefined}
                draggable={draggable}
                onDragStart={draggable ? (e) => handleDragStart(e, col.key) : undefined}
                onDragOver={draggable ? (e) => handleDragOver(e, col.key) : undefined}
                onDrop={draggable ? (e) => handleDrop(e, col.key) : undefined}
                onDragEnd={() => setDraggingId(null)}
              >
                {col.label}
                {col.sortable && col.key === sortKey ? (sortDir < 0 ? " ▾" : " ▴") : ""}
              </th>
            );
          })}
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
            <td className="col-star">
              <StarButton active={isWatched(r.symbol)} onToggle={() => onToggleWatch(r.symbol)} />
            </td>
            {visibleColumns.map((col) => (
              <td key={col.key} className={col.className} style={{ textAlign: col.align }}>
                {col.renderCell(r)}
              </td>
            ))}
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
