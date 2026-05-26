"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { CountryFile } from "@/lib/types";

export type ChartRange = "5Y" | "10Y" | "20Y" | "50Y" | "MAX";

type Props = {
  series: { meta: { iso2: string; name: string; color: string }; data: CountryFile["history"] }[];
  range: ChartRange;
};

function rangeFloor(range: ChartRange): string | null {
  if (range === "MAX") return null;
  const yrs = parseInt(range.replace("Y", ""), 10);
  const d = new Date();
  d.setFullYear(d.getFullYear() - yrs);
  return d.toISOString().slice(0, 7);
}

export default function Chart({ series, range }: Props) {
  const { rows, keys } = useMemo(() => {
    const floor = rangeFloor(range);
    const byDate = new Map<string, Record<string, number | string>>();
    const ks: string[] = [];
    for (const s of series) {
      ks.push(s.meta.iso2);
      for (const obs of s.data) {
        if (floor && obs.d < floor) continue;
        const row = byDate.get(obs.d) ?? { d: obs.d };
        row[s.meta.iso2] = obs.v;
        byDate.set(obs.d, row);
      }
    }
    const rows = [...byDate.values()].sort((a, b) => (a.d < b.d ? -1 : 1));
    return { rows, keys: ks };
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
      <LineChart data={rows} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="currentColor" strokeOpacity={0.06} vertical={false} />
        <XAxis
          dataKey="d"
          tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
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
          cursor={{ stroke: "currentColor", strokeOpacity: 0.15 }}
          contentStyle={{
            background: "rgba(20,22,28,0.92)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            color: "white",
            fontSize: 12,
            padding: "10px 12px",
            boxShadow: "0 10px 40px -10px rgba(0,0,0,0.4)",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.6)", marginBottom: 4, fontWeight: 600 }}
          itemStyle={{ padding: "2px 0" }}
          formatter={(v: number) => [`${v?.toFixed(2)}%`, ""]}
          labelFormatter={(d: string) => d}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
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
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
