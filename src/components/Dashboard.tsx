"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Globe2,
  Info,
  LineChart as LineChartIcon,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import Chart, { type ChartRange } from "./Chart";
import Flag from "./Flag";
import type { CountryFile, CountrySummary, Coverage } from "@/lib/types";

const CONTINENTS = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"] as const;
type Continent = (typeof CONTINENTS)[number];

type SortKey = "name" | "rate-desc" | "rate-asc" | "changed";

const PALETTE = [
  "#0a84ff", "#ff453a", "#30d158", "#ff9f0a", "#bf5af2",
  "#64d2ff", "#ff375f", "#ffd60a", "#5e5ce6", "#32d74b",
  "#ff6482", "#62cef0", "#a679e8", "#f7c548", "#7bc62d",
];

const DEFAULT_SELECTION = ["US", "XM", "GB", "JP", "CN"];

function fmtPct(v: number | null | undefined) {
  return v == null ? "—" : `${v.toFixed(2)}%`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length === 7 ? `${iso}-01` : iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function monthsBetween(a: string, b: string) {
  // YYYY-MM strings
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

export default function Dashboard({
  index,
  coverage,
}: {
  index: CountrySummary[];
  coverage: Coverage;
}) {
  const [query, setQuery] = useState("");
  const [continent, setContinent] = useState<Continent>("All");
  const [sort, setSort] = useState<SortKey>("rate-desc");
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [cache, setCache] = useState<Record<string, CountryFile>>({});
  const [range, setRange] = useState<ChartRange>("20Y");
  const [showCoverage, setShowCoverage] = useState(false);
  const [onlyHistory, setOnlyHistory] = useState(false);

  // Fetch series for any selected country missing from cache.
  useEffect(() => {
    const needed = selected.filter((iso) => !cache[iso]);
    if (!needed.length) return;
    let alive = true;
    Promise.all(
      needed.map((iso) =>
        fetch(`/data/series/${iso}.json`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((files) => {
      if (!alive) return;
      const next: Record<string, CountryFile> = {};
      files.forEach((f, i) => {
        if (f) next[needed[i]] = f;
      });
      if (Object.keys(next).length) setCache((c) => ({ ...c, ...next }));
    });
    return () => {
      alive = false;
    };
  }, [selected, cache]);

  const filtered = useMemo(() => {
    let rows = index.slice();
    if (continent !== "All") rows = rows.filter((c) => c.continent === continent);
    if (onlyHistory) rows = rows.filter((c) => c.hasHistory);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (c) => c.name.toLowerCase().includes(q) || c.iso2.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case "name":
        rows.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "rate-desc":
        rows.sort((a, b) => (b.rate ?? -Infinity) - (a.rate ?? -Infinity));
        break;
      case "rate-asc":
        rows.sort((a, b) => (a.rate ?? Infinity) - (b.rate ?? Infinity));
        break;
      case "changed":
        rows.sort((a, b) => (b.rateDate ?? "").localeCompare(a.rateDate ?? ""));
        break;
    }
    return rows;
  }, [index, continent, query, sort, onlyHistory]);

  const stats = useMemo(() => {
    const withRate = index.filter((c) => c.rate != null) as (CountrySummary & { rate: number })[];
    const sorted = withRate.slice().sort((a, b) => b.rate - a.rate);
    const med = sorted[Math.floor(sorted.length / 2)];
    return {
      total: index.length,
      withRate: withRate.length,
      withHistory: index.filter((c) => c.hasHistory).length,
      highest: sorted[0],
      lowest: sorted[sorted.length - 1],
      median: med,
      avg: withRate.reduce((s, c) => s + c.rate, 0) / Math.max(1, withRate.length),
    };
  }, [index]);

  function toggle(iso: string) {
    setSelected((sel) => (sel.includes(iso) ? sel.filter((x) => x !== iso) : [...sel, iso]));
  }

  function clearSelection() {
    setSelected([]);
  }

  function pickTop(kind: "highest" | "lowest") {
    const withRate = index.filter((c) => c.rate != null) as (CountrySummary & { rate: number })[];
    const sorted = withRate.slice().sort((a, b) => (kind === "highest" ? b.rate - a.rate : a.rate - b.rate));
    setSelected(sorted.slice(0, 8).map((c) => c.iso2));
  }

  const chartSeries = useMemo(() => {
    return selected
      .map((iso, i) => {
        const file = cache[iso];
        if (!file || !file.history.length) return null;
        return {
          meta: { iso2: iso, name: file.name, color: PALETTE[i % PALETTE.length] },
          data: file.history,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [selected, cache]);

  const selectedRows = useMemo(
    () => selected.map((iso) => index.find((c) => c.iso2 === iso)).filter(Boolean) as CountrySummary[],
    [selected, index],
  );

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            <Sparkles size={12} className="opacity-70" />
            <span>Central Bank Policy Rates · {stats.total} economies</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Policy Rate
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            Monthly history since 1945 from BIS, current snapshot for {stats.withRate} countries. Click any
            country to overlay it on the chart.
          </p>
        </div>
        <button
          onClick={() => setShowCoverage(true)}
          className="glass inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium hover:opacity-90"
        >
          <Info size={14} /> Sources
        </button>
      </header>

      {/* Stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Globe2 size={14} />} label="Countries" value={stats.total.toString()} hint={`${stats.withHistory} with deep history`} />
        <Stat icon={<TrendingUp size={14} />} label="Highest rate" value={fmtPct(stats.highest?.rate)} hint={stats.highest?.name} flag={stats.highest?.flagCode} />
        <Stat icon={<TrendingDown size={14} />} label="Lowest rate" value={fmtPct(stats.lowest?.rate)} hint={stats.lowest?.name} flag={stats.lowest?.flagCode} />
        <Stat icon={<LineChartIcon size={14} />} label="Median rate" value={fmtPct(stats.median?.rate)} hint={`avg ${stats.avg.toFixed(2)}%`} />
      </section>

      {/* Chart card */}
      <section className="glass mb-6 rounded-3xl p-4 sm:p-6 animate-slide-up">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              Overlay
            </span>
            {selectedRows.length === 0 ? (
              <span className="text-xs text-neutral-400">no countries selected</span>
            ) : (
              <>
                {selectedRows.slice(0, 8).map((c, i) => (
                  <button
                    key={c.iso2}
                    onClick={() => toggle(c.iso2)}
                    className="group inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-xs ring-1 ring-black/5 backdrop-blur dark:bg-white/10 dark:ring-white/10"
                    title={`Remove ${c.name}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <Flag code={c.flagCode} alt={c.name} size={14} />
                    <span className="font-medium">{c.name}</span>
                    <X size={12} className="opacity-40 group-hover:opacity-100" />
                  </button>
                ))}
                {selectedRows.length > 8 && (
                  <span className="text-xs text-neutral-500">+{selectedRows.length - 8} more</span>
                )}
                <button
                  onClick={clearSelection}
                  className="ml-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  Clear
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-black/[0.04] p-1 text-xs dark:bg-white/[0.06]">
            {(["5Y", "10Y", "20Y", "50Y", "MAX"] as ChartRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-2.5 py-1 transition ${
                  range === r
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-100/95"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[360px] sm:h-[440px]">
          <Chart series={chartSeries} range={range} />
        </div>
      </section>

      {/* Filters + table */}
      <section className="glass overflow-hidden rounded-3xl animate-slide-up">
        <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] p-3 dark:border-white/[0.08] sm:p-4">
          <label className="flex flex-1 items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10 sm:min-w-[260px] sm:max-w-sm">
            <Search size={14} className="opacity-50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            {query && (
              <button onClick={() => setQuery("")} className="opacity-50 hover:opacity-100">
                <X size={12} />
              </button>
            )}
          </label>
          <div className="flex items-center gap-1 rounded-full bg-black/[0.04] p-1 text-xs dark:bg-white/[0.06]">
            {CONTINENTS.map((c) => (
              <button
                key={c}
                onClick={() => setContinent(c)}
                className={`rounded-full px-2.5 py-1 transition ${
                  continent === c
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-100/95"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOnlyHistory((x) => !x)}
            className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${
              onlyHistory
                ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white"
                : "ring-black/10 text-neutral-600 hover:text-neutral-900 dark:ring-white/10 dark:text-neutral-300"
            }`}
          >
            With history
          </button>
          <button
            onClick={() => pickTop("highest")}
            className="rounded-full px-3 py-1.5 text-xs ring-1 ring-black/10 text-neutral-600 hover:text-neutral-900 dark:ring-white/10 dark:text-neutral-300"
          >
            Top 8 highest
          </button>
          <button
            onClick={() => pickTop("lowest")}
            className="rounded-full px-3 py-1.5 text-xs ring-1 ring-black/10 text-neutral-600 hover:text-neutral-900 dark:ring-white/10 dark:text-neutral-300"
          >
            Top 8 lowest
          </button>
          <div className="ml-auto flex items-center gap-1 rounded-full bg-black/[0.04] p-1 text-xs dark:bg-white/[0.06]">
            <SortBtn active={sort === "name"} onClick={() => setSort("name")}>A–Z</SortBtn>
            <SortBtn active={sort === "rate-desc"} onClick={() => setSort("rate-desc")}>
              Rate <ArrowDown size={11} className="ml-0.5" />
            </SortBtn>
            <SortBtn active={sort === "rate-asc"} onClick={() => setSort("rate-asc")}>
              Rate <ArrowUp size={11} className="ml-0.5" />
            </SortBtn>
            <SortBtn active={sort === "changed"} onClick={() => setSort("changed")}>
              Last move
            </SortBtn>
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[640px] overflow-y-auto">
          <table className="w-full text-sm tnum">
            <thead className="sticky top-0 z-10 bg-white/70 backdrop-blur dark:bg-neutral-900/60">
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <th className="w-8 px-3 py-2"></th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Continent</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2">Last change</th>
                <th className="px-3 py-2">History</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const isSel = selected.includes(c.iso2);
                const palIdx = selected.indexOf(c.iso2);
                return (
                  <tr
                    key={c.iso2}
                    onClick={() => toggle(c.iso2)}
                    className={`group cursor-pointer border-t border-black/[0.04] transition-colors dark:border-white/[0.05] ${
                      isSel
                        ? "bg-blue-500/[0.06] dark:bg-blue-400/[0.08]"
                        : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <td className="px-3 py-2">
                      {isSel ? (
                        <span
                          className="block h-2.5 w-2.5 rounded-full"
                          style={{ background: PALETTE[palIdx % PALETTE.length] }}
                        />
                      ) : (
                        <span className="block h-2.5 w-2.5 rounded-full ring-1 ring-black/15 dark:ring-white/20" />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Flag code={c.flagCode} alt={c.name} size={18} />
                        <span className="font-medium">{c.name}</span>
                        <span className="text-[11px] text-neutral-400">{c.iso2}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{c.continent}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtPct(c.rate)}</td>
                    <td className="px-3 py-2 text-neutral-500">{fmtDate(c.rateDate)}</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {c.hasHistory ? (
                        <span>
                          {c.historyStart?.slice(0, 4)}–{c.historyEnd?.slice(0, 4)}{" "}
                          <span className="text-neutral-400">({c.historyCount} obs)</span>
                        </span>
                      ) : (
                        <span className="text-neutral-400">current only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-500">
                    No countries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        <div>
          Historical data:{" "}
          <a
            href={coverage.sources.historical.url}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            BIS Central Bank Policy Rates
          </a>{" "}
          · Current snapshot:{" "}
          <a
            href={coverage.sources.current.url}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Wikipedia
          </a>{" "}
          ({coverage.sources.current.snapshotDate})
        </div>
        <div>Generated {fmtDate(coverage.generatedAt.slice(0, 10))}</div>
      </footer>

      {/* Coverage drawer */}
      {showCoverage && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-end bg-black/30 backdrop-blur-sm sm:items-center"
          onClick={() => setShowCoverage(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass max-h-[88vh] w-full overflow-y-auto rounded-t-3xl p-6 sm:m-6 sm:max-w-2xl sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Data sources & coverage</h2>
              <button onClick={() => setShowCoverage(false)} className="opacity-60 hover:opacity-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5 text-sm">
              <Section title="Historical (BIS CBPOL)">
                <p>
                  <a className="underline" href={coverage.sources.historical.url} target="_blank" rel="noreferrer">
                    {coverage.sources.historical.name}
                  </a>{" "}
                  · {coverage.sources.historical.frequency}.
                </p>
                <p className="mt-1 text-neutral-500">
                  {coverage.totals.withHistorySeries} countries with monthly history. Earliest series start
                  in 1945; series may break or be discontinued (e.g. legacy euro-area members merged into the
                  Eurozone aggregate from 1999).
                </p>
              </Section>
              <Section title="Current rates (Wikipedia snapshot)">
                <p>
                  <a className="underline" href={coverage.sources.current.url} target="_blank" rel="noreferrer">
                    {coverage.sources.current.name}
                  </a>{" "}
                  · snapshot {coverage.sources.current.snapshotDate}.
                </p>
                <p className="mt-1 text-neutral-500">
                  {coverage.totals.currentOnly} countries appear only here (no BIS history).
                </p>
              </Section>
              <Section title="Current-only countries (no historical series yet)">
                <div className="grid grid-cols-2 gap-1 text-xs text-neutral-600 dark:text-neutral-300 sm:grid-cols-3">
                  {coverage.currentOnly.map((c) => (
                    <div key={c.iso2} className="flex items-center gap-1.5">
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-auto tnum text-neutral-400">{c.rate.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </Section>
              {coverage.unknownBisReferenceAreas.length > 0 && (
                <Section title="Unmapped BIS reference areas">
                  <p className="text-xs text-neutral-500">
                    Reference areas in BIS data we don&apos;t surface (likely aggregates):{" "}
                    {coverage.unknownBisReferenceAreas.join(", ") || "none"}
                  </p>
                </Section>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  flag,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  flag?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tnum tracking-tight">{value}</div>
      {hint && (
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          {flag && <Flag code={flag} alt={hint} size={12} />}
          <span className="truncate">{hint}</span>
        </div>
      )}
    </div>
  );
}

function SortBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2.5 py-1 transition ${
        active
          ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-100/95"
          : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
