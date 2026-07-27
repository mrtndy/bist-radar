"use client";

import { ArrowsClockwise, MagnifyingGlass } from "@phosphor-icons/react";
import { formatInt } from "../lib/format";
import { COLOR_DOWN, COLOR_UP } from "../lib/colors";
import type { RefreshState, Timeframe } from "../lib/types";
import ViewMenu from "./ViewMenu";
import type { UsePanelPrefsResult, UseTabPrefsResult } from "../lib/view-prefs";

/**
 * Düğme metni duruma göre değişir. Sadece ikon kullanmıyoruz: bu aracı borsa
 * terminolojisine hâkim olmayan biri kullanacak ve basınca ne olduğunu görmesi gerekiyor —
 * "hiçbir şey olmadı" izlenimi en kötü sonuç.
 */
const REFRESH_LABEL: Record<RefreshState, string> = {
  idle: "Güncelle",
  loading: "Güncelleniyor…",
  updated: "Güncellendi",
  current: "Zaten güncel",
  error: "Güncellenemedi",
};

function refreshColor(s: RefreshState): string | undefined {
  if (s === "updated") return COLOR_UP;
  if (s === "error") return COLOR_DOWN;
  return undefined;
}

const TF_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "G", label: "Günlük" },
  { value: "H", label: "Haftalık" },
  { value: "S", label: "Saatlik" },
];

interface TopBarProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  query: string;
  onQueryChange: (q: string) => void;
  totalScanned: number;
  upCount: number;
  downCount: number;
  lastUpdatedLabel: string | null;
  onRefresh: () => void;
  refreshState: RefreshState;
  /**
   * Genişlik < 720px VEYA yükseklik < 500px mobil düzen mi (bkz.
   * tasks/08-panel-gizleme-yatay-siralama.md §B, önceki hâli tasks/04-mobil-gorunum.md
   * §A, §F). `false` iken bu bileşen ESKİ JSX'iyle (aşağıdaki `if (!isMobile)` dalı)
   * birebir aynıdır — kabul kriteri 9 bunu gerektiriyor, o yüzden o dal hiç
   * dokunulmadan bırakıldı (yalnızca ViewMenu EKLENDİ, bkz. aşağı).
   */
  isMobile: boolean;
  /**
   * "Görünüm" menüsü — masaüstü panel + mobil sekme tercihleri (bkz.
   * tasks/08-panel-gizleme-yatay-siralama.md §A, lib/view-prefs.ts). TopBar HER İKİ
   * demeti de alır, kendi dalına uygun olanı ViewMenu'ye geçirir — iki dal da bu
   * bileşeni "aynı yerden" barındırır (görev metni "tek Görünüm menüsü").
   */
  panelPrefs: UsePanelPrefsResult;
  tabPrefs: UseTabPrefsResult;
}

export default function TopBar({
  timeframe,
  onTimeframeChange,
  query,
  onQueryChange,
  totalScanned,
  upCount,
  downCount,
  lastUpdatedLabel,
  onRefresh,
  refreshState,
  isMobile,
  panelPrefs,
  tabPrefs,
}: TopBarProps) {
  if (isMobile) {
    return (
      <MobileTopBar
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        query={query}
        onQueryChange={onQueryChange}
        lastUpdatedLabel={lastUpdatedLabel}
        onRefresh={onRefresh}
        refreshState={refreshState}
        tabPrefs={tabPrefs}
      />
    );
  }

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        height: 54,
        flex: "none",
        padding: "0 20px",
        borderBottom: "1px solid transparent",
        borderImage:
          "linear-gradient(90deg, transparent, var(--color-neutral-700) 48px, var(--color-neutral-700) calc(100% - 48px), transparent) 1",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            flex: "none",
            background: "var(--color-accent)",
            transform: "rotate(45deg)",
            borderRadius: 2,
            boxShadow: "0 0 12px color-mix(in oklab, var(--color-accent) 60%, transparent)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          BIST Radar
        </span>
        <span className="tag tag-outline" style={{ fontSize: 10, whiteSpace: "nowrap" }}>
          Borsa İstanbul · Gecikmeli veri
        </span>
      </div>

      <div className="seg">
        {TF_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`seg-btn${timeframe === opt.value ? " active" : ""}`}
            onClick={() => onTimeframeChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", flex: "0 1 200px", minWidth: 110 }}>
        <MagnifyingGlass
          size={14}
          color="var(--color-neutral-500)"
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          className="input"
          style={{ paddingLeft: 32, width: "100%", boxSizing: "border-box", fontSize: 12.5 }}
          placeholder="Sembol ara…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          minWidth: 0,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ flex: "none" }}>
          <span style={{ color: "var(--color-neutral-400)" }}>Taranan</span>{" "}
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>{formatInt(totalScanned)}</span>
        </span>
        <span style={{ flex: "none" }}>
          <span style={{ color: COLOR_UP, fontWeight: 600 }}>▲ {formatInt(upCount)}</span>{" "}
          <span style={{ color: COLOR_DOWN, fontWeight: 600 }}>▼ {formatInt(downCount)}</span>
        </span>
        <span
          style={{
            color: "var(--color-neutral-500)",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {lastUpdatedLabel ? `Veri: ${lastUpdatedLabel}` : "Veri: —"}
        </span>

        <ViewMenu
          mode="desktop"
          filterOpen={panelPrefs.filterOpen}
          newsOpen={panelPrefs.newsOpen}
          onToggleFilterOpen={panelPrefs.toggleFilterOpen}
          onToggleNewsOpen={panelPrefs.toggleNewsOpen}
        />

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={refreshState === "loading"}
          aria-live="polite"
          title="Yayınlanmış en son veriyi yeniden yükler. Yeni piyasa verisi çekmez — o, gün sonu otomatik güncellemesiyle gelir."
          style={{
            flex: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 32,
            fontSize: 12,
            color: refreshColor(refreshState),
            borderColor: refreshColor(refreshState),
          }}
        >
          <ArrowsClockwise
            size={14}
            style={
              refreshState === "loading"
                ? { animation: "omSpin 900ms linear infinite" }
                : undefined
            }
          />
          {REFRESH_LABEL[refreshState]}
        </button>
      </div>
    </header>
  );
}

/**
 * Mobil üst bar (< 720px) — bkz. tasks/04-mobil-gorunum.md §F. 375px'te marka +
 * zaman dilimi + arama + sayaçlar + güncelle düğmesi tek satıra sığmıyor (ölçüldü);
 * iki satıra bölünür. Sayaçlar (taranan/yükselen/düşen) BİLEREK yok — brief §F bu
 * üçünü mobil düzende listemiyor, "Tarama sonuçları" başlığının de mobilde
 * gösterilmediği ScanScreen.tsx ile tutarlı (teknik ayrıntı, alan israfı).
 *
 * "Güncelle" düğmesi masaüstündeki gibi TAM METİNLİ kalır (yalnızca ikon değil) —
 * yukarıdaki `REFRESH_LABEL` yorumundaki gerekçe (borsa terminolojisine hakim
 * olmayan kullanıcı "hiçbir şey olmadı" sanmasın) mobilde de aynen geçerli.
 */
interface MobileTopBarProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  query: string;
  onQueryChange: (q: string) => void;
  lastUpdatedLabel: string | null;
  onRefresh: () => void;
  refreshState: RefreshState;
  /** "Görünüm" menüsü (tasks/08-panel-gizleme-yatay-siralama.md §A "Mobil") — bkz. TopBarProps yorumu. */
  tabPrefs: UseTabPrefsResult;
}

function MobileTopBar({
  timeframe,
  onTimeframeChange,
  query,
  onQueryChange,
  lastUpdatedLabel,
  onRefresh,
  refreshState,
  tabPrefs,
}: MobileTopBarProps) {
  return (
    <div className="mobile-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            flex: "none",
            background: "var(--color-accent)",
            transform: "rotate(45deg)",
            borderRadius: 2,
            boxShadow: "0 0 12px color-mix(in oklab, var(--color-accent) 60%, transparent)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 14.5,
            fontWeight: 500,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            flex: "none",
          }}
        >
          BIST Radar
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--color-neutral-500)",
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          {lastUpdatedLabel ? `Veri: ${lastUpdatedLabel}` : "Veri: —"}
        </span>
        <ViewMenu mode="mobile" hiddenTabs={tabPrefs.hiddenTabs} onToggleTab={tabPrefs.toggleTabHidden} />
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={onRefresh}
          disabled={refreshState === "loading"}
          aria-live="polite"
          title="Yayınlanmış en son veriyi yeniden yükler. Yeni piyasa verisi çekmez — o, gün sonu otomatik güncellemesiyle gelir."
          style={{
            flex: "none",
            gap: 6,
            whiteSpace: "nowrap",
            color: refreshColor(refreshState),
            borderColor: refreshColor(refreshState),
          }}
        >
          <ArrowsClockwise
            size={15}
            style={
              refreshState === "loading" ? { animation: "omSpin 900ms linear infinite", flex: "none" } : { flex: "none" }
            }
          />
          {REFRESH_LABEL[refreshState]}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="seg seg-lg" style={{ flex: "none" }}>
          {TF_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`seg-btn${timeframe === opt.value ? " active" : ""}`}
              onClick={() => onTimeframeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: "1 1 auto", minWidth: 0 }}>
          <MagnifyingGlass
            size={15}
            color="var(--color-neutral-500)"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            className="input input-lg"
            style={{ paddingLeft: 36, width: "100%", boxSizing: "border-box" }}
            placeholder="Sembol ara…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
