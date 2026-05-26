"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CountryFile } from "@/lib/types";

export type ChartRange = "5Y" | "10Y" | "20Y" | "50Y" | "MAX";

type Series = { meta: { iso2: string; name: string; color: string }; data: CountryFile["history"] };

function rangeFloor(range: ChartRange): string | null {
  if (range === "MAX") return null;
  const yrs = parseInt(range.replace("Y", ""), 10);
  const d = new Date();
  d.setFullYear(d.getFullYear() - yrs);
  return d.toISOString().slice(0, 7);
}

// Target ~360 plotted points per line max — keeps Recharts SVG cheap on big ranges.
function decimate<T>(arr: T[], target = 360): T[] {
  if (arr.length <= target) return arr;
  const step = Math.ceil(arr.length / target);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

function Chart({ series, range }: { series: Series[]; range: ChartRange }) {
  const { rows } = useMemo(() => {
    if (!series.length) return { rows: [] as Record<string, number | string>[] };
    const floor = rangeFloor(range);
    // Per-line slice + decimate first → merge after, so per-series cost stays small.
    const slimmed = series.map((s) => {
      const filtered = floor ? s.data.filter((o) => o.d >= floor) : s.data;
      return { iso: s.meta.iso2, data: decimate(filtered) };
    });
    const byDate = new Map<string, Record<string, number | string>>();
    for (const s of slimmed) {
      for (const obs of s.data) {
        let row = byDate.get(obs.d);
        if (!row) {
          row = { d: obs.d };
          byDate.set(obs.d, row);
        }
        row[s.iso] = obs.v;
      }
    }
    const rows = [...byDate.values()].sort((a, b) => ((a.d as string) < (b.d as string) ? -1 : 1));
    return { rows };
  }, [series, range]);

  if (!series.length) {
    return (
      <div className="flex h-full min-h-[340px] items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        Select countries from the list to plot their policy rate history.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 18, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="currentColor" strokeOpacity={0.06} vertical={false} />
        <XAxis
          dataKey="d"
          tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }}
          tickLine={false}
          axisLine={false}
          minTickGap={36}
          tickFormatter={(d: string) => d.slice(0, 4)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "currentColor", strokeOpacity: 0.18 }}
          contentStyle={{
            background: "rgba(20,22,28,0.94)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            color: "white",
            fontSize: 12,
            padding: "8px 10px",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.4)",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.6)", marginBottom: 4, fontWeight: 600 }}
          itemStyle={{ padding: "1px 0" }}
          formatter={(v: number, name: string) => [`${v?.toFixed(2)}%`, name]}
          labelFormatter={(d: string) => d}
        />
        {series.map((s) => (
          <Line
            key={s.meta.iso2}
            type="monotone"
            dataKey={s.meta.iso2}
            name={s.meta.name}
            stroke={s.meta.color}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default memo(Chart);
