"use client";

/**
 * Mobil sıralama açılır menüsü — bkz. tasks/04-mobil-gorunum.md §C. Masaüstündeki
 * tıklanabilir kolon başlıklarının (ScanTable) yerini alır: kolon yok, yalnızca 4
 * sabit seçenek var, her biri kendi etiketinde yazan yönü (azalan/A-Z) UYGULAR.
 *
 * Yön her seçenek için SABİTTİR — ScanScreen'deki `handleSortMenuSelect` bu yüzden
 * masaüstünün "aynı kolona tekrar tıklayınca yönü çevir" davranışını (`handleSort`)
 * yeniden KULLANMAZ; menüden seçim her zaman deterministik aynı yönü uygular
 * (bkz. tasks/04 kabul kriteri 7 "dört seçenekte de doğru sıralıyor").
 */
import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { SortKey } from "../lib/types";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Skora göre (yüksek→düşük)" },
  { key: "chg", label: "Değişime göre" },
  { key: "price", label: "Fiyata göre" },
  { key: "symbol", label: "Sembole göre (A-Z)" },
];

interface SortMenuProps {
  sortKey: SortKey;
  onSelect: (key: SortKey) => void;
}

export default function SortMenu({ sortKey, onSelect }: SortMenuProps) {
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

  const current = OPTIONS.find((o) => o.key === sortKey);

  return (
    <div className="sort-menu" ref={rootRef}>
      <button
        type="button"
        className="sort-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 168 }}>
          {current ? current.label : "Sırala"}
        </span>
        <CaretDown
          size={13}
          style={{ flex: "none", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}
        />
      </button>
      {open ? (
        <div className="sort-dropdown" role="menu">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="menuitemradio"
              aria-checked={opt.key === sortKey}
              className={`sort-option${opt.key === sortKey ? " active" : ""}`}
              onClick={() => {
                onSelect(opt.key);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
