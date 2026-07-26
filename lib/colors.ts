/**
 * Renk yardımcıları — handoff README "Design Tokens": yükseliş/AL ve düşüş/SAT
 * renkleri yalnızca bu iki OKLCH değeriyle ifade edilir, başka yerde yeşil/kırmızı
 * kullanılmaz. Eşikler burada YENİDEN TANIMLANMAZ: skor/sinyal renklendirmesi
 * `RowData.signal` alanına (motorun `signalOf()`'u tarafından üretilir) dayanır;
 * yalnızca gösterge eşikli hücreler (%K, RSI, R.HACİM, DEĞİŞİM) kendi ham
 * değerlerinin işaretine/eşiğine bakar (prototipte de böyle: `scoreOf`/`signalOf`
 * ile bağımsız, salt görsel eşikler).
 */
import type { Signal } from "./types";

export const COLOR_UP = "oklch(0.75 0.1 158)";
export const COLOR_DOWN = "oklch(0.69 0.13 24)";
/** Genel "nötr" sayı rengi (DEĞİŞİM, SKOR sayısı, %K, RSI, R.HACİM eşik altı). */
export const COLOR_MUTED = "var(--color-neutral-300)";
/** Yalnızca SİNYAL tag'inin NÖTR hâli için — prototipte bilerek 400 kullanılır (300 değil). */
export const COLOR_SIGNAL_NEUTRAL = "var(--color-neutral-400)";

export function scoreColor(signal: Signal): string {
  if (signal === "AL") return COLOR_UP;
  if (signal === "SAT") return COLOR_DOWN;
  return COLOR_MUTED;
}

export function signalTagColor(signal: Signal): string {
  if (signal === "AL") return COLOR_UP;
  if (signal === "SAT") return COLOR_DOWN;
  return COLOR_SIGNAL_NEUTRAL;
}

export function changeColor(value: number): string {
  if (value > 0) return COLOR_UP;
  if (value < 0) return COLOR_DOWN;
  return COLOR_MUTED;
}

export function stochKColor(k: number): string {
  if (k <= 20) return COLOR_UP;
  if (k >= 80) return COLOR_DOWN;
  return COLOR_MUTED;
}

export function rsiColor(rsi: number): string {
  if (rsi >= 70) return COLOR_DOWN;
  if (rsi <= 30) return COLOR_UP;
  return COLOR_MUTED;
}

export function macdColor(hist: number): string {
  if (!Number.isFinite(hist)) return COLOR_MUTED;
  return hist >= 0 ? COLOR_UP : COLOR_DOWN;
}

export function relVolColor(relVol: number): string {
  return relVol >= 1.5 ? "var(--color-accent-200)" : COLOR_MUTED;
}
