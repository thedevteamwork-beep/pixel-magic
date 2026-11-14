/** Half-widths of shoulders, waist and hips per build, in a 100×100 box. */
const shapes: Record<string, [number, number, number]> = {
  slim: [20, 11, 15],
  athletic: [27, 15, 16],
  curvy: [21, 12, 25],
  broad: [31, 23, 21],
};

export function BodyArt({ build, skin }: { build: string; skin: string }) {
  const [sw, ww, hw] = shapes[build] ?? shapes.slim;
  const x = (offset: number) => 50 + offset;
  const body = `M${x(-sw)} 33 Q50 27 ${x(sw)} 33 Q${x(ww)} 44 ${x(ww)} 56 Q${x(hw)} 64 ${x(hw)} 77 L${x(hw - 4)} 97 H${x(-hw + 4)} L${x(-hw)} 77 Q${x(-hw)} 64 ${x(-ww)} 56 Q${x(-ww)} 44 ${x(-sw)} 33Z`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={body} fill={skin} />
      <path d={`M${x(-hw + 4)} 97 L50 80 L${x(hw - 4)} 97`} fill="#000" fillOpacity=".1" />
      <circle cx="50" cy="16" r="9.5" fill={skin} />
      <rect x="46" y="23" width="8" height="8" rx="3" fill={skin} />
    </svg>
  );
}
