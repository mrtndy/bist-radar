"use client";

/**
 * KAP haber akışı öğe listesi — masaüstü sağ panel (`NewsPanel`) ve mobil "Haberler"
 * sekmesi (bkz. tasks/05-kap-haberler.md §C, §D) TARAFINDAN PAYLAŞILIR. İki varyant
 * farklı ETKİLEŞİM MODELİ kullanır (yalnızca boyut değil):
 *
 * - "panel" (masaüstü, ~292px dar sütun): tasarım şartnamesindeki birebir düzen —
 *   satır kendisi tıklanabilir DEĞİL, yalnızca hisse kodu başına ayrı bir "SEMBOL →"
 *   çip düğmesi tıklanabilir (bkz. design_handoff "Sağ haber paneli"). Fare imleci
 *   küçük hedeflerde sorun değil.
 * - "mobile" (kart listesi): brief §D "hisse kodu olan öğelere dokununca..." — burada
 *   KARTIN TAMAMI tek dokunma hedefi (≥44px, brief'in mobil dokunma hedefi kısıtı):
 *   küçük bir çip yerine bütün kart tıklanabilir olur (birden fazla sembol varsa
 *   ilki açılır, diğerleri salt bilgi etiketi olarak gösterilir — KAP'ta bu çok
 *   nadir, aynı şirketin iki payı gibi durumlar). Sembolsüz öğe (nadiren olur, ör.
 *   KAP'ın kendi meta duyuruları) tıklanabilir DEĞİLDİR, düz metin kalır.
 *
 * Metinler KAP'ın kendi ifadesiyle birebir gösterilir (LLM özetleme/yorumlama YOK —
 * bkz. görev "Kapsam dışı"): `subject` birincil satır, `summary` (varsa) ikincil satır
 * (bkz. görev §B "konu + varsa özet" sırası).
 */
import { importanceTagStyle } from "../lib/news-importance";
import { formatNewsTime, kapDisclosureUrl } from "../lib/news";
import type { NewsItem } from "../lib/types";

interface NewsListProps {
  /** `null` = henüz yüklenmedi (fetch sürüyor). */
  items: NewsItem[] | null;
  onSelectSymbol: (symbol: string) => void;
  /** `items` boş dizi olduğunda gösterilecek sade metin (bkz. görev §B). */
  emptyText: string;
  variant: "panel" | "mobile";
}

export default function NewsList({ items, onSelectSymbol, emptyText, variant }: NewsListProps) {
  if (items === null) {
    return (
      <div style={{ padding: variant === "panel" ? "14px" : "18px 14px", fontSize: 12.5, color: "var(--color-neutral-400)" }}>
        Yükleniyor…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: variant === "panel" ? "20px 14px" : "28px 14px", fontSize: variant === "panel" ? 12.5 : 14, color: "var(--color-neutral-400)", textAlign: "center" }}>
        {emptyText}
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <MobileNewsCard key={item.index} item={item} onSelectSymbol={onSelectSymbol} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {items.map((item) => (
        <PanelNewsRow key={item.index} item={item} onSelectSymbol={onSelectSymbol} />
      ))}
    </div>
  );
}

function SourcePill({ item }: { item: NewsItem }) {
  const style = importanceTagStyle(item.importance);
  return (
    <span
      style={{
        color: style.color,
        border: style.border,
        background: style.background,
        borderRadius: 99,
        padding: "1px 7px",
        fontSize: 10.5,
        flex: "none",
        whiteSpace: "nowrap",
      }}
    >
      KAP
    </span>
  );
}

/**
 * "KAP'ta oku" — bildirimin aslına götürür. Yeni sekmede açılır ki kullanıcı
 * uygulamadan çıkmasın (yaşlıca bir kullanıcı için geri dönmeyi bulmak zahmetli).
 * Metinli, sadece ikon değil: ne yaptığı okunabilir olmalı.
 */
function KapLink({ index, big = false }: { index: number; big?: boolean }) {
  if (!Number.isFinite(index)) return null;
  return (
    <a
      href={kapDisclosureUrl(index)}
      target="_blank"
      rel="noopener noreferrer"
      className="news-chip"
      onClick={(e) => e.stopPropagation()}
      style={
        big
          ? { minHeight: 44, display: "inline-flex", alignItems: "center", fontSize: 13, textDecoration: "none" }
          : { textDecoration: "none" }
      }
      title="Bildirimin tamamını KAP sitesinde aç"
    >
      KAP&apos;ta oku ↗
    </a>
  );
}

/** Masaüstü sağ panel satırı — design_handoff "Sağ haber paneli" ile birebir. */
function PanelNewsRow({ item, onSelectSymbol }: { item: NewsItem; onSelectSymbol: (symbol: string) => void }) {
  const text = item.subject || item.title || "Bildirim";
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid color-mix(in oklab, var(--color-neutral-800) 55%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5 }}>
        <span style={{ color: "var(--color-neutral-500)", fontVariantNumeric: "tabular-nums", flex: "none" }}>
          {formatNewsTime(item.publishedAt)}
        </span>
        <SourcePill item={item} />
      </div>
      <div style={{ fontSize: 12.3, lineHeight: 1.45, color: "var(--color-neutral-200)" }}>{text}</div>
      {item.summary ? (
        <div style={{ fontSize: 11.5, lineHeight: 1.4, color: "var(--color-neutral-400)" }}>{item.summary}</div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        {item.symbols.map((sym) => (
          <button key={sym} type="button" className="news-chip" onClick={() => onSelectSymbol(sym)}>
            {sym} →
          </button>
        ))}
        <KapLink index={item.index} />
      </div>
    </div>
  );
}

/** Mobil kart — brief §D: kart tamamı dokunma hedefi (sembol varsa). */
function MobileNewsCard({ item, onSelectSymbol }: { item: NewsItem; onSelectSymbol: (symbol: string) => void }) {
  const text = item.subject || item.title || "Bildirim";
  const primary = item.symbols[0];
  const extra = item.symbols.slice(1);

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    textAlign: "left",
    padding: 14,
    background: "var(--color-surface)",
    border: "1px solid var(--color-neutral-800)",
    borderRadius: "var(--radius-lg)",
    fontFamily: "inherit",
    color: "inherit",
  };

  const body = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
        <span style={{ color: "var(--color-neutral-500)", fontVariantNumeric: "tabular-nums", flex: "none" }}>
          {formatNewsTime(item.publishedAt)}
        </span>
        <SourcePill item={item} />
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.45, color: "var(--color-neutral-200)" }}>{text}</div>
      {item.summary ? (
        <div style={{ fontSize: 13, lineHeight: 1.4, color: "var(--color-neutral-400)" }}>{item.summary}</div>
      ) : null}
      {item.symbols.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {item.symbols.map((sym) => (
            <span key={sym} className="tag tag-neutral" style={{ fontSize: 11 }}>
              {sym}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );

  // Kart bir <button> DEĞİL, içinde buton olan bir <div>: KAP bağlantısı (<a>) bir
  // <button> içine konamaz (geçersiz HTML, tıklama davranışı da bozulur). Gövdenin
  // tamamı yine tek dokunuşla hissenin detayını açar — sadece sarmalayıcı değişti.
  return (
    <div style={{ ...cardStyle, gap: 10 }}>
      {primary ? (
        <button
          type="button"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: "100%",
            textAlign: "left",
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            color: "inherit",
            cursor: "pointer",
            appearance: "none",
          }}
          onClick={() => onSelectSymbol(primary)}
          title={extra.length ? `${primary} (+${extra.length}) hissesinin detayını aç` : `${primary} hissesinin detayını aç`}
        >
          {body}
        </button>
      ) : (
        body
      )}
      <div style={{ display: "flex" }}>
        <KapLink index={item.index} big />
      </div>
    </div>
  );
}
