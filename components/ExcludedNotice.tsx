"use client";

/**
 * Elenen (taranamayan) bir sembol için açıklama kartı — bkz. tasks/09-eleme-gorunurlugu.md
 * §B (EN ÖNEMLİ PARÇA) ve §C. İKİ yerde birebir AYNI bileşen kullanılır:
 *  1. Arama sonucu boşken (bkz. components/ScanTable.tsx `EmptyState`) — kullanıcı var
 *     olan ama bu dilimde elenmiş bir sembol aradığında.
 *  2. Detay paneli açıkken kullanıcı o hissenin bulunmadığı bir dilime geçtiğinde (bkz.
 *     components/DetailDrawer.tsx) — görev §C "aynı açıklamayı göstersin" ifadesi BİREBİR
 *     aynı bileşenin tekrar kullanılmasıyla karşılanır, ayrı bir metin YAZILMAZ.
 *
 * Dokunma hedefi: "…'e geç" düğmesi `.btn-lg` (≥44×44px, hem masaüstü hem mobil) — bu
 * projede touch target üç kez atlanmış (görev "Sert kısıtlar"), burada bilerek her yerde
 * büyük varyant kullanılıyor.
 */
import type { ExcludedEntry, Timeframe } from "../lib/types";
import { excludedReasonText, firstTradeText, TF_DATIVE, TF_LABEL } from "../lib/excluded";

interface ExcludedNoticeProps {
  /** Genelde tek eleman (bir sembol tam eşleşti); arama alt dize eşleşmesiyle birden
   * çok elenen sembole uyabilir (ör. "AL" birden çok sembolle eşleşir) — o durumda
   * her biri kendi kartında, alt alta gösterilir. */
  entries: ExcludedEntry[];
  onJumpToTf: (tf: Timeframe) => void;
}

export default function ExcludedNotice({ entries, onJumpToTf }: ExcludedNoticeProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      {entries.map((e) => (
        <div
          key={e.symbol}
          style={{
            textAlign: "left",
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid color-mix(in oklab, var(--color-accent) 30%, transparent)",
            background: "color-mix(in oklab, var(--color-accent) 7%, transparent)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 14, color: "var(--color-text)" }}>
            {e.symbol} bu zaman diliminde taranamıyor.
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-neutral-200)", marginTop: 6 }}>
            {excludedReasonText(e)}
          </div>
          {firstTradeText(e) ? (
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--color-neutral-400)", marginTop: 4 }}>
              {firstTradeText(e)}
            </div>
          ) : null}
          {e.availableIn.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {e.availableIn.map((tf) => (
                <div key={tf} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: "var(--color-neutral-300)" }}>
                    {TF_LABEL[tf]} diliminde mevcut →
                  </span>
                  <button type="button" className="btn btn-secondary btn-lg" onClick={() => onJumpToTf(tf)}>
                    {TF_DATIVE[tf]} geç
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
