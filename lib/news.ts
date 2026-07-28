/**
 * İstemci tarafı KAP haber yardımcıları — bkz. tasks/05-kap-haberler.md. Veriler
 * derleme zamanında `scripts/build-news.ts` tarafından üretilir (`public/data/
 * news-feed.json`, `public/data/news/{SEMBOL}.json`); burada yalnızca İSTEK ÜZERİNE bu
 * dosyaları indirip biçimlendiren istemci yardımcıları var — sınıflandırma MANTIĞI
 * değil (bkz. `lib/news-importance.ts`).
 *
 * Her iki fetch de HİÇBİR ZAMAN reddetmez (throw etmez): dosya yoksa (o hissede / o
 * hafta piyasa genelinde bildirim yok, ya da `build:news` KAP'a erişemediği için hiç
 * dosya üretmedi) veya ağ hatası olursa boş dizi döner. Haber paneli/bölümü YARDIMCI
 * bir özelliktir — ScanScreen'in ana tarama verisi fetch'inin aksine (o, kullanıcıya
 * "hata: ..." gösterir) burada sessizce "haber yok" durumuna düşmek, teknik hata
 * mesajıyla telaşlandırmaktan daha doğru bir kullanıcı deneyimi (bkz. görev "WHO THIS
 * IS FOR" — borsa terminolojisine hakim olmayan, telefonundan işlem yapan kullanıcı).
 */
import type { NewsItem } from "./types";

// bkz. components/ScanScreen.tsx — statik export'ta alt dizin (GitHub Pages) desteği
// için aynı örüntü; derleme zamanında istemci paketine gömülür.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

async function fetchNewsJson(path: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${BASE_PATH}${path}`);
    if (!res.ok) return [];
    const json: unknown = await res.json();
    return Array.isArray(json) ? (json as NewsItem[]) : [];
  } catch {
    return [];
  }
}

/** Piyasa geneli haber akışı (bkz. `public/data/news-feed.json`, en fazla 80 öğe, önem+zaman sıralı). */
export function fetchNewsFeed(): Promise<NewsItem[]> {
  return fetchNewsJson("/data/news-feed.json");
}

/** Tek hissenin son 7 gündeki bildirimleri (bkz. `public/data/news/{SEMBOL}.json`, en fazla 15 öğe). */
export function fetchStockNews(symbol: string): Promise<NewsItem[]> {
  return fetchNewsJson(`/data/news/${encodeURIComponent(symbol)}.json`);
}

const timeFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** epoch ms -> "27.07 16:59" (Europe/Istanbul) — bkz. `scripts/news.ts`teki `fmt()` ile aynı biçim. */
export function formatNewsTime(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  return timeFmt.format(new Date(ms));
}

/**
 * Bir KAP bildiriminin kendi sayfası.
 *
 * Doğrulama (2026-07-28): bu adres HTTP 200 ve ~122 KB'lık gerçek bir belge döndürüyor;
 * karşılaştırma için yanlış adresler 12,8 KB'lık Next.js hata kabuğu dönüyor. Sayfanın
 * içeriği JavaScript ile render edildiği için başsız/sandbox tarayıcıda boş görünüyor —
 * KAZIMA amacıyla KULLANILMAZ, yalnızca kullanıcıyı bildirimin aslına götürür.
 */
export function kapDisclosureUrl(index: number): string {
  return `https://www.kap.org.tr/tr/Bildirim/${index}`;
}
