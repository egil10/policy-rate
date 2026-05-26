type Props = { code: string; alt: string; size?: number };

export default function Flag({ code, alt, size = 16 }: Props) {
  const h = Math.round(size * 0.75);
  const w = size;
  const c = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/${w * 2}x${h * 2}/${c}.png`}
      srcSet={`https://flagcdn.com/${w * 3}x${h * 3}/${c}.png 1.5x, https://flagcdn.com/${w * 4}x${h * 4}/${c}.png 2x`}
      alt={alt}
      width={w}
      height={h}
      loading="lazy"
      className="inline-block align-middle rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.18)]"
    />
  );
}
