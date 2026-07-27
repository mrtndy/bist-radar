"""
BIST Radar — OHLCV ingest.

Bu, projedeki TEK Python bileşenidir ve kasıtlı olarak incedir: tek işi Yahoo Finance'ten
ham barları çekip diske yazmak. Node/TypeScript bu işi yapamıyor çünkü Yahoo, curl/undici
TLS parmak izlerini HTTP 429 ile reddediyor; yfinance'in altındaki curl_cffi Chrome'un TLS
el sıkışmasını taklit ederek geçiyor (2026-07-27'de ölçülerek doğrulandı).

Gösterge ve skor matematiği burada YOKTUR — o mantık TypeScript tarafında tek kopya hâlinde
durur (src/engine/), böylece prototiple birebir kalır.

Kullanım:
    python ingest/ingest.py --timeframe G --out data/bars
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import yfinance as yf

# (yfinance interval, period) — MIN_BARS=120 ısınma payını rahatça karşılar.
#
# Saatlikte "2y" değil "6mo": ölçüldü (2026-07-27, 119 hisse), 3962 bardan 450 bara
# inince göstergelerdeki en büyük göreli fark %0,0000 ve tek bir skor bile değişmiyor —
# EMA(26) o noktada çoktan yakınsamış oluyor. "6mo" ~880 bar verir, yani hâlâ bol paylı.
# Kazanç büyük: bar indirme iş akışı süresinin %83'ünü yiyordu ve saatlik onun en ağır
# parçasıydı. Bu kısaltma gün içi tazelemeyi mümkün kılıyor.
TIMEFRAMES = {
    "G": ("1d", "2y"),
    "H": ("1wk", "10y"),
    "S": ("1h", "6mo"),
}

BATCH_SIZE = 60
RETRIES = 3


def load_universe(path: Path) -> list[str]:
    codes = json.loads(path.read_text(encoding="utf-8"))
    out: list[str] = []
    for entry in codes:
        sym = entry["symbol"] if isinstance(entry, dict) else entry
        # KAP bazı kayıtlarda çoklu kod veriyor: "A1CAP, ACP" -> ilkini al.
        out.append(sym.split(",")[0].strip().upper())
    return sorted(set(c for c in out if c and c != "-"))


def fetch_batch(symbols: list[str], interval: str, period: str) -> dict[str, list[dict]]:
    tickers = [f"{s}.IS" for s in symbols]
    last_err: Exception | None = None
    for attempt in range(RETRIES):
        try:
            df = yf.download(
                tickers,
                period=period,
                interval=interval,
                group_by="ticker",
                auto_adjust=False,
                progress=False,
                threads=True,
            )
            break
        except Exception as exc:  # ağ/oran sınırı — üstel geri çekilme
            last_err = exc
            time.sleep(2**attempt)
    else:
        raise RuntimeError(f"batch failed after {RETRIES} tries: {last_err}")

    out: dict[str, list[dict]] = {}
    for sym, tic in zip(symbols, tickers):
        if tic not in df.columns.get_level_values(0):
            continue
        sub = df[tic].dropna(subset=["Close"])
        if sub.empty:
            continue
        bars = [
            {
                "t": int(ts.timestamp() * 1000),
                "o": round(float(r.Open), 6),
                "h": round(float(r.High), 6),
                "l": round(float(r.Low), 6),
                "c": round(float(r.Close), 6),
                "v": float(r.Volume),
            }
            for ts, r in sub.iterrows()
            if r.Open == r.Open and r.Volume == r.Volume  # NaN ele
        ]
        if bars:
            out[sym] = bars
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeframe", choices=sorted(TIMEFRAMES), default="G")
    ap.add_argument("--universe", type=Path, default=Path("data/universe.json"))
    ap.add_argument("--out", type=Path, default=Path("data/bars"))
    ap.add_argument("--limit", type=int, default=0, help="ilk N sembol (deneme için)")
    args = ap.parse_args()

    interval, period = TIMEFRAMES[args.timeframe]
    symbols = load_universe(args.universe)
    if args.limit:
        symbols = symbols[: args.limit]

    out_dir = args.out / args.timeframe
    out_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    t0 = time.time()
    for i in range(0, len(symbols), BATCH_SIZE):
        chunk = symbols[i : i + BATCH_SIZE]
        got = fetch_batch(chunk, interval, period)
        for sym, bars in got.items():
            (out_dir / f"{sym}.json").write_text(json.dumps(bars), encoding="utf-8")
        total += len(got)
        print(
            f"  {i + len(chunk):4d}/{len(symbols)}  yazılan={total}",
            file=sys.stderr,
            flush=True,
        )

    elapsed = time.time() - t0
    meta = {
        "timeframe": args.timeframe,
        "interval": interval,
        "period": period,
        "requested": len(symbols),
        "written": total,
        "fetchedAt": int(time.time() * 1000),
        "source": "yahoo-finance (yfinance %s)" % yf.__version__,
    }
    (args.out / f"{args.timeframe}.meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"{args.timeframe}: {total}/{len(symbols)} sembol, {elapsed:.1f}s", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
