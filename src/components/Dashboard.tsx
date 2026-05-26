"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Globe2,
  Info,
  LineChart as LineChartIcon,
  RotateCcw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import Chart, { type ChartRange, type ChartScale } from "./Chart";
import Flag from "./Flag";
import type { CountryFile, CountrySummary, Coverage } from "@/lib/types";

const CONTINENTS = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"] as const;
type Continent = (typeof CONTINENTS)[number];
type SortKey = "name" | "rate-desc" | "rate-asc" | "changed";

const RATE_BUCKETS = [
  { key: "any", label: "Any rate", test: (_: number | null) => true },
  { key: "lt2", label: "< 2%", test: (r: number | null) => r != null && r < 2 },
  { key: "2to5", label: "2–5%", test: (r: number | null) => r != null && r >= 2 && r < 5 },
  { key: "5to10", label: "5–10%", test: (r: number | null) => r != null && r >= 5 && r < 10 },
  { key: "gte10", label: "≥ 10%", test: (r: number | null) => r != null && r >= 10 },
] as const;
type RateBucketKey = (typeof RATE_BUCKETS)[number]["key"];

const PALETTE = [
  "#0a84ff", "#ff453a", "#30d158", "#ff9f0a", "#bf5af2",
  "#64d2ff", "#ff375f", "#ffd60a", "#5e5ce6", "#32d74b",
  "#ff6482", "#62cef0", "#a679e8", "#f7c548", "#7bc62d",
];

const RANGES: ChartRange[] = ["5Y", "10Y", "20Y", "50Y", "MAX"];
const MAX_SELECTION = 12;

function fmtPct(v: number | null | undefined) {
  return v == null ? "—" : `${v.toFixed(2)}%`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length === 7 ? `${iso}-01` : iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

type Props = {
  index: CountrySummary[];
  coverage: Coverage;
  preloadedSeries: Record<string, CountryFile>;
  defaultSelection: string[];
};

export default function Dashboard({ index, coverage, preloadedSeries, defaultSelection }: Props) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [continent, setContinent] = useState<Continent>("All");
  const [rateBucket, setRateBucket] = useState<RateBucketKey>("any");
  const [sort, setSort] = useState<SortKey>("rate-desc");
  const [selected, setSelected] = useState<string[]>(defaultSelection);
  const [cache, setCache] = useState<Record<string, CountryFile>>(preloadedSeries);
  const [range, setRange] = useState<ChartRange>("20Y");
  const [scale, setScale] = useState<ChartScale>("linear");
  const [showCoverage, setShowCoverage] = useState(false);
  const [onlyHistory, setOnlyHistory] = useState(false);

  // Batched fetch — one Promise.all per "selected" change, one setState when ready.
  const inflight = useRef<Set<string>>(new Set());
  useEffect(() => {
    const missing = selected.filter((iso) => !cache[iso] && !inflight.current.has(iso));
    if (!missing.length) return;
    missing.forEach((iso) => inflight.current.add(iso));
    let alive = true;
    (async () => {
      const results = await Promise.all(
        missing.map((iso) =>
          fetch(`/data/series/${iso}.json`)
            .then((r) => (r.ok ? (r.json() as Promise<CountryFile>) : null))
            .catch(() => null),
        ),
      );
      if (!alive) {
        missing.forEach((iso) => inflight.current.delete(iso));
        return;
      }
      const next: Record<string, CountryFile> = {};
      results.forEach((f, i) => {
        const iso = missing[i];
        inflight.current.delete(iso);
        if (f) next[iso] = f;
      });
      if (Object.keys(next).length) setCache((c) => ({ ...c, ...next }));
    })();
    return () => {
      alive = false;
    };
  }, [selected, cache]);

  const toggle = useCallback((iso: string) => {
    setSelected((sel) => {
      if (sel.includes(iso)) return sel.filter((x) => x !== iso);
      if (sel.length >= MAX_SELECTION) return sel;
      return [...sel, iso];
    });
  }, []);
  const remove = useCallback((iso: string) => {
    setSelected((sel) => sel.filter((x) => x !== iso));
  }, []);
  const clearSelection = useCallback(() => setSelected([]), []);

  const pickTop = useCallback(
    (kind: "highest" | "lowest") => {
      const withRate = index.filter((c) => c.rate != null) as (CountrySummary & { rate: number })[];
      const sorted = withRate.slice().sort((a, b) => (kind === "highest" ? b.rate - a.rate : a.rate - b.rate));
      setSelected(sorted.slice(0, 8).map((c) => c.iso2));
    },
    [index],
  );

  const resetFilters = useCallback(() => {
    setQuery("");
    setContinent("All");
    setRateBucket("any");
    setOnlyHistory(false);
    setSort("rate-desc");
  }, []);

  const filtersActive =
    query.trim() !== "" || continent !== "All" || rateBucket !== "any" || onlyHistory;

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let rows = index;
    if (continent !== "All") rows = rows.filter((c) => c.continent === continent);
    if (onlyHistory) rows = rows.filter((c) => c.hasHistory);
    const bucket = RATE_BUCKETS.find((b) => b.key === rateBucket)!;
    if (rateBucket !== "any") rows = rows.filter((c) => bucket.test(c.rate));
    if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.iso2.toLowerCase().includes(q));
    rows = rows.slice();
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
  }, [index, continent, deferredQuery, sort, onlyHistory, rateBucket]);

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

  const loadingCount = selected.length - chartSeries.length;

  // "Select visible" toggles all currently-filtered rows that aren't already selected,
  // up to MAX_SELECTION. If everything visible is already selected, it deselects them.
  const visibleIsos = useMemo(() => filtered.map((c) => c.iso2), [filtered]);
  const allVisibleSelected =
    visibleIsos.length > 0 && visibleIsos.every((iso) => selected.includes(iso));
  const toggleVisible = useCallback(() => {
    setSelected((sel) => {
      const visible = visibleIsos;
      const allOn = visible.length > 0 && visible.every((iso) => sel.includes(iso));
      if (allOn) {
        const visSet = new Set(visible);
        return sel.filter((iso) => !visSet.has(iso));
      }
      const merged = [...sel];
      for (const iso of visible) {
        if (merged.length >= MAX_SELECTION) break;
        if (!merged.includes(iso)) merged.push(iso);
      }
      return merged;
    });
  }, [visibleIsos]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            <Sparkles size={12} className="opacity-70" />
            <span>Central Bank Policy Rates · {stats.total} economies</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Policy Rate</h1>
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
      <section className="glass mb-6 rounded-3xl p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              Overlay
            </span>
            {selectedRows.length === 0 ? (
              <span className="text-xs text-neutral-400">no countries selected</span>
            ) : (
              <>
                {selectedRows.slice(0, 12).map((c, i) => (
                  <SelectedPill
                    key={c.iso2}
                    color={PALETTE[i % PALETTE.length]}
                    country={c}
                    onRemove={remove}
                  />
                ))}
                {selectedRows.length > 12 && (
                  <span className="text-xs text-neutral-500">+{selectedRows.length - 12}</span>
                )}
                {loadingCount > 0 && (
                  <span className="text-[11px] text-neutral-500">loading {loadingCount}…</span>
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
          <div className="flex flex-wrap items-center gap-2">
            <Segment
              value={scale}
              onChange={setScale}
              options={[
                { value: "linear", label: "Linear" },
                { value: "log", label: "Log" },
              ]}
            />
            <Segment value={range} onChange={setRange} options={RANGES} />
          </div>
        </div>
        <div className="h-[360px] sm:h-[440px]">
          <Chart series={chartSeries} range={range} scale={scale} />
        </div>
      </section>

      {/* Filters + table */}
      <section className="glass overflow-hidden rounded-3xl">
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-3 dark:border-white/[0.08] sm:p-4">
          {/* Row 1: search + sort */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10 sm:min-w-[260px] sm:max-w-sm">
              <Search size={14} className="opacity-50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
              {query && (
                <button onClick={() => setQuery("")} className="opacity-50 hover:opacity-100" aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </label>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-[11px] uppercase tracking-wider text-neutral-500 sm:inline">Sort</span>
              <Segment
                value={sort}
                onChange={setSort}
                options={[
                  { value: "name", label: "A–Z" },
                  { value: "rate-desc", label: (<>Rate <ArrowDown size={11} className="ml-0.5" /></>) },
                  { value: "rate-asc", label: (<>Rate <ArrowUp size={11} className="ml-0.5" /></>) },
                  { value: "changed", label: "Last move" },
                ] as { value: SortKey; label: React.ReactNode }[]}
              />
            </div>
          </div>

          {/* Row 2: filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Segment value={continent} onChange={setContinent} options={CONTINENTS} />
            <Segment value={rateBucket} onChange={setRateBucket} options={RATE_BUCKETS.map((b) => ({ value: b.key, label: b.label }))} />
            <button
              onClick={() => setOnlyHistory((x) => !x)}
              className={`chip ${onlyHistory ? "chip-active" : ""}`}
            >
              With history
            </button>
            <button onClick={() => pickTop("highest")} className="chip">Top 8 highest</button>
            <button onClick={() => pickTop("lowest")} className="chip">Top 8 lowest</button>
            {filtersActive && (
              <button onClick={resetFilters} className="chip inline-flex items-center gap-1.5">
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          {/* Row 3: selection summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-3">
              <span>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">{filtered.length}</span>{" "}
                of {stats.total} shown
              </span>
              <span className="opacity-50">·</span>
              <span>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {selected.length}
                </span>{" "}
                / {MAX_SELECTION} selected
              </span>
            </div>
            <button
              onClick={toggleVisible}
              disabled={visibleIsos.length === 0}
              className="chip inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={11} /> {allVisibleSelected ? "Deselect visible" : "Select visible"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[640px] overflow-y-auto">
          <table className="w-full text-sm tnum">
            <thead className="sticky top-0 z-10 bg-[color:var(--surface)] backdrop-blur">
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <th className="w-10 px-3 py-2"></th>
                <th className="px-3 py-2">Country</th>
                <th className="hidden px-3 py-2 sm:table-cell">Continent</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="hidden px-3 py-2 sm:table-cell">Last change</th>
                <th className="hidden px-3 py-2 md:table-cell">History</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const palIdx = selected.indexOf(c.iso2);
                const disabled = palIdx < 0 && selected.length >= MAX_SELECTION;
                return (
                  <CountryRow
                    key={c.iso2}
                    c={c}
                    selectedIdx={palIdx}
                    disabled={disabled}
                    onToggle={toggle}
                  />
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-500">
                    No countries match your filters.{" "}
                    <button onClick={resetFilters} className="underline-offset-2 hover:underline">
                      Reset
                    </button>
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
          Historical:{" "}
          <a className="underline-offset-2 hover:underline" href={coverage.sources.historical.url} target="_blank" rel="noreferrer">
            BIS CBPOL
          </a>{" "}
          · Current:{" "}
          <a className="underline-offset-2 hover:underline" href={coverage.sources.current.url} target="_blank" rel="noreferrer">
            Wikipedia
          </a>{" "}
          ({coverage.sources.current.snapshotDate})
        </div>
        <div>Generated {fmtDate(coverage.generatedAt.slice(0, 10))}</div>
      </footer>

      {/* Coverage drawer */}
      {showCoverage && <CoverageDrawer coverage={coverage} onClose={() => setShowCoverage(false)} />}
    </main>
  );
}

/* --- helpers --- */

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

type SegmentOpt<T> = T | { value: T; label: React.ReactNode };

function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly SegmentOpt<T>[];
}) {
  return (
    <div className="segment">
      {options.map((opt) => {
        const v = (typeof opt === "object" ? opt.value : opt) as T;
        const label = typeof opt === "object" ? opt.label : opt;
        const active = v === value;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`chip ${active ? "chip-active" : ""} inline-flex items-center`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const SelectedPill = memo(function SelectedPill({
  color,
  country,
  onRemove,
}: {
  color: string;
  country: CountrySummary;
  onRemove: (iso: string) => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs ring-1 ring-black/5 dark:bg-white/[0.08] dark:ring-white/10"
      title={country.name}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="font-medium">{country.name}</span>
      <button
        type="button"
        onClick={() => onRemove(country.iso2)}
        className="ml-0.5 grid h-4 w-4 place-items-center rounded-full text-neutral-500 hover:bg-black/[0.08] hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={`Remove ${country.name}`}
      >
        <X size={11} />
      </button>
    </span>
  );
});

const CountryRow = memo(function CountryRow({
  c,
  selectedIdx,
  disabled,
  onToggle,
}: {
  c: CountrySummary;
  selectedIdx: number;
  disabled: boolean;
  onToggle: (iso: string) => void;
}) {
  const isSel = selectedIdx >= 0;
  const color = isSel ? PALETTE[selectedIdx % PALETTE.length] : null;
  return (
    <tr
      onClick={() => !disabled && onToggle(c.iso2)}
      aria-disabled={disabled}
      className={`group border-t border-black/[0.04] transition-colors dark:border-white/[0.05] ${
        isSel
          ? "cursor-pointer bg-blue-500/[0.08] dark:bg-blue-400/[0.10]"
          : disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      }`}
    >
      <td className="px-3 py-2">
        <span
          className={`grid h-4 w-4 place-items-center rounded-[4px] border transition-colors ${
            isSel
              ? "border-transparent"
              : "border-black/15 group-hover:border-black/35 dark:border-white/20 dark:group-hover:border-white/45"
          }`}
          style={color ? { background: color, borderColor: color } : undefined}
          aria-hidden
        >
          {isSel && <Check size={11} className="text-white" />}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Flag code={c.flagCode} alt={c.name} size={16} />
          <span className="font-medium">{c.name}</span>
          <span className="text-[11px] text-neutral-400">{c.iso2}</span>
        </div>
      </td>
      <td className="hidden px-3 py-2 text-neutral-500 sm:table-cell">{c.continent}</td>
      <td className="px-3 py-2 text-right font-semibold">{fmtPct(c.rate)}</td>
      <td className="hidden px-3 py-2 text-neutral-500 sm:table-cell">{fmtDate(c.rateDate)}</td>
      <td className="hidden px-3 py-2 text-neutral-500 md:table-cell">
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
});

function CoverageDrawer({ coverage, onClose }: { coverage: Coverage; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-end bg-black/35 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[88vh] w-full overflow-y-auto rounded-t-3xl p-6 sm:m-6 sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Data sources & coverage</h2>
          <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Close">
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
              {coverage.totals.withHistorySeries} countries with monthly history. Earliest series start in
              1945; legacy euro-area members fold into the Eurozone aggregate from 1999.
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
        </div>
      </div>
    </div>
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
