/**
 * Arayüz katmanının veri sözleşmesi. Motorun (`src/engine`) kendi tiplerini
 * (`Signal`, `Timeframe`) yeniden dışa aktarır; matematik tipi değil, sadece
 * isimlendirme paylaşımı içindir.
 */
import type { Signal, Timeframe } from "../src/engine/types.ts";

export type { Signal, Timeframe };

/** Tarama tablosundaki tek satır — API rotasının döndürdüğü, motor çıktısından türetilmiş alanlar. */
export interface RowData {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  /** Yüzde değişim. */
  chg: number;
  score: number;
  signal: Signal;
  /** Stokastik %K. */
  k: number;
  /** Stokastik %D. */
  d: number;
  rsi: number;
  atrPct: number;
  relVol: number;
  pctB: number;
  /** MACD histogram (ham). */
  hist: number;
  /** MACD histogramının fiyata oranı (%) — tablo ve sıralama bunu kullanır. */
  histPct: number;
  /** TL cinsinden bar hacmi (fiyat * lot). */
  volTL: number;
}

export interface ScanResult {
  rows: RowData[];
  /** Bu zaman diliminde başarıyla hesaplanan hisse sayısı (filtre öncesi). */
  total: number;
  /** İlgili zaman dilimi barlarının en son çekildiği zaman (epoch ms) — ingest meta'sından. */
  fetchedAt: number | null;
  /** Tüm evrendeki sektörlerin tr-locale sıralı listesi ("Tümü" hariç). */
  sectors: string[];
}

export interface ScanApiResponse extends ScanResult {
  tf: Timeframe;
}

export type SignalFilter = "ALL" | "AL" | "SAT" | "NOTR";

export interface FilterState {
  sig: SignalFilter;
  sector: string;
  minScore: number;
  minRelVol: number;
  /** Serbest metin girişleri — boş string = sınır yok. Virgül/nokta ondalık kabul edilir. */
  atrMin: string;
  atrMax: string;
  pMin: string;
  pMax: string;
  minVolM: string;
  q: string;
}

export type SortKey =
  | "symbol"
  | "price"
  | "chg"
  | "score"
  | "k"
  | "hist"
  | "rsi"
  | "atrPct"
  | "relVol"
  | "pctB";

export type SortDir = 1 | -1;
