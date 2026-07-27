"use client";

/**
 * Fiyat + Bollinger(20,2) mum grafiği — inline SVG `<path>` ile (kütüphane yok, bkz.
 * tasks/03-detail-drawer.md §C). Geometri, prototipin `BIST Radar.dc.html` içindeki
 * `buildDetail()` fonksiyonunun birebir portudur (candles/bbFill/grid/xticks hesabı).
 */
import { COLOR_DOWN, COLOR_UP } from "../../lib/colors";
import type { ChartSeries } from "../../lib/types";

const nf1 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const PLOT_W = 572;
/** Prototipteki sabit x-ekseni etiket indeksleri (n=70 barlık pencere varsayımıyla). */
const XTICK_IDX = [6, 20, 34, 48, 62];

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

interface PriceChartProps {
  chart: ChartSeries;
  price: number;
}

export default function PriceChart({ chart, price }: PriceChartProps) {
  const { bars, bbU, bbM, bbL, labels } = chart;
  const n = bars.length;
  const xw = PLOT_W / n;
  const bw = Math.max(2.2, xw * 0.62);
  const cx = (i: number) => i * xw + xw / 2;

  let ymin = Infinity;
  let ymax = -Infinity;
  for (const b of bars) {
    ymin = Math.min(ymin, b.l);
    ymax = Math.max(ymax, b.h);
  }
  for (const v of bbU) if (v != null) ymax = Math.max(ymax, v);
  for (const v of bbL) if (v != null) ymin = Math.min(ymin, v);
  const pad = (ymax - ymin) * 0.04;
  ymin -= pad;
  ymax += pad;
  const range = ymax - ymin || 1;
  const Y = (v: number) => 8 + ((ymax - v) / range) * 208;

  const candles = bars.map((b, i) => {
    const up = b.c >= b.o;
    const color = up ? COLOR_UP : COLOR_DOWN;
    return {
      key: i,
      cx: cx(i),
      y1: Y(b.h),
      y2: Y(b.l),
      bx: cx(i) - bw / 2,
      by: Y(Math.max(b.o, b.c)),
      bh: Math.max(1.4, Math.abs(Y(b.o) - Y(b.c))),
      color,
    };
  });

  const up0 = bbU.findIndex((v) => v != null);
  let bbFill = buildPath(bbU, cx, Y);
  if (up0 >= 0) {
    for (let i = n - 1; i >= up0; i--) {
      const lo = bbL[i];
      if (lo != null) bbFill += `L${cx(i).toFixed(1)} ${Y(lo).toFixed(1)}`;
    }
  }
  bbFill += "Z";

  const grid = [ymax - pad, (ymax + ymin) / 2, ymin + pad].map((v) => ({ y: Y(v), label: nf1.format(v) }));
  const xticks = XTICK_IDX.filter((i) => i < n).map((i) => ({ x: cx(i), label: labels[i] ?? "" }));
  const lastY = Y(price);

  return (
    <svg viewBox="0 0 616 240" style={{ width: "100%", height: "auto", display: "block" }}>
      <path d={bbFill} style={{ fill: "var(--color-accent)", opacity: 0.06 }} />
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={0} x2={PLOT_W} y1={g.y} y2={g.y} style={{ stroke: "var(--color-neutral-800)", strokeWidth: 1 }} />
          <text
            x={614}
            y={g.y + 3}
            textAnchor="end"
            style={{ fill: "var(--color-neutral-500)", fontSize: 10, fontFamily: "var(--font-body)" }}
          >
            {g.label}
          </text>
        </g>
      ))}
      <path d={buildPath(bbU, cx, Y)} style={{ fill: "none", stroke: "var(--color-accent-300)", strokeWidth: 1, opacity: 0.45 }} />
      <path d={buildPath(bbL, cx, Y)} style={{ fill: "none", stroke: "var(--color-accent-300)", strokeWidth: 1, opacity: 0.45 }} />
      <path
        d={buildPath(bbM, cx, Y)}
        style={{ fill: "none", stroke: "var(--color-neutral-500)", strokeWidth: 1, strokeDasharray: "3 4", opacity: 0.7 }}
      />
      {candles.map((c) => (
        <g key={c.key}>
          <line x1={c.cx} x2={c.cx} y1={c.y1} y2={c.y2} style={{ stroke: c.color, strokeWidth: 1 }} />
          <rect x={c.bx} y={c.by} width={bw} height={c.bh} rx={1} style={{ fill: c.color }} />
        </g>
      ))}
      <line
        x1={0}
        x2={PLOT_W}
        y1={lastY}
        y2={lastY}
        style={{ stroke: "var(--color-accent)", strokeWidth: 1, strokeDasharray: "2 4", opacity: 0.6 }}
      />
      <text
        x={614}
        y={lastY + 3}
        textAnchor="end"
        style={{ fill: "var(--color-accent-200)", fontSize: 10, fontFamily: "var(--font-heading)", fontWeight: 600 }}
      >
        {nf1.format(price)}
      </text>
      {xticks.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={238}
          textAnchor="middle"
          style={{ fill: "var(--color-neutral-500)", fontSize: 9.5, fontFamily: "var(--font-body)" }}
        >
          {t.label}
        </text>
      ))}
    </svg>
  );
}
