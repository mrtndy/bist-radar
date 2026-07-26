# BIST Radar — veri katmanı

`../design_handoff_bist_radar/` altındaki tasarım paketinin üretim uygulaması.
Bu dizin şu an **veri katmanı + hesaplama motorunu** içerir; arayüz henüz yok.

Durum: veri hattı uçtan uca çalışıyor ve gerçek BIST verisiyle doğrulandı (2026-07-27).

## Neden bu mimari

| Katman | Dil | Gerekçe |
|---|---|---|
| `ingest/` | Python | **Tek Python bileşeni.** Yahoo Finance, Node/undici ve düz curl'ün TLS parmak izini HTTP 429 ile reddediyor; yfinance'in altındaki `curl_cffi` Chrome'un TLS el sıkışmasını taklit ederek geçiyor. Ölçülerek doğrulandı, varsayım değil. |
| `src/engine/` | TypeScript | Gösterge + skor matematiği. Prototipteki `bist-data.js` zaten JavaScript olduğu için **birebir** portlanabildi; ikinci bir dile bölmek sapma riski yaratırdı. |
| `src/providers/` | TypeScript | KAP (evren + bildirimler), İş Yatırım (çapraz doğrulama). İkisi de Node'dan sorunsuz erişilebiliyor. |

## Doğrulanmış veri kaynakları (2026-07-27 ölçümleri)

| Kaynak | Ne veriyor | Gecikme | Ücret | Ölçüm |
|---|---|---|---|---|
| Yahoo Finance (yfinance + curl_cffi) | OHLCV — günlük/haftalık/saatlik, tam OHLC | ~15 dk | 0 | 619/639 sembol, günlük 54 sn · haftalık 51 sn · saatlik 222 sn |
| KAP `/api/company/items/IGS/A` | Hisse evreni | — | 0 | 743 üye → 615 işlem gören → 639 kod |
| KAP `/api/disclosure/members/byCriteria` | Şirket bildirimleri, saniye hassasiyetli, `stockCodes` hazır | saniyeler | 0 | 568 bildirim / 286 ms; 283'ü evrenle eşleşti |
| İş Yatırım `HisseTekil` | EOD OHLC (açılış YOK) — çapraz doğrulama | gün sonu | 0 | 10 sembolde kapanışlar yfinance ile **%0,000** sapma |

Sonuç: **taramanın tamamı ücretsiz veriyle çalışıyor.** Gerçek zamanlı (0 gecikmeli) veri BIST'te
lisanslıdır; gerekirse `DataProvider` arayüzüne bir aracı kurum API'si takılır — çekirdek değişmez.

## Kurulum

```bash
npm --version   # Node >= 24 gerekli (TypeScript'i doğrudan çalıştırır, build adımı yok)
python3 -m venv .venv && ./.venv/bin/pip install -r ingest/requirements.txt
```

## Kullanım

```bash
node scripts/build-universe.ts              # KAP'tan evren -> data/universe.json
./.venv/bin/python ingest/ingest.py --timeframe G   # barlar -> data/bars/G/*.json
node scripts/scan.ts --tf G --top 20        # tarama tablosu
node scripts/news.ts --days 3               # KAP bildirim akışı
node scripts/parity.ts                      # motor prototiple aynı mı?
```

## Parity garantisi

`scripts/parity.ts`, TypeScript motorunu prototipin orijinal `bist-data.js`'iyle aynı barlarda
karşılaştırır: **144 vaka (12 sembol × 4 tier × 3 zaman dilimi), tüm alanlar eşleşiyor.**
Motor dosyalarına dokunan her değişiklikten sonra çalıştır. Kasıtlı iki fark:
`chart.labels` (gerçek zaman damgası) ve `chart.bars[].t` (orijinalde yok).

## Bilinen konular

**1. ATR skorlaması yalnızca günlük zaman diliminde ayırt edici.**
`scoreOf()` ATR bandı %2–6'yı "ideal" (+6) sayar. Gerçek veriyle medyan ATR:

| Zaman dilimi | Medyan ATR% | Sonuç |
|---|---|---|
| Günlük | 4,21 | 499/598 hisse +6 — tasarlandığı gibi çalışıyor |
| Haftalık | 10,27 | 448/548 hisse sabit **−5** — ayırt etmiyor |
| Saatlik | 1,10 | 545/611 hisse sabit **−2** — ayırt etmiyor |

Prototipin sentetik verisi bunu gizlemişti. Düzeltmek eşikleri zaman dilimine göre ölçeklemeyi
gerektirir (kabaca bar süresinin kareköküyle) — bu **ürün kararıdır**, sinyal anlamını değiştirir.
Handoff "birebir portla" dediği için motor kasıtlı olarak **değiştirilmedi**.

**2. Sektör bilgisi eksik.** KAP'ta ve İş Yatırım'ın açık uçlarında makinece okunabilir sektör
alanı yok (İş Yatırım sektör uçları HTTP 401). Şu an prototipin küratörlü 158 hisselik listesinden
tohumlanıyor: **155 eşleşti, 484 hisse "Diğer".** Kalıcı çözüm BIST sektör endeksi (XBANK, XHOLD…)
üyeliğini bağlamak.

**3. Kapsam.** 639 koddan 619'u veri döndürüyor; 20'si Yahoo'da yok (borsa kotundan çıkmış veya
eski kodlar: `$TGB`, `$TIB`, `$YKB`…). Ayrıca yeni halka arzlar 120 barlık ısınmayı doldurmadığı
için taramada atlanıyor (günlük 21, haftalık 71, saatlik 8).

**4. KAP uçları resmî API değil.** Kimlik doğrulama istemiyorlar ama belgelenmiş de değiller;
habersiz değişebilirler. `robots.txt` standart dışı HTTP 666 döndürüyor — WAF agresif, istekleri
seyrek tut (~2 istek/sn üstüne çıkma).

## Sırada

- Next.js arayüzü — prototipin birebir yeniden inşası (bkz. `tasks/01-nextjs-ui.md`)
- KAP poller (seans içi 15–30 sn) + haber → hisse eşlemesi kalıcılaştırma
- Sektör kaynağı
- Genel piyasa haber akışı: AA/Dünya/Ekonomim/Investing RSS (doğrulandı, çalışıyor)
