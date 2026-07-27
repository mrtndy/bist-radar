"use client";

/**
 * "Kolonlar" düğmesi — açılır göster/gizle onay kutulu listesi + "Varsayılana dön" —
 * bkz. tasks/06-takip-listesi-ve-kolonlar.md §B. Yalnızca masaüstü: `ScanScreen`
 * bunu isMobile===false dalında, tablo başlık çubuğunda render eder; mobil düzende
 * hiç mount edilmez (kabul kriteri 13).
 *
 * Açılır menü yapısı `components/SortMenu.tsx` ile AYNI desen (dış tıklama/Escape
 * kapatır, `.sort-menu`/`.sort-dropdown`/`.sort-option` sınıfları yeniden kullanılır
 * — yeni CSS gerekmez).
 */
import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Columns } from "@phosphor-icons/react";
import type { ColumnId } from "../lib/columns";

interface ColumnMenuProps {
  /** Serbest 11 kolon, GÜNCEL sırayla — {id, label} (bkz. lib/columns.ts `COLUMN_LABELS`). */
  columns: { id: ColumnId; label: string }[];
  hidden: ColumnId[];
  onToggle: (id: ColumnId) => void;
  onReset: () => void;
}

export default function ColumnMenu({ columns, hidden, onToggle, onReset }: ColumnMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="sort-menu" ref={rootRef}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ fontSize: 12, minHeight: 30 }}
      >
        <Columns size={14} />
        Kolonlar
      </button>
      {open ? (
        <div className="sort-dropdown" role="menu" aria-label="Kolonlar" style={{ minWidth: 210 }}>
          {columns.map((col) => {
            const isHidden = hidden.includes(col.id);
            return (
              <label key={col.id} className="sort-option" style={{ gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={() => onToggle(col.id)}
                  style={{ accentColor: "var(--color-accent)", flex: "none" }}
                />
                <span>{col.label}</span>
              </label>
            );
          })}
          <button
            type="button"
            className="sort-option"
            style={{
              color: "var(--color-accent-200)",
              gap: 8,
              borderTop: "1px solid var(--color-neutral-800)",
              marginTop: 4,
              paddingTop: 10,
            }}
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            <ArrowCounterClockwise size={14} />
            Varsayılana dön
          </button>
        </div>
      ) : null}
    </div>
  );
}
