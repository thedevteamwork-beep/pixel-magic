import type { ReactNode } from "react";

type Hair = { back?: ReactNode; front?: ReactNode };

const cap = "M31 46 C29 26 41 18 50 18 C60 18 71 26 69 46 C65 36 57 31 50 31 C43 31 35 36 31 46Z";

/** Hair drawn behind and in front of the face, in a 100×100 box. Colour is applied by the parent. */
const hairStyles: Record<string, (color: string) => Hair> = {
  "long-waves": (c) => ({
    back: (
      <path
        d="M30 40 C23 52 31 62 24 74 C21 83 30 90 32 95 L68 95 C70 90 79 83 76 74 C69 62 77 52 70 40 C68 22 58 16 50 16 C42 16 32 22 30 40Z"
        fill={c}
      />
    ),
    front: <path d="M31 46 C29 26 41 18 50 18 C60 18 71 26 69 46 C63 34 55 28 47 28 C41 34 35 40 31 46Z" fill={c} />,
  }),
  "sleek-straight": (c) => ({
    back: (
      <path d="M31 38 C29 55 30 75 28 90 L72 90 C70 75 71 55 69 38 C67 20 58 16 50 16 C42 16 33 20 31 38Z" fill={c} />
    ),
    front: (
      <>
        <path d={cap} fill={c} />
        <path d="M50 18 V31" stroke="#000" strokeOpacity=".25" strokeWidth="1" />
      </>
    ),
  }),
  curly: (c) => ({
    back: (
      <g fill={c}>
        {[
          [30, 34, 9],
          [38, 24, 9],
          [50, 20, 10],
          [62, 24, 9],
          [70, 34, 9],
          [27, 48, 8],
          [73, 48, 8],
          [30, 60, 7],
          [70, 60, 7],
        ].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
    ),
    front: (
      <g fill={c}>
        {[
          [40, 32, 5.5],
          [50, 29, 5.5],
          [60, 32, 5.5],
        ].map(([x, y, r]) => (
          <circle key={x} cx={x} cy={y} r={r} />
        ))}
      </g>
    ),
  }),
  bob: (c) => ({
    back: (
      <path d="M29 40 C27 56 29 64 32 69 L68 69 C71 64 73 56 71 40 C69 22 58 16 50 16 C42 16 31 22 29 40Z" fill={c} />
    ),
    front: <path d="M31 46 C30 28 42 22 50 22 C60 22 70 28 69 46 C63 38 57 35 50 35 C43 35 37 38 31 46Z" fill={c} />,
  }),
  pixie: (c) => ({
    front: (
      <path
        d="M30 46 C27 24 41 16 52 16 C65 16 73 28 70 46 C67 38 63 34 57 30 C53 35 45 35 40 32 C36 36 33 40 30 46Z"
        fill={c}
      />
    ),
  }),
  braids: (c) => ({
    back: (
      <g fill={c}>
        {[31, 69].flatMap((x) =>
          [62, 70, 78, 86].map((y) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4.5" ry="5" />),
        )}
      </g>
    ),
    front: <path d={cap} fill={c} />,
  }),
  "buzz-cut": (c) => ({
    front: (
      <path
        d="M33 44 C32 29 42 22 50 22 C58 22 68 29 67 44 C62 36 56 33 50 33 C44 33 38 36 33 44Z"
        fill={c}
        opacity=".9"
      />
    ),
  }),
  "top-knot": (c) => ({
    front: (
      <>
        <path d={cap} fill={c} />
        <circle cx="50" cy="13" r="7.5" fill={c} />
        <rect x="45" y="17" width="10" height="3" rx="1.5" fill="#000" fillOpacity=".25" />
      </>
    ),
  }),
};

export function HairArt({ style, skin, hair, eyes }: { style: string; skin: string; hair: string; eyes: string }) {
  const { back, front } = (hairStyles[style] ?? hairStyles["long-waves"])(hair);
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {back}
      <path d="M42 60 H58 V80 C58 84 66 86 76 90 L78 100 H22 L24 90 C34 86 42 84 42 80Z" fill={skin} />
      <path d="M42 70 C46 76 54 76 58 70 V80 H42Z" fill="#000" fillOpacity=".12" />
      <ellipse cx="50" cy="46" rx="17" ry="21" fill={skin} />
      <ellipse cx="33" cy="47" rx="2.6" ry="4.5" fill={skin} />
      <ellipse cx="67" cy="47" rx="2.6" ry="4.5" fill={skin} />
      {front}
      <circle cx="43" cy="49" r="2.2" fill={eyes} />
      <circle cx="57" cy="49" r="2.2" fill={eyes} />
      <path
        d="M39 44.5 Q43 42.5 47 44.5 M53 44.5 Q57 42.5 61 44.5"
        stroke="#000"
        strokeOpacity=".4"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M45 59 Q50 63 55 59"
        stroke="#000"
        strokeOpacity=".5"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
