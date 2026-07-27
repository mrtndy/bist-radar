"use client";

/**
 * "Görünüm" menüsü — bkz. tasks/08-panel-gizleme-yatay-siralama.md §A. TEK bileşen,
 * TopBar'ın hem masaüstü hem mobil dalında render edilir ("aynı yerden" yönetim,
 * görev metni "tek Görünüm menüsü"): masaüstünde sol filtre / sağ haber panellerinin
 * aç/kapa durumu, mobilde Haberler/Takibim sekmelerinin gizli/görünür durumu için
 * onay kutulu liste.
 *
 * Açılır menü kabuğu `components/ColumnMenu.tsx`/`components/SortMenu.tsx` ile AYNI
 * desen (dış tıklama/Escape kapatır, `.sort-menu`/`.sort-dropdown`/`.sort-option`
 * sınıfları yeniden kullanılır — yeni CSS gerekmez) ve ColumnMenu ile AYNI şekilde
 * seçimler arasında menü AÇIK kalır (kullanıcı tek ziyarette birden çok kutuyu
 * işaretleyebilir; SortMenu'nün eski "seçince kapan" davranışından BİLEREK farklı).
 */
import { useEffect, useRef, useState } from "react";
import { Gear } from "@phosphor-icons/react";
import { HIDEABLE_TABS, type MobileTabId } from "../lib/view-prefs";

const TAB_LABELS: Record<MobileTabId, string> = {
  hisseler: "Hisseler",
  haberler: "Haberler",
  takibim: "Takibim",
};
/** Görüntüleme sırası — Hisseler ilk (her zaman işaretli/pasif kutuyla gösterilir,
 * görev "Hisseler sekmesi gizlenemez"), ardından gizlenebilir iki sekme. */
const TAB_ORDER: MobileTabId[] = ["hisseler", "haberler", "takibim"];

type ViewMenuProps =
  | {
      mode: "desktop";
      filterOpen: boolean;
      newsOpen: boolean;
      onToggleFilterOpen: () => void;
      onToggleNewsOpen: () => void;
    }
  | {
      mode: "mobile";
      hiddenTabs: MobileTabId[];
      onToggleTab: (id: MobileTabId) => void;
    };

export default function ViewMenu(props: ViewMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isMobileMenu = props.mode === "mobile";

  return (
    <div className="sort-menu" ref={rootRef}>
      <button
        type="button"
        // Mobil: ikon-tek 44×44 dokunma hedefi (.btn-icon, görev "Sert kısıtlar").
        // Masaüstü: ColumnMenu'nün küçük ikon+metin düğmesiyle AYNI stil — burada
        // fare kullanan "yapılandıran kişi" var (dış görev metni "WHO THIS IS FOR"),
        // 44px zorunluluğu YOK.
        className={isMobileMenu ? "btn btn-icon" : "btn btn-secondary"}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Görünüm"
        aria-label="Görünüm"
        style={isMobileMenu ? undefined : { fontSize: 12, minHeight: 30, gap: 6 }}
      >
        <Gear size={isMobileMenu ? 18 : 14} weight={isMobileMenu ? "bold" : "regular"} />
        {isMobileMenu ? null : "Görünüm"}
      </button>
      {open ? (
        <div className="sort-dropdown" role="menu" aria-label="Görünüm" style={{ minWidth: 220 }}>
          {props.mode === "desktop" ? (
            <DesktopPanelOptions
              filterOpen={props.filterOpen}
              newsOpen={props.newsOpen}
              onToggleFilterOpen={props.onToggleFilterOpen}
              onToggleNewsOpen={props.onToggleNewsOpen}
            />
          ) : (
            <MobileTabOptions hiddenTabs={props.hiddenTabs} onToggleTab={props.onToggleTab} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function DesktopPanelOptions({
  filterOpen,
  newsOpen,
  onToggleFilterOpen,
  onToggleNewsOpen,
}: {
  filterOpen: boolean;
  newsOpen: boolean;
  onToggleFilterOpen: () => void;
  onToggleNewsOpen: () => void;
}) {
  return (
    <>
      <label className="sort-option" style={{ gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={filterOpen}
          onChange={onToggleFilterOpen}
          style={{ accentColor: "var(--color-accent)", flex: "none" }}
        />
        <span>Filtre paneli</span>
      </label>
      <label className="sort-option" style={{ gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={newsOpen}
          onChange={onToggleNewsOpen}
          style={{ accentColor: "var(--color-accent)", flex: "none" }}
        />
        <span>Haber paneli</span>
      </label>
    </>
  );
}

function MobileTabOptions({
  hiddenTabs,
  onToggleTab,
}: {
  hiddenTabs: MobileTabId[];
  onToggleTab: (id: MobileTabId) => void;
}) {
  return (
    <>
      {TAB_ORDER.map((id) => {
        const hideable = (HIDEABLE_TABS as MobileTabId[]).includes(id);
        const hidden = hiddenTabs.includes(id);
        return (
          <label
            key={id}
            className="sort-option"
            style={{ gap: 10, cursor: hideable ? "pointer" : "not-allowed", opacity: hideable ? 1 : 0.6 }}
          >
            <input
              type="checkbox"
              checked={!hidden}
              disabled={!hideable}
              onChange={() => {
                if (hideable) onToggleTab(id);
              }}
              style={{ accentColor: "var(--color-accent)", flex: "none" }}
            />
            <span>
              {TAB_LABELS[id]}
              {hideable ? "" : " (kapatılamaz)"}
            </span>
          </label>
        );
      })}
    </>
  );
}
