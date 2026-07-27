/**
 * Skorlama motoru — `design_handoff_bist_radar/bist-data.js` içindeki `scoreOf()`
 * fonksiyonunun birebir portu. Puanlar, eşikler ve Türkçe gerekçe metinleri
 * orijinaliyle karakter düzeyinde aynıdır; `tests/parity.test.ts` bunu doğrular.
 */
import type { Indicators, Score, ScoreComponent, Signal, Timeframe } from "./types.ts";

/** Sinyal eşikleri — handoff README: AL >= 65 (55-80 aralığında ayarlanabilir), SAT <= 38. */
export const SIGNAL_THRESHOLDS = { buy: 65, sell: 38 } as const;

/**
 * ATR eşiklerinin zaman dilimine göre ölçeği.
 *
 * Prototipin ATR bandı (%2-6 ideal) günlük barlara göre kalibreydi ve demo verisinde sorun
 * görünmüyordu. Gerçek BIST verisiyle 619 hisse ölçüldüğünde (2026-07-27) bandın diğer
 * dilimlerde tamamen dışarıda kaldığı ortaya çıktı — ATR bileşeni hisseleri ayırmayı bırakıp
 * herkese aynı sabit puanı veriyordu:
 *
 *   dilim | p10   | medyan | p90    | ölçeksiz sonuç
 *   ------|-------|--------|--------|--------------------------------------
 *   G     |  2,65 |   4,21 |   6,40 | %83 ideal (+6) — tasarlandığı gibi
 *   H     |  7,41 |  10,27 |  15,19 | 448/548 sabit "aşırı volatil" (-5)
 *   S     |  0,67 |   1,10 |   2,03 | 545/611 sabit "düşük volatilite" (-2)
 *
 * Katsayılar bu ölçümdeki medyan oranlarıdır (H 10,27/4,21, S 1,10/4,21). Böylece her dilimde
 * bant kendi medyanına göre günlüktekiyle aynı yerde durur. Teorik √zaman ölçeklemesi haftalıkta
 * yakın (√5 = 2,24) ama saatlikte sapıyor (gün içi ortalamaya dönüş + gecelik boşluğun saatlik
 * barda olmaması), o yüzden teori yerine ölçüm kullanıldı.
 *
 * `G: 1` kasıtlıdır — günlük tarama prototiple birebir aynı kalır ve `scripts/parity.ts` bunu
 * doğrulamayı sürdürür. Piyasa rejimi kalıcı olarak değişirse katsayılar
 * `scripts/atr-calibration.ts` ile yeniden türetilmelidir.
 */
export const ATR_TIMEFRAME_SCALE: Record<Timeframe, number> = { G: 1, H: 2.442, S: 0.262 };

/** Orijinaldeki `toFixed(1).replace(".",",")` — Türkçe ondalık ayırıcı. */
const tr1 = (x: number): string => x.toFixed(1).replace(".", ",");

/**
 * @param tf Zaman dilimi — yalnızca ATR eşiklerini ölçekler (bkz. `ATR_TIMEFRAME_SCALE`).
 *           Varsayılan `"G"`, prototipin `scoreOf(d)` davranışıyla birebir aynıdır.
 */
export function scoreOf(d: Indicators, tf: Timeframe = "G"): Score {
  const B: ScoreComponent[] = [];
  const add = (k: string, p: number, n: string) => B.push({ k, p, n });
  const atrK = ATR_TIMEFRAME_SCALE[tf] ?? 1;

  if (d.crossDir > 0 && d.crossBars <= 3) add("MACD", 10, "AL kesişimi (" + d.crossBars + " bar önce)");
  else if (d.crossDir < 0 && d.crossBars <= 3) add("MACD", -10, "SAT kesişimi (" + d.crossBars + " bar önce)");
  else if (d.hist > 0 && d.histRising) add("MACD", 8, "Histogram pozitif ve artıyor");
  else if (d.hist > 0) add("MACD", 4, "Histogram pozitif, ivme zayıflıyor");
  else if (!d.histRising) add("MACD", -8, "Histogram negatif ve azalıyor");
  else add("MACD", -3, "Histogram negatif, toparlanıyor");

  if (d.k < 25 && d.k > d.d) add("Stokastik", 10, "Aşırı satımdan yukarı dönüyor");
  else if (d.k < 25) add("Stokastik", 4, "Aşırı satım bölgesi (%K " + Math.round(d.k) + ")");
  else if (d.k > 80 && d.k < d.d) add("Stokastik", -10, "Aşırı alımdan aşağı dönüyor");
  else if (d.k > 80) add("Stokastik", -5, "Aşırı alım bölgesi (%K " + Math.round(d.k) + ")");
  else if (d.k > d.d) add("Stokastik", 5, "%K, %D üzerinde");
  else add("Stokastik", -3, "%K, %D altında");

  if (d.rsi > 70) add("RSI", -7, "Aşırı alım (" + Math.round(d.rsi) + ")");
  else if (d.rsi >= 55) add("RSI", 7, "Güçlü momentum (" + Math.round(d.rsi) + ")");
  else if (d.rsi >= 45) add("RSI", 2, "Nötr bölge (" + Math.round(d.rsi) + ")");
  else if (d.rsi >= 30) add("RSI", -4, "Zayıf momentum (" + Math.round(d.rsi) + ")");
  else add("RSI", 3, "Aşırı satım — tepki potansiyeli");

  if (d.relVol >= 2) add("Hacim", 10, "Ortalamanın " + tr1(d.relVol) + " katı hacim");
  else if (d.relVol >= 1.5) add("Hacim", 7, "Ortalamanın belirgin üzerinde");
  else if (d.relVol >= 1.2) add("Hacim", 4, "Ortalamanın hafif üzerinde");
  else if (d.relVol < 0.7) add("Hacim", -5, "Zayıf hacim");
  else add("Hacim", 0, "Ortalama seviyede");

  if (d.atrPct >= 2 * atrK && d.atrPct <= 6 * atrK) add("ATR", 6, "İdeal volatilite bandı (%" + tr1(d.atrPct) + ")");
  else if (d.atrPct > 8 * atrK) add("ATR", -5, "Aşırı volatil (%" + tr1(d.atrPct) + ")");
  else if (d.atrPct > 6 * atrK) add("ATR", 1, "Yüksek volatilite");
  else add("ATR", -2, "Düşük volatilite (%" + tr1(d.atrPct) + ")");

  if (d.pctB > 1 && d.relVol >= 1.5) add("Bollinger", 6, "Üst bant kırılımı — hacim teyitli");
  else if (d.pctB > 1) add("Bollinger", -3, "Üst bant dışı, hacim teyidi yok");
  else if (d.pctB < 0) add("Bollinger", 3, "Alt bant dışı — tepki potansiyeli");
  else if (d.pctB <= 0.25) add("Bollinger", 4, "Alt banda yakın");
  else if (d.pctB >= 0.85) add("Bollinger", -2, "Üst banda yakın");
  else add("Bollinger", 1, "Bant içi normal seyir");

  const score = Math.max(4, Math.min(98, Math.round(50 + B.reduce((s, b) => s + b.p, 0))));
  return { score, breakdown: B };
}

export function signalOf(score: number): Signal {
  if (score >= SIGNAL_THRESHOLDS.buy) return "AL";
  if (score <= SIGNAL_THRESHOLDS.sell) return "SAT";
  return "NÖTR";
}
