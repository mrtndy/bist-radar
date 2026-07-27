"use client";

/**
 * Keşfedilebilir eleme sayacı + tam liste (bkz. tasks/09-eleme-gorunurlugu.md §D).
 * `ExcludedCounterButton` masaüstünde "Tarama sonuçları" satırında, mobilde liste
 * üstündeki sayaç satırında render edilir (bkz. components/ScanScreen.tsx) — tıklanınca
 * `ExcludedListModal`i açar. Liste İSTEK ÜZERİNE `lib/excluded.ts`teki `useExcludedList`
 * ile çekilir (görev "Sert kısıtlar": sayfaya gömülmez).
 *
 * `WatchlistImportPrompt` (bkz. components/ScanScreen.tsx) ile AYNI modal deseni
 * (`.drawer-overlay` + ortalanmış panel) — masaüstü/mobil ayrımı olmadan her ikisinde de
 * çalışır. Kapatma düğmesi `.btn-icon` (mevcut ≥44×44px sınıf, DetailDrawer/FilterSheet
 * ile AYNI) — yeni bir dokunma hedefi kuralı İCAT edilmedi.
 */
import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { REASON_LABEL, TF_LABEL, useExcludedList } from "../lib/excluded";
import type { Timeframe } from "../lib/types";

const nfInt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

interface ExcludedCounterButtonProps {
  tf: Timeframe;
  /** Bu dilimde BAŞARIYLA taranan sembol sayısı (bkz. `ScanResult.total`) — görev §D
   * örneği: "598 hisse tarandı · 16 hisse taranamadı ›". */
  scannedCount: number;
  onOpen: () => void;
  /** Mobil dar satırlar için kısaltılmış metin ("16 hisse taranamadı ›", "tarandı"
   * kısmı YOK) — bkz. ScanScreen.tsx mobil sayaç satırları (görev §D "mobilde liste
   * üstü"), orada `scannedCount` zaten ayrı bir "X/Y hisse eşleşti" metninde görünüyor,
   * tekrar YAZILMAZ. */
  compact?: boolean;
}

/** Elenen sayısı 0 iken veya liste henüz gelmeden HİÇBİR ŞEY render etmez (görev metninde
 * bu durum tarif edilmiyor; sıfır elenen varken boş bir "0 hisse taranamadı" göstermek
 * yanıltıcı/gereksiz olurdu — en küçük makul karar). */
export function ExcludedCounterButton({ tf, scannedCount, onOpen, compact = false }: ExcludedCounterButtonProps) {
  const entries = useExcludedList(tf);
  if (entries === null || entries.length === 0) return null;

  return (
    <button
      type="button"
      className={`btn btn-ghost${compact ? " btn-lg" : ""}`}
      onClick={onOpen}
      style={compact ? { fontSize: 12.5, padding: "6px 10px", whiteSpace: "nowrap" } : { fontSize: 11.5, padding: "2px 4px" }}
    >
      {compact
        ? `${nfInt.format(entries.length)} hisse taranamadı ›`
        : `${nfInt.format(scannedCount)} hisse tarandı · ${nfInt.format(entries.length)} hisse taranamadı ›`}
    </button>
  );
}

interface ExcludedListModalProps {
  tf: Timeframe;
  onClose: () => void;
}

export default function ExcludedListModal({ tf, onClose }: ExcludedListModalProps) {
  const entries = useExcludedList(tf);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div
        className="drawer-overlay"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(9, 10, 18, 0.6)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Taranamayan hisseler"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 51,
          width: "min(440px, 92vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: "linear-gradient(180deg, var(--color-neutral-900), var(--color-bg) 200px)",
          border: "1px solid var(--color-neutral-700)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "16px 18px 12px",
            borderBottom: "1px solid transparent",
            borderImage: "linear-gradient(90deg, var(--color-neutral-700), transparent) 1",
          }}
        >
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 15.5, fontWeight: 500 }}>
            Taranamayan hisseler — {TF_LABEL[tf]}
          </span>
          <button type="button" className="btn btn-icon" onClick={onClose} title="Kapat" aria-label="Kapat">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 10px 14px" }}>
          {entries === null ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-neutral-400)", fontSize: 13 }}>
              Yükleniyor…
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-neutral-400)", fontSize: 13 }}>
              Bu dilimde elenen hisse yok.
            </div>
          ) : (
            entries.map((e) => (
              <div
                key={e.symbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 8px",
                  borderBottom: "1px solid color-mix(in oklab, var(--color-neutral-800) 55%, transparent)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 12.5 }}>{e.symbol}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-neutral-400)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 220,
                    }}
                  >
                    {e.name}
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "none", fontSize: 11.5 }}>
                  <div style={{ color: "var(--color-neutral-300)" }}>{REASON_LABEL[e.reason]}</div>
                  <div style={{ color: "var(--color-neutral-500)", fontVariantNumeric: "tabular-nums" }}>
                    {nfInt.format(e.bars)}/{nfInt.format(e.minBars)} bar
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
