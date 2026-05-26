"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import Flag from "./Flag";
import Sparkline from "./Sparkline";
import type { Observation } from "@/lib/types";

type Card = {
  iso2: string;
  name: string;
  continent: string;
  flagCode: string;
  currentRate: number | null;
  currentDate: string | null;
  history: Observation[];
};

const CONTINENTS = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"] as const;
type Continent = (typeof CONTINENTS)[number];
type Range = "5Y" | "10Y" | "20Y" | "50Y" | "MAX";
type Scale = "linear" | "log";

const RANGES: Range[] = ["5Y", "10Y", "20Y", "50Y", "MAX"];

function rangeFloor(range: Range): string | null {
  if (range === "MAX") return null;
  const yrs = parseInt(range.replace("Y", ""), 10);
  const d = new Date();
  d.setFullYear(d.getFullYear() - yrs);
  return d.toISOString().slice(0, 7);
}

function fmtPct(v: number | null | undefined) {
  return v == null ? "—" : `${v.toFixed(2)}%`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s.length === 7 ? `${s}-01` : s);
  if (Number.isNaN(+d)) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export default function GridView({ cards }: { cards: Card[] }) {
  const [range, setRange] = useState<Range>("MAX");
  const [scale, setScale] = useState<Scale>("linear");
  const [continent, setContinent] = useState<Continent>("All");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let rows = cards;
    if (continent !== "All") rows = rows.filter((c) => c.continent === continent);
    if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.iso2.toLowerCase().includes(q));
    return rows;
  }, [cards, continent, deferredQuery]);

  const floor = useMemo(() => rangeFloor(range), [range]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <header className="mt-6">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
          Atlas
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">All countries</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          One sparkline per country with monthly history. Filters apply to every card. Snapshot-only
          countries are excluded.
        </p>
      </header>

      {/* Filter bar */}
      <section className="glass mt-6 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:flex-wrap sm:p-4">
        <label className="flex flex-1 items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10 sm:min-w-[240px] sm:max-w-sm">
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
        <Segment value={continent} onChange={setContinent} options={CONTINENTS} />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
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
      </section>

      <div className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400">
        Showing <span className="font-medium text-neutral-700 dark:text-neutral-200">{filtered.length}</span> of {cards.length} countries
      </div>

      {/* Grid */}
      <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const ranged = floor ? c.history.filter((o) => o.d >= floor) : c.history;
          const data = ranged.length >= 2 ? ranged : c.history;
          let ymin = Infinity;
          let ymax = -Infinity;
          for (const o of data) {
            if (o.v < ymin) ymin = o.v;
            if (o.v > ymax) ymax = o.v;
          }
          if (!Number.isFinite(ymin)) {
            ymin = 0;
            ymax = 1;
          }
          return (
            <article key={c.iso2} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Flag code={c.flagCode} alt={c.name} size={14} />
                    <h2 className="truncate text-sm font-semibold tracking-tight">{c.name}</h2>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    <span>{c.iso2}</span>
                    <span className="opacity-50">·</span>
                    <span>{c.continent}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-base font-semibold tnum tracking-tight">{fmtPct(c.currentRate)}</div>
                  <div className="text-[10px] text-neutral-500">{fmtDate(c.currentDate)}</div>
                </div>
              </div>
              <div className="mt-3 h-16">
                <Sparkline data={data} color="#0a84ff" scale={scale} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] tnum text-neutral-500">
                <span>{ymin.toFixed(1)}%</span>
                <span>
                  {data[0]?.d?.slice(0, 4)}–{data[data.length - 1]?.d?.slice(0, 4)}
                </span>
                <span>{ymax.toFixed(1)}%</span>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-neutral-500">
            No countries match your filters.
          </div>
        )}
      </section>
    </main>
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
