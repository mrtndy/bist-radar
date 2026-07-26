import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Bir üst dizinlerde başka bir package-lock.json bulunması Next'in workspace
  // root'unu yanlış tahmin etmesine yol açıyordu (bkz. build uyarısı) — kökü
  // burada sabitlemek belirsizliği kaldırır.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
