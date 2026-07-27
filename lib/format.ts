/**
 * Sayı/tarih biçimlendirme — brief kısıtı: her yerde `Intl.NumberFormat("tr-TR")`
 * (virgül ondalık). Prototipteki `fp`/`fchg`/`fmtMn` fonksiyonlarının birebir
 * karşılığıdır (bkz. `BIST Radar.dc.html` `renderVals()`); gösterge/skor MATEMATİĞİ
 * değildir, yalnızca görüntüleme biçimidir.
 */
const nf2 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nfInt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

/**
 * Bazı semboller barlarında dejenere veri taşır (ör. hacmi haftalarca 0 kalan,
 * fiyatı sabit kalan sembol) — motorun kendi matematiği bu durumda NaN/Infinity
 * üretebilir (0/0 vb., bkz. `indicators.ts` relVol hesabı). Bu, motor
 * MATEMATİĞİNİN bir parçası ve DEĞİŞTİRİLMEZ; yalnızca görüntülemede ham "NaN"
 * metninin kullanıcıya sızmasını önlüyoruz.
 */
const PLACEHOLDER = "—";

export function formatPrice(v: number): string {
  if (!Number.isFinite(v)) return PLACEHOLDER;
  return `${nf2.format(v)} ₺`;
}

export function formatChange(v: number): string {
  if (!Number.isFinite(v)) return PLACEHOLDER;
  return `%${v > 0 ? "+" : ""}${nf2.format(v)}`;
}

/**
 * İşaretli para tutarı — portföy kâr/zarar tutarı için (bkz.
 * tasks/07-portfoy-kar-zarar.md). `formatChange` ile AYNI işaret kalıbı
 * (pozitifte "+" öneki), `formatPrice` ile AYNI iki ondalık/"₺" son eki.
 */
export function formatSignedPrice(v: number): string {
  if (!Number.isFinite(v)) return PLACEHOLDER;
  return `${v > 0 ? "+" : ""}${nf2.format(v)} ₺`;
}

export function formatVolumeMn(v: number): string {
  if (!Number.isFinite(v)) return PLACEHOLDER;
  return `${nf1.format(v / 1e6)} Mn ₺`;
}

export function formatPercent1(v: number): string {
  if (!Number.isFinite(v)) return PLACEHOLDER;
  return `%${nf1.format(v)}`;
}

export function formatRatio1(v: number): string {
  if (!Number.isFinite(v)) return PLACEHOLDER;
  return `${nf1.format(v)}×`;
}

export function formatDecimal2(v: number): string {
  if (!Number.isFinite(v)) return PLACEHOLDER;
  return nf2.format(v);
}

export function formatInt(v: number): string {
  if (!Number.isFinite(v)) return PLACEHOLDER;
  return nfInt.format(Math.round(v));
}

export function formatMacdCell(hist: number, histPct: number): string {
  if (!Number.isFinite(hist) || !Number.isFinite(histPct)) return PLACEHOLDER;
  return `${hist >= 0 ? "▲ " : "▼ "}%${nf2.format(Math.abs(histPct))}`;
}

/** Motorun `indicators.ts` içindeki `labelsFor()` ile aynı ay kısaltmaları (dosya export etmediği için burada küçük ölçekte tekrarlanır — gösterge matematiği değil, yalnızca tarih etiketi biçimi). */
const AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** Üst bar "Son: …" etiketi için epoch ms -> "27 Tem 18:10" (Europe/Istanbul). */
export function formatLastUpdated(ms: number): string {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = AY[Number(get("month")) - 1] ?? "";
  return `${get("day")} ${month} ${get("hour")}:${get("minute")}`;
}

/** Serbest metin sayı alanları için gevşek ayrıştırma — virgül veya nokta ondalık, boş = sınır yok. */
export function parseLenient(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}
