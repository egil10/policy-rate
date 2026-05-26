// Downloads the BIS CBPOL bulk CSV zip into data/raw/ and extracts the CSV.

import { existsSync, mkdirSync, createWriteStream, createReadStream, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RAW = resolve(ROOT, "data/raw");
const ZIP = resolve(RAW, "WS_CBPOL_csv_flat.zip");
const CSV = resolve(RAW, "WS_CBPOL_csv_flat.csv");
const URL = "https://data.bis.org/static/bulk/WS_CBPOL_csv_flat.zip";

mkdirSync(RAW, { recursive: true });

console.log(`[fetch] downloading ${URL}`);
const res = await fetch(URL);
if (!res.ok) {
  console.error(`[fetch] HTTP ${res.status}`);
  process.exit(1);
}
await pipeline(res.body, createWriteStream(ZIP));
console.log(`[fetch] saved ${ZIP}`);

// Extract via system unzip (works on Win + Unix).
try {
  execSync(`unzip -o "${ZIP}" -d "${RAW}"`, { stdio: "inherit" });
} catch (err) {
  console.error("[fetch] unzip failed. Make sure `unzip` is installed (e.g. via Git Bash on Windows).", err);
  process.exit(1);
}

if (!existsSync(CSV)) {
  console.error(`[fetch] expected ${CSV} after unzip`);
  process.exit(1);
}

console.log(`[fetch] ready: ${CSV}`);
