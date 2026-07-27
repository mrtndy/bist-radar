# Görev 06 — Takip listesi + kolon düzeni

**Atanan tier:** 2 (standart implementasyon) — Sonnet 5 subagent
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin.

İki bağımsız özellik. **A önce yapılsın** (daha değerli), sonra B.

---

# A. Takip listesi

## Amaç

Kullanıcı ilgilendiği hisseleri işaretleyip bir arada görebilsin.

## Mimari kısıt

Site **tamamen statik** — sunucu, hesap, giriş yok. Bu yüzden:

1. **localStorage** (`bist-radar:takip`, sembol dizisi) — cihazda kalıcı.
2. **URL ile paylaşım** — `?takip=THYAO,GARAN,BIMAS`. Kritik kullanım senaryosu:
   listeyi bir kişi hazırlayıp bağlantıyı asıl kullanıcıya gönderiyor; o tıklayınca
   listesi hazır geliyor. Sembol arayıp tek tek eklemek zorunda kalmıyor.

**URL'de sembol varsa** ve localStorage'da da liste varsa: kullanıcıya sor —
"Bağlantıdaki N hisse eklensin mi? [Listeme ekle] [Listemi değiştir] [Yoksay]".
localStorage boşsa doğrudan uygula. Uygulandıktan sonra URL'yi temizle
(`history.replaceState`) ki yenilemede tekrar sormasın.

## Kapsam

- **Yıldız düğmesi**: her satırda (masaüstü) ve her kartta (mobil). Dolu/boş yıldız,
  ≥44×44px dokunma alanı mobilde. `aria-pressed` ve `aria-label` doğru olsun.
- **Mobil**: mevcut `[Hisseler | Haberler]` sekmelerine üçüncü olarak **`Takibim`** eklensin.
  Sekmede yalnızca takip edilenler, aynı kart bileşeniyle.
- **Masaüstü**: filtre panelindeki sinyal chip'lerinin yanına **"Takip listem"** chip'i
  (seçiliyken yalnızca takip edilenler). Ayrıca tabloda yıldız kolonu (en solda, dar).
- **Boş durum**: takip listesi boşken ne yapacağını anlatan sade bir metin —
  "Bir hissenin yanındaki ★ işaretine dokunarak takip listenize ekleyin."
- **Paylaş düğmesi**: takip listesi doluyken, listeyi bağlantı olarak kopyalayan bir düğme
  ("Listeyi paylaş" → panoya kopyalar, "Bağlantı kopyalandı" geri bildirimi).
  `navigator.clipboard` yoksa bağlantıyı seçilebilir bir metin kutusunda göster.

## KAPSAM DIŞI — bunu YAPMA

**Adet/maliyet girişi ve kâr-zarar hesabı YOK.** Yalnızca sembol listesi. Fiyatlar 15 dakika
gecikmeli olduğu için para rakamı göstermek ayrı bir sorumluluk; kullanıcı ayrıca karar verecek.

---

# B. Kolon düzeni (yalnızca masaüstü)

## Amaç

Kullanıcı tablodaki kolonların sırasını değiştirebilsin ve istemediklerini gizleyebilsin.

## Kapsam

- **Sıra değiştirme**: başlıkları sürükle-bırak ile. **Kütüphane KULLANMA** — HTML5
  drag-and-drop (`draggable`, `dragstart`, `dragover`, `drop`) yeterli.
- **Göster/gizle**: başlık çubuğunda bir "Kolonlar" düğmesi → onay kutulu liste.
- **SEMBOL kolonu sabit**: taşınamaz ve gizlenemez (hissenin kimliği; onsuz tablo okunamaz).
  Diğer 11 kolon serbest.
- **Kalıcılık**: `bist-radar:kolonlar` anahtarında localStorage (sıra + gizli olanlar).
- **"Varsayılana dön"** düğmesi.
- Sıralama (sort) davranışı bozulmamalı: kolon taşındıktan sonra da başlığa tıklayınca
  o kolona göre sıralamalı.
- Mobil düzende bu özellik **hiç görünmesin** (kart listesi var, kolon yok).

---

## Sert kısıtlar (ikisi için de)

- **`src/engine/` DEĞİŞTİRİLMEZ**; `node scripts/parity.ts` geçmeli.
- `scoreOf(ind, tf)` — tf zorunlu.
- **Yeni bağımlılık YOK** (sürükle-bırak kütüphanesi dahil).
- localStorage erişimi **try/catch içinde** olsun — gizli sekmede/engelliyse uygulama
  çökmemeli, özellik sessizce devre dışı kalmalı.
- Sunucu tarafı render ile uyum: localStorage yalnızca mount sonrası okunabilir. İlk render
  sunucudakiyle aynı olmalı, yoksa React hydration hatası verir (`isMobile`'da uygulanan
  kalıba bak, aynısını uygula).
- Türkçe arayüz, `Intl.NumberFormat("tr-TR")`.
- Tasarım token'ları: accent geniş dolgu olarak kullanılmaz; yıldız için accent tonu kullan,
  yeşil/kırmızı KULLANMA (onlar fiyat/sinyal renkleri).
- Statik export'ta çalışmalı; `${BASE_PATH}` kalıbını koru.
- `ingest/`, `data/`, `reference/`, `scripts/parity.ts`, `scripts/atr-calibration.ts`,
  `scripts/prototype-source.ts`, `scripts/build-news.ts`, `.github/`,
  `../design_handoff_bist_radar/` — dokunma.
- Commit atma.

## Kabul kriterleri

**A — takip listesi**
1. Yıldıza basınca sembol ekleniyor/çıkıyor; sayfa yenilendiğinde korunuyor.
2. Mobilde `Takibim` sekmesi yalnızca takip edilenleri gösteriyor; boşken açıklayıcı metin var.
3. Masaüstünde "Takip listem" chip'i doğru filtreliyor; sayaç doğru.
4. `?takip=THYAO,GARAN` ile açıldığında (localStorage boşken) liste uygulanıyor ve URL
   temizleniyor.
5. localStorage doluyken URL'de liste varsa seçim soruluyor; üç seçenek de doğru çalışıyor.
6. "Listeyi paylaş" panoya doğru bağlantıyı kopyalıyor.
7. localStorage engelliyken uygulama çalışmaya devam ediyor (konsol hatası yok, özellik pasif).

**B — kolonlar**
8. Bir kolon sürüklenip bırakılınca sıra değişiyor ve yenilemede korunuyor.
9. "Kolonlar" menüsünden gizlenen kolon tablodan kalkıyor, geri açılınca dönüyor.
10. SEMBOL taşınamıyor/gizlenemiyor.
11. Taşınan bir kolonun başlığına tıklayınca sıralama hâlâ doğru çalışıyor.
12. "Varsayılana dön" orijinal 12 kolonluk sırayı geri getiriyor.
13. Mobilde (375px) kolon arayüzü hiç görünmüyor.

**Ortak**
14. `node scripts/parity.ts` geçiyor; `npm run build` ve
    `NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build` hatasız.
15. Mobilde ilk render DOM düğümü **< 2000**; yatay kaydırma yok.
16. Konsolda hata yok (375px ve 1280px).

## Doğrulama

`preview_start` ile `out/` servis et, `resize_window` ile 375 ve 1280.
Bu ortamda ekran görüntüsü alınamıyor, `computer` tıklamaları kaydedilmiyor, CSS animasyonları
ve IntersectionObserver çalışmıyor — `javascript_tool` ile gerçek `.click()` gönder,
`localStorage` içeriğini doğrudan oku/yaz, sürükle-bırak için gerçek `DragEvent`'ler
(`dragstart`/`dragover`/`drop`, `DataTransfer` ile) gönder. Panel/sayfa animasyonlarını
`element.getAnimations().forEach(a => a.finish())` ile bitirip ölç.

## İzin verilen değişiklikler

- OLUŞTUR: `lib/watchlist.ts`, `lib/columns.ts`, `components/WatchlistTab.tsx`,
  `components/ColumnMenu.tsx`, `components/StarButton.tsx` (isimler serbest)
- DÜZENLE: `components/ScanScreen.tsx`, `components/ScanTable.tsx`,
  `components/StockCard.tsx`, `components/FilterPanel.tsx`, `components/MobileList.tsx`,
  `lib/types.ts`, `app/globals.css`
- DOKUNMA: sert kısıtlardaki dizinler; `components/DetailDrawer.tsx`, `components/charts/**`,
  `components/NewsPanel.tsx`, `components/NewsList.tsx`

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce, değişen dosyalar, çalıştırılan kontroller **gerçek
sonuçlarıyla**, ölçülen mobil DOM düğümü, varsayımlar, çözülmemiş riskler.
