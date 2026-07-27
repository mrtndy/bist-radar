"use client";

/**
 * Takip listesi (watchlist) — bkz. tasks/06-takip-listesi-ve-kolonlar.md §A.
 *
 * Mimari: site tamamen statik (hesap/sunucu/giriş yok), bu yüzden kalıcılık İKİ
 * mekanizmayla sağlanır:
 *  1. localStorage (`bist-radar:takip`) — cihazda kalıcı, sembol dizisi (JSON).
 *  2. URL paylaşımı (`?takip=THYAO,GARAN`) — kritik senaryo: bir kişi listeyi
 *     hazırlayıp bağlantıyı asıl kullanıcıya gönderiyor; o tıklayınca listesi
 *     hazır geliyor, sembol arayıp tek tek eklemek zorunda kalmıyor (bkz. görev
 *     "Mimari kısıt" ve dış görev metni "WHO THIS IS FOR").
 *
 * Hidrasyon: `ScanScreen.tsx`'teki `isMobile` ile AYNI desen. İlk state her zaman
 * "boş/varsayılan" (sunucunun/derleme zamanının bileceği TEK durum) — gerçek
 * localStorage/URL okuması yalnızca mount sonrası bir efektte olur. Aksi hâlde ilk
 * istemci render'ı sunucudan farklı çıkar ve React hydration hatası verir.
 *
 * Depolama erişimi HER YERDE try/catch içinde: gizli sekmede veya depolama
 * engelliyse özellik sessizce devre dışı kalır, uygulama çökmez (bkz. görev
 * "Sert kısıtlar").
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bist-radar:takip";
const URL_PARAM = "takip";

export interface PendingImport {
  /** URL'den gelen, henüz kullanıcıya sorulmamış sembol listesi. */
  symbols: string[];
}

function normalizeSymbols(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim().toLocaleUpperCase("tr");
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** `"THYAO,GARAN, bimas"` -> `["THYAO","GARAN","BIMAS"]` (boşlar atılır, tekrar elenir). */
function parseTakipParam(raw: string): string[] {
  return normalizeSymbols(raw.split(","));
}

/** localStorage'dan oku — engelliyse (gizli sekme/kota/izin) veya JSON bozuksa sessizce []. */
function readStoredWatchlist(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeSymbols(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** localStorage'a yaz — başarısız olursa sessizce yut (özellik pasifleşir, çökmez). */
function writeStoredWatchlist(symbols: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    // Kasıtlı: depolama engelliyse takip listesi kalıcı olmaz ama uygulama çalışmaya devam eder.
  }
}

/** `?takip=...`'i adres çubuğundan kaldırır (görev metni: "Uygulandıktan sonra URL'yi
 * temizle... ki yenilemede tekrar sormasın"). Geçmişe yeni giriş EKLEMEZ. */
function cleanUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(URL_PARAM)) return;
    url.searchParams.delete(URL_PARAM);
    window.history.replaceState(null, "", url.toString());
  } catch {
    // history/URL API kullanılamıyorsa sessizce vazgeç — kritik değil, sadece kozmetik.
  }
}

export interface UseWatchlistResult {
  /** Şu anki takip listesi (mount öncesi / sunucuda her zaman []). */
  symbols: string[];
  isWatched: (symbol: string) => boolean;
  toggle: (symbol: string) => void;
  /** URL'den gelen ve localStorage doluyken kullanıcıya sorulması gereken liste (yoksa null). */
  pendingImport: PendingImport | null;
  /** Üç seçenekten biri (görev metni): birleştir / değiştir / yoksay. Her durumda URL temizlenir. */
  resolvePendingImport: (choice: "merge" | "replace" | "ignore") => void;
}

export function useWatchlist(): UseWatchlistResult {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  // Mount sonrası TEK seferlik: localStorage oku, URL'de ?takip= varsa uygula/sor.
  // `isMobile` ile birebir aynı gerekçe (bkz. ScanScreen.tsx) — ilk render sunucu/
  // derleme çıktısıyla ([] / null) aynı kalsın diye bu okuma efekte ertelenir.
  useEffect(() => {
    const stored = readStoredWatchlist();
    setSymbols(stored);

    let urlSymbols: string[] = [];
    try {
      const url = new URL(window.location.href);
      const raw = url.searchParams.get(URL_PARAM);
      if (raw) urlSymbols = parseTakipParam(raw);
    } catch {
      urlSymbols = [];
    }
    if (urlSymbols.length === 0) return;

    if (stored.length === 0) {
      // localStorage boş: doğrudan uygula, sormadan, URL'yi temizle.
      setSymbols(urlSymbols);
      writeStoredWatchlist(urlSymbols);
      cleanUrl();
    } else {
      // localStorage dolu: kullanıcıya sor (üç seçenek, bkz. resolvePendingImport).
      setPendingImport({ symbols: urlSymbols });
    }
  }, []);

  const persist = useCallback((next: string[]) => {
    setSymbols(next);
    writeStoredWatchlist(next);
  }, []);

  // Fonksiyonel güncelleme (`prev` üzerinden) KASITLI: iki yıldıza art arda hızlı
  // basınca (veya otomatik testte iki `.click()` aynı JS turunda ateşlenince) React
  // henüz yeniden render ETMEDEN ikinci tıklama da işlenebilir — `symbols`i doğrudan
  // closure'dan okusaydık ikisi de AYNI eski değeri görür, biri diğerini ezerdi.
  // `prev` her zaman kuyruktaki bir önceki güncellemenin sonucudur, bu yüzden güvenli.
  const toggle = useCallback((symbol: string) => {
    setSymbols((prev) => {
      const has = prev.includes(symbol);
      const next = has ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      writeStoredWatchlist(next);
      return next;
    });
  }, []);

  const resolvePendingImport = useCallback(
    (choice: "merge" | "replace" | "ignore") => {
      if (pendingImport) {
        if (choice === "merge") persist(normalizeSymbols([...symbols, ...pendingImport.symbols]));
        else if (choice === "replace") persist(pendingImport.symbols);
        // "ignore": listeye dokunma.
      }
      cleanUrl();
      setPendingImport(null);
    },
    [pendingImport, persist, symbols],
  );

  const isWatched = useCallback((symbol: string) => symbols.includes(symbol), [symbols]);

  return { symbols, isWatched, toggle, pendingImport, resolvePendingImport };
}

/**
 * Paylaşım bağlantısı — mevcut sayfa (origin + basePath'li yol) + temiz `?takip=...`.
 * Diğer tüm sorgu parametreleri/hash bilerek atılır: bu uygulamada URL durumu
 * yalnızca `takip`'tir, "Listeyi paylaş" her zaman sade bir bağlantı üretir.
 * Sembol adları yalnızca Latin harf/rakam içerdiği için `encodeURIComponent` burada
 * pratikte no-op'tur; virgüller okunaklılık için (görev metnindeki örnekle birebir
 * aynı biçim) BİLEREK kodlanmadan bırakılır.
 */
export function buildShareUrl(symbols: string[]): string {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = `?${URL_PARAM}=${symbols.map((s) => encodeURIComponent(s)).join(",")}`;
  return url.toString();
}
