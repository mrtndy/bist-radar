"use client";

/**
 * Takibim sekmesinin üstündeki portföy özeti — bkz.
 * tasks/07-portfoy-kar-zarar.md "Gösterim".
 *
 * "Kimin kullanacağı" kısıtları (dış görev metni): kesinlik iddia eden dil
 * KULLANILMAZ (ör. "Portföy değeriniz") — başlıklarda "yaklaşık" geçer, gecikme
 * uyarısı özetin hemen altında birebir görev metnindeki cümleyle durur ve
 * `DetailDrawer`teki `DelayNotice`/ScanScreen'deki `DelayStrip` ile AYNI görsel
 * dil (accent tonlu kutu + saat ikonu) kullanılır ki "göz ardı edilemeyecek"
 * kısıtı karşılansın.
 *
 * Hiç geçerli pozisyon yoksa (görev "Boş/kısmi durumlar" — "Hiç portföy kaydı
 * yoksa özet gösterilmesin, bunun yerine tek satır açıklama") toplam kutusu
 * DEĞİL, tek satırlık açıklama gösterilir; bu durumda hiçbir para rakamı
 * ekranda olmadığı için gecikme kutusu da gösterilmez (görev "her yerde" kuralı
 * yalnızca kâr/zarar GÖSTERİLEN yerler için geçerli).
 */
import { Clock } from "@phosphor-icons/react";
import { changeColor } from "../lib/colors";
import { formatChange, formatPrice, formatSignedPrice } from "../lib/format";
import type { PortfolioSummary as Summary } from "../lib/portfolio";

interface PortfolioSummaryProps {
  summary: Summary;
}

export default function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const { totalCost, totalValue, totalPnl, totalPnlPct, includedCount, excludedCount } = summary;

  if (includedCount === 0) {
    return (
      <div
        style={{
          margin: "10px 14px 0",
          padding: "12px 14px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-neutral-800)",
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "var(--color-neutral-400)",
        }}
      >
        Kâr/zarar görmek için bir hissede &quot;Adet/maliyet ekle&quot;ye dokunup lot ve ortalama alış
        fiyatınızı girin.
      </div>
    );
  }

  const pnlColor = changeColor(totalPnl);

  return (
    <div
      style={{
        margin: "10px 14px 0",
        padding: 14,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-neutral-800)",
        background: "var(--color-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-neutral-400)",
        }}
      >
        Yaklaşık özet ({includedCount} hisse)
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <SummaryStat label="Toplam maliyet" value={formatPrice(totalCost)} />
        <SummaryStat label="Yaklaşık güncel değer" value={formatPrice(totalValue)} />
        <SummaryStat
          label="Yaklaşık kâr/zarar"
          value={`${formatSignedPrice(totalPnl)} · ${formatChange(totalPnlPct)}`}
          color={pnlColor}
        />
      </div>

      {excludedCount > 0 ? (
        <div style={{ fontSize: 11.5, color: "var(--color-neutral-500)" }}>
          {excludedCount} hisse hesaba katılmadı (adet/maliyet girilmemiş)
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          padding: "9px 11px",
          borderRadius: "var(--radius-md)",
          border: "1px solid color-mix(in oklab, var(--color-accent) 30%, transparent)",
          background: "color-mix(in oklab, var(--color-accent) 8%, transparent)",
        }}
      >
        <Clock size={14} weight="bold" style={{ flex: "none", marginTop: 1, color: "var(--color-accent-200)" }} />
        <span style={{ fontSize: 11.5, lineHeight: 1.45, color: "var(--color-neutral-200)" }}>
          Fiyatlar ~15 dakika gecikmelidir; tutarlar yaklaşıktır.
        </span>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 108 }}>
      <span style={{ fontSize: 11, color: "var(--color-neutral-400)" }}>{label}</span>
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: 14.5,
          fontVariantNumeric: "tabular-nums",
          color: color ?? "var(--color-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
