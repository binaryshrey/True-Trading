/**
 * scripts/preprocess-prices.mjs
 *
 * Aggregates minute-level Kraken CSV data → daily OHLCV JSON files
 * that the frontend loads as static assets from /public/data/*.json
 *
 * Usage:  node scripts/preprocess-prices.mjs
 *
 * Input:  data/{TICKER}.csv
 *         Columns: Datetime,Open,High,Low,Close,Volume,Trades
 *         Datetime format: "YYYY-MM-DD HH:MM:SS" (UTC)
 *
 * Output: public/data/{LABEL}.json
 *         Array of { ts, date, open, high, low, close, volume }
 *         One entry per calendar day (UTC), sorted ascending.
 *
 * Excluded: USDT, DAI  (stablecoins — SMA is meaningless on pegged assets)
 * Renamed:  XBT → BTC,  XDG → DOGE  (common aliases)
 */

import { createReadStream, mkdirSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, "..");
const SRC    = join(ROOT, "data");
const OUT    = join(ROOT, "public", "data");

mkdirSync(OUT, { recursive: true });

// Ticker file → display label mapping (stablecoins omitted)
const TICKER_MAP = {
  XBT:   "BTC",
  ETH:   "ETH",
  XDG:   "DOGE",
  XRP:   "XRP",
  LTC:   "LTC",
  XLM:   "XLM",
  XMR:   "XMR",
  ADA:   "ADA",
  BCH:   "BCH",
  LINK:  "LINK",
  ATOM:  "ATOM",
  ETC:   "ETC",
  ZEC:   "ZEC",
  DASH:  "DASH",
  EOS:   "EOS",
  XTZ:   "XTZ",
  QTUM:  "QTUM",
  WAVES: "WAVES",
  BAT:   "BAT",
  ICX:   "ICX",
  LSK:   "LSK",
  MLN:   "MLN",
  NANO:  "NANO",
  OMG:   "OMG",
  PAXG:  "PAXG",
  REP:   "REP",
  SC:    "SC",
  GNO:   "GNO",
};

async function processFile(ticker, label) {
  const csvPath = join(SRC, `${ticker}.csv`);

  // day → { open, high, low, close, volume, firstTs, lastMinute }
  const days = new Map();

  const rl = createInterface({
    input: createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let firstLine = true;
  for await (const line of rl) {
    if (firstLine) { firstLine = false; continue; } // skip header
    if (!line.trim()) continue;

    const comma1 = line.indexOf(",");
    const rest   = line.slice(comma1 + 1);
    const dt     = line.slice(0, comma1);          // "YYYY-MM-DD HH:MM:SS"
    const date   = dt.slice(0, 10);                // "YYYY-MM-DD"

    // Parse remaining columns
    const parts  = rest.split(",");
    const open   = parseFloat(parts[0]);
    const high   = parseFloat(parts[1]);
    const low    = parseFloat(parts[2]);
    const close  = parseFloat(parts[3]);
    const vol    = parseFloat(parts[4]);

    if (isNaN(close) || close <= 0) continue;

    const ts = Date.parse(dt.replace(" ", "T") + "Z"); // UTC ms

    if (!days.has(date)) {
      days.set(date, { open, high, low, close, volume: 0, firstTs: ts, lastTs: ts });
    }
    const d = days.get(date);
    if (ts < d.firstTs) { d.firstTs = ts; d.open = open; }
    if (ts > d.lastTs)  { d.lastTs  = ts; d.close = close; }
    if (high > d.high)  d.high = high;
    if (low  < d.low)   d.low  = low;
    d.volume += vol;
  }

  // Convert to sorted array
  const bars = [...days.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]) => ({
      ts:     new Date(date + "T00:00:00Z").getTime(),
      date,
      open:   +d.open.toFixed(6),
      high:   +d.high.toFixed(6),
      low:    +d.low.toFixed(6),
      close:  +d.close.toFixed(6),
      volume: +d.volume.toFixed(4),
    }));

  const outPath = join(OUT, `${label}.json`);
  writeFileSync(outPath, JSON.stringify(bars));
  console.log(`  ${ticker} → ${label}.json  (${bars.length} daily bars, ${date0(bars)} → ${date1(bars)})`);
}

function date0(bars) { return bars[0]?.date ?? "?"; }
function date1(bars) { return bars[bars.length - 1]?.date ?? "?"; }

// Write the manifest so the frontend knows which tickers are available
function writeManifest() {
  const manifest = Object.entries(TICKER_MAP).map(([ticker, label]) => ({
    ticker,
    label,
    file: `/data/${label}.json`,
  }));
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\n  manifest.json written (${manifest.length} assets)`);
}

console.log("Preprocessing minute → daily bars...\n");
for (const [ticker, label] of Object.entries(TICKER_MAP)) {
  process.stdout.write(`Processing ${ticker}... `);
  try {
    await processFile(ticker, label);
  } catch (e) {
    console.log(`  SKIP (${e.message})`);
  }
}
writeManifest();
console.log("\nDone.");
