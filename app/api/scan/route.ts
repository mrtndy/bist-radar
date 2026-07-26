import { NextResponse, type NextRequest } from "next/server";
import { getScanRows } from "../../../lib/scan-data";
import type { ScanApiResponse, Timeframe } from "../../../lib/types";

// Motor girdisi (bar dosyaları) her an değişebilir (ingest); Next'in statik/route
// önbelleğine güvenmek yerine kendi mtime tabanlı önbelleğimizi (lib/scan-data)
// kullanıyoruz — bu route her istekte dinamik çalışmalı.
export const dynamic = "force-dynamic";

const VALID_TF: readonly Timeframe[] = ["G", "H", "S"];

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("tf") ?? "G";
  const tf = (VALID_TF as readonly string[]).includes(raw) ? (raw as Timeframe) : "G";

  try {
    const result = await getScanRows(tf);
    const body: ScanApiResponse = { tf, ...result };
    return NextResponse.json(body);
  } catch (err) {
    console.error(`[/api/scan] tf=${tf} okuma hatası:`, err);
    return NextResponse.json(
      { error: "Tarama verisi okunamadı. Barlar eksik/bozuk olabilir." },
      { status: 500 },
    );
  }
}
