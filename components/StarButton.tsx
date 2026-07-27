"use client";

/**
 * Takip listesi yıldız düğmesi — bkz. tasks/06-takip-listesi-ve-kolonlar.md §A.
 * Hem masaüstü `ScanTable` satırında hem mobil `StockCard`ta kullanılır (tek
 * bileşen, iki boyut varyantı — bkz. `large` prop / `.star-btn-lg`).
 *
 * Tasarım kısıtı: yeşil/kırmızı KULLANILMAZ (onlar fiyat/sinyal renkleri) — yalnızca
 * accent tonu (bkz. app/globals.css `.star-btn`).
 *
 * Bu düğme her zaman tıklanabilir bir satır/kart İÇİNDE render edilir (satıra
 * tıklamak detay panelini açar) — bu yüzden `stopPropagation` ŞART, yoksa yıldıza
 * basmak da paneli açar.
 */
import { Star } from "@phosphor-icons/react";

interface StarButtonProps {
  active: boolean;
  onToggle: () => void;
  /** Mobil kart içinde ≥44×44px dokunma hedefi (görev "Kapsam") — masaüstü tabloda kompakt kalır. */
  large?: boolean;
}

export default function StarButton({ active, onToggle, large = false }: StarButtonProps) {
  return (
    <button
      type="button"
      className={`star-btn${large ? " star-btn-lg" : ""}${active ? " active" : ""}`}
      aria-pressed={active}
      aria-label={active ? "Takip listesinden çıkar" : "Takip listesine ekle"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <Star size={large ? 20 : 14} weight={active ? "fill" : "regular"} />
    </button>
  );
}
