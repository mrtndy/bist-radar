"use client";

/**
 * Panel (masaüstü) ve sekme (mobil) görünürlük tercihleri — bkz.
 * tasks/08-panel-gizleme-yatay-siralama.md §A. Tek "Görünüm" menüsünün
 * (components/ViewMenu.tsx) veri katmanı: masaüstünde sol filtre / sağ haber
 * panellerinin açık/kapalı durumunu, mobilde hangi sekmelerin gizlendiğini tutar.
 *
 * Hidrasyon: `ScanScreen.tsx`'teki `isMobile` ile AYNI desen (bkz. o dosyadaki
 * yorum, ayrıca lib/columns.ts, lib/watchlist.ts). İlk state HER ZAMAN sunucu/
 * derleme zamanının bileceği tek varsayılan değer — gerçek localStorage okuması
 * yalnızca mount sonrası bir efektte olur, aksi hâlde ilk istemci render'ı
 * sunucudan farklı çıkar ve React hidrasyon hatası verir.
 *
 * Depolama erişimi HER YERDE try/catch içinde: gizli sekmede veya depolama
 * engelliyse özellik sessizce devre dışı kalır, uygulama çökmez (görev
 * "Sert kısıtlar").
 */
import { useCallback, useEffect, useState } from "react";

const PANELS_KEY = "bist-radar:paneller";
const TABS_KEY = "bist-radar:sekmeler";

/** Mobil "Hisseler | Haberler | Takibim" sekmelerinin kimliği — bkz.
 * ScanScreen.tsx `mobileTab`. Tek kaynak burada: hem ScanScreen (sekme state'i)
 * hem ViewMenu (onay kutulu liste) AYNI birliği kullanır. */
export type MobileTabId = "hisseler" | "haberler" | "takibim";

/** Hisseler ANA ekran — asla gizlenemez (görev "Mobil": "hepsi gizlenirse
 * uygulama kullanılamaz hâle gelir"), bu yüzden gizlenebilir kümenin DIŞINDA. */
export const HIDEABLE_TABS: MobileTabId[] = ["haberler", "takibim"];

interface PanelPrefs {
  filterOpen: boolean;
  newsOpen: boolean;
}

const DEFAULT_PANEL_PREFS: PanelPrefs = { filterOpen: true, newsOpen: true };

/** Bozuk/eski/kısmi kayıtlara karşı savunma: eksik/yanlış tipli alan varsayılana
 * (açık) düşer — mevcut davranış (her iki panel de varsayılan açık) korunur. */
function readPanelPrefs(): PanelPrefs {
  try {
    const raw = window.localStorage.getItem(PANELS_KEY);
    if (!raw) return DEFAULT_PANEL_PREFS;
    const parsed = JSON.parse(raw) as Partial<PanelPrefs> | null;
    return {
      filterOpen: typeof parsed?.filterOpen === "boolean" ? parsed.filterOpen : true,
      newsOpen: typeof parsed?.newsOpen === "boolean" ? parsed.newsOpen : true,
    };
  } catch {
    return DEFAULT_PANEL_PREFS;
  }
}

function writePanelPrefs(prefs: PanelPrefs): void {
  try {
    window.localStorage.setItem(PANELS_KEY, JSON.stringify(prefs));
  } catch {
    // Depolama engelliyse panel durumu kalıcı olmaz ama uygulama çalışmaya devam eder.
  }
}

export interface UsePanelPrefsResult extends PanelPrefs {
  toggleFilterOpen: () => void;
  toggleNewsOpen: () => void;
}

/** Masaüstü sol filtre / sağ haber panellerinin aç/kapa durumu (görev §A "Masaüstü"). */
export function usePanelPrefs(): UsePanelPrefsResult {
  const [prefs, setPrefs] = useState<PanelPrefs>(DEFAULT_PANEL_PREFS);

  // Mount sonrası TEK seferlik gerçek okuma — bkz. dosya başı yorumu.
  useEffect(() => {
    setPrefs(readPanelPrefs());
  }, []);

  const toggleFilterOpen = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, filterOpen: !prev.filterOpen };
      writePanelPrefs(next);
      return next;
    });
  }, []);

  const toggleNewsOpen = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, newsOpen: !prev.newsOpen };
      writePanelPrefs(next);
      return next;
    });
  }, []);

  return { ...prefs, toggleFilterOpen, toggleNewsOpen };
}

/** Bilinmeyen/bozuk id'leri atar, yinelenenleri temizler (bkz. lib/columns.ts
 * `sanitizeLayout` ile AYNI savunma gerekçesi). */
function readHiddenTabs(): MobileTabId[] {
  try {
    const raw = window.localStorage.getItem(TABS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<MobileTabId>();
    const out: MobileTabId[] = [];
    for (const id of parsed) {
      if (typeof id === "string" && (HIDEABLE_TABS as string[]).includes(id) && !seen.has(id as MobileTabId)) {
        seen.add(id as MobileTabId);
        out.push(id as MobileTabId);
      }
    }
    return out;
  } catch {
    return [];
  }
}

function writeHiddenTabs(hidden: MobileTabId[]): void {
  try {
    window.localStorage.setItem(TABS_KEY, JSON.stringify(hidden));
  } catch {
    // Depolama engelliyse tercih kalıcı olmaz ama uygulama çalışmaya devam eder.
  }
}

export interface UseTabPrefsResult {
  hiddenTabs: MobileTabId[];
  /** Hisseler (HIDEABLE_TABS dışında) için no-op — çağıran taraf (ViewMenu) zaten o
   * sekme için onay kutusunu devre dışı bırakır, bu ikinci bir savunma katmanı. */
  toggleTabHidden: (id: MobileTabId) => void;
}

/** Mobil "Hisseler | Haberler | Takibim" sekme görünürlüğü (görev §A "Mobil"). */
export function useTabPrefs(): UseTabPrefsResult {
  const [hiddenTabs, setHiddenTabs] = useState<MobileTabId[]>([]);

  useEffect(() => {
    setHiddenTabs(readHiddenTabs());
  }, []);

  const toggleTabHidden = useCallback((id: MobileTabId) => {
    if (!HIDEABLE_TABS.includes(id)) return;
    setHiddenTabs((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((t) => t !== id) : [...prev, id];
      writeHiddenTabs(next);
      return next;
    });
  }, []);

  return { hiddenTabs, toggleTabHidden };
}
