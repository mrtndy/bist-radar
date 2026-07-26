"use client";

import type { FilterState, SignalFilter } from "../lib/types";

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
}

export default function FilterPanel({
  filters,
  onChange,
  onReset,
  sectorOptions,
  matchCount,
  totalCount,
}: FilterPanelProps) {
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
        </div>
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
