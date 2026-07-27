"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, FunnelSimple } from "@phosphor-icons/react";
import TopBar from "./TopBar";
import FilterPanel from "./FilterPanel";
import ScanTable, { EmptyState } from "./ScanTable";
import MobileList from "./MobileList";
import FilterSheet from "./FilterSheet";
import SortMenu from "./SortMenu";
import DetailDrawer from "./DetailDrawer";
import NewsPanel from "./NewsPanel";
import NewsList from "./NewsList";
import WatchlistTab, { WatchlistEmptyState } from "./WatchlistTab";
import ColumnMenu from "./ColumnMenu";
import ExcludedListModal, { ExcludedCounterButton } from "./ExcludedList";
import { formatLastUpdated, parseLenient } from "../lib/format";
import { fetchNewsFeed } from "../lib/news";
import { usePortfolio } from "../lib/portfolio";
import { useWatchlist } from "../lib/watchlist";
import { COLUMN_LABELS, useColumnLayout } from "../lib/columns";
import { SORT_NAMES } from "../lib/types";
import type {
  FilterState,
  NewsItem,
  RefreshState,
  RowData,
  ScanApiResponse,
  ScanResult,
  SortDir,
  SortKey,
  Timeframe,
} from "../lib/types";
import { usePanelPrefs, useTabPrefs } from "../lib/view-prefs";
import type { MobileTabId } from "../lib/view-prefs";

const TF_LABEL: Record<Timeframe, string> = { G: "Günlük", H: "Haftalık", S: "Saatlik" };

/**
 * Kırılma noktası (bkz. tasks/08-panel-gizleme-yatay-siralama.md §B — HATA
 * DÜZELTMESİ, ölçüldü 2026-07-27; önceki hâli tasks/04-mobil-gorunum.md §A):
 * SADECE genişliğe bakmak yanlıştı — yan çevrilmiş telefon (812×375) genişlik
 * eşiğini (720) geçtiği için masaüstü dalına düşüyordu, ama masaüstü tablosu
 * (min-width 1060px) + sol filtre paneli (236px) 812px'e sığmıyor, üstelik 375px
 * yükseklikte yalnızca ~5 satır görünüyordu ("masaüstü gibi" olmaya çalışıp
 * kullanılamaz hâle geliyordu). Yükseklik de eşiğe eklendi: gerçek bir masaüstü
 * penceresi nadiren 500px'den kısadır, yan çevrilmiş telefon HER ZAMAN kısadır —
 * bkz. aşağıdaki `check()` efekti: `isMobile = width < 720 || height < 500`.
 */
const MOBILE_BREAKPOINT = 720;
const MOBILE_MIN_HEIGHT = 500;

/** Mobil düzendeyken bu genişliğe ULAŞAN (yatay telefon gibi geniş-ama-kısa)
 * viewport'larda kart listesi tek sütun yerine iki sütunlu grid'e geçer (bkz.
 * tasks/08 §B "Ek iyileştirme") — dar dikey telefonda (375px) tek sütun kalır. */
const MOBILE_WIDE_MIN_WIDTH = 600;

/** Mobil kartların bir kerede kaç tanesi render edilir / kaydırınca kaç tane daha
 * eklenir (bkz. tasks/04-mobil-gorunum.md §E — performans ZORUNLU). */
const MOBILE_PAGE_SIZE = 50;

// GitHub Pages gibi alt dizinde servis eden statik host'lar için (next.config.ts'teki
// basePath ile aynı değer) — derleme zamanında istemci paketine gömülür, yerel
// geliştirmede boş string olur. Hem dev hem export'ta aynı statik JSON yolu kullanılır.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Mobil "Hisseler | Haberler | Takibim" sekmelerinin görüntülenme sırası + etiketi
 * (bkz. tasks/08 §A "Mobil", lib/view-prefs.ts `MobileTabId`). */
const MOBILE_TAB_ORDER: MobileTabId[] = ["hisseler", "haberler", "takibim"];
const MOBILE_TAB_LABELS: Record<MobileTabId, string> = {
  hisseler: "Hisseler",
  haberler: "Haberler",
  takibim: "Takibim",
};

const DEFAULT_FILTERS: FilterState = {
  sig: "ALL",
  sector: "Tümü",
  minScore: 0,
  minRelVol: 0,
  atrMin: "",
  atrMax: "",
  pMin: "",
  pMax: "",
  minVolM: "",
  q: "",
  chgDir: "ALL",
};

function getSortValue(row: RowData, key: SortKey): number {
  switch (key) {
    case "price":
      return row.price;
    case "chg":
      return row.chg;
    case "score":
      return row.score;
    case "k":
      return row.k;
    case "hist":
      return row.histPct;
    case "rsi":
      return row.rsi;
    case "atrPct":
      return row.atrPct;
    case "relVol":
      return row.relVol;
    case "pctB":
      return row.pctB;
    case "newsCount":
      return row.newsCount;
    default:
      return 0;
  }
}

/**
 * Ortak sıralama — hem masaüstü/mobil ana listede (`sortedRows`) hem de takip
 * listesi sekmesinde (`watchedRows`, bkz. tasks/06-takip-listesi-ve-kolonlar.md §A)
 * AYNI sıralama kuralı uygulansın diye tek yerde (görev metni Takibim'in "hangi
 * sırayla" göstereceğini belirtmiyor; en tutarlı/en az sürpriz seçenek, uygulamanın
 * geri kalanıyla aynı `sortKey`/`sortDir`'i kullanmak).
 */
function sortRows(rows: RowData[], sortKey: SortKey, sortDir: SortDir): RowData[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortKey === "symbol") return sortDir * a.symbol.localeCompare(b.symbol, "tr");
    return sortDir * (getSortValue(a, sortKey) - getSortValue(b, sortKey));
  });
  return copy;
}

interface ScanScreenProps {
  initialTf: Timeframe;
  initialData: ScanResult;
}

export default function ScanScreen({ initialTf, initialData }: ScanScreenProps) {
  const [tf, setTf] = useState<Timeframe>(initialTf);
  const [dataByTf, setDataByTf] = useState<Partial<Record<Timeframe, ScanResult>>>({
    [initialTf]: initialData,
  });
  const [loadingTf, setLoadingTf] = useState<Timeframe | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>(-1);
  // README "State Management": selectedSymbol (drawer). Zaman dilimi değişince panel
  // açık kalır ve DetailDrawer aynı sembol için yeni `tf`'in verisini fetch eder
  // (bkz. DetailDrawer'daki [symbol, tf] bağımlı efekt) — böylece tablo ve detay aynı
  // anda o dilimin verisine geçer (README "Interactions & Behavior").
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");

  // Mobil kırılma noktası (tasks/04-mobil-gorunum.md §A). `false` başlar (sunucuda
  // `window` yok) — bu, ilk render'ın masaüstü dalını üretmesini sağlar ki client
  // hidration'ı sunucuyla birebir eşleşsin (aksi hâlde React hidration uyuşmazlığı
  // -> konsol hatası verir, kabul kriteri 12'yi bozar). Gerçek genişlik mount
  // olduktan HEMEN sonra, aşağıdaki efektte ölçülür ve pencere yeniden boyutlanınca
  // güncellenir (Claude_Browser `resize_window` doğrulaması sayfayı yeniden
  // yüklemeden aynı sekmede boyut değiştirebiliyor).
  const [isMobile, setIsMobile] = useState(false);
  // Yan çevrilmiş telefonda (genişlik≥600) kartlar iki sütunlu grid olsun diye (bkz.
  // tasks/08 §B "Ek iyileştirme") — `isMobile` ile AYNI mount-sonrası desende, aynı
  // efektte ölçülür (aşağıda). Sunucu/derleme zamanı tek değeri bilir (1) diye `false`
  // yerine `1` ile başlar; masaüstü dalı bu değeri hiç okumaz, hidrasyon riski yok.
  const [mobileColumns, setMobileColumns] = useState<1 | 2>(1);
  // Yükseklik <500px olduğu İÇİN mobil olan durum (yan çevrilmiş telefon) — ölçüldü:
  // 812×375'te sabit üst bar (121px) + gecikme şeridi + sekme çubuğu + Filtrele/Sırala
  // satırı + "N/M hisse" sayaç satırı TOPLAMDA ~187px yer kaplıyor, karta yalnızca 67px
  // kalıyor (bir kart 151px) — kart HİÇ tam görünmüyordu. Bu bayrak true iken (yalnızca
  // kısa/yatay durumda) gecikme şeridi/sekme satırının dolgusu daralır ve Filtrele/Sırala
  // satırıyla sayaç TEK satırda birleşir (bkz. aşağıdaki JSX + DelayStrip `compact` prop).
  // `false` iken (375×812 DAHİL — 812≥500) hiçbir şey değişmez: kabul kriteri 10 ("dikey
  // düzen bugünkü hâliyle aynı") bu yüzden otomatik korunur — genişlik değil, SADECE
  // yükseklik eşiği bu bayrağı tetikler.
  const [isShortMobile, setIsShortMobile] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // Elenen (taranamayan) hisseler listesi modalı (bkz. tasks/09-eleme-gorunurlugu.md §D)
  // — `FilterSheet`/`DetailDrawer` ile AYNI "yalnızca açıkken mount et" deseni.
  const [excludedListOpen, setExcludedListOpen] = useState(false);
  // Mobil kartlarda ilk 50, kaydırınca/"daha fazla göster"e basınca +50 (tasks/04 §E).
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);
  // Mobil "Hisseler | Haberler | Takibim" sekmesi (bkz. tasks/05-kap-haberler.md §D,
  // tasks/06-takip-listesi-ve-kolonlar.md §A). "hisseler" ile başlar: ilk render'da
  // haber/takip kartları hiç mount edilmez, bu da mobil DOM düğümü bütçesini (kabul
  // kriteri 7, <2000) o listelerin boyutundan bağımsız kılar. Ayrıca "hisseler" ASLA
  // gizlenemeyen tek sekme (bkz. lib/view-prefs.ts) — güvenli, her zaman geçerli bir
  // varsayılan.
  const [mobileTab, setMobileTab] = useState<MobileTabId>("hisseler");
  // Panel (masaüstü) + sekme (mobil) görünürlük tercihleri (tasks/08 §A) —
  // localStorage okuması hook İÇİNDE `isMobile` ile AYNI mount-sonrası desenle
  // yapılır (bkz. lib/view-prefs.ts), burada yalnızca sonuç kullanılır/TopBar'a
  // (Görünüm menüsü) ve FilterPanel/NewsPanel'e (rail düğmeleri) geçirilir.
  const panelPrefs = usePanelPrefs();
  const tabPrefs = useTabPrefs();
  // Piyasa geneli KAP haber akışı (bkz. tasks/05-kap-haberler.md §C/§D) — `tf`/filtreden
  // BAĞIMSIZ, tek seferlik fetch (ScanScreen'in tarama verisi fetch'iyle AYNI mimari:
  // konteyner fetch eder, NewsPanel/NewsList yalnızca gösterir). `null` = henüz
  // yüklenmedi; `fetchNewsFeed()` HİÇBİR ZAMAN reddetmez (bkz. lib/news.ts) — ağ hatası
  // burada da sessizce boş diziye düşer, ayrı bir "hata" durumu YOK (haber yardımcı bir
  // özellik, ana tarama verisinin aksine kullanıcıyı teknik hatayla telaşlandırmaz).
  const [newsFeed, setNewsFeed] = useState<NewsItem[] | null>(null);

  // Takip listesi (tasks/06-takip-listesi-ve-kolonlar.md §A) — localStorage/URL
  // okuması hook İÇİNDE `isMobile` ile AYNI mount-sonrası desenle yapılır (bkz.
  // lib/watchlist.ts), burada yalnızca sonucu kullanılır.
  const { symbols: watchlistSymbols, isWatched, toggle: toggleWatch, pendingImport, resolvePendingImport } =
    useWatchlist();
  // Portföy: adet + ortalama maliyet (tasks/07-portfoy-kar-zarar.md) — takip
  // listesinden BAĞIMSIZ localStorage anahtarı (bkz. lib/portfolio.ts), aynı
  // mount-sonrası okuma deseni. Yalnızca Takibim sekmesine (WatchlistTab) geçirilir;
  // Hisseler sekmesindeki `MobileList` çağrısı bunu HİÇ almaz.
  const { positions: portfolioPositions, savePosition, removePosition } = usePortfolio();
  // Masaüstü "Takip listem" çipi (bkz. FilterPanel) — BİLEREK `FilterState`in parçası
  // DEĞİL: "Filtreleri sıfırla" bunu sıfırlamamalı (skor/sektör/vb. gibi türetilmiş bir
  // filtre değil, "hangi hisselerim var" sorusuna bakan ayrı bir eksen).
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  // Takibim sekmesinin kendi "daha fazla göster" sayacı (tasks/04 §E ile aynı desen) —
  // `visibleCount`tan (Hisseler sekmesi) BAĞIMSIZ, aksi hâlde iki sekme birbirinin
  // sayfalama ilerlemesini bozardı.
  const [watchlistVisibleCount, setWatchlistVisibleCount] = useState(MOBILE_PAGE_SIZE);

  // Masaüstü kolon düzeni (tasks/06-takip-listesi-ve-kolonlar.md §B) — localStorage
  // okuması hook İÇİNDE `isMobile`/takip listesiyle AYNI mount-sonrası desenle yapılır
  // (bkz. lib/columns.ts). Mobilde bu değerler ScanTable'a hiç ulaşmaz (ScanTable
  // yalnızca masaüstü dalında render edilir) — kabul kriteri 13 bu yüzden otomatik sağlanır.
  const columnLayout = useColumnLayout();

  useEffect(() => {
    let cancelled = false;
    fetchNewsFeed().then((items) => {
      if (!cancelled) setNewsFeed(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function check() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Bkz. dosya başı MOBILE_BREAKPOINT/MOBILE_MIN_HEIGHT yorumu (tasks/08 §B) —
      // HATA DÜZELTMESİ: yalnızca genişlik değil, yükseklik de kontrol edilir.
      setIsMobile(w < MOBILE_BREAKPOINT || h < MOBILE_MIN_HEIGHT);
      setMobileColumns(w >= MOBILE_WIDE_MIN_WIDTH ? 2 : 1);
      setIsShortMobile(h < MOBILE_MIN_HEIGHT);
    }
    check();
    window.addEventListener("resize", check);
    // Bazı tarayıcılarda döndürmede `resize` geç/eksik tetikleniyor (görev §B) —
    // `orientationchange` ek güvence olarak dinlenir.
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // Aktif mobil sekme "Görünüm" menüsünden gizlenirse Hisseler'e dön (görev §A
  // "Mobil": "Gizli bir sekme aktifken gizlenirse, otomatik olarak Hisseler'e
  // dönülsün"). `tabPrefs.hiddenTabs` mount sonrası (localStorage okunduktan sonra)
  // değiştiğinde de çalışır — o an açık sekme zaten kalıcı olarak gizli bir sekmeyse
  // aynı şekilde Hisseler'e düşer.
  useEffect(() => {
    if (mobileTab !== "hisseler" && tabPrefs.hiddenTabs.includes(mobileTab)) {
      setMobileTab("hisseler");
    }
  }, [tabPrefs.hiddenTabs, mobileTab]);

  /**
   * Yayınlanmış veriyi yeniden çeker.
   *
   * Neyi tazeler, neyi tazelemez: bu, GitHub Actions'ın en son YAYINLADIĞI veriyi getirir.
   * "Şimdi git yeni piyasa verisi çek" demek DEĞİLDİR — o iş akışını tetiklemek gerekir ve
   * bu site public olduğu için sayfaya token gömülemez. Veri iş akışı çalıştıkça tazelenir.
   *
   * `cache: "no-cache"` şart: GitHub Pages JSON'lara `max-age=600` koyuyor (ölçüldü), yani
   * düz bir fetch 10 dakika boyunca ağa hiç çıkmadan eski kopyayı döndürebilir. no-cache
   * doğrulamayı zorlar ama ETag sayesinde veri değişmediyse 304 döner — bedava.
   */
  const refresh = async () => {
    if (refreshState === "loading") return;
    setRefreshState("loading");
    const before = dataByTf[tf]?.fetchedAt ?? null;
    try {
      const res = await fetch(`${BASE_PATH}/data/scan-${tf}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`İstek başarısız (${res.status})`);
      const json = (await res.json()) as ScanApiResponse;
      setDataByTf((prev) => ({ ...prev, [tf]: json }));
      setFetchError(null);
      setRefreshState(json.fetchedAt !== before ? "updated" : "current");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Tarama verisi alınamadı.");
      setRefreshState("error");
    }
  };

  // Geri bildirimi birkaç saniye sonra sıfırla ki buton kalıcı olarak "Güncellendi" demesin.
  useEffect(() => {
    if (refreshState === "idle" || refreshState === "loading") return;
    const t = setTimeout(() => setRefreshState("idle"), 4000);
    return () => clearTimeout(t);
  }, [refreshState]);

  // Sekmeye geri dönünce sessizce kontrol et — sayfa gün boyu açık kalırsa kullanıcının
  // elle basması gerekmesin. Sekme gizliyken poll ETMİYORUZ (telefonda pil/veri).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tf, dataByTf]);

  useEffect(() => {
    if (dataByTf[tf]) return;
    let cancelled = false;
    setLoadingTf(tf);
    fetch(`${BASE_PATH}/data/scan-${tf}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`İstek başarısız (${res.status})`);
        return res.json() as Promise<ScanApiResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        setDataByTf((prev) => ({ ...prev, [tf]: json }));
        setFetchError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFetchError(err instanceof Error ? err.message : "Tarama verisi alınamadı.");
      })
      .finally(() => {
        if (!cancelled) setLoadingTf((cur) => (cur === tf ? null : cur));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tf]);

  const current = dataByTf[tf];
  const allRows = useMemo<RowData[]>(() => current?.rows ?? [], [current]);
  const sectorOptions = useMemo(() => ["Tümü", ...(current?.sectors ?? [])], [current]);

  const filteredRows = useMemo(() => {
    const q = filters.q.trim().toLocaleLowerCase("tr");
    const aMin = parseLenient(filters.atrMin);
    const aMax = parseLenient(filters.atrMax);
    const pMin = parseLenient(filters.pMin);
    const pMax = parseLenient(filters.pMax);
    const vMin = parseLenient(filters.minVolM);
    const wantSignal = filters.sig === "NOTR" ? "NÖTR" : filters.sig;

    return allRows.filter((row) => {
      if (q && !(row.symbol.toLocaleLowerCase("tr").includes(q) || row.name.toLocaleLowerCase("tr").includes(q))) {
        return false;
      }
      if (filters.sig !== "ALL" && row.signal !== wantSignal) return false;
      if (filters.sector !== "Tümü" && row.sector !== filters.sector) return false;
      if (row.score < filters.minScore) return false;
      // `filters.minRelVol > 0` koruması bilerek var: bazı semboller dejenere veri
      // taşır (relVol = NaN, bkz. lib/format.ts yorumu, "0/0" durumu) — eski hâliyle
      // `row.relVol < filters.minRelVol` NaN için HER ZAMAN false döner (NaN hiçbir
      // sayıdan küçük değildir), yani NaN satırlar YANLIŞLIKLA her pozitif eşiği
      // geçerdi (mobil "Yüksek hacimli" hazır seti bunu yakaladı: relVol>=1,5 ölçüde
      // 79 beklenirken 82 çıkıyordu — 3 fazlası tam da bu NaN satırlardı). Varsayılan
      // (minRelVol=0, filtre yok) durumda bu satır ESKİSİYLE BİREBİR AYNI davranır —
      // yalnızca GERÇEKTEN bir eşik uygulanınca NaN satırlar (doğru biçimde) elenir.
      if (filters.minRelVol > 0 && !(row.relVol >= filters.minRelVol)) return false;
      if (aMin != null && row.atrPct < aMin) return false;
      if (aMax != null && row.atrPct > aMax) return false;
      if (pMin != null && row.price < pMin) return false;
      if (pMax != null && row.price > pMax) return false;
      if (vMin != null && row.volTL / 1e6 < vMin) return false;
      // Mobil "Yükselenler"/"Düşenler" hazır setleri (tasks/04-mobil-gorunum.md §D).
      // `chgDir` masaüstü FilterPanel'de hiç ayarlanmaz — "ALL" kalır, yani bu satır
      // masaüstü için her zaman no-op'tur (davranış birebir korunur).
      if (filters.chgDir === "UP" && !(row.chg > 0)) return false;
      if (filters.chgDir === "DOWN" && !(row.chg < 0)) return false;
      // "Takip listem" çipi (tasks/06-takip-listesi-ve-kolonlar.md §A) — mobilde HİÇ
      // ayarlanmaz (mobil bunun yerine ayrı bir "Takibim" sekmesi kullanır, aşağıdaki
      // `watchedRows`), yani bu satır mobil "Hisseler" sekmesi için her zaman no-op'tur.
      if (watchlistOnly && !isWatched(row.symbol)) return false;
      return true;
    });
  }, [allRows, filters, watchlistOnly, isWatched]);

  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortKey, sortDir),
    [filteredRows, sortKey, sortDir],
  );

  // Mobil "Takibim" sekmesi (tasks/06-takip-listesi-ve-kolonlar.md §A) — BİLEREK
  // `filteredRows`den değil `allRows`dan türetilir: sig/sektör/skor/ATR/fiyat/hacim/
  // arama filtreleri burada UYGULANMAZ. Gerekçe: kullanıcı bir hisseyi yıldızladıysa
  // onu HER ZAMAN görmeli — mevcut bir filtre (ör. "yalnızca SAT") yüzünden kendi
  // takip listesinin "boş" görünmesi güvenilirlik vaadini (dış görev metni "WHO THIS
  // IS FOR") bozar. Sıralama (`sortKey`/`sortDir`) yine de uygulanır — bu bir "filtre"
  // değil, uygulamanın geri kalanıyla tutarlı bir görüntüleme sırası.
  const watchedRows = useMemo(
    () => sortRows(allRows.filter((r) => isWatched(r.symbol)), sortKey, sortDir),
    [allRows, isWatched, sortKey, sortDir],
  );

  const upCount = useMemo(() => allRows.filter((r) => r.chg > 0).length, [allRows]);
  const downCount = useMemo(() => allRows.filter((r) => r.chg < 0).length, [allRows]);

  // Mobil kart listesi her yeni tf/filtre/sıralamada 50'den başlar (tasks/04 §E) —
  // önceki (farklı) sonuç kümesinden kalma büyük bir visibleCount ile başlamasın.
  useEffect(() => {
    setVisibleCount(MOBILE_PAGE_SIZE);
  }, [tf, filters, sortKey, sortDir]);

  // Takibim sekmesi için AYNI sayfalama sıfırlaması — `filters`e bağımlı DEĞİL
  // (watchedRows filtrelerden etkilenmiyor, bkz. yukarıdaki yorum), yalnızca tf/sıralama.
  useEffect(() => {
    setWatchlistVisibleCount(MOBILE_PAGE_SIZE);
  }, [tf, sortKey, sortDir]);

  // "Filtrele" düğmesindeki sayı rozeti (tasks/04 §D) — yalnızca FilterSheet'in
  // gerçekten denetlediği alanlar sayılır; `q` (arama) TopBar'da ayrı bir kontrol,
  // filtre sayfasının parçası değil.
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.sig !== DEFAULT_FILTERS.sig) n++;
    if (filters.sector !== DEFAULT_FILTERS.sector) n++;
    if (filters.minScore !== DEFAULT_FILTERS.minScore) n++;
    if (filters.minRelVol !== DEFAULT_FILTERS.minRelVol) n++;
    if (filters.atrMin !== DEFAULT_FILTERS.atrMin) n++;
    if (filters.atrMax !== DEFAULT_FILTERS.atrMax) n++;
    if (filters.pMin !== DEFAULT_FILTERS.pMin) n++;
    if (filters.pMax !== DEFAULT_FILTERS.pMax) n++;
    if (filters.minVolM !== DEFAULT_FILTERS.minVolM) n++;
    if (filters.chgDir !== DEFAULT_FILTERS.chgDir) n++;
    return n;
  }, [filters]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d * -1) as SortDir);
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? 1 : -1);
    }
  }

  function handleFilterChange(patch: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
  }

  /**
   * Mobil hazır filtre seti (bkz. components/FilterSheet.tsx §D) — diğer TÜM
   * filtreleri varsayılana döndürüp yalnızca `patch`'i uygular ("tek dokunuşla"
   * öngörülebilir sonuç; teyzenin karşısına birikmiş gizli filtreler çıkmasın) ve
   * alt sayfayı kapatır.
   */
  function handleApplyPreset(patch: Partial<FilterState>) {
    setFilters({ ...DEFAULT_FILTERS, ...patch });
    setFilterSheetOpen(false);
  }

  const sortLabel = `${SORT_NAMES[sortKey]}${sortDir < 0 ? " (azalan)" : " (artan)"}`;
  const lastUpdatedLabel = current?.fetchedAt != null ? formatLastUpdated(current.fetchedAt) : null;
  const isLoading = loadingTf === tf && !current;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: isMobile ? "auto 1fr" : "54px 1fr",
        gridTemplateColumns: "minmax(0, 1fr)",
        height: "100vh",
        overflow: "hidden",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <TopBar
        timeframe={tf}
        onTimeframeChange={setTf}
        query={filters.q}
        onQueryChange={(q) => handleFilterChange({ q })}
        totalScanned={current?.total ?? 0}
        upCount={upCount}
        downCount={downCount}
        lastUpdatedLabel={lastUpdatedLabel}
        onRefresh={() => void refresh()}
        refreshState={refreshState}
        isMobile={isMobile}
        panelPrefs={panelPrefs}
        tabPrefs={tabPrefs}
      />
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <DelayStrip compact={isShortMobile} />
          {/* Hisseler/Haberler/Takibim sekmesi (bkz. tasks/05-kap-haberler.md §D,
              tasks/06-takip-listesi-ve-kolonlar.md §A). Mevcut `.seg`/`.seg-lg`
              sınıfları (TopBar'daki zaman dilimi kontrolüyle AYNI) yeniden kullanılır
              — yeni CSS gerekmez, dokunma hedefi zaten ≥44px. Gizlenen sekmeler
              (bkz. tasks/08 §A "Mobil", lib/view-prefs.ts) listeden düşer; Hisseler
              `tabPrefs.hiddenTabs`e ASLA giremez (useTabPrefs.toggleTabHidden
              korumasız da bırakılsa) bu yüzden filtre koşulsuz gösterilir.
              Üst/alt dolgu `isShortMobile`te daralır (bkz. dosya başı yorumu) — dokunma
              hedefi (.seg-lg, 44px) HİÇ küçülmez, yalnızca boşluk kısalır. */}
          <div style={{ display: "flex", padding: isShortMobile ? "4px 14px 0" : "10px 14px 0", flex: "none" }}>
            <div className="seg seg-lg" style={{ flex: "none" }}>
              {MOBILE_TAB_ORDER.filter((id) => id === "hisseler" || !tabPrefs.hiddenTabs.includes(id)).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`seg-btn${mobileTab === id ? " active" : ""}`}
                  onClick={() => setMobileTab(id)}
                >
                  {MOBILE_TAB_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
          {mobileTab === "haberler" ? (
            <NewsList
              items={newsFeed}
              onSelectSymbol={setSelectedSymbol}
              emptyText="Son 7 günde KAP bildirimi yok."
              variant="mobile"
            />
          ) : mobileTab === "takibim" ? (
            <WatchlistTab
              rows={watchedRows}
              visibleCount={watchlistVisibleCount}
              onLoadMore={() => setWatchlistVisibleCount((c) => Math.min(c + MOBILE_PAGE_SIZE, watchedRows.length))}
              onSelectSymbol={setSelectedSymbol}
              isWatched={isWatched}
              onToggleWatch={toggleWatch}
              symbols={watchlistSymbols}
              positions={portfolioPositions}
              onSavePosition={savePosition}
              onDeletePosition={removePosition}
            />
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: isShortMobile ? "4px 14px 0" : "10px 14px 0",
                  flex: "none",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={() => setFilterSheetOpen(true)}
                  style={{ position: "relative", gap: 8 }}
                >
                  <FunnelSimple size={16} />
                  Filtrele
                  {activeFilterCount > 0 ? <span className="filter-badge">{activeFilterCount}</span> : null}
                </button>
                <SortMenu sortKey={sortKey} sortDir={sortDir} onChangeKey={setSortKey} onChangeDir={setSortDir} />
                {/* Yan çevrilmiş telefonda (isShortMobile) sayaç ayrı bir satır
                    AÇMAZ — bkz. dosya başı `isShortMobile` yorumu (tasks/08 §B,
                    yükseklik bütçesi: 375px'te bir satırın tamamı ~27px değerli).
                    812px genişlikte iki düğmenin yanına rahatça sığar
                    (ölçüldü). Dikey/normal mobilde (isShortMobile===false) bu dal
                    HİÇ render edilmez — aşağıdaki ayrı satır (eski hâliyle
                    BİREBİR) onun yerine geçer, kabul kriteri 10 bu yüzden korunur. */}
                {isShortMobile ? (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span
                      style={{
                        flex: "0 1 auto",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 12.5,
                        color: "var(--color-neutral-400)",
                      }}
                    >
                      <strong style={{ color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
                        {sortedRows.length}
                      </strong>{" "}
                      / {allRows.length} hisse eşleşti
                      {isLoading ? " · yükleniyor…" : ""}
                      {fetchError ? ` · hata: ${fetchError}` : ""}
                    </span>
                    {/* Elenen sayacı (bkz. tasks/09-eleme-gorunurlugu.md §D) — kısa/yatay
                        modda da AYNI satırda, kısaltılmış metinle (`compact`); düğme
                        `.btn-lg` olduğu için satırın zaten Filtrele/Sırala'dan gelen
                        ≥44px yüksekliğine sığar, ek yükseklik EKLEMEZ (bkz. o düğmelerin
                        `.btn-lg`/`.sort-trigger` kuralları, app/globals.css). */}
                    <ExcludedCounterButton
                      tf={tf}
                      scannedCount={current?.total ?? 0}
                      onOpen={() => setExcludedListOpen(true)}
                      compact
                    />
                  </div>
                ) : null}
              </div>
              {!isShortMobile ? (
                <div style={{ padding: "8px 14px 0", flex: "none", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12.5, color: "var(--color-neutral-400)", flex: "1 1 auto", minWidth: 0 }}>
                    <strong style={{ color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
                      {sortedRows.length}
                    </strong>{" "}
                    / {allRows.length} hisse eşleşti
                    {isLoading ? " · yükleniyor…" : ""}
                    {fetchError ? ` · hata: ${fetchError}` : ""}
                  </div>
                  <ExcludedCounterButton
                    tf={tf}
                    scannedCount={current?.total ?? 0}
                    onOpen={() => setExcludedListOpen(true)}
                    compact
                  />
                </div>
              ) : null}
              {sortedRows.length === 0 && !isLoading ? (
                <EmptyState onReset={handleReset} query={filters.q} tf={tf} onJumpToTf={setTf} />
              ) : (
                <MobileList
                  rows={sortedRows}
                  visibleCount={visibleCount}
                  onLoadMore={() => setVisibleCount((c) => Math.min(c + MOBILE_PAGE_SIZE, sortedRows.length))}
                  onSelectSymbol={setSelectedSymbol}
                  isWatched={isWatched}
                  onToggleWatch={toggleWatch}
                  columns={mobileColumns}
                  compact={isShortMobile}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", minHeight: 0 }}>
          <FilterPanel
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
            sectorOptions={sectorOptions}
            matchCount={sortedRows.length}
            totalCount={allRows.length}
            watchlistSymbols={watchlistSymbols}
            watchlistOnly={watchlistOnly}
            onToggleWatchlistOnly={() => setWatchlistOnly((v) => !v)}
            open={panelPrefs.filterOpen}
            onToggleOpen={panelPrefs.toggleFilterOpen}
          />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "10px 16px 8px", flex: "none" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 13.5, fontWeight: 500 }}>
                Tarama sonuçları
              </span>
              <span style={{ fontSize: 11.5, color: "var(--color-neutral-400)" }}>
                {TF_LABEL[tf]} · sıralama: {sortLabel}
                {isLoading ? " · yükleniyor…" : ""}
                {fetchError ? ` · hata: ${fetchError}` : ""}
              </span>
              {/* Elenen sayacı — keşfedilebilir, tıklanınca liste açılır (bkz.
                  tasks/09-eleme-gorunurlugu.md §D, components/ExcludedList.tsx). */}
              <ExcludedCounterButton
                tf={tf}
                scannedCount={current?.total ?? 0}
                onOpen={() => setExcludedListOpen(true)}
              />
              {/* Kolon düzeni (tasks/06-takip-listesi-ve-kolonlar.md §B) — yalnızca
                  masaüstü, tablonun başlık çubuğunda ("başlık çubuğunda bir 'Kolonlar'
                  düğmesi", görev metni). `marginLeft:auto` bu tek öğeyi bar'ın SAĞ ucuna
                  iter, "Tarama sonuçları"/sıralama etiketinin mevcut düzenine dokunmadan. */}
              <div style={{ marginLeft: "auto" }}>
                <ColumnMenu
                  columns={columnLayout.order.map((id) => ({ id, label: COLUMN_LABELS[id] }))}
                  hidden={columnLayout.hidden}
                  onToggle={columnLayout.toggleHidden}
                  onReset={columnLayout.reset}
                />
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <ScanTable
                rows={sortedRows}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                onResetFilters={handleReset}
                onSelectSymbol={setSelectedSymbol}
                selectedSymbol={selectedSymbol}
                isWatched={isWatched}
                onToggleWatch={toggleWatch}
                columnOrder={columnLayout.order}
                hiddenColumns={columnLayout.hidden}
                onReorderColumns={columnLayout.reorder}
              />
              {sortedRows.length === 0 && !isLoading ? (
                // Boşluğun NEDENİ "Takip listem" çipi açıkken hiç yıldızlı hisse
                // olmaması ise (görev "Kapsam" §Boş durum) genel "Filtrelerle eşleşen
                // hisse yok" mesajı YANLIŞ olurdu — o zaman aynı açıklayıcı metin
                // (WatchlistEmptyState, Takibim sekmesiyle PAYLAŞILAN) gösterilir.
                // Başka bir filtre YÜZÜNDEN boşsa (watchlistSymbols.length > 0 ama
                // hiçbiri eşleşmiyorsa) genel mesaj/"Filtreleri sıfırla" doğru kalır.
                watchlistOnly && watchlistSymbols.length === 0 ? (
                  <WatchlistEmptyState />
                ) : (
                  <EmptyState onReset={handleReset} query={filters.q} tf={tf} onJumpToTf={setTf} />
                )
              ) : null}
            </div>
          </div>
          <NewsPanel
            items={newsFeed}
            onSelectSymbol={setSelectedSymbol}
            open={panelPrefs.newsOpen}
            onToggleOpen={panelPrefs.toggleNewsOpen}
          />
        </div>
      )}
      {filterSheetOpen ? (
        <FilterSheet
          onClose={() => setFilterSheetOpen(false)}
          filters={filters}
          onChange={handleFilterChange}
          onApplyPreset={handleApplyPreset}
          sectorOptions={sectorOptions}
          matchCount={sortedRows.length}
          totalCount={allRows.length}
        />
      ) : null}
      {selectedSymbol ? (
        <DetailDrawer
          symbol={selectedSymbol}
          tf={tf}
          onClose={() => setSelectedSymbol(null)}
          onTimeframeChange={setTf}
        />
      ) : null}
      {excludedListOpen ? (
        <ExcludedListModal tf={tf} onClose={() => setExcludedListOpen(false)} />
      ) : null}
      {/* URL'de `?takip=` var VE localStorage doluyken sorulan üç seçenek (tasks/06-
          takip-listesi-ve-kolonlar.md §A "Mimari kısıt") — isMobile dalından BAĞIMSIZ
          render edilir (DetailDrawer/FilterSheet ile aynı desen), çünkü bağlantı hangi
          cihazda açılırsa açılsın (çoğunlukla mobil, bkz. dış görev metni) çalışmalı. */}
      {pendingImport ? (
        <WatchlistImportPrompt
          count={pendingImport.symbols.length}
          onMerge={() => resolvePendingImport("merge")}
          onReplace={() => resolvePendingImport("replace")}
          onIgnore={() => resolvePendingImport("ignore")}
        />
      ) : null}
    </div>
  );
}

/**
 * Gecikme uyarısı şeridi (mobil) — bkz. tasks/04-mobil-gorunum.md §G. Sürekli
 * görünür, KAPATILAMAZ (dismiss düğmesi yok, localStorage'da "görüldü" durumu
 * tutulmaz) — brief'in kendi ifadesiyle birebir aynı metin; DetailDrawer'daki
 * `DelayNotice` ile aynı "~15 dakika" gecikme gerçeğini anlatır (bkz. o dosyadaki
 * yorum), aynı ikon/vurgu düzenini kullanır.
 *
 * `compact` (bkz. tasks/08-panel-gizleme-yatay-siralama.md §B, ScanScreen'deki
 * `isShortMobile` yorumu) — yan çevrilmiş telefonda dolgu/yazı biraz küçülür ki
 * kart listesine daha çok yükseklik kalsın; METİN AYNI KALIR (uyarı hiçbir zaman
 * kısaltılmaz/gizlenmez — "sürekli görünür" kısıtı). Normal mobilde (`compact`
 * yok/false) ESKİ hâliyle birebir aynı — kabul kriteri 10.
 */
function DelayStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className="delay-strip" style={compact ? { margin: "4px 14px 0", padding: "4px 8px", gap: 5 } : undefined}>
      <Clock
        size={compact ? 12 : 16}
        weight="bold"
        style={{ flex: "none", marginTop: 1, color: "var(--color-accent-200)" }}
      />
      {/*
        Yatay ekranda (compact) yalnızca dolgu/satır aralığı daralır, PUNTO DARALMAZ.
        Bu, kullanıcıyı emir vermeden önce aracı kurumundaki canlı fiyata bakmaya
        yönlendiren güvenlik uyarısı; bir kart daha sığsın diye küçültülmez.
        Kullanıcı yaşlıca ve bu metni okuması gerekiyor.
      */}
      <span style={{ fontSize: 14, lineHeight: compact ? 1.3 : 1.45, color: "var(--color-neutral-200)" }}>
        Veriler ~15 dakika gecikmelidir. Emir vermeden önce aracı kurumunuzdaki canlı fiyata bakın.
      </span>
    </div>
  );
}

/**
 * URL'den gelen takip listesi + localStorage'da ZATEN bir liste varken sorulan üç
 * seçenek (bkz. tasks/06-takip-listesi-ve-kolonlar.md §A "Mimari kısıt"): görev
 * metninde birebir "Bağlantıdaki N hisse eklensin mi? [Listeme ekle] [Listemi
 * değiştir] [Yoksay]". `.drawer-overlay` (mevcut fade-in animasyonu) yeniden
 * kullanılır; öne çıkan "Listeme ekle" seçeneği accent TONU ile vurgulanır (geniş
 * dolgu DEĞİL — `.chip.active`/`.seg-btn.active` ile aynı color-mix tarifi, görev
 * "Sert kısıtlar").
 */
function WatchlistImportPrompt({
  count,
  onMerge,
  onReplace,
  onIgnore,
}: {
  count: number;
  onMerge: () => void;
  onReplace: () => void;
  onIgnore: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onIgnore();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div
        className="drawer-overlay"
        style={{ position: "fixed", inset: 0, background: "rgba(9, 10, 18, 0.6)" }}
        onClick={onIgnore}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Takip listesi bağlantısı"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 51,
          width: "min(360px, 90vw)",
          background: "linear-gradient(180deg, var(--color-neutral-900), var(--color-bg) 160px)",
          border: "1px solid var(--color-neutral-700)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--color-text)" }}>
          Bağlantıdaki {count} hisse eklensin mi?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            style={{
              borderColor: "var(--color-accent)",
              color: "var(--color-accent-100)",
              background: "color-mix(in oklab, var(--color-accent) 16%, transparent)",
            }}
            onClick={onMerge}
          >
            Listeme ekle
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onReplace}>
            Listemi değiştir
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={onIgnore}>
            Yoksay
          </button>
        </div>
      </div>
    </div>
  );
}
