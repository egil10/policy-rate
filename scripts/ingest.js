// Streams the BIS CBPOL flat CSV, extracts monthly observations per country,
// merges with Wikipedia "current rate" snapshot, and writes:
//   public/data/series/{ISO2}.json   per-country time series
//   public/data/index.json           lightweight country list with current rate
//   public/data/coverage.json        covered vs. missing report
//
// Usage:
//   node scripts/fetch.js     # downloads BIS CBPOL zip into data/raw/
//   node scripts/ingest.js    # parses + writes public/data/

import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { COUNTRIES, NAME_TO_ISO2 } from "./countries.js";
import { CURRENT_RATES } from "./current-rates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RAW_CSV = resolve(ROOT, "data/raw/WS_CBPOL_csv_flat.csv");
const SERIES_DIR = resolve(ROOT, "public/data/series");
const DATA_DIR = resolve(ROOT, "public/data");

if (!existsSync(RAW_CSV)) {
  console.error(`[ingest] missing ${RAW_CSV}`);
  console.error("[ingest] run `npm run fetch` first to download the BIS CBPOL CSV");
  process.exit(1);
}

mkdirSync(SERIES_DIR, { recursive: true });

function splitCsv(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const rl = createInterface({
  input: createReadStream(RAW_CSV, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

const series = new Map(); // ISO2 -> [{ d, v }]
const seenRefAreas = new Set();
let header = null;
let idxFreq, idxRef, idxTime, idxVal;
let processed = 0;

console.log("[ingest] streaming BIS CBPOL CSV …");

for await (const line of rl) {
  if (!line) continue;
  if (!header) {
    header = splitCsv(line);
    idxFreq = header.findIndex((h) => h.startsWith("FREQ"));
    idxRef = header.findIndex((h) => h.startsWith("REF_AREA"));
    idxTime = header.findIndex((h) => h.startsWith("TIME_PERIOD"));
    idxVal = header.findIndex((h) => h.startsWith("OBS_VALUE"));
    continue;
  }
  const row = splitCsv(line);
  const freq = (row[idxFreq] || "").split(":")[0].trim();
  if (freq !== "M") continue;
  const refRaw = row[idxRef] || "";
  const iso2 = refRaw.split(":")[0].trim();
  if (!iso2) continue;
  seenRefAreas.add(iso2);
  const date = (row[idxTime] || "").trim();
  const valRaw = (row[idxVal] || "").trim();
  if (!date || valRaw === "") continue;
  const value = Number(valRaw);
  if (!Number.isFinite(value)) continue;

  let arr = series.get(iso2);
  if (!arr) {
    arr = [];
    series.set(iso2, arr);
  }
  arr.push({ d: date, v: value });
  processed++;
  if (processed % 200000 === 0) {
    console.log(`[ingest]   processed ${processed.toLocaleString()} rows …`);
  }
}

console.log(`[ingest] done. ${processed.toLocaleString()} obs across ${series.size} ref areas.`);

const currentByIso2 = new Map();
const wikiMissingCountries = [];
for (const row of CURRENT_RATES) {
  const iso2 = NAME_TO_ISO2[row.name];
  if (!iso2) {
    wikiMissingCountries.push(row.name);
    continue;
  }
  currentByIso2.set(iso2, { rate: row.rate, date: row.date });
}

const allIso2 = new Set([...series.keys(), ...currentByIso2.keys()]);
const index = [];

for (const iso2 of allIso2) {
  const meta = COUNTRIES[iso2];
  if (!meta) continue;
  const obs = (series.get(iso2) || []).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const current = currentByIso2.get(iso2) || null;
  const latestObs = obs.length ? obs[obs.length - 1] : null;
  const latest = current
    ? { rate: current.rate, date: current.date, source: "wikipedia-snapshot-2026-05-26" }
    : latestObs
    ? { rate: latestObs.v, date: latestObs.d, source: "BIS-CBPOL" }
    : null;

  const file = {
    iso2: meta.iso2,
    iso3: meta.iso3,
    name: meta.name,
    continent: meta.continent,
    flagCode: meta.flagCode,
    latest,
    sources: {
      history: obs.length ? "BIS CBPOL (monthly, end of period)" : null,
      current: current ? "Wikipedia (2026-05-26 snapshot)" : null,
    },
    history: obs,
  };
  writeFileSync(resolve(SERIES_DIR, `${iso2}.json`), JSON.stringify(file));
  index.push({
    iso2: meta.iso2,
    iso3: meta.iso3,
    name: meta.name,
    continent: meta.continent,
    flagCode: meta.flagCode,
    rate: latest?.rate ?? null,
    rateDate: latest?.date ?? null,
    hasHistory: obs.length > 0,
    historyStart: obs.length ? obs[0].d : null,
    historyEnd: obs.length ? obs[obs.length - 1].d : null,
    historyCount: obs.length,
  });
}

index.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(resolve(DATA_DIR, "index.json"), JSON.stringify(index, null, 2));

const withHistory = index.filter((c) => c.hasHistory);
const onlyCurrent = index.filter((c) => !c.hasHistory && c.rate !== null);
const unknownBisAreas = [...seenRefAreas].filter((c) => !COUNTRIES[c]);

const coverage = {
  generatedAt: new Date().toISOString(),
  totals: {
    countriesSurfaced: index.length,
    withHistorySeries: withHistory.length,
    currentOnly: onlyCurrent.length,
  },
  withHistory: withHistory.map((c) => ({
    iso2: c.iso2,
    name: c.name,
    historyStart: c.historyStart,
    historyEnd: c.historyEnd,
    historyCount: c.historyCount,
  })),
  currentOnly: onlyCurrent.map((c) => ({ iso2: c.iso2, name: c.name, rate: c.rate, rateDate: c.rateDate })),
  unknownBisReferenceAreas: unknownBisAreas,
  wikipediaNamesUnmapped: wikiMissingCountries,
  sources: {
    historical: {
      name: "BIS Central Bank Policy Rates (WS_CBPOL)",
      url: "https://data.bis.org/topics/CBPOL",
      bulk: "https://data.bis.org/static/bulk/WS_CBPOL_csv_flat.zip",
      frequency: "Monthly, end of period",
    },
    current: {
      name: "Wikipedia — List of countries by central bank interest rates",
      url: "https://en.wikipedia.org/wiki/List_of_countries_by_central_bank_interest_rates",
      snapshotDate: "2026-05-26",
    },
  },
};
writeFileSync(resolve(DATA_DIR, "coverage.json"), JSON.stringify(coverage, null, 2));

console.log(`[ingest] wrote ${index.length} country files`);
console.log(`[ingest]   with history: ${withHistory.length}`);
console.log(`[ingest]   current-only: ${onlyCurrent.length}`);
if (unknownBisAreas.length) console.log(`[ingest]   unmapped BIS areas: ${unknownBisAreas.join(", ")}`);
if (wikiMissingCountries.length) console.log(`[ingest]   unmapped wiki names: ${wikiMissingCountries.join(", ")}`);
