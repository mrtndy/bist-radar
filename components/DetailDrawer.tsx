"use client";

/**
 * Hisse detay paneli (sağdan kayan drawer) — bkz. tasks/03-detail-drawer.md ve
 * ../design_handoff_bist_radar/README.md § "2. Hisse detay paneli". Veri, derleme
 * zamanında üretilmiş `public/data/detail/{SEMBOL}-{tf}.json` dosyasından istek
 * üzerine (yalnızca panel açıldığında) çekilir — bkz. `scripts/build-static.ts`,
 * `lib/detail.ts`.
 *
 * Kimin kullanacağı (tasks/03 "Kimin kullanacağı"): borsa terminolojisine hakim
 * olmayan, telefonundan kendi parasıyla işlem yapacak bir kullanıcı. Bu yüzden:
 * - Skor dökümündeki (motorun ürettiği) Türkçe gerekçe metinleri okunaklı boyut/renkte
 *   gösterilir (bkz. ScoreRow) — dipnot değil, panelin en değerli bölümü.
 * - Gecikme uyarısı başlığın hemen altında, göze çarpan biçimde durur (bkz. DelayNotice).
 */
import { useEffect, useState } from "react";
import { Clock, X } from "@phosphor-icons/react";
import MacdChart from "./charts/MacdChart";
import PriceChart from "./charts/PriceChart";
import StochChart from "./charts/StochChart";
import VolumeChart from "./charts/VolumeChart";
import { COLOR_DOWN, COLOR_UP, scoreColor, signalTagColor } from "../lib/colors";
import {
  formatChange,
  formatDecimal2,
  formatInt,
  formatPercent1,
  formatPrice,
  formatRatio1,
  formatVolumeMn,
} from "../lib/format";
import { useExcludedEntry } from "../lib/excluded";
import { fetchStockNews, formatNewsTime } from "../lib/news";
import { importanceTagStyle } from "../lib/news-importance";
import type { DetailData, NewsItem, ScoreComponent, Timeframe } from "../lib/types";
import ExcludedNotice from "./ExcludedNotice";

// bkz. components/ScanScreen.tsx — statik export'ta alt dizin (GitHub Pages) desteği
// için aynı örüntü; derleme zamanında istemci paketine gömülür.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const TF_LABEL: Record<Timeframe, string> = { G: "Günlük", H: "Haftalık", S: "Saatlik" };

const nf1 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Prototipin `fsig()`'i — MACD/Sinyal ham değerleri büyüklüğe göre değişken ondalık. */
function formatSigned(v: number): string {
  const a = Math.abs(v);
  const digits = a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: Math.min(digits, 2),
  }).format(v);
}

interface DetailDrawerProps {
  symbol: string;
  tf: Timeframe;
  onClose: () => void;
  /** Panel içindeki "…'e geç" düğmesi (bkz. tasks/09-eleme-gorunurlugu.md §C) —
   * ScanScreen'in `setTf`'iyle AYNI state, tablo/panel HER ZAMAN aynı dilimi gösterir. */
  onTimeframeChange: (tf: Timeframe) => void;
}

export default function DetailDrawer({ symbol, tf, onClose, onTimeframeChange }: DetailDrawerProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Zaman dilimi değişince (veya panel bu sembol için ilk açılınca) bu sembolün YENİ
  // dilimde elenip elenmediği (bkz. tasks/09-eleme-gorunurlugu.md §C: "panel boş/bozuk
  // görünmesin"). `detail/{symbol}-{tf}.json` 404 verirse (aşağıdaki fetch efekti)
  // AYNI sebep bilgisiyle açıklama gösterilir — ayrı bir metin YAZILMAZ (ExcludedNotice,
  // §B ile PAYLAŞILAN bileşen).
  const { loading: excludedLoading, entry: excludedEntry } = useExcludedEntry(tf, symbol);
  // Şirket haberleri (bkz. tasks/05-kap-haberler.md §B — "EN ÖNEMLİ PARÇA"). `tf`den
  // BAĞIMSIZ ayrı bir efekt: haber, zaman dilimi değişince yeniden çekilmez, yalnızca
  // sembol değişince (panel açıldığında `${BASE_PATH}/data/news/{SEMBOL}.json`, bkz.
  // görev §B). `fetchStockNews()` HİÇBİR ZAMAN reddetmez (bkz. lib/news.ts) — haber
  // yoksa/ağ hatasında boş dizi döner, bu da doğal olarak "Son 7 günde KAP bildirimi
  // yok" mesajına düşer; ayrı bir hata durumu YOK (bkz. lib/news.ts yorumu).
  const [news, setNews] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`${BASE_PATH}/data/detail/${symbol}-${tf}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`İstek başarısız (${res.status})`);
        return res.json() as Promise<DetailData>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Detay verisi alınamadı.");
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, tf]);

  useEffect(() => {
    let cancelled = false;
    setNews(null);
    fetchStockNews(symbol).then((items) => {
      if (!cancelled) setNews(items);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div className="drawer-overlay" onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(9,10,18,0.58)" }} />
      <div className="drawer-panel" role="dialog" aria-modal="true" aria-label={`${symbol} hisse detayı`}>
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 500, letterSpacing: "0.01em", flex: "none" }}>
              {symbol}
            </span>
            {data ? (
              <>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--color-neutral-300)",
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {data.name}
                </span>
                <span className="tag tag-neutral" style={{ fontSize: 10.5, flex: "none" }}>
                  {data.sector}
                </span>
              </>
            ) : (
              <span style={{ flex: "1 1 auto" }} />
            )}
            <button type="button" className="btn btn-icon" onClick={onClose} title="Kapat" aria-label="Kapat">
              <X size={18} weight="bold" />
            </button>
          </div>

          {!data ? (
            error ? (
              excludedLoading ? (
                <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--color-neutral-400)" }}>Yükleniyor…</div>
              ) : excludedEntry ? (
                <div style={{ marginTop: 14 }}>
                  <ExcludedNotice entries={[excludedEntry]} onJumpToTf={onTimeframeChange} />
                </div>
              ) : (
                <div style={{ marginTop: 14, fontSize: 12.5, color: COLOR_DOWN }}>
                  Detay verisi alınamadı: {error}
                </div>
              )
            ) : (
              <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--color-neutral-400)" }}>Yükleniyor…</div>
            )
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, rowGap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 23, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                  {formatPrice(data.price)}
                </span>
                <span
                  style={{
                    color: data.chg > 0 ? COLOR_UP : data.chg < 0 ? COLOR_DOWN : "var(--color-neutral-300)",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {formatChange(data.chg)}
                </span>
                <span
                  className="tag"
                  style={{
                    background: `color-mix(in oklab, ${signalTagColor(data.signal)} 13%, transparent)`,
                    color: signalTagColor(data.signal),
                    border: `1px solid color-mix(in oklab, ${signalTagColor(data.signal)} 35%, transparent)`,
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  {data.signal}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-neutral-400)" }}>
                    Skor
                  </span>
                  <div style={{ width: 84, height: 5, borderRadius: 99, background: "var(--color-neutral-800)", overflow: "hidden" }}>
                    <div style={{ width: `${data.score}%`, height: "100%", background: scoreColor(data.signal), borderRadius: 99 }} />
                  </div>
                  <span style={{ color: scoreColor(data.signal), fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 14 }}>
                    {formatInt(data.score)}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-neutral-500)", marginTop: 6 }}>
                {TF_LABEL[tf]} · son 70 bar
              </div>
              <DelayNotice />
            </>
          )}
        </div>

        {data ? <DrawerBody data={data} news={news} /> : null}
      </div>
    </div>
  );
}

/** "Göz ardı edilemeyecek" gecikme uyarısı — tasks/03 "Kimin kullanacağı" §2. */
function DelayNotice() {
  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        border: "1px solid color-mix(in oklab, var(--color-accent) 30%, transparent)",
        background: "color-mix(in oklab, var(--color-accent) 8%, transparent)",
      }}
    >
      <Clock size={15} weight="bold" style={{ flex: "none", marginTop: 1, color: "var(--color-accent-200)" }} />
      <span style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--color-neutral-200)" }}>
        Veri ~15 dakika gecikmeli (2026-07-27 tarihinde ölçüldü) — gösterilen fiyat canlı değildir. Seans
        sırasındaysa son bar henüz kapanmamış olabilir; bu durumda göstergeler geçicidir. Yatırım tavsiyesi
        değildir.
      </span>
    </div>
  );
}

function DrawerBody({ data, news }: { data: DetailData; news: NewsItem[] | null }) {
  const vmax = Math.max(...data.chart.bars.map((b) => b.v)) || 1;

  return (
    <div className="drawer-body">
      <Section title="Fiyat + Bollinger (20,2)">
        <PriceChart chart={data.chart} price={data.price} />
      </Section>

      <Section title="Hacim" caption={`20 bar ort. çizgisi · zirve ${formatVolumeMn(vmax * data.price)}`}>
        <VolumeChart chart={data.chart} />
      </Section>

      <Section
        title="MACD (12,26,9)"
        caption={
          <>
            <span style={{ color: "var(--color-accent-300)" }}>━</span> MACD {formatSigned(data.macd)} ·{" "}
            <span style={{ color: "var(--color-neutral-400)" }}>╌</span> Sinyal {formatSigned(data.msig)}
          </>
        }
      >
        <MacdChart chart={data.chart} crossDir={data.crossDir} crossBars={data.crossBars} />
      </Section>

      <Section
        title="Stokastik (14,3,3)"
        caption={
          <>
            <span style={{ color: "var(--color-accent-300)" }}>━</span> %K {formatInt(data.k)} ·{" "}
            <span style={{ color: "var(--color-neutral-400)" }}>╌</span> %D {formatInt(data.d)}
          </>
        }
      >
        <StochChart chart={data.chart} />
      </Section>

      <Section title="Göstergeler">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <StatCard label="RSI (14)" value={formatInt(data.rsi)} />
          <StatCard label="ATR" value={formatPercent1(data.atrPct)} />
          <StatCard label="Relatif hacim" value={formatRatio1(data.relVol)} />
          <StatCard label="Bollinger %B" value={formatDecimal2(data.pctB)} />
          <StatCard label="Son bar hacmi" value={formatVolumeMn(data.volTL)} />
          <StatCard label="70 bar aralığı" value={`${nf1.format(data.lo70)} – ${nf1.format(data.hi70)}`} />
        </div>
      </Section>

      <Section title="Skor bileşenleri">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {data.breakdown.map((b) => (
            <ScoreRow key={b.k} component={b} />
          ))}
        </div>
      </Section>

      <Section title="Şirket haberleri">
        <CompanyNews news={news} />
      </Section>
    </div>
  );
}

/**
 * Şirket haberleri (bkz. tasks/05-kap-haberler.md §B "EN ÖNEMLİ PARÇA" — "bu hisse
 * neden hareketlendi?" sorusunun cevabı). `NewsList`teki panel/mobile varyantlarından
 * BİLEREK ayrı: burada gezinme çip'i YOK (zaten bu hissenin kendi panelindeyiz, kendi
 * sembolüne tıklamak anlamsız) ve tasarım şartnamesi (§ "2. Hisse detay paneli" madde
 * 7) sabit 64px zaman sütunlu, temel çizgi hizalı farklı bir satır düzeni tanımlıyor.
 * Metin KAP'ın kendi ifadesiyle: `subject` birincil, `summary` (varsa) ikincil (bkz.
 * görev §B "konu + varsa özet").
 */
function CompanyNews({ news }: { news: NewsItem[] | null }) {
  if (news === null) {
    return <div style={{ fontSize: 12.5, color: "var(--color-neutral-400)" }}>Yükleniyor…</div>;
  }
  if (news.length === 0) {
    return <div style={{ fontSize: 12.5, color: "var(--color-neutral-400)" }}>Son 7 günde KAP bildirimi yok.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {news.map((item) => {
        const style = importanceTagStyle(item.importance);
        const text = item.subject || item.title || "Bildirim";
        return (
          <div
            key={item.index}
            style={{
              padding: "9px 0",
              borderBottom: "1px solid color-mix(in oklab, var(--color-neutral-800) 55%, transparent)",
              display: "flex",
              gap: 10,
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                color: "var(--color-neutral-500)",
                fontVariantNumeric: "tabular-nums",
                flex: "none",
                width: 64,
              }}
            >
              {formatNewsTime(item.publishedAt)}
            </span>
            <span
              style={{
                fontSize: 10.5,
                color: style.color,
                border: style.border,
                background: style.background,
                borderRadius: 99,
                padding: "1px 7px",
                flex: "none",
              }}
            >
              KAP
            </span>
            <span style={{ fontSize: 12.3, lineHeight: 1.45, color: "var(--color-neutral-200)" }}>
              {text}
              {item.summary ? (
                <>
                  <br />
                  <span style={{ color: "var(--color-neutral-400)", fontSize: 11.5 }}>{item.summary}</span>
                </>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Skor bileşeni satırı — motorun ürettiği gerekçe metni (`n`) panelin en değerli
 * içeriği olduğu için (tasks/03) okunaklı boyut/renkte (14/neutral-200), bir dipnot
 * gibi küçük/sönük DEĞİL. Prototipteki tek satırlık 4 kolonlu grid yerine (78px etiket
 * + 110px bar + 36px puan + 1fr metin — 375px genişlikte metin sütununu ~77px'e
 * sıkıştırır) etiket+puan / bar / metin şeklinde 3 satıra bölünmüştür; bu, dar ekranda
 * yatay taşma olmadan gerekçe metnine tam genişlik verir (bkz. görev "Mobil" §D).
 */
function ScoreRow({ component }: { component: ScoreComponent }) {
  const { k, p, n } = component;
  const color = p > 0 ? COLOR_UP : p < 0 ? COLOR_DOWN : "var(--color-neutral-500)";
  const w = Math.min(50, (Math.abs(p) / 12) * 50);
  const left = p >= 0 ? 50 : 50 - w;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 12.5, color: "var(--color-neutral-100)" }}>
          {k}
        </span>
        <span style={{ color, fontVariantNumeric: "tabular-nums", fontSize: 12.5, fontWeight: 600 }}>
          {p > 0 ? "+" : ""}
          {p}
        </span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 99, background: "var(--color-neutral-800)" }}>
        <div style={{ position: "absolute", left: "50%", top: -1, bottom: -1, width: 1, background: "var(--color-neutral-600)" }} />
        <div
          style={{
            position: "absolute",
            left: `${left}%`,
            width: `${w}%`,
            top: 0,
            bottom: 0,
            background: color,
            borderRadius: 99,
          }}
        />
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--color-neutral-200)" }}>{n}</div>
    </div>
  );
}

function Section({ title, caption, children }: { title: string; caption?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, rowGap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-neutral-400)", flex: "none" }}>
          {title}
        </span>
        {caption ? <span style={{ fontSize: 10.5, color: "var(--color-neutral-500)" }}>{caption}</span> : null}
        <div style={{ flex: 1, minWidth: 24, height: 1, background: "linear-gradient(90deg, var(--color-neutral-700), transparent)" }} />
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--color-neutral-800)", borderRadius: "var(--radius-md)", padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-neutral-500)", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 15,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
