/** Zaman dilimi: Günlük / Haftalık / Saatlik (prototipteki `tfk` ile aynı kodlar). */
export type Timeframe = "G" | "H" | "S";

export interface Bar {
  /** Bar açılış zamanı, epoch ms (UTC). */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  /** Lot (adet) cinsinden hacim — TL hacim `v * c` ile türetilir. */
  v: number;
}

export interface ScoreComponent {
  /** Gösterge adı — "MACD", "Stokastik", "RSI", "Hacim", "ATR", "Bollinger". */
  k: string;
  /** Puan katkısı (+/-). */
  p: number;
  /** Türkçe gerekçe metni. */
  n: string;
}

export interface ChartSeries {
  bars: Bar[];
  K: (number | null)[];
  D: (number | null)[];
  macd: number[];
  sig: number[];
  hist: number[];
  bbU: (number | null)[];
  bbM: (number | null)[];
  bbL: (number | null)[];
  volSMA: (number | null)[];
  labels: string[];
}

export interface Indicators {
  price: number;
  chg: number;
  k: number;
  d: number;
  rsi: number;
  atrPct: number;
  relVol: number;
  pctB: number;
  macd: number;
  msig: number;
  hist: number;
  histRising: boolean;
  kRising: boolean;
  crossDir: number;
  crossBars: number;
  volTL: number;
  hi70: number;
  lo70: number;
  chart: ChartSeries;
}

export interface Score {
  score: number;
  breakdown: ScoreComponent[];
}

export type Signal = "AL" | "SAT" | "NÖTR";

/**
 * Fiyat verisi sağlayıcı sözleşmesi (handoff README'sindeki `DataProvider`).
 * Sağlayıcılar takılabilir olmalı: yfinance ile başla, gerekirse AlgoLab/Matriks ekle.
 */
export interface DataProvider {
  readonly name: string;
  /** İşlem gören BIST sembolleri. */
  getUniverse(): Promise<UniverseEntry[]>;
  /** Bir sembolün barları — eskiden yeniye sıralı. */
  getBars(symbol: string, timeframe: Timeframe): Promise<Bar[]>;
}

export interface UniverseEntry {
  symbol: string;
  name: string;
  sector: string;
}
