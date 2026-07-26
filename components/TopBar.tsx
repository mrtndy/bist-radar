"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { formatInt } from "../lib/format";
import { COLOR_DOWN, COLOR_UP } from "../lib/colors";
import type { Timeframe } from "../lib/types";

const TF_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "G", label: "Günlük" },
  { value: "H", label: "Haftalık" },
  { value: "S", label: "Saatlik" },
];

interface TopBarProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  query: string;
  onQueryChange: (q: string) => void;
  totalScanned: number;
  upCount: number;
  downCount: number;
  lastUpdatedLabel: string | null;
}

export default function TopBar({
  timeframe,
  onTimeframeChange,
  query,
  onQueryChange,
  totalScanned,
  upCount,
  downCount,
  lastUpdatedLabel,
}: TopBarProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        height: 54,
        flex: "none",
        padding: "0 20px",
        borderBottom: "1px solid transparent",
        borderImage:
          "linear-gradient(90deg, transparent, var(--color-neutral-700) 48px, var(--color-neutral-700) calc(100% - 48px), transparent) 1",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            flex: "none",
            background: "var(--color-accent)",
            transform: "rotate(45deg)",
            borderRadius: 2,
            boxShadow: "0 0 12px color-mix(in oklab, var(--color-accent) 60%, transparent)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          BIST Radar
        </span>
        <span className="tag tag-outline" style={{ fontSize: 10, whiteSpace: "nowrap" }}>
          Borsa İstanbul · Gecikmeli veri
        </span>
      </div>

      <div className="seg">
        {TF_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`seg-btn${timeframe === opt.value ? " active" : ""}`}
            onClick={() => onTimeframeChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", flex: "0 1 200px", minWidth: 110 }}>
        <MagnifyingGlass
          size={14}
          color="var(--color-neutral-500)"
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          className="input"
          style={{ paddingLeft: 32, width: "100%", boxSizing: "border-box", fontSize: 12.5 }}
          placeholder="Sembol ara…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          minWidth: 0,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ flex: "none" }}>
          <span style={{ color: "var(--color-neutral-400)" }}>Taranan</span>{" "}
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>{formatInt(totalScanned)}</span>
        </span>
        <span style={{ flex: "none" }}>
          <span style={{ color: COLOR_UP, fontWeight: 600 }}>▲ {formatInt(upCount)}</span>{" "}
          <span style={{ color: COLOR_DOWN, fontWeight: 600 }}>▼ {formatInt(downCount)}</span>
        </span>
        <span
          style={{
            color: "var(--color-neutral-500)",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {lastUpdatedLabel ? `Son: ${lastUpdatedLabel}` : "Son: —"}
        </span>
      </div>
    </header>
  );
}
