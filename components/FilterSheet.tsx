"use client";

/**
 * Mobil filtre alt sayfası (bottom sheet) — bkz. tasks/04-mobil-gorunum.md §D.
 *
 * Üstte tek dokunuşla 5 hazır set (ham slider DEĞİL). Altta, varsayılan KAPALI
 * "Ayrıntılı filtreler" içinde masaüstü `FilterPanel` ile aynı sektör/skor/ATR/
 * fiyat/hacim kontrolleri (yalnızca dokunma hedefleri büyütülmüş). Sinyal
 * (AL/SAT/Nötr) çip satırı bilerek burada YOK — görev metni ayrıntılı bölüme
 * yalnızca "sektör/skor/ATR/fiyat/hacim" filtrelerinin taşındığını söylüyor;
 * sinyal seçimi artık hazır setler üzerinden ("Güçlü AL sinyalleri").
 *
 * ScanScreen bu bileşeni yalnızca sayfa açıkken mount eder (`{open && <FilterSheet/>}`),
 * DetailDrawer ile aynı desen — hem "varsayılan kapalı" davranışını (yeniden
 * mount = state sıfırlanır) hem de kapalıyken sıfır ekstra DOM düğümünü garanti eder.
 */
import { useEffect, useState } from "react";
import { CaretDown, X } from "@phosphor-icons/react";
import type { FilterState } from "../lib/types";

const nf1 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11.5,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--color-neutral-400)",
  marginBottom: 8,
};

const sliderLabelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 6,
  fontSize: 11.5,
  letterSpacing: "0.03em",
  color: "var(--color-neutral-300)",
  marginBottom: 8,
};

interface Preset {
  label: string;
  patch: Partial<FilterState>;
}

const PRESETS: Preset[] = [
  { label: "Tümü", patch: {} },
  { label: "Güçlü AL sinyalleri", patch: { sig: "AL" } },
  { label: "Yüksek hacimli", patch: { minRelVol: 1.5 } },
  { label: "Yükselenler", patch: { chgDir: "UP" } },
  { label: "Düşenler", patch: { chgDir: "DOWN" } },
];

interface FilterSheetProps {
  onClose: () => void;
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  /** Preset dokunuşu: diğer TÜM filtreleri sıfırlayıp yalnızca patch'i uygular, sayfayı kapatır. */
  onApplyPreset: (patch: Partial<FilterState>) => void;
  sectorOptions: string[];
  matchCount: number;
  totalCount: number;
}

export default function FilterSheet({
  onClose,
  filters,
  onChange,
  onApplyPreset,
  sectorOptions,
  matchCount,
  totalCount,
}: FilterSheetProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /** Bir preset'in ŞU AN uygulanmış filtrelerle eşleşip eşleşmediği — yalnızca vurgu içindir. */
  function isActive(patch: Partial<FilterState>): boolean {
    const keys = Object.keys(patch) as (keyof FilterState)[];
    if (keys.length === 0) {
      return filters.sig === "ALL" && filters.chgDir === "ALL" && filters.minRelVol === 0;
    }
    return keys.every((k) => filters[k] === patch[k]);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 45 }}>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-label="Filtrele">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 500 }}>Filtrele</span>
          <button type="button" className="btn btn-icon" onClick={onClose} title="Kapat" aria-label="Kapat">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="sheet-body">
          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`preset-btn${isActive(preset.patch) ? " active" : ""}`}
                style={preset.label === "Tümü" ? { gridColumn: "1 / -1" } : undefined}
                onClick={() => onApplyPreset(preset.patch)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 13.5, color: "var(--color-neutral-300)" }}>
            <strong style={{ color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>{matchCount}</strong> /{" "}
            {totalCount} hisse eşleşti
          </div>

          <div>
            <button
              type="button"
              className="details-toggle"
              onClick={() => setDetailsOpen((v) => !v)}
              aria-expanded={detailsOpen}
            >
              <span>Ayrıntılı filtreler</span>
              <CaretDown
                size={14}
                style={{ transform: detailsOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}
              />
            </button>

            {detailsOpen ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 14 }}>
                <div>
                  <div style={fieldLabelStyle}>Sektör</div>
                  <select
                    className="input input-lg"
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
                  <div style={fieldLabelStyle}>ATR aralığı (%)</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="input input-lg"
                      type="number"
                      style={{ width: 0, flex: 1 }}
                      placeholder="min"
                      value={filters.atrMin}
                      onChange={(e) => onChange({ atrMin: e.target.value })}
                    />
                    <input
                      className="input input-lg"
                      type="number"
                      style={{ width: 0, flex: 1 }}
                      placeholder="maks"
                      value={filters.atrMax}
                      onChange={(e) => onChange({ atrMax: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <div style={fieldLabelStyle}>Fiyat aralığı (₺)</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="input input-lg"
                      type="number"
                      style={{ width: 0, flex: 1 }}
                      placeholder="min"
                      value={filters.pMin}
                      onChange={(e) => onChange({ pMin: e.target.value })}
                    />
                    <input
                      className="input input-lg"
                      type="number"
                      style={{ width: 0, flex: 1 }}
                      placeholder="maks"
                      value={filters.pMax}
                      onChange={(e) => onChange({ pMax: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <div style={fieldLabelStyle}>Min. hacim (Mn ₺)</div>
                  <input
                    className="input input-lg"
                    type="number"
                    style={{ width: "100%" }}
                    placeholder="örn. 50"
                    value={filters.minVolM}
                    onChange={(e) => onChange({ minVolM: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
