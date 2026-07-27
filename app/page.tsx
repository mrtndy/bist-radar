import { getScanRows } from "../lib/scan-data";
import ScanScreen from "../components/ScanScreen";

const DEFAULT_TF = "G";

// Statik export (next.config.ts: output "export") tüm sayfaların derleme zamanında
// tek seferlik render edilmesini gerektirir; bu yüzden artık "force-dynamic" YOK
// (statik export ile uyumsuz — bkz. tasks/02-static-export.md). Burada gömülen ilk
// G verisi, scripts/build-static.ts'in ürettiği public/data/scan-G.json ile aynı
// `data/bars` anlık görüntüsünden hesaplanır; ikisi de lib/scan-data.ts'i kullanır.
export default async function Page() {
  const initialData = await getScanRows(DEFAULT_TF);
  return <ScanScreen initialTf={DEFAULT_TF} initialData={initialData} />;
}
