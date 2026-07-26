/**
 * KAP (Kamuyu Aydınlatma Platformu) sağlayıcısı — hisse evreni ve şirket bildirimleri.
 *
 * Bunlar KAP arayüzünün kendi çağırdığı, kimlik doğrulaması istemeyen JSON uçlarıdır;
 * resmî olarak belgelenmiş bir kamu API'si DEĞİLDİR. Uçlar habersiz değişebilir, bu yüzden
 * çağrılar dar tutulur ve şema hataları yukarı taşınır. Ölçüm (2026-07-27): bildirimler
 * saniye hassasiyetli `publishDate` ile geliyor ve `stockCodes` alanı hisse eşlemesini
 * hazır veriyor.
 */
import type { UniverseEntry } from "../engine/types.ts";

const BASE = "https://www.kap.org.tr/tr/api";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function kapFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: "https://www.kap.org.tr/tr/bildirim-sorgu",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`KAP ${path} -> HTTP ${res.status}`);
  return res.json();
}

interface KapCompany {
  stockCode: string | null;
  kapMemberTitle: string | null;
  kapMemberState: string | null;
  payIslemDurumu: string | null;
  cityName: string | null;
}

/** Şirket unvanını tabloda gösterilebilir kısa ada indirger. */
export function shortName(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /\s+(A\.Ş\.?|ANONİM ŞİRKETİ|T\.A\.Ş\.?|HOLDİNG A\.Ş\.?)$/i,
      "",
    )
    .replace(/\s+(SANAYİ VE TİCARET|SANAYİ VE TİC\.|TİCARET VE SANAYİ|SAN\. VE TİC\.)$/i, "")
    .trim();
}

/**
 * İşlem gören BIST hisselerinin listesi.
 * `payIslemDurumu === "1"` = payları işlem görüyor (2026-07-27 ölçümü: 743 üyeden 615'i).
 */
export async function getUniverse(): Promise<UniverseEntry[]> {
  const raw = (await kapFetch("/company/items/IGS/A")) as KapCompany[];
  if (!Array.isArray(raw)) throw new Error("KAP evren yanıtı dizi değil");

  const out: UniverseEntry[] = [];
  for (const c of raw) {
    if (c.kapMemberState !== "A" || c.payIslemDurumu !== "1") continue;
    if (!c.stockCode || c.stockCode === "-") continue;
    // Bazı kayıtlar çoklu kod taşır: "A1CAP, ACP" — her kodu ayrı hisse olarak aç.
    for (const code of c.stockCode.split(",").map((s) => s.trim().toUpperCase())) {
      if (!code || code === "-") continue;
      out.push({
        symbol: code,
        name: shortName(c.kapMemberTitle ?? code),
        sector: "Diğer", // sektör ayrı kaynaktan zenginleştirilir (bkz. scripts/build-universe.ts)
      });
    }
  }
  out.sort((a, b) => a.symbol.localeCompare(b.symbol, "tr"));
  return out;
}

export interface Disclosure {
  /** KAP'ın tekil bildirim kimliği — tekilleştirme anahtarı. */
  index: number;
  /** Epoch ms (Europe/Istanbul saatinden çevrilmiş). */
  publishedAt: number;
  /** Ham `dd.MM.yyyy HH:mm:ss` metni. */
  publishedRaw: string;
  title: string;
  subject: string;
  summary: string | null;
  /** İlgili hisse kodları. */
  symbols: string[];
}

interface KapDisclosure {
  disclosureIndex: number;
  publishDate: string;
  kapTitle: string | null;
  subject: string | null;
  summary: string | null;
  stockCodes: string | null;
}

/** "26.07.2026 16:59:25" (Europe/Istanbul) -> epoch ms. */
function parseKapDate(s: string): number {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return Number.NaN;
  const [, d, mo, y, h, mi, sec] = m;
  // TSİ sabit UTC+3 (Türkiye 2016'dan beri yaz saati uygulamıyor).
  return Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${sec}+03:00`);
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Verilen tarih aralığındaki bildirimler (varsayılan: bugün), en yeniden eskiye.
 * Seans içi 15-30 sn'de bir çağrılıp `index` ile tekilleştirilmek üzere tasarlandı.
 */
export async function getDisclosures(opts: { from?: number; to?: number } = {}): Promise<Disclosure[]> {
  const to = opts.to ?? Date.now();
  const from = opts.from ?? to;
  const raw = (await kapFetch("/disclosure/members/byCriteria", {
    method: "POST",
    body: JSON.stringify({
      fromDate: iso(from),
      toDate: iso(to),
      mkkMemberOidList: [],
      subjectList: [],
    }),
  })) as KapDisclosure[];
  if (!Array.isArray(raw)) throw new Error("KAP bildirim yanıtı dizi değil");

  return raw
    .map((d) => ({
      index: d.disclosureIndex,
      publishedAt: parseKapDate(d.publishDate ?? ""),
      publishedRaw: d.publishDate ?? "",
      title: d.kapTitle ?? "",
      subject: d.subject ?? "",
      summary: d.summary,
      symbols: (d.stockCodes ?? "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    }))
    .filter((d) => Number.isFinite(d.publishedAt))
    .sort((a, b) => b.publishedAt - a.publishedAt);
}
