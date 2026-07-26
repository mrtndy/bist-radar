import { getScanRows } from "../lib/scan-data";
import ScanScreen from "../components/ScanScreen";

const DEFAULT_TF = "G";

// Bar dosyaları ingest tarafından periyodik güncellenir; sayfa build zamanında
// statik donmamalı (bkz. app/api/scan/route.ts'deki aynı gerekçe).
export const dynamic = "force-dynamic";

export default async function Page() {
  const initialData = await getScanRows(DEFAULT_TF);
  return <ScanScreen initialTf={DEFAULT_TF} initialData={initialData} />;
}
