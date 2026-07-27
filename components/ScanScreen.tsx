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
import { formatLastUpdated, parseLenient } from "../lib/format";
import type { FilterState, RefreshState, RowData, ScanApiResponse, ScanResult, SortDir, SortKey, Timeframe } from "../lib/types";

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
    default:
      return 0;
  }
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
      return true;
    });
  }, [allRows, filters]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      if (sortKey === "symbol") return sortDir * a.symbol.localeCompare(b.symbol, "tr");
      return sortDir * (getSortValue(a, sortKey) - getSortValue(b, sortKey));
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const upCount = useMemo(() => allRows.filter((r) => r.chg > 0).length, [allRows]);
  const downCount = useMemo(() => allRows.filter((r) => r.chg < 0).length, [allRows]);

  // Mobil kart listesi her yeni tf/filtre/sıralamada 50'den başlar (tasks/04 §E) —
  // önceki (farklı) sonuç kümesinden kalma büyük bir visibleCount ile başlamasın.
  useEffect(() => {
    setVisibleCount(MOBILE_PAGE_SIZE);
  }, [tf, filters, sortKey, sortDir]);

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
            />
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
              />
              {sortedRows.length === 0 && !isLoading ? <EmptyState onReset={handleReset} /> : null}
            </div>
          </div>
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
