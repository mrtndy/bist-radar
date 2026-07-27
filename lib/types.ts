/**
 * Arayüz katmanının veri sözleşmesi. Motorun (`src/engine`) kendi tiplerini
 * (`Signal`, `Timeframe`, `ChartSeries`, `ScoreComponent`) yeniden dışa aktarır;
 * matematik tipi değil, sadece isimlendirme paylaşımı içindir.
 */
import type { ChartSeries, ScoreComponent, Signal, Timeframe } from "../src/engine/types.ts";

export type { ChartSeries, ScoreComponent, Signal, Timeframe };

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
  /**
   * En güçlü (|p| en büyük) skor bileşeninin motor gerekçesi — mobil kart listesinde
   * gösterilir (bkz. tasks/04-mobil-gorunum.md §B "Kimin kullanacağı"). Ayrı bir metin
   * DEĞİLDİR: `scoreOf()` çıktısındaki `breakdown[].n` alanından türetilir
   * (bkz. `lib/scan-data.ts`).
   */
  topReason: string;
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

/**
 * Hisse detay paneli için tek sembol × zaman dilimi verisi — `public/data/detail/
 * {SEMBOL}-{tf}.json` içeriği (bkz. tasks/03-detail-drawer.md §A, `lib/detail.ts`).
 * Motorun `Indicators` + `Score` çıktısının, panelin ihtiyaç duyduğu alt kümesidir
 * (ısınma amaçlı ara alanlar — `histRising`, `kRising` — dışarıda bırakılmıştır).
 */
export interface DetailData {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  /** Yüzde değişim. */
  chg: number;
  /** Stokastik %K / %D (son bar). */
  k: number;
  d: number;
  rsi: number;
  atrPct: number;
  relVol: number;
  pctB: number;
  macd: number;
  msig: number;
  hist: number;
  crossDir: number;
  crossBars: number;
  /** TL cinsinden bar hacmi (fiyat * lot). */
  volTL: number;
  hi70: number;
  lo70: number;
  score: number;
  signal: Signal;
  /** `scoreOf(ind, tf)` çıktısı — gerekçe metinleri (`n`) motordan birebir gelir. */
  breakdown: ScoreComponent[];
  chart: ChartSeries;
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
  /**
   * Mobil "Yükselenler" / "Düşenler" hazır filtre setleri için (bkz.
   * tasks/04-mobil-gorunum.md §D). Masaüstü `FilterPanel` bu alanı hiç göstermez ya
   * da değiştirmez — varsayılan "ALL" kalır, yani bu alan eklenmeden önceki masaüstü
   * filtreleme davranışı birebir korunur.
   */
  chgDir: "ALL" | "UP" | "DOWN";
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

/**
 * "Güncelle" düğmesinin durumu.
 * `updated` = sunucudan daha yeni veri geldi · `current` = zaten en günceldi.
 * İkisini ayırmak önemli: kullanıcı basıp hiçbir şey olmadığını sanmasın.
 */
export type RefreshState = "idle" | "loading" | "updated" | "current" | "error";
