"use client";

/**
 * Adet + ortalama maliyet giriş formu — bkz. tasks/07-portfoy-kar-zarar.md
 * "Giriş". Görev metni birebir: **iki alan, başka bir şey yok** ("Kaç lot?" +
 * "Ortalama alış fiyatı (₺)") + Kaydet/Sil düğmeleri — bu yüzden bilerek
 * başka hiçbir alan/açıklama metni EKLENMEMİŞTİR.
 *
 * `FilterSheet.tsx` ile AYNI alt sayfa (bottom sheet) kalıbı — mobil formlar
 * için zaten kurulu, dokunma hedefleri büyük (`.input-lg`/`.btn-lg`) bir
 * desen; yeni CSS gerektirmez.
 *
 * Türkçe ondalık (virgül) girişi `lib/format.ts`teki `parseLenient` ile
 * ayrıştırılır (görev kısıtı: bu fonksiyon zaten var, yeniden yazılmaz).
 * Alanlar `type="text"` + `inputMode="decimal"`: `type="number"` virgülü
 * kabul etmez (tarayıcı yerel ayarından bağımsız nokta bekler), görev metninin
 * "Türkçe ondalık kabul edilsin" şartı bu yüzden düz metin alanı gerektirir.
 */
import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { parseLenient } from "../lib/format";
import type { Position } from "../lib/portfolio";

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11.5,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--color-neutral-400)",
  marginBottom: 8,
  display: "block",
};

interface PositionFormProps {
  symbol: string;
  /** Mevcut kayıt (düzenleme) veya `null` (yeni ekleme) — başlık/Sil düğmesi buna göre değişir. */
  position: Position | null;
  onClose: () => void;
  onSave: (lot: number, maliyet: number) => void;
  onDelete: () => void;
}

/** `12.5` -> `"12,5"` — kayıtlı sayısal değeri düzenleme alanına Türkçe ondalıkla geri basar. */
function toEditableText(n: number): string {
  return String(n).replace(".", ",");
}

export default function PositionForm({ symbol, position, onClose, onSave, onDelete }: PositionFormProps) {
  const [lotText, setLotText] = useState(position ? toEditableText(position.lot) : "");
  const [maliyetText, setMaliyetText] = useState(position ? toEditableText(position.maliyet) : "");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lot = parseLenient(lotText);
  const maliyet = parseLenient(maliyetText);
  const canSave = lot != null && lot > 0 && maliyet != null && maliyet > 0;

  function handleSave() {
    if (!canSave || lot == null || maliyet == null) return;
    onSave(lot, maliyet);
    onClose();
  }

  function handleDelete() {
    onDelete();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 45 }}>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-label={`${symbol} adet ve maliyet`}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 500 }}>
            {symbol} <span style={{ color: "var(--color-neutral-400)", fontWeight: 400 }}>· Adet ve maliyet</span>
          </span>
          <button type="button" className="btn btn-icon" onClick={onClose} title="Kapat" aria-label="Kapat">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="sheet-body">
          <div>
            <label style={fieldLabelStyle} htmlFor="position-form-lot">
              Kaç lot?
            </label>
            <input
              id="position-form-lot"
              className="input input-lg"
              style={{ width: "100%", boxSizing: "border-box" }}
              type="text"
              inputMode="decimal"
              placeholder="örn. 100"
              autoFocus
              value={lotText}
              onChange={(e) => setLotText(e.target.value)}
            />
          </div>

          <div>
            <label style={fieldLabelStyle} htmlFor="position-form-maliyet">
              Ortalama alış fiyatı (₺)
            </label>
            <input
              id="position-form-maliyet"
              className="input input-lg"
              style={{ width: "100%", boxSizing: "border-box" }}
              type="text"
              inputMode="decimal"
              placeholder="örn. 42,50"
              value={maliyetText}
              onChange={(e) => setMaliyetText(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {position ? (
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={handleDelete}
              >
                Sil
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-lg"
              style={{
                flex: 1,
                borderColor: "var(--color-accent)",
                color: "var(--color-accent-100)",
                background: "color-mix(in oklab, var(--color-accent) 22%, transparent)",
              }}
              disabled={!canSave}
              onClick={handleSave}
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
