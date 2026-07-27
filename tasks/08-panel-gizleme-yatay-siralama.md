# Görev 08 — Panel gizleme, yatay ekran düzeltmesi, mobil sıralama

**Atanan tier:** 2 (standart implementasyon) — Sonnet 5 subagent
**Tek yazar:** Bu görev süresince `bist-radar/` çalışma ağacının tek yazarı sensin.

Üç bağımsız iş. **B önce yapılsın** — o bir hata düzeltmesi, diğer ikisi iyileştirme.

---

# A. Her panel/sekme gizlenebilsin

## Masaüstü
- **Sol filtre paneli katlanabilir olsun.** Sağ haber paneli zaten kapatılabiliyor;
  aynı kalıbı sol panele uygula (kapatınca ince bir şerit + geri açma düğmesi).
  Kapalıyken tabloya daha çok yer kalsın.
- Her iki panelin açık/kapalı durumu localStorage'da saklansın
  (`bist-radar:paneller`).

## Mobil
- Kullanıcı **kullanmadığı sekmeleri gizleyebilsin** (Hisseler / Haberler / Takibim).
  Örneğin haberlerle ilgilenmeyen biri o sekmeyi kaldırabilsin.
- **Hisseler sekmesi gizlenemez** (uygulamanın ana ekranı; hepsi gizlenirse
  uygulama kullanılamaz hâle gelir).
- Kontrol nerede: üst barda küçük bir ayar düğmesi (⚙ veya "Görünüm") → onay kutulu
  liste. Aynı yerden masaüstü panel tercihleri de yönetilebilir (tek "Görünüm" menüsü).
- Tercih localStorage'da (`bist-radar:sekmeler`).
- Gizli bir sekme aktifken gizlenirse, otomatik olarak Hisseler'e dönülsün.

---

# B. Yatay ekran (telefon yan çevrildiğinde) — HATA DÜZELTMESİ

## Sorun (ölçüldü, 2026-07-27)

Kırılma noktası yalnızca **genişliğe** bakıyor (`width < 720`). Telefon yan çevrilince
viewport 812×375 oluyor; genişlik 720'yi aştığı için masaüstü düzenine geçiyor ama:

- Tablo `min-width: 1060px` — 812px ekrana sığmıyor
- Sol filtre paneli 236px yiyor, tabloya ~576px kalıyor
- Yükseklik 375px olduğu için **yalnızca 5 satır** görünüyor

Yani "masaüstü gibi" olmaya çalışıp kullanılamaz hâle geliyor.

## Çözüm

Kırılma noktası **yüksekliği de** hesaba katsın:

```
isMobile = width < 720 || height < 500
```

Gerekçe: gerçek bir masaüstü penceresi nadiren 500px'den kısadır; yan çevrilmiş telefon
her zaman kısadır. Böylece yan çevrilince kart düzeni korunur.

**Ek iyileştirme:** mobil düzendeyken genişlik ≥ 600px ise kartlar **iki sütunlu grid**
olsun — yan çevrilmiş telefonda boş alan kalmasın. Dar ekranda tek sütun kalsın.

`resize` dinleyicisi zaten var; `orientationchange` olayını da dinle (bazı tarayıcılarda
döndürmede `resize` geç/eksik tetikleniyor).

---

# C. Mobil sıralama: tüm kolonlar + artan/azalan

## Sorun

Mobil sıralama menüsünde yalnızca 4 sabit seçenek var ve **yön değiştirilemiyor**.
Masaüstünde 11 kolona göre iki yönde sıralanabiliyor; mobilde bu kayıp.

## Çözüm

Sıralama menüsü şunları sunsun:
- **Alanlar:** Skor, Değişim, Fiyat, Sembol, RSI, Relatif hacim, ATR %, Stokastik %K,
  MACD, %B, Haber (masaüstü tablodaki sıralanabilir alanların tamamı)
- **Yön:** her alanın yanında artan/azalan seçilebilsin. Ya seçili alana tekrar
  dokununca yön değişsin (ve ok işaretiyle gösterilsin), ya da menüde ayrı bir
  "Artan / Azalan" geçişi olsun. Hangisini seçersen seç, **seçili alan ve yön ekranda
  açıkça görünsün** (ör. düğme üstünde "Skor ↓").
- Varsayılan: Skor, azalan (bugünkü davranış).
- Seçim localStorage'da saklanmasın — oturum içinde kalsın (masaüstü davranışıyla
  tutarlı olsun; orada da sıralama kalıcı değil).

Türkçe alan adları `SORT_NAMES` sabitinde zaten var, onu kullan.

---

## Sert kısıtlar

- **`src/engine/` DEĞİŞTİRİLMEZ**; `node scripts/parity.ts` geçmeli.
- Yeni bağımlılık YOK.
- localStorage erişimi try/catch içinde; engelliyse özellik pasif kalsın, uygulama çökmesin.
- Hydration: localStorage/viewport yalnızca mount sonrası okunur — `ScanScreen.tsx`'teki
  mevcut kalıbı izle, yoksa konsol hatası verir.
- Mobilde dokunma hedefleri **≥44×44px** (bu projede daha önce iki kez atlandı, dikkat).
- Türkçe arayüz.
- Masaüstü tablo düzeni (kolonlar, sıralama) A ve C dışında değişmesin.
- `ingest/`, `data/`, `reference/`, `scripts/`, `.github/`, `../design_handoff_bist_radar/`,
  `components/charts/**` — dokunma.
- Commit atma.

## Kabul kriterleri

**A**
1. Masaüstünde sol filtre paneli kapatılıp açılabiliyor; kapalıyken tablo genişliyor.
2. Panel durumu sayfa yenilendiğinde korunuyor.
3. Mobilde "Görünüm" menüsünden Haberler ve Takibim sekmeleri gizlenebiliyor; gizlenince
   sekme çubuğundan kalkıyor ve tercih yenilemede korunuyor.
4. Hisseler sekmesi gizlenemiyor (onay kutusu pasif veya hiç yok).
5. Aktif sekme gizlenirse Hisseler'e dönülüyor.

**B**
6. **812×375'te (yan çevrilmiş telefon) kart düzeni görünüyor, tablo GÖRÜNMÜYOR.**
7. 812×375'te yatay kaydırma yok ve ekranda 2'den fazla kart görünüyor.
8. Genişlik ≥600px mobil düzende kartlar iki sütunlu.
9. 1280×800'de masaüstü düzeni aynen çalışıyor (regresyon yok).
10. 375×812 dikey düzen bugünkü hâliyle aynı (tek sütun kart).

**C**
11. Sıralama menüsünde 11 alanın tamamı var.
12. Her alan için artan ve azalan seçilebiliyor; seçili alan+yön ekranda görünüyor.
13. En az 3 farklı alanda sıralama sonucu **bağımsız hesaplanan sırayla** doğrulandı
    (ilk 3 sembolü karşılaştır), her birinde iki yön de.

**Ortak**
14. `node scripts/parity.ts` geçiyor; `npm run build` ve
    `NEXT_PUBLIC_BASE_PATH=/bist-radar npm run build` hatasız.
15. Mobilde (375px) ilk render DOM düğümü **< 2000**.
16. Konsolda hata yok: 375×812, 812×375, 1280×800.

## Doğrulama

`preview_start` ile `out/` servis et; `resize_window` ile **üç boyutu da** dene:
375×812 (dikey telefon), **812×375 (yatay telefon)**, 1280×800 (masaüstü).
Bu ortamda ekran görüntüsü alınamıyor, `computer` tıklamaları kaydedilmiyor,
animasyonlar/IntersectionObserver çalışmıyor — `javascript_tool` ile gerçek `.click()`
gönder, `getBoundingClientRect`/`getComputedStyle` oku, `localStorage`'ı doğrudan yönet.
Boyut değiştirdikten sonra `window.dispatchEvent(new Event('resize'))` göndermen gerekebilir
(bu ortam gerçek resize olayı üretmiyor).

## İzin verilen değişiklikler

- OLUŞTUR: `components/ViewMenu.tsx`, `lib/view-prefs.ts` (isimler serbest)
- DÜZENLE: `components/ScanScreen.tsx`, `components/TopBar.tsx`, `components/FilterPanel.tsx`,
  `components/SortMenu.tsx`, `components/MobileList.tsx`, `components/NewsPanel.tsx`,
  `lib/types.ts`, `lib/columns.ts`, `app/globals.css`
- DOKUNMA: sert kısıtlardaki dizinler

## İstenen çıktı

Kontrat §4 formatında rapor: sonuç önce (üç iş ayrı ayrı), değişen dosyalar, çalıştırılan
kontroller **gerçek sonuçlarıyla** (sıralama doğrulamasında karşılaştırdığın sembolleri yaz),
üç boyutta ölçülen DOM düğümü, varsayımlar, çözülmemiş riskler.
