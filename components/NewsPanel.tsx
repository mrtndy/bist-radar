"use client";

/**
 * Masaüstü sağ haber paneli — bkz. tasks/05-kap-haberler.md §C, design_handoff
 * README § "Sağ haber paneli (292px, scroll, kapatılabilir)". Veri `ScanScreen`den
 * prop olarak gelir (tarama verisiyle AYNI mimari: konteyner fetch eder, sunum
 * bileşenleri yalnızca gösterir — bkz. ScanTable/MobileList'in `rows` prop'u).
 *
 * "Kapatılabilir" (§C) için üst barda ayrı bir düğme YOK (TopBar.tsx bu görevin
 * DÜZENLE listesinde değil) — panel kendi aç/kapa durumunu kendi içinde tutar: kapanınca
 * 44px'lik dar bir "rail"e döner, tekrar açmak için üzerindeki gazete ikonuna basılır.
 */
import { useState } from "react";
import { Newspaper, X } from "@phosphor-icons/react";
import NewsList from "./NewsList";
import type { NewsItem } from "../lib/types";

interface NewsPanelProps {
  items: NewsItem[] | null;
  onSelectSymbol: (symbol: string) => void;
}

export default function NewsPanel({ items, onSelectSymbol }: NewsPanelProps) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <div
        style={{
          width: 44,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 10,
          borderLeft: "1px solid transparent",
          borderImage:
            "linear-gradient(180deg, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) 1",
        }}
      >
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => setOpen(true)}
          title="Piyasa akışını göster"
          aria-label="Piyasa akışını göster"
        >
          <Newspaper size={18} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 292,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderLeft: "1px solid transparent",
        borderImage:
          "linear-gradient(180deg, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) 1",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 10px 8px 14px" }}>
        <Newspaper size={15} weight="bold" style={{ color: "var(--color-accent-300)", flex: "none" }} />
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 13.5, fontWeight: 500, flex: "none" }}>
          Piyasa akışı
        </span>
        <span style={{ flex: "1 1 auto" }} />
        <button
          type="button"
          className="btn btn-icon"
          style={{ width: 30, height: 30 }}
          onClick={() => setOpen(false)}
          title="Paneli kapat"
          aria-label="Paneli kapat"
        >
          <X size={15} weight="bold" />
        </button>
      </div>
      <NewsList
        items={items}
        onSelectSymbol={onSelectSymbol}
        emptyText="Son 7 günde KAP bildirimi yok."
        variant="panel"
      />
    </div>
  );
}
