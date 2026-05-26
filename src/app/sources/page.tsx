import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ArrowLeft, ArrowUpRight, Database, FileText, Globe2 } from "lucide-react";
import type { Coverage } from "@/lib/types";

export const metadata = {
  title: "Sources & Coverage — Policy Rate",
  description:
    "Data sources, country coverage, and methodology behind the Policy Rate dashboard.",
};

async function loadCoverage(): Promise<Coverage> {
  const p = path.join(process.cwd(), "public", "data", "coverage.json");
  return JSON.parse(await fs.readFile(p, "utf8")) as Coverage;
}

function fmtMonth(s: string | null | undefined) {
  if (!s) return "—";
  const iso = s.length === 7 ? `${s}-01` : s;
  const d = new Date(iso);
  if (Number.isNaN(+d)) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(+d)) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default async function SourcesPage() {
  const coverage = await loadCoverage();
  const withHistory = [...coverage.withHistory].sort((a, b) => a.name.localeCompare(b.name));
  const currentOnly = [...coverage.currentOnly].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-8 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <header className="mt-6">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
          Methodology
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Sources &amp; Coverage</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Two open data sources back the dashboard: BIS for monthly history and Wikipedia for the
          latest-rate snapshot. This page lists every source, every country in scope, and the gaps.
        </p>
        <p className="mt-1 text-xs text-neutral-500">Generated {fmtDate(coverage.generatedAt.slice(0, 10))}</p>
      </header>

      {/* Headline counts */}
      <section className="mt-8 grid grid-cols-3 gap-3">
        <Stat icon={<Globe2 size={14} />} label="Countries shown" value={coverage.totals.countriesSurfaced} />
        <Stat icon={<Database size={14} />} label="Monthly history" value={coverage.totals.withHistorySeries} />
        <Stat icon={<FileText size={14} />} label="Snapshot only" value={coverage.totals.currentOnly} />
      </section>

      {/* Source cards */}
      <section className="mt-8 grid gap-3 md:grid-cols-2">
        <SourceCard
          eyebrow="Monthly history"
          title={coverage.sources.historical.name}
          url={coverage.sources.historical.url}
          meta={`${coverage.sources.historical.frequency} · ${coverage.totals.withHistorySeries} countries`}
          body="Bank for International Settlements bulk CSV. Series begin as early as 1945; legacy euro-area members merge into the Eurozone aggregate from 1999. This is the canonical aggregate for central-bank policy rates."
        />
        <SourceCard
          eyebrow="Current snapshot"
          title={coverage.sources.current.name}
          url={coverage.sources.current.url}
          meta={`Snapshot ${coverage.sources.current.snapshotDate} · ${coverage.totals.countriesSurfaced} countries`}
          body="Living list of every country's most recent policy rate decision, with the date it took effect. Used to refresh the current rate on BIS countries and to fill in the 74 countries BIS doesn't cover."
        />
      </section>

      {/* Coverage tables */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Country coverage</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Every country surfaced in the dashboard, grouped by whether a chartable history exists.
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
                With monthly history
              </h3>
              <span className="text-xs text-neutral-500">{withHistory.length} countries</span>
            </div>
            <div className="glass overflow-hidden rounded-2xl">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm tnum">
                  <thead className="sticky top-0 z-10 bg-[color:var(--surface)] backdrop-blur">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2">Range</th>
                      <th className="px-3 py-2 text-right">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withHistory.map((c) => (
                      <tr
                        key={c.iso2}
                        className="border-t border-black/[0.04] dark:border-white/[0.05]"
                      >
                        <td className="px-3 py-2">
                          <span className="font-medium">{c.name}</span>{" "}
                          <span className="text-[11px] text-neutral-400">{c.iso2}</span>
                        </td>
                        <td className="px-3 py-2 text-neutral-500">
                          {fmtMonth(c.historyStart)} – {fmtMonth(c.historyEnd)}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-500">{c.historyCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
                Snapshot only
              </h3>
              <span className="text-xs text-neutral-500">{currentOnly.length} countries</span>
            </div>
            <div className="glass overflow-hidden rounded-2xl">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm tnum">
                  <thead className="sticky top-0 z-10 bg-[color:var(--surface)] backdrop-blur">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2">As of</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOnly.map((c) => (
                      <tr
                        key={c.iso2}
                        className="border-t border-black/[0.04] dark:border-white/[0.05]"
                      >
                        <td className="px-3 py-2">
                          <span className="font-medium">{c.name}</span>{" "}
                          <span className="text-[11px] text-neutral-400">{c.iso2}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{c.rate.toFixed(2)}%</td>
                        <td className="px-3 py-2 text-neutral-500">{fmtDate(c.rateDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <Prose title="Pipeline">
          <p>
            <code className="rounded bg-black/[0.05] px-1 py-0.5 text-[11px] dark:bg-white/[0.06]">npm run fetch</code>{" "}
            downloads the BIS CBPOL bulk CSV;{" "}
            <code className="rounded bg-black/[0.05] px-1 py-0.5 text-[11px] dark:bg-white/[0.06]">npm run ingest</code>{" "}
            streams it, merges the Wikipedia snapshot, and writes per-country JSON into{" "}
            <code className="rounded bg-black/[0.05] px-1 py-0.5 text-[11px] dark:bg-white/[0.06]">public/data/series</code>.
          </p>
          <p>
            Each country gets its own file so the chart can fetch only what's selected. The index plus
            coverage manifest are served alongside.
          </p>
        </Prose>
        <Prose title="Why coverage stops at ~50 countries">
          <p>
            BIS CBPOL is the canonical aggregate for monthly central-bank policy rates and already
            harvests data from every central bank that publishes a clean monthly series.
          </p>
          <p>
            Extending past it requires hand-rolled scrapers per country. Many remaining central banks
            publish only rate-change announcements (not monthly observations), use PDFs, or bot-defend
            their websites. The IMF's SDMX API that used to bridge the gap was retired in 2024.
          </p>
        </Prose>
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-6 text-xs text-neutral-500 dark:border-white/[0.08]">
        <Link href="/" className="underline-offset-2 hover:underline">
          Back to dashboard
        </Link>
        <span>Snapshot {coverage.sources.current.snapshotDate} · Generated {fmtDate(coverage.generatedAt.slice(0, 10))}</span>
      </footer>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tnum tracking-tight">{value}</div>
    </div>
  );
}

function SourceCard({
  eyebrow,
  title,
  url,
  meta,
  body,
}: {
  eyebrow: string;
  title: string;
  url: string;
  meta: string;
  body: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="glass group block rounded-2xl p-5 transition-colors hover:bg-white/85 dark:hover:bg-white/[0.10]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
            {eyebrow}
          </div>
          <div className="mt-1 text-base font-semibold tracking-tight">{title}</div>
        </div>
        <ArrowUpRight size={16} className="opacity-50 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-1 text-[11px] text-neutral-500">{meta}</div>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{body}</p>
    </a>
  );
}

function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        {children}
      </div>
    </div>
  );
}
