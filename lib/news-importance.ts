/**
 * KAP bildirim önem sınıflandırması — bkz. tasks/05-kap-haberler.md "ÖNCE OKU: gürültü
 * sorunu". Ölçüm (2026-07-27/28, `getDisclosures()` ile son 7 gün, ~1580 bildirim, 94
 * benzersiz `subject`): ham listede en sık çıkan konular çoğunlukla sıradan kullanıcı
 * için anlamsız (rutin form, tahvil/sukuk işlemleri) — ham listeyi olduğu gibi
 * göstermek özelliği işe yaramaz hâle getirir.
 *
 * Eşleştirme `subject` alanındaki anahtar kelimelerle yapılır, BİREBİR STRING
 * EŞLEŞMESİ DEĞİL: KAP konu metinleri hem parantezli varyantlar taşır ("Özel Durum
 * Açıklaması (Genel)") HEM DE Türkçe ek varyantları taşır ("Kira Sertifikası" tekil vs
 * "Kira Sertifikalarının" çoğul+iyelik gibi) — bu yüzden anahtar kelimeler tam kelime
 * değil, EK ALMAMIŞ KÖK biçiminde tutulur (ör. "kira sertifika", "sermaye piyasası
 * arac"). Bu liste tahminle değil, gerçek `getDisclosures()` çıktısından çekilen son 7
 * günün 94 benzersiz konusu tek tek sınıflandırılıp doğrulanarak oluşturuldu (bkz. görev
 * raporu) — ÜÇ gerçek hata bu doğrulamada yakalandı:
 *   - "Araç" kökü ünsüz yumuşamasıyla ekli hâlde HER ZAMAN "arac" olur (ç -> c: Aracı,
 *     Aracının, Aracı Notu) — ilk yazımda "araç" (ekşiz sözlük biçimi) kullanılmıştı ve
 *     bu, en büyük tek gürültü kaynağını (haftada ~237 bildirim, "Pay Dışında Sermaye
 *     Piyasası Aracı...") sessizce kaçırıyordu; gerçek script çıktısı denetlenirken
 *     yakalandı.
 *   - "İzahname-Sermaye Piyasası Aracı Notu" gibi bazı izahname alt türleri "sermaye
 *     piyasası aracı" ifadesini taşıdığı için gizli kuralına yanlışlıkla takılıyordu;
 *     izahname kontrolü artık gizli kuralından ÖNCE ve onu ezerek çalışıyor.
 *   - "Kar Payı Dağıtım İşlemlerine İlişkin Bildirim" için yazılan "kar payı dağıtım"
 *     anahtar kelimesi, "dağıtım" kelimesini taşımayan "Kar Payı Bildirimi" konusunu
 *     kaçırıyordu; anahtar kelime "kar payı"ya genişletildi (yanlış pozitif üretmediği
 *     94 konu üzerinde doğrulandı).
 *
 * Tanımadığımız bir konu VARSAYILAN OLARAK "orta" — "gizli" DEĞİL: önemli ama listede
 * olmayan bir bildirimi kaybetmektense biraz gürültüye katlanmak yeğdir (brief'in kendi
 * ifadesi). Bu yüzden aşağıda yalnızca "yuksek" ve "gizli" için anahtar kelime listesi
 * var; her şey varsayılan olarak "orta"dır.
 *
 * VARSAYIM: ölçülen dağılımda "İzahname" ayrı bir "düşük" etiketiyle anılıyor ama
 * sınıflandırma yalnızca ÜÇ seviyeli ("yuksek"|"orta"|"gizli") — dördüncü seviye yok.
 * En yakın karşılığa, "orta"ya eşlendi (görev raporunda da belirtildi).
 */
export type Importance = "yuksek" | "orta" | "gizli";

function includesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * "İzahname" (prospektüs) ailesindeki bazı alt türler ("...Sermaye Piyasası Aracı
 * Notu" gibi) metinsel olarak GIZLI_KEYWORDS'teki "sermaye piyasası araç" kuralını da
 * taşır; bu yüzden izahname kontrolü ayrı ve GİZLİ kuralından ÖNCELİKLİDİR.
 */
const IZAHNAME_KEYWORD = "izahname";

/** Hisseyle ilgisiz ya da rutin/idari — brief'in ölçtüğü gürültü kaynakları. */
const GIZLI_KEYWORDS = [
  // "araç" + iyelik eki ("-ı") Türkçe ünsüz yumuşamasıyla "arac" olur (ç -> c) — KAP
  // metninde HER ZAMAN ekli göründüğü için ("Aracı", "Aracının", "Aracı Notu" vb.) kök
  // burada "ç" DEĞİL "c" ile yazılır. Bu ayrım gerçek 7 günlük veriyle doğrulanmadan
  // önce ("araç" ile) yanlıştı ve en büyük gürültü kaynağını (haftada ~237 bildirim)
  // sessizce kaçırıyordu — bkz. görev raporu.
  "sermaye piyasası arac", // Pay Dışında Sermaye Piyasası Aracı İşlemleri (tahvil/sukuk, faizli/faizsiz)
  "tahvil",
  "sukuk",
  "kira sertifika",
  "bono",
  "genel bilgi formu", // Şirket Genel Bilgi Formu
  "ihraç tavan", // İhraç Tavanına İlişkin Bildirim
  "bağımsız denetim kuruluş", // Bağımsız Denetim Kuruluşunun Belirlenmesi
  "sorumluluk beyan", // Sorumluluk Beyanı (Konsolide / Konsolide Olmayan)
] as const;

/** Hisse fiyatını/kararını doğrudan etkileyebilecek olaylar. */
const YUKSEK_KEYWORDS = [
  "özel durum açıklama",
  "geri alın", // Payların Geri Alınmasına İlişkin Bildirim
  "finansal rapor",
  "pay alım satım", // içeriden işlem bildirimi
  "sermaye artırım",
  "sermaye azaltım",
  "kar payı", // Kar Payı Dağıtım İşlemleri + Kar Payı Bildirimi ("dağıtım" şartı ARANMAZ, bkz. dosya başı notu)
  "kâr payı", // aynısı, "â" imleçli yazım varyantı
] as const;

// Belgelenmiş "orta" örnekleri (ölçülen dağılımda en sık üçü): "Pay Bazında Devre
// Kesici Bildirimi", "Kredi Derecelendirmesi", "Genel Kurul İşlemlerine İlişkin
// Bildirim". Ayrı bir kural listesi YOK — bunlar zaten varsayılan "orta" davranışına
// girer; burada yalnızca belgelemek için anılıyor.

/** Sıralama için sayısal rütbe (küçük = daha önemli). "gizli" feed'e hiç girmez. */
export const IMPORTANCE_RANK: Record<Importance, number> = { yuksek: 0, orta: 1, gizli: 2 };

/**
 * `subject` alanına bakarak önem seviyesini çıkarır. Eşleşme yoksa "orta" (bkz. dosya
 * başı notu — kaybetmektense gürültüye katlan).
 */
export function classifyImportance(subject: string): Importance {
  const s = (subject || "").toLocaleLowerCase("tr");
  if (s.includes(IZAHNAME_KEYWORD)) return "orta";
  if (includesAny(s, YUKSEK_KEYWORDS)) return "yuksek";
  if (includesAny(s, GIZLI_KEYWORDS)) return "gizli";
  return "orta";
}

export interface ImportanceTagStyle {
  background: string;
  border: string;
  color: string;
}

/**
 * Kaynak etiketinin önem seviyesine göre rengi (bkz. görev §B "kaynak etiketi (önem
 * seviyesine göre renk)"). Tasarım kısıtı: yükseliş/düşüş yeşil/kırmızısı burada
 * KULLANILMAZ, yalnızca nötr tonlar + accent (bkz. handoff README "Design Tokens" —
 * "Aksan asla geniş dolgu olarak kullanılmaz"). "yuksek" accent tintiyle öne çıkar;
 * "orta" tasarımdaki var olan nötr "kaynak pill" görünümünde kalır (bkz. design_handoff
 * "Sağ haber paneli" pill stili — border neutral-700, color neutral-400).
 */
export function importanceTagStyle(importance: Importance): ImportanceTagStyle {
  if (importance === "yuksek") {
    return {
      background: "color-mix(in oklab, var(--color-accent) 14%, transparent)",
      border: "1px solid color-mix(in oklab, var(--color-accent) 40%, transparent)",
      color: "var(--color-accent-200)",
    };
  }
  return {
    background: "transparent",
    border: "1px solid var(--color-neutral-700)",
    color: "var(--color-neutral-400)",
  };
}
