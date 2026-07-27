import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages gibi alt dizinde servis eden statik host'lar için (kullanici.github.io/repo-adi);
// yerel geliştirmede boş kalır. Aynı değer components/ScanScreen.tsx içinde de okunur
// (NEXT_PUBLIC_* derleme zamanında istemci paketine gömülür) — statik veri dosyalarının
// yolu her iki yerde de tutarlı kalsın diye.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sunucusuz statik export: tarama verisi derleme zamanında public/data/*.json
  // olarak üretilir (scripts/build-static.ts), istemci onu okur. bkz. tasks/02-static-export.md.
  output: "export",
  basePath: base,
  assetPrefix: base,
  // Bir üst dizinlerde başka bir package-lock.json bulunması Next'in workspace
  // root'unu yanlış tahmin etmesine yol açıyordu (bkz. build uyarısı) — kökü
  // burada sabitlemek belirsizliği kaldırır.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
