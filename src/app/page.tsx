import { promises as fs } from "node:fs";
import path from "node:path";
import Dashboard from "@/components/Dashboard";
import type { CountrySummary, Coverage } from "@/lib/types";

async function loadJson<T>(rel: string): Promise<T> {
  const p = path.join(process.cwd(), "public", "data", rel);
  const txt = await fs.readFile(p, "utf8");
  return JSON.parse(txt) as T;
}

export default async function Home() {
  const [index, coverage] = await Promise.all([
    loadJson<CountrySummary[]>("index.json"),
    loadJson<Coverage>("coverage.json"),
  ]);
  return <Dashboard index={index} coverage={coverage} />;
}
