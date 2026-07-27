"use client";

/**
 * Hacim çubukları + 20 bar SMA çizgisi — bkz. PriceChart.tsx üstündeki not (aynı
 * kütüphanesiz SVG yaklaşımı, `buildDetail()` portu).
 */
import { COLOR_DOWN, COLOR_UP } from "../../lib/colors";
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

interface VolumeChartProps {
  chart: ChartSeries;
}

export default function VolumeChart({ chart }: VolumeChartProps) {
  const { bars, volSMA } = chart;
  const n = bars.length;
  const xw = PLOT_W / n;
  const bw = Math.max(2.2, xw * 0.62);
  const cx = (i: number) => i * xw + xw / 2;

  const vmax = Math.max(...bars.map((b) => b.v)) || 1;

  const vols = bars.map((b, i) => {
    const h = Math.max(1, (b.v / vmax) * 52);
    return { key: i, x: cx(i) - bw / 2, y: 56 - h, h, color: b.c >= b.o ? COLOR_UP : COLOR_DOWN };
  });

  const volSmaY = (v: number) => 56 - Math.max(1, (v / vmax) * 52);
  const volSmaPath = buildPath(
    volSMA.map((v) => (v == null ? null : Math.min(v, vmax))),
    cx,
    volSmaY,
  );

  return (
    <svg viewBox="0 0 616 60" style={{ width: "100%", height: "auto", display: "block" }}>
      {vols.map((v) => (
        <rect key={v.key} x={v.x} y={v.y} width={bw} height={v.h} style={{ fill: v.color, opacity: 0.65 }} />
      ))}
      <path d={volSmaPath} style={{ fill: "none", stroke: "var(--color-neutral-400)", strokeWidth: 1, opacity: 0.8 }} />
    </svg>
  );
}
