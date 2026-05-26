import { promises as fs } from "node:fs";
import path from "node:path";
import Dashboard from "@/components/Dashboard";
import type { CountryFile, CountrySummary, Coverage } from "@/lib/types";

const DEFAULT_SELECTION = ["US", "XM", "GB", "JP", "CN"];

async function loadJson<T>(rel: string): Promise<T> {
  const p = path.join(process.cwd(), "public", "data", rel);
  const txt = await fs.readFile(p, "utf8");
  return JSON.parse(txt) as T;
}

export default async function Home() {
  const [index, coverage, ...defaults] = await Promise.all([
    loadJson<CountrySummary[]>("index.json"),
    loadJson<Coverage>("coverage.json"),
    ...DEFAULT_SELECTION.map((iso) =>
      loadJson<CountryFile>(`series/${iso}.json`).catch(() => null),
    ),
  ]);
  const preloaded: Record<string, CountryFile> = {};
  defaults.forEach((f, i) => {
    if (f) preloaded[DEFAULT_SELECTION[i]] = f;
  });
  return (
    <Dashboard
      index={index}
      coverage={coverage}
      preloadedSeries={preloaded}
      defaultSelection={DEFAULT_SELECTION}
    />
  );
}
