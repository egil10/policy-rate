import { promises as fs } from "node:fs";
import path from "node:path";
import GridView from "@/components/GridView";
import type { CountryFile, CountrySummary, Observation } from "@/lib/types";

export const metadata = {
  title: "All countries — Policy Rate",
  description: "Sparkline grid of every country with monthly policy-rate history.",
};

// Decimate to ~240 points so payload stays small and rendering is cheap.
function decimate<T>(arr: T[], target = 240): T[] {
  if (arr.length <= target) return arr;
  const step = Math.ceil(arr.length / target);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

export default async function GridPage() {
  const dataDir = path.join(process.cwd(), "public", "data");
  const index = JSON.parse(await fs.readFile(path.join(dataDir, "index.json"), "utf8")) as CountrySummary[];
  const chartable = index
    .filter((c) => c.hasHistory)
    .sort((a, b) => a.name.localeCompare(b.name));

  const cards = await Promise.all(
    chartable.map(async (c) => {
      const file = JSON.parse(
        await fs.readFile(path.join(dataDir, "series", `${c.iso2}.json`), "utf8"),
      ) as CountryFile;
      const history: Observation[] = decimate(file.history);
      return {
        iso2: c.iso2,
        name: c.name,
        continent: c.continent,
        flagCode: c.flagCode,
        currentRate: c.rate,
        currentDate: c.rateDate,
        history,
      };
    }),
  );

  return <GridView cards={cards} />;
}
