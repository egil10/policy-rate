// Minimal SVG sparkline — one <path>, no JS deps. ~10x faster than Recharts for grids.

import { memo } from "react";
import type { Observation } from "@/lib/types";

type Props = {
  data: Observation[];
  color: string;
  width?: number;
  height?: number;
  scale?: "linear" | "log";
};

function Sparkline({ data, color, width = 200, height = 60, scale = "linear" }: Props) {
  if (data.length < 2) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-full w-full" preserveAspectRatio="none" />
    );
  }
  const xs = data.map((_, i) => (i / (data.length - 1)) * width);
  const f = (v: number) => (scale === "log" ? Math.log10(Math.max(v, 0.05)) : v);
  const projected = data.map((o) => f(o.v));
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const v of projected) {
    if (v < ymin) ymin = v;
    if (v > ymax) ymax = v;
  }
  const yspan = ymax - ymin || 1;
  const ys = projected.map((v) => height - ((v - ymin) / yspan) * height);
  let d = "";
  for (let i = 0; i < data.length; i++) {
    d += `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)} ${ys[i].toFixed(1)} `;
  }
  // End-of-line dot to highlight the most recent value.
  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-full w-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={d.trim()}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

export default memo(Sparkline);
