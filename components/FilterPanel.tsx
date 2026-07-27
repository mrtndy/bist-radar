"use client";

/**
 * Masaüstü sol filtre paneli. Katlanabilirlik (bkz.
 * tasks/08-panel-gizleme-yatay-siralama.md §A "Masaüstü") `components/NewsPanel.tsx`
 * ile AYNI görsel kalıbı izler: kapanınca 44px'lik dar bir "rail"e döner, tekrar
 * açmak için üzerindeki huni ikonuna basılır. Aç/kapa durumu (`open`/`onToggleOpen`)
 * ScanScreen'de tutulur (bkz. lib/view-prefs.ts `usePanelPrefs`) — hem bu panelin
 * kendi rail düğmesinden hem TopBar'daki "Görünüm" menüsünden AYNI localStorage'a
 * (`bist-radar:paneller`) yazılıp okunsun diye.
 */
import { FunnelSimple, Star, X } from "@phosphor-icons/react";
import type { FilterState, SignalFilter } from "../lib/types";
import { ShareWatchlistButton } from "./WatchlistTab";

const SIGNAL_CHIPS: { value: SignalFilter; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "AL", label: "AL" },
  { value: "SAT", label: "SAT" },
  { value: "NOTR", label: "Nötr" },
];

const groupLabelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-neutral-400)",
  marginBottom: 8,
};

const sliderLabelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 6,
  fontSize: 10.5,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--color-neutral-400)",
  marginBottom: 8,
  whiteSpace: "nowrap",
};

const nf1 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface FilterPanelProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  sectorOptions: string[];
  matchCount: number;
  totalCount: number;
  /** Takip listesi (tasks/06-takip-listesi-ve-kolonlar.md §A) — "Takip listem" çipi + paylaş düğmesi. */
  watchlistSymbols: string[];
  watchlistOnly: boolean;
  onToggleWatchlistOnly: () => void;
  /** Katlanabilirlik (tasks/08 §A "Masaüstü") — bkz. dosya başı yorumu. */
  open: boolean;
  onToggleOpen: () => void;
}

export default function FilterPanel({
  filters,
  onChange,
  onReset,
  sectorOptions,
  matchCount,
  totalCount,
  watchlistSymbols,
  watchlistOnly,
  onToggleWatchlistOnly,
  open,
  onToggleOpen,
}: FilterPanelProps) {
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
          borderRight: "1px solid transparent",
          borderImage:
            "linear-gradient(180deg, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) 1",
        }}
      >
        <button
          type="button"
          className="btn btn-icon"
          onClick={onToggleOpen}
          title="Filtre panelini göster"
          aria-label="Filtre panelini göster"
        >
          <FunnelSimple size={18} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 236,
        flex: "none",
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        borderRight: "1px solid transparent",
        borderImage:
          "linear-gradient(180deg, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) 1",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 13.5, fontWeight: 500, flex: "1 1 auto" }}>
          Filtreler
        </span>
        <button
          type="button"
          className="btn btn-icon"
          style={{ width: 30, height: 30 }}
          onClick={onToggleOpen}
          title="Paneli kapat"
          aria-label="Paneli kapat"
        >
          <X size={15} weight="bold" />
        </button>
      </div>

      <div>
        <div style={groupLabelStyle}>Sinyal</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SIGNAL_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`chip${filters.sig === chip.value ? " active" : ""}`}
              onClick={() => onChange({ sig: chip.value })}
            >
              {chip.label}
            </button>
          ))}
          {/* "Takip listem" çipi (görev "Kapsam" §Masaüstü) — sinyal çiplerinin YANINDA
              ama bağımsız bir boyut: diğer filtrelerle AND'lenir (bkz. ScanScreen.tsx
              `filteredRows`), sıfırlama (Filtreleri sıfırla) ile SIFIRLANMAZ — bu, "hangi
              hisselerim var" sorusuna bakan farklı bir eksen, skor/sektör filtrelemesi
              DEĞİL. Yıldız için accent tonu — yeşil/kırmızı YOK (görev "Sert kısıtlar"). */}
          <button
            type="button"
            className={`chip${watchlistOnly ? " active" : ""}`}
            onClick={onToggleWatchlistOnly}
            aria-pressed={watchlistOnly}
          >
            <Star
              size={11}
              weight={watchlistOnly ? "fill" : "regular"}
              style={{ marginRight: 4, verticalAlign: -1 }}
            />
            Takip listem ({watchlistSymbols.length})
          </button>
        </div>
        {watchlistSymbols.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <ShareWatchlistButton symbols={watchlistSymbols} />
          </div>
        ) : null}
      </div>

      <div>
        <div style={groupLabelStyle}>Sektör</div>
        <select
          className="input"
          style={{ width: "100%" }}
          value={filters.sector}
          onChange={(e) => onChange({ sector: e.target.value })}
        >
          {sectorOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div style={sliderLabelStyle}>
          <span>Min. skor</span>
          <span style={{ color: "var(--color-accent-300)" }}>{filters.minScore}</span>
        </div>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={filters.minScore}
          onChange={(e) => onChange({ minScore: Number(e.target.value) })}
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <div style={sliderLabelStyle}>
          <span>Min. relatif hacim</span>
          <span style={{ color: "var(--color-accent-300)" }}>{nf1.format(filters.minRelVol)}×</span>
        </div>
        <input
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={filters.minRelVol}
          onChange={(e) => onChange({ minRelVol: Number(e.target.value) })}
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <div style={groupLabelStyle}>ATR aralığı (%)</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="input"
            type="number"
            style={{ width: 0, flex: 1, fontSize: 12 }}
            placeholder="min"
            value={filters.atrMin}
            onChange={(e) => onChange({ atrMin: e.target.value })}
          />
          <input
            className="input"
            type="number"
            style={{ width: 0, flex: 1, fontSize: 12 }}
            placeholder="maks"
            value={filters.atrMax}
            onChange={(e) => onChange({ atrMax: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div style={groupLabelStyle}>Fiyat aralığı (₺)</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="input"
            type="number"
            style={{ width: 0, flex: 1, fontSize: 12 }}
            placeholder="min"
            value={filters.pMin}
            onChange={(e) => onChange({ pMin: e.target.value })}
          />
          <input
            className="input"
            type="number"
            style={{ width: 0, flex: 1, fontSize: 12 }}
            placeholder="maks"
            value={filters.pMax}
            onChange={(e) => onChange({ pMax: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div style={groupLabelStyle}>Min. hacim (Mn ₺)</div>
        <input
          className="input"
          type="number"
          style={{ width: "100%", fontSize: 12 }}
          placeholder="örn. 50"
          value={filters.minVolM}
          onChange={(e) => onChange({ minVolM: e.target.value })}
        />
      </div>

      <button type="button" className="btn btn-ghost" style={{ width: "100%" }} onClick={onReset}>
        Filtreleri sıfırla
      </button>

      <div style={{ fontSize: 11.5, color: "var(--color-neutral-400)" }}>
        {matchCount} / {totalCount} hisse eşleşti
      </div>

      <div style={{ marginTop: "auto", fontSize: 10.5, lineHeight: 1.5, color: "var(--color-neutral-500)" }}>
        Fiyat, gösterge ve skor içerikleri gecikmeli/gün sonu veriye dayanır; yatırım tavsiyesi değildir.
      </div>
    </div>
  );
}
