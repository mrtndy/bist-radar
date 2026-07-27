"use client";

/**
 * Mobil sıralama açılır menüsü — bkz. tasks/08-panel-gizleme-yatay-siralama.md §C
 * (önceki hâli: tasks/04-mobil-gorunum.md §C, 4 sabit seçenek + sabit yön).
 * Masaüstündeki tıklanabilir kolon başlıklarının (ScanTable) yerini alır: kolon yok,
 * bunun yerine masaüstünde sıralanabilir 11 alanın TAMAMI + her biri için bağımsız
 * yön (artan/azalan).
 *
 * Alan ve yön İKİ BAĞIMSIZ kontrol (görev metninin sunduğu iki seçenekten "ayrı bir
 * Artan/Azalan geçişi" tarafı): alan seçimi mevcut yönü DEĞİŞTİRMEZ — böylece "fiyata
 * göre artan" gibi bir kombinasyon iki dokunuşla kurulabilir ve aradan menü kapanmaz
 * (ColumnMenu ile AYNI "seçimler arasında açık kalan" desen, bkz.
 * components/ColumnMenu.tsx) — kullanıcı alanı seçip yönü de ayarlayabilsin diye.
 * Seçili alan+yön HER ZAMAN tetikleyici düğmede görünür (görev kabul kriteri 12,
 * örnek: "Skor ↓").
 *
 * Seçim SESSION-ONLY: localStorage'a YAZILMAZ (görev metni — masaüstünde de sıralama
 * kalıcı değil, `sortKey`/`sortDir` state'i ScanScreen.tsx'te sayfa ömrü boyunca
 * yaşar, kalıcılık katmanı yok; mobil bununla tutarlı kalsın).
 */
import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { SORT_NAMES } from "../lib/types";
import type { SortDir, SortKey } from "../lib/types";

/** Masaüstü tablodaki sıralanabilir 11 alanın TAMAMI, görev metnindeki sırayla
 * (bkz. tasks/08 §C "Alanlar": Skor, Değişim, Fiyat, Sembol, RSI, Relatif hacim,
 * ATR %, Stokastik %K, MACD, %B, Haber). */
const FIELDS: SortKey[] = [
  "score",
  "chg",
  "price",
  "symbol",
  "rsi",
  "relVol",
  "atrPct",
  "k",
  "hist",
  "pctB",
  "newsCount",
];

interface SortMenuProps {
  sortKey: SortKey;
  sortDir: SortDir;
  onChangeKey: (key: SortKey) => void;
  onChangeDir: (dir: SortDir) => void;
}

export default function SortMenu({ sortKey, sortDir, onChangeKey, onChangeDir }: SortMenuProps) {
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

  // Görev kabul kriteri 12: seçili alan + yön ekranda açıkça görünsün (ör. "Skor ↓").
  const arrow = sortDir < 0 ? "↓" : "↑";

  return (
    <div className="sort-menu" ref={rootRef}>
      <button
        type="button"
        className="sort-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>
          {SORT_NAMES[sortKey]} {arrow}
        </span>
        <CaretDown
          size={13}
          style={{ flex: "none", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}
        />
      </button>
      {open ? (
        // 11 alan + yön geçişi 375px yükseklikte (yatay telefon) taşabilir — kendi
        // içinde kaydırılabilir, dropdown ekran dışına akmaz.
        <div className="sort-dropdown" role="menu" aria-label="Sırala" style={{ maxHeight: "min(60vh, 420px)", overflowY: "auto" }}>
          <div className="seg seg-lg" style={{ marginBottom: 6 }} role="group" aria-label="Yön">
            <button
              type="button"
              className={`seg-btn${sortDir === -1 ? " active" : ""}`}
              style={{ flex: 1 }}
              aria-pressed={sortDir === -1}
              onClick={() => onChangeDir(-1)}
            >
              ↓ Azalan
            </button>
            <button
              type="button"
              className={`seg-btn${sortDir === 1 ? " active" : ""}`}
              style={{ flex: 1 }}
              aria-pressed={sortDir === 1}
              onClick={() => onChangeDir(1)}
            >
              ↑ Artan
            </button>
          </div>
          {FIELDS.map((key) => (
            <button
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={key === sortKey}
              className={`sort-option${key === sortKey ? " active" : ""}`}
              onClick={() => onChangeKey(key)}
            >
              {SORT_NAMES[key]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
