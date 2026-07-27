"use client";

/**
 * Mobil tarama listesindeki tek hisse kartı — bkz. tasks/04-mobil-gorunum.md §B.
 * Masaüstü `ScanTable` satırının 11 teknik kolonluk görünümünün yerini alır: burada
 * yalnızca sembol/fiyat/değişim/sinyal/skor + motorun ürettiği en güçlü gerekçe
 * metni var. %B, ATR%, STOK %K, MACD gibi ham gösterge değerleri KASITLI OLARAK
 * YOK — hedef kullanıcı (tasks/04 "Kimin kullanacağı") bunları yorumlayamaz; aynı
 * veriler `DetailDrawer`'da (karta dokununca açılır) kalmaya devam ediyor.
 */
import { changeColor, scoreColor, signalTagColor } from "../lib/colors";
import { formatChange, formatInt, formatPrice, formatSignedPrice } from "../lib/format";
import type { Position, PositionMetrics } from "../lib/portfolio";
import type { RowData } from "../lib/types";
import StarButton from "./StarButton";

/**
 * Portföy bölümü (tasks/07-portfoy-kar-zarar.md) — YALNIZCA Takibim sekmesi bu
 * prop'u geçirir (bkz. MobileList.tsx `portfolio` prop, WatchlistTab.tsx). Hisseler
 * sekmesindeki AYNI `StockCard`ta bu prop `undefined` kalır ve aşağıdaki blok hiç
 * render edilmez — görev metni "Takibim sekmesindeki her kartta" ifadesini
 * karşılamak için tek kart bileşenini bölmek yerine tercih edilen yol.
 */
interface StockCardPortfolioProps {
  position: Position | null;
  metrics: PositionMetrics | null;
  onEdit: () => void;
}

interface StockCardProps {
  row: RowData;
  onSelect: (symbol: string) => void;
  /** Takip listesi (tasks/06-takip-listesi-ve-kolonlar.md §A). */
  isWatched: boolean;
  onToggleWatch: () => void;
  portfolio?: StockCardPortfolioProps;
}

export default function StockCard({ row, onSelect, isWatched, onToggleWatch, portfolio }: StockCardProps) {
  return (
    // `<button>` DEĞİL: içinde StarButton (kendi `<button>`'ı) var, buton içinde buton
    // geçersiz HTML olurdu. `role="button"` + `tabIndex`/`onKeyDown` ile klavye
    // erişilebilirliği (Enter/Boşluk) native butonla AYNI kalır.
    <div
      className="mobile-card"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(row.symbol)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(row.symbol);
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, letterSpacing: "0.01em" }}>
            {row.symbol}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--color-neutral-400)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.name}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flex: "none" }}>
          <StarButton active={isWatched} onToggle={onToggleWatch} large />
          <div style={{ textAlign: "right", flex: "none" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 15,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatPrice(row.price)}
            </div>
            <div style={{ color: changeColor(row.chg), fontWeight: 600, fontSize: 13.5, marginTop: 2 }}>
              {formatChange(row.chg)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span
            className="tag"
            style={{
              background: `color-mix(in oklab, ${signalTagColor(row.signal)} 13%, transparent)`,
              color: signalTagColor(row.signal),
              border: `1px solid color-mix(in oklab, ${signalTagColor(row.signal)} 35%, transparent)`,
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {row.signal}
          </span>
          {/* Son 7 gündeki KAP bildirim sayısı (bkz. tasks/05-kap-haberler.md §D) —
              kullanıcı hangi hissede haber olduğunu listeden görebilsin. Yeşil/kırmızı
              KULLANILMAZ (nötr + accent tonu, bkz. görev "Sert kısıtlar"). */}
          {row.newsCount > 0 ? (
            <span
              className="tag tag-neutral"
              style={{ fontSize: 11, color: "var(--color-accent-200)", whiteSpace: "nowrap" }}
            >
              {row.newsCount} bildirim
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 56,
              height: 5,
              borderRadius: 99,
              background: "var(--color-neutral-800)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${row.score}%`,
                height: "100%",
                background: scoreColor(row.signal),
                borderRadius: 99,
              }}
            />
          </div>
          <span
            style={{
              color: scoreColor(row.signal),
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: 13.5,
              minWidth: 22,
              textAlign: "right",
            }}
          >
            {formatInt(row.score)}
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--color-neutral-800)", flex: "none" }} />

      {/* Motorun ürettiği Türkçe gerekçe — bkz. RowData.topReason (lib/scan-data.ts).
          Dipnot değil, listenin en değerli bilgisi: brief "gövde ≥ 14px" kısıtı
          burada tam olarak uygulanır (14px, tesadüf değil). */}
      <div style={{ fontSize: 14, lineHeight: 1.45, color: "var(--color-neutral-200)" }}>{row.topReason}</div>

      {portfolio ? (
        <>
          <div style={{ height: 1, background: "var(--color-neutral-800)", flex: "none" }} />
          <PortfolioSection
            hasPosition={portfolio.position != null}
            metrics={portfolio.metrics}
            onEdit={portfolio.onEdit}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Kartın portföy bölümü — tasks/07-portfoy-kar-zarar.md "Gösterim". Geçerli bir
 * pozisyon (lot+maliyet>0) yoksa YALNIZCA "Adet/maliyet ekle" bağlantısı (görev
 * "Boş/kısmi durumlar": "kartta yalnızca fiyat görünsün" — üstteki fiyat zaten
 * kartın başında gösteriliyor, burada ekstra para rakamı YOK). Varsa değer/kâr-
 * zarar/maliyet satırları + "Düzenle" bağlantısı.
 *
 * Etiketlerde BİLEREK "yaklaşık" geçer (dış görev metni "Kimin kullanacağı" §2 —
 * kesinlik iddia eden dil yasak, ör. "Portföy değeriniz" DENMEZ) — fiyata dayanan
 * (gecikmeli) alanlar: değer + kâr/zarar. Maliyet kullanıcının kendi girdiği sabit
 * bir sayı olduğu için (fiyata bağlı değil) "yaklaşık" İÇERMEZ.
 */
function PortfolioSection({
  hasPosition,
  metrics,
  onEdit,
}: {
  hasPosition: boolean;
  metrics: PositionMetrics | null;
  onEdit: () => void;
}) {
  // Dokunma hedefi 44px: kullanıcı yaşlıca ve telefondan kullanıyor, bu düğme de
  // pozisyon girmenin TEK yolu. Görsel olarak hâlâ bir bağlantı gibi görünsün diye
  // yükseklik dolguyla veriliyor, kutu çizilmiyor.
  const editLink = (label: string) => (
    <button
      type="button"
      className="btn btn-ghost"
      style={{
        alignSelf: "flex-start",
        padding: "0 8px",
        minHeight: 44,
        display: "inline-flex",
        alignItems: "center",
        fontSize: 13.5,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      {label}
    </button>
  );

  if (!metrics) {
    return editLink(hasPosition ? "Düzenle" : "Adet/maliyet ekle");
  }

  const pnlColor = changeColor(metrics.pnl);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11.5, color: "var(--color-neutral-400)" }}>Yaklaşık değer</span>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: 14,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatPrice(metrics.value)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11.5, color: "var(--color-neutral-400)" }}>Kâr/zarar (yaklaşık)</span>
        <span style={{ color: pnlColor, fontWeight: 600, fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>
          {formatSignedPrice(metrics.pnl)} · {formatChange(metrics.pnlPct)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>Maliyet</span>
        <span style={{ fontSize: 11.5, color: "var(--color-neutral-500)", fontVariantNumeric: "tabular-nums" }}>
          {formatPrice(metrics.cost)}
        </span>
      </div>
      {editLink("Düzenle")}
    </div>
  );
}
