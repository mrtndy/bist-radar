# Referans kopya

`bist-data.original.js`, tasarım paketindeki (`design_handoff_bist_radar/bist-data.js`)
prototip motorunun **birebir kopyasıdır**. Çalışma zamanında kullanılmaz; yalnızca
`scripts/parity.ts` (motor sapmadı mı) ve `scripts/build-universe.ts` (sektör tohumu) okur.

Asıl dosya bu deponun dışında durduğu için CI'da erişilemiyordu — depo kendi kendine yeterli
olsun diye buraya kopyalandı. Geliştirme makinesinde asıl dosya varsa `scripts/prototype-source.ts`
kopyanın ondan sapmadığını da doğrular, yani sessizce eskiyemez.

Tasarım paketi güncellenirse:

```bash
cp "../design_handoff_bist_radar/bist-data.js" reference/bist-data.original.js
node scripts/parity.ts
```
