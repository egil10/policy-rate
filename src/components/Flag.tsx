type Props = { code: string; alt: string; size?: number };

const PALETTE = [
  ["#2563eb", "#1d4ed8"], // blue
  ["#059669", "#047857"], // emerald
  ["#d97706", "#b45309"], // amber
  ["#dc2626", "#b91c1c"], // red
  ["#7c3aed", "#6d28d9"], // violet
  ["#0891b2", "#0e7490"], // cyan
  ["#db2777", "#be185d"], // pink
  ["#65a30d", "#4d7c0f"], // lime
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Flag({ code, alt, size = 16 }: Props) {
  const label = (code || "??").slice(0, 2).toUpperCase();
  const [bg] = PALETTE[hashCode(label) % PALETTE.length];
  const px = Math.max(14, size);
  return (
    <span
      role="img"
      aria-label={alt}
      title={alt}
      className="inline-flex select-none items-center justify-center rounded-[4px] font-semibold tracking-tight text-white"
      style={{
        background: bg,
        width: px + 4,
        height: px,
        fontSize: Math.round(px * 0.55),
        lineHeight: 1,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </span>
  );
}
