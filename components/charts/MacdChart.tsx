"use client";

/**
 * MACD(12,26,9) histogramı + çizgileri + son kesişim halkası — bkz. PriceChart.tsx
 * üstündeki not (aynı kütüphanesiz SVG yaklaşımı, `buildDetail()` portu).
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

interface MacdChartProps {
  chart: ChartSeries;
  crossDir: number;
  crossBars: number;
}

export default function MacdChart({ chart, crossDir, crossBars }: MacdChartProps) {
  const { bars, macd, sig, hist } = chart;
  const n = bars.length;
  const xw = PLOT_W / n;
  const bw = Math.max(2.2, xw * 0.62);
  const cx = (i: number) => i * xw + xw / 2;

  const mAll = [...macd, ...sig, ...hist].filter((v): v is number => v != null).map(Math.abs);
  const mm = Math.max(...mAll) * 1.15 || 1;
  const YM = (v: number) => 60 - (v / mm) * 50;

  const mh = hist.map((v, i) => {
    const y = v >= 0 ? YM(v) : 60;
    const h = Math.max(0.8, Math.abs(YM(v) - 60));
    return { key: i, x: cx(i) - bw / 2, y, h, color: v >= 0 ? COLOR_UP : COLOR_DOWN };
  });

  const macdPath = buildPath(macd, cx, YM);
  const sigPath = buildPath(sig, cx, YM);

  let crossPt: { x: number; y: number; color: string } | null = null;
  if (crossBars < n - 1) {
    const idx = n - 1 - crossBars;
    const sigVal = sig[idx];
    if (sigVal != null) crossPt = { x: cx(idx), y: YM(sigVal), color: crossDir > 0 ? COLOR_UP : COLOR_DOWN };
  }

  return (
    <svg viewBox="0 0 616 120" style={{ width: "100%", height: "auto", display: "block" }}>
      <line x1={0} x2={PLOT_W} y1={60} y2={60} style={{ stroke: "var(--color-neutral-700)", strokeWidth: 1 }} />
      {mh.map((m) => (
        <rect key={m.key} x={m.x} y={m.y} width={bw} height={m.h} style={{ fill: m.color, opacity: 0.5 }} />
      ))}
      <path d={macdPath} style={{ fill: "none", stroke: "var(--color-accent)", strokeWidth: 1.4 }} />
      <path d={sigPath} style={{ fill: "none", stroke: "var(--color-neutral-300)", strokeWidth: 1, strokeDasharray: "4 3" }} />
      {crossPt ? (
        <circle cx={crossPt.x} cy={crossPt.y} r={4} style={{ fill: "none", stroke: crossPt.color, strokeWidth: 1.5 }} />
      ) : null}
    </svg>
  );
}
