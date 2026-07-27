"use client";

/**
 * Stokastik(14,3,3) %K/%D çizgileri + 20/80 kesikli seviyeler — bkz. PriceChart.tsx
 * üstündeki not (aynı kütüphanesiz SVG yaklaşımı, `buildDetail()` portu).
 */
import type { ChartSeries } from "../../lib/types";

const PLOT_W = 572;

function buildPath(
  values: readonly (number | null)[],
  cx: (i: number) => number,
  y: (v: number) => number,
): string {
  let s = "";
  values.forEach((v, i) => {
    if (v == null) return;
    s += (s ? "L" : "M") + cx(i).toFixed(1) + " " + y(v).toFixed(1);
  });
  return s;
}

interface StochChartProps {
  chart: ChartSeries;
}

export default function StochChart({ chart }: StochChartProps) {
  const { bars, K, D } = chart;
  const n = bars.length;
  const xw = PLOT_W / n;
  const cx = (i: number) => i * xw + xw / 2;

  const YS = (v: number) => 8 + ((100 - v) / 100) * 88;
  const st80 = YS(80);
  const st20 = YS(20);

  const kPath = buildPath(K, cx, YS);
  const dPath = buildPath(D, cx, YS);

  return (
    <svg viewBox="0 0 616 104" style={{ width: "100%", height: "auto", display: "block" }}>
      <line
        x1={0}
        x2={PLOT_W}
        y1={st80}
        y2={st80}
        style={{ stroke: "var(--color-neutral-700)", strokeWidth: 1, strokeDasharray: "3 4" }}
      />
      <line
        x1={0}
        x2={PLOT_W}
        y1={st20}
        y2={st20}
        style={{ stroke: "var(--color-neutral-700)", strokeWidth: 1, strokeDasharray: "3 4" }}
      />
      <text x={614} y={st80 - 3} textAnchor="end" style={{ fill: "var(--color-neutral-500)", fontSize: 10, fontFamily: "var(--font-body)" }}>
        80
      </text>
      <text x={614} y={st20 + 10} textAnchor="end" style={{ fill: "var(--color-neutral-500)", fontSize: 10, fontFamily: "var(--font-body)" }}>
        20
      </text>
      <path d={kPath} style={{ fill: "none", stroke: "var(--color-accent)", strokeWidth: 1.4 }} />
      <path d={dPath} style={{ fill: "none", stroke: "var(--color-neutral-300)", strokeWidth: 1, strokeDasharray: "4 3" }} />
    </svg>
  );
}
