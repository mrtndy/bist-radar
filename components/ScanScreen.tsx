"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "./TopBar";
import FilterPanel from "./FilterPanel";
import ScanTable, { EmptyState } from "./ScanTable";
import DetailDrawer from "./DetailDrawer";
import { formatLastUpdated, parseLenient } from "../lib/format";
import type { FilterState, RefreshState, RowData, ScanApiResponse, ScanResult, SortDir, SortKey, Timeframe } from "../lib/types";

const TF_LABEL: Record<Timeframe, string> = { G: "Günlük", H: "Haftalık", S: "Saatlik" };

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
      if (row.relVol < filters.minRelVol) return false;
      if (aMin != null && row.atrPct < aMin) return false;
      if (aMax != null && row.atrPct > aMax) return false;
      if (pMin != null && row.price < pMin) return false;
      if (pMax != null && row.price > pMax) return false;
      if (vMin != null && row.volTL / 1e6 < vMin) return false;
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

  const sortLabel = `${SORT_NAMES[sortKey]}${sortDir < 0 ? " (azalan)" : " (artan)"}`;
  const lastUpdatedLabel = current?.fetchedAt != null ? formatLastUpdated(current.fetchedAt) : null;
  const isLoading = loadingTf === tf && !current;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "54px 1fr",
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
      />
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
      {selectedSymbol ? (
        <DetailDrawer symbol={selectedSymbol} tf={tf} onClose={() => setSelectedSymbol(null)} />
      ) : null}
    </div>
  );
}
