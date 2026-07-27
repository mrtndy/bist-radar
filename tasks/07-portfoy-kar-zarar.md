# Görev 07 — Portföy: adet, maliyet ve kâr/zarar

**Atanan tier:** 2 (standart implementasyon) — Sonnet 5 subagent
**Ön koşul:** Görev 06 (takip listesi) tamamlanmış ve birleştirilmiş olmalı — bu görev onun
üzerine kurulur.
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin.

## Amaç

Takip listesindeki hisselere isteğe bağlı **adet + ortalama maliyet** girilebilsin; uygulama
güncel değeri ve kâr/zararı göstersin.

## Kimin kullanacağı ve bunun sonuçları

Kullanıcı borsa terminolojisine hâkim olmayan yaşlıca biri; telefonundan bakıp gerçek para
kararları veriyor. Bu özellik ilk kez **para rakamı** gösteriyor, o yüzden iki kural şart:

1. **Gecikme her yerde yazılı olacak.** Kâr/zarar gösterilen her yerde, göz ardı edilemeyecek
   şekilde: fiyatlar ~15 dakika gecikmeli, dolayısıyla rakam **yaklaşıktır**. Kullanıcı bu
   rakama bakıp "şu kadar kârdayım" diye kesin karar vermemeli.
2. **Rakamlar asla "canlı portföy değeri" gibi sunulmayacak.** Başlıklarda "yaklaşık" ifadesi
   geçsin; kesinlik iddia eden bir dil (ör. "Portföy değeriniz") kullanılmasın.

## GİZLİLİK — sert kural

**Maliyet ve adet bilgisi paylaşım bağlantısına ASLA girmeyecek.** Görev 06'daki
`?takip=...` bağlantısı yalnızca sembol taşır. Gerekçe: bu kişisel finansal bilgi; URL'ler
tarayıcı geçmişinde, mesajlaşma uygulamalarında ve referrer başlıklarında sızar.

Veri yalnızca localStorage'da (`bist-radar:portfoy`) durur, hiçbir yere gönderilmez. Uygulamada
ağ isteğiyle dışarı çıkan hiçbir yol olmayacak.

## Kapsam

### Veri
`bist-radar:portfoy` → `{ [sembol]: { lot: number, maliyet: number } }`.
Takip listesinden bağımsız saklansın ama yalnızca takip edilen semboller için gösterilsin.
Bir sembol takipten çıkarılırsa portföy kaydı **silinmesin** (yanlışlıkla yıldız kapatan
kullanıcı verisini kaybetmesin); tekrar eklenince geri gelsin.

### Giriş
`Takibim` sekmesindeki her kartta "Adet/maliyet ekle" (veya doluysa "Düzenle") bağlantısı.
Basınca sade bir form: **"Kaç lot?"** ve **"Ortalama alış fiyatı (₺)"**. İki alan, başka
bir şey yok. Kaydet / Sil düğmeleri. Mobilde alanlar ≥44px yüksek, `inputmode="decimal"`.
Türkçe ondalık (virgül) kabul edilsin — `lib/format.ts`'teki `parseLenient` zaten bunu yapıyor,
onu kullan.

### Gösterim
Portföy bilgisi girilmiş kartta/satırda:
- Güncel değer (lot × son fiyat)
- Kâr/zarar: tutar **ve** yüzde, yön rengiyle (mevcut yükseliş/düşüş token renkleri)
- Maliyet (lot × ortalama maliyet) — küçük, ikincil

`Takibim` sekmesinin üstünde **özet**: toplam maliyet, toplam güncel değer, toplam kâr/zarar
(tutar + %). Yalnızca adet/maliyet girilmiş hisseler toplama katılsın; katılmayan varsa
"N hisse hesaba katılmadı (adet/maliyet girilmemiş)" notu düşülsün.

Özetin hemen altında gecikme uyarısı: *"Fiyatlar ~15 dakika gecikmelidir; tutarlar
yaklaşıktır."*

### Boş/kısmi durumlar
- Hiç portföy kaydı yoksa özet gösterilmesin, bunun yerine tek satır açıklama.
- Lot veya maliyet 0/boşsa o hisse hesaba katılmasın, kartta yalnızca fiyat görünsün.

## Kapsam dışı (YAPMA)

- İşlem geçmişi, birden çok alım kaydı, ortalama maliyet hesaplama sihirbazı — tek bir
  "ortalama maliyet" alanı yeterli
- Komisyon, vergi, temettü hesabı
- Para birimi çevrimi
- Portföyü sunucuya/buluta gönderen herhangi bir şey
- Görev 06'nın paylaşım bağlantısına maliyet eklemek (yukarıdaki gizlilik kuralı)

## Sert kısıtlar

- **`src/engine/` DEĞİŞTİRİLMEZ**; `node scripts/parity.ts` geçmeli.
- Yeni bağımlılık YOK.
- localStorage erişimi try/catch içinde; engelliyse özellik sessizce pasif kalsın, uygulama
  çökmesin.
- Hydration: localStorage yalnızca mount sonrası okunur (`ScanScreen.tsx`'teki `isMobile`
  kalıbını izle), yoksa konsol hatası verir.
- Türkçe arayüz; para `Intl.NumberFormat("tr-TR")` ile, "₺" son ekiyle.
- Kâr/zarar renkleri mevcut token'lar: yükseliş `oklch(0.75 0.1 158)`, düşüş `oklch(0.69 0.13 24)`.
- Statik export'ta çalışmalı; `${BASE_PATH}` kalıbını koru.
- `ingest/`, `data/`, `reference/`, `scripts/`, `.github/`, `../design_handoff_bist_radar/`,
  `components/charts/**` — dokunma.
- Commit atma.

## Kabul kriterleri

1. Bir hisseye lot + maliyet girilebiliyor; sayfa yenilendiğinde korunuyor.
2. Kâr/zarar hesabı doğru: elle hesaplanan değerle birebir (en az 3 hissede kontrol et,
   biri zararda olsun).
3. Özet toplamları, tek tek kartların toplamıyla tutarlı.
4. Adet/maliyet girilmemiş takip edilen hisse toplama katılmıyor ve bu kullanıcıya bildiriliyor.
5. Gecikme uyarısı kâr/zarar gösterilen her yerde görünüyor.
6. Sembol takipten çıkarılıp geri eklenince portföy kaydı korunmuş oluyor.
7. **Paylaşım bağlantısında lot/maliyet YOK** — `?takip=` çıktısını fiilen kontrol et.
8. localStorage engelliyken uygulama çalışıyor, konsol hatası yok.
9. Virgüllü giriş ("12,50") doğru ayrıştırılıyor.
10. `node scripts/parity.ts` geçiyor; `npm run build` ve
    `NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build` hatasız.
11. Mobilde (375px) ilk render DOM düğümü < 2000; yatay kaydırma yok; form alanları ≥44px.
12. Konsolda hata yok (375px ve 1280px).

## Doğrulama

`preview_start` ile `out/` servis et, `resize_window` ile 375 ve 1280. Ekran görüntüsü
alınamıyor, `computer` tıklamaları kaydedilmiyor, animasyonlar/IntersectionObserver çalışmıyor —
`javascript_tool` ile gerçek `.click()`/`input` olayları gönder, `localStorage`'ı doğrudan
oku/yaz. Kâr/zarar doğruluğunu **bağımsız hesaplayıp** karşılaştır (ekrandaki rakamı okuyup
kendi hesabınla doğrula, sadece "makul görünüyor" deme).

## İzin verilen değişiklikler

- OLUŞTUR: `lib/portfolio.ts`, `components/PositionForm.tsx`, `components/PortfolioSummary.tsx`
- DÜZENLE: `components/ScanScreen.tsx`, `components/StockCard.tsx`, `components/MobileList.tsx`,
  `components/WatchlistTab.tsx` (Görev 06'da hangi adla oluşturulduysa), `lib/types.ts`,
  `lib/format.ts`, `app/globals.css`
- DOKUNMA: sert kısıtlardaki dizinler

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce, değişen dosyalar, çalıştırılan kontroller **gerçek
sonuçlarıyla** (kâr/zarar doğrulamasında kullandığın sayıları yaz), ölçülen mobil DOM düğümü,
varsayımlar, çözülmemiş riskler.
