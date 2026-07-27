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
import { formatLastUpdated, parseLenient } from "../lib/format";
import { fetchNewsFeed } from "../lib/news";
import { useWatchlist } from "../lib/watchlist";
import { COLUMN_LABELS, useColumnLayout } from "../lib/columns";
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

const TF_LABEL: Record<Timeframe, string> = { G: "Günlük", H: "Haftalık", S: "Saatlik" };

/** Kırılma noktası (bkz. tasks/04-mobil-gorunum.md §A): altı mobil kart listesi,
 * üstü/eşiti mevcut masaüstü tablo düzeni — masaüstü BİREBİR aynı kalır. */
const MOBILE_BREAKPOINT = 720;

/** Mobil kartların bir kerede kaç tanesi render edilir / kaydırınca kaç tane daha
 * eklenir (bkz. tasks/04-mobil-gorunum.md §E — performans ZORUNLU). */
const MOBILE_PAGE_SIZE = 50;

// GitHub Pages gibi alt dizinde servis eden statik host'lar için (next.config.ts'teki
// basePath ile aynı değer) — derleme zamanında istemci paketine gömülür, yerel
// geliştirmede boş string olur. Hem dev hem export'ta aynı statik JSON yolu kullanılır.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const SORT_NAMES: Record<SortKey, string> = {
  symbol: "sembol",
  price: "fiyat",
  chg: "değişim",
  score: "skor",
  k: "stokastik",
  hist: "MACD",
  rsi: "RSI",
  atrPct: "ATR",
  relVol: "relatif hacim",
  pctB: "%B",
  newsCount: "haber",
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // Mobil kartlarda ilk 50, kaydırınca/"daha fazla göster"e basınca +50 (tasks/04 §E).
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);
  // Mobil "Hisseler | Haberler | Takibim" sekmesi (bkz. tasks/05-kap-haberler.md §D,
  // tasks/06-takip-listesi-ve-kolonlar.md §A). "hisseler" ile başlar: ilk render'da
  // haber/takip kartları hiç mount edilmez, bu da mobil DOM düğümü bütçesini (kabul
  // kriteri 7, <2000) o listelerin boyutundan bağımsız kılar.
  const [mobileTab, setMobileTab] = useState<"hisseler" | "haberler" | "takibim">("hisseler");
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
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  /**
   * Mobil sıralama menüsünden seçim (bkz. components/SortMenu.tsx). `handleSort`'un
   * "aynı kolona tekrar basınca yönü çevir" davranışını BİLEREK yeniden kullanmaz:
   * menüdeki her seçenek kendi etiketinde yazan yönü (ör. "yüksek→düşük") her
   * seferinde deterministik uygular — masaüstü `handleSort`/ScanTable başlık tıklaması
   * bu fonksiyondan ETKİLENMEZ, ayrı kalır.
   */
  function handleSortMenuSelect(key: SortKey) {
    setSortKey(key);
    setSortDir(key === "symbol" ? 1 : -1);
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
      />
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <DelayStrip />
          {/* Hisseler/Haberler sekmesi (bkz. tasks/05-kap-haberler.md §D) — sağ haber
              paneli mobilde olmaz, yerine liste üstünde bir geçiş. Mevcut `.seg`/
              `.seg-lg` sınıfları (TopBar'daki zaman dilimi kontrolüyle AYNI) yeniden
              kullanılır — yeni CSS gerekmez, dokunma hedefi zaten ≥44px. */}
          <div style={{ display: "flex", padding: "10px 14px 0", flex: "none" }}>
            <div className="seg seg-lg" style={{ flex: "none" }}>
              <button
                type="button"
                className={`seg-btn${mobileTab === "hisseler" ? " active" : ""}`}
                onClick={() => setMobileTab("hisseler")}
              >
                Hisseler
              </button>
              <button
                type="button"
                className={`seg-btn${mobileTab === "haberler" ? " active" : ""}`}
                onClick={() => setMobileTab("haberler")}
              >
                Haberler
              </button>
              <button
                type="button"
                className={`seg-btn${mobileTab === "takibim" ? " active" : ""}`}
                onClick={() => setMobileTab("takibim")}
              >
                Takibim
              </button>
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
            />
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "10px 14px 0",
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
                <SortMenu sortKey={sortKey} onSelect={handleSortMenuSelect} />
              </div>
              <div style={{ padding: "8px 14px 0", flex: "none", fontSize: 12.5, color: "var(--color-neutral-400)" }}>
                <strong style={{ color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
                  {sortedRows.length}
                </strong>{" "}
                / {allRows.length} hisse eşleşti
                {isLoading ? " · yükleniyor…" : ""}
                {fetchError ? ` · hata: ${fetchError}` : ""}
              </div>
              {sortedRows.length === 0 && !isLoading ? (
                <EmptyState onReset={handleReset} />
              ) : (
                <MobileList
                  rows={sortedRows}
                  visibleCount={visibleCount}
                  onLoadMore={() => setVisibleCount((c) => Math.min(c + MOBILE_PAGE_SIZE, sortedRows.length))}
                  onSelectSymbol={setSelectedSymbol}
                  isWatched={isWatched}
                  onToggleWatch={toggleWatch}
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
                  <EmptyState onReset={handleReset} />
                )
              ) : null}
            </div>
          </div>
          <NewsPanel items={newsFeed} onSelectSymbol={setSelectedSymbol} />
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
        <DetailDrawer symbol={selectedSymbol} tf={tf} onClose={() => setSelectedSymbol(null)} />
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
 */
function DelayStrip() {
  return (
    <div className="delay-strip">
      <Clock size={16} weight="bold" style={{ flex: "none", marginTop: 1, color: "var(--color-accent-200)" }} />
      <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--color-neutral-200)" }}>
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
