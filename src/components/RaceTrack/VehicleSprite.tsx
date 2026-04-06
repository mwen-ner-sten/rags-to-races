/**
 * Inline SVG sprites for each vehicle tier (top-down view, pointing right).
 *
 * All sprites use a 32×32 viewBox and accept a `color` prop for theming.
 * Details use CSS custom properties so they adapt to any theme.
 * Layered paths (no shared defs/ids) keep many cars on one SVG valid.
 */

/** Shown in Dev → Vehicle Sprites so you can confirm the running bundle has new art. */
export const VEHICLE_SPRITE_ART_REVISION = 2;

interface VehicleSpriteProps {
  vehicleId: string;
  size?: number;
  color?: string;
  className?: string;
}

type SpriteRenderer = (color: string) => React.ReactNode;

/* ── Shared drawing helpers (32×32 space, +X = front of vehicle) ─────────── */

function shadowUnder(cx: number, cy: number, rx: number, ry: number) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={rx + 1.2} ry={ry + 0.6} fill="black" opacity={0.12} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" opacity={0.18} />
    </>
  );
}

/** Tire + rim; `angle` 0 = horizontal ellipse */
function wheel(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opts?: { hub?: boolean },
) {
  const hub = opts?.hub !== false;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx + 0.35} ry={ry + 0.35} fill="black" opacity={0.2} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#1a1a1a" />
      <ellipse cx={cx} cy={cy} rx={rx * 0.78} ry={ry * 0.78} fill="#2d2d2d" />
      {hub ? (
        <>
          <ellipse cx={cx - 0.35} cy={cy - 0.25} rx={rx * 0.35} ry={ry * 0.35} fill="var(--text-muted)" opacity={0.45} />
          <ellipse cx={cx} cy={cy} rx={rx * 0.28} ry={ry * 0.28} fill="var(--text-muted)" opacity={0.65} />
        </>
      ) : null}
    </g>
  );
}

function bodyHighlight(
  d: string,
  opacity = 0.22,
) {
  return <path d={d} fill="white" opacity={opacity} />;
}

function glassPanel(d: string, opacity = 0.42) {
  return (
    <path
      d={d}
      fill="var(--panel-bg)"
      opacity={opacity}
      stroke="var(--text-muted)"
      strokeWidth={0.25}
      strokeOpacity={0.35}
    />
  );
}

/* ── Sprite definitions ─────────────────────────────────────────────────── */

export const sprites: Record<string, SpriteRenderer> = {
  /* T0 — Push Mower */
  push_mower: (c) => (
    <>
      {shadowUnder(16, 17.5, 8, 3)}
      {wheel(10, 9, 2.2, 1.6)}
      {wheel(10, 23, 2.2, 1.6)}
      <rect x="11.5" y="10" width="13" height="12" rx="2.2" fill={c} />
      <path d="M12,10.5 L22,10.5 L23.5,12 L23.5,20 L22,21.5 L12,21.5 Z" fill={c} opacity={0.88} />
      {bodyHighlight("M12,11 L21,11 L22.5,12.2 L22.5,13.5 L12,13 Z")}
      <rect x="19.5" y="12" width="5" height="8" rx="1" fill={c} opacity={0.72} />
      <ellipse cx="17.5" cy="16" rx="3.8" ry="3.6" fill={c} opacity={0.55} stroke="var(--text-muted)" strokeWidth={0.4} />
      <rect x="4" y="14" width="9" height="1.8" rx="0.6" fill="var(--text-muted)" />
      <rect x="2.5" y="12.5" width="2.5" height="5" rx="1" fill="var(--text-muted)" />
      <rect x="3" y="13.5" width="2" height="1.2" rx="0.4" fill="var(--text-muted)" opacity={0.6} />
      <path d="M23,14 L27,15.5 L27,16.5 L23,18 Z" fill="var(--text-muted)" opacity={0.5} />
    </>
  ),

  /* T1 — Riding Mower */
  riding_mower: (c) => (
    <>
      {shadowUnder(16, 17, 10, 3.2)}
      {wheel(9.5, 7.5, 2.6, 1.9)}
      {wheel(9.5, 24.5, 2.6, 1.9)}
      {wheel(23.5, 9, 1.9, 1.45)}
      {wheel(23.5, 23, 1.9, 1.45)}
      <path
        d="M10.5,8.5 L23,8.5 Q25,8.5 25.5,10 L25.5,22 Q25,23.5 23,23.5 L10.5,23.5 Q9,23.5 9,22 L9,10 Q9,8.5 10.5,8.5Z"
        fill={c}
      />
      {bodyHighlight("M11,9.5 L22,9.5 L24,10.5 L24,12 L11,11 Z")}
      <rect x="21" y="10" width="6.5" height="12" rx="2" fill={c} opacity={0.82} />
      <rect x="11" y="12" width="5.5" height="8" rx="2" fill="var(--panel-bg)" opacity={0.5} />
      <rect x="11.8" y="13" width="3.8" height="5.5" rx="1" fill="black" opacity={0.12} />
      <line x1="17.5" y1="16" x2="21.5" y2="16" stroke="var(--text-muted)" strokeWidth={0.9} strokeLinecap="round" />
      <circle cx="21.5" cy="16" r="1.6" fill="var(--text-muted)" opacity={0.75} />
      <rect x="9" y="14.5" width="2" height="3" rx="0.5" fill="var(--text-muted)" opacity={0.4} />
    </>
  ),

  /* T2 — Go-Kart */
  go_kart: (c) => (
    <>
      {shadowUnder(16, 17, 9.5, 2.8)}
      {wheel(7.5, 6.5, 2.8, 2)}
      {wheel(7.5, 25.5, 2.8, 2)}
      {wheel(25, 9, 2.1, 1.55)}
      {wheel(25, 23, 2.1, 1.55)}
      <rect x="8.5" y="6" width="1.2" height="20" rx="0.4" fill="var(--text-muted)" opacity={0.85} />
      <path d="M10.5,11.5 L24,11 Q26.5,12 26.5,16 Q26.5,20 24,21 L10.5,20.5 Q9,20 9,16 Q9,12 10.5,11.5Z" fill={c} />
      {bodyHighlight("M11,12.5 L23,12 Q24.5,13 24.5,15 L11,14 Z")}
      {glassPanel("M12.5,13.5 L18.5,13 Q19.5,14 19.5,16 Q19.5,18 18.5,19 L12.5,18.5 Q12,17.5 12,16 Q12,14.5 12.5,13.5Z")}
      <path d="M24.5,12.5 L29.5,15.2 L29.5,16.8 L24.5,19.5 Z" fill={c} opacity={0.9} />
      <path d="M24,9.5 L24.8,12 M24,22.5 L24.8,20" stroke="var(--text-muted)" strokeWidth={0.65} strokeLinecap="round" />
      <path
        d="M13,10.5 Q15.5,8.5 18,10.5"
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={0.9}
        strokeLinecap="round"
        opacity={0.7}
      />
    </>
  ),

  /* T3 — Beater Car */
  beater_car: (c) => (
    <>
      {shadowUnder(16, 17.5, 11, 3.2)}
      {wheel(9, 7, 2.5, 1.85)}
      {wheel(9, 25, 2.5, 1.85)}
      {wheel(24, 7, 2.5, 1.85)}
      {wheel(24, 25, 2.5, 1.85)}
      <path
        d="M7,9.5 L24,9 Q28.5,10.5 29.5,14 L29.5,18 Q28.5,21.5 24,23 L7,22.5 Q5,21.5 4.5,18 L4.5,14 Q5,10.5 7,9.5Z"
        fill={c}
      />
      {bodyHighlight("M8,10.5 L23,10 Q27,11.2 28,14 L8,12.5 Z")}
      <path d="M25,9.5 Q29,11.5 29.5,16 Q29,20.5 25,22.5 L25,9.5Z" fill={c} opacity={0.78} />
      <path d="M7,10.5 Q4.5,12.5 4.5,16 Q4.5,19.5 7,21.5 L7,10.5Z" fill={c} opacity={0.72} />
      <path d="M13,10 L20,10 Q21,12 21,16 Q21,20 20,22 L13,22 Q12,20 12,16 Q12,12 13,10Z" fill={c} opacity={0.58} />
      {glassPanel("M20.5,11 L24.5,10.8 Q25.5,13 25.5,16 Q25.5,19 24.5,21.2 L20.5,21 Q21,18.5 21,16 Q21,13.5 20.5,11Z")}
      {glassPanel("M9.5,11.5 L12.5,11.2 Q13,13 13,16 Q13,19 12.5,20.8 L9.5,20.5 Q10,18.5 10,16 Q10,13.5 9.5,11.5Z", 0.32)}
      <ellipse cx="11" cy="19.5" rx="1.8" ry="1.2" fill="var(--text-muted)" opacity={0.35} />
      <path d="M8,15.5 L22,15.5" stroke="var(--text-muted)" strokeWidth={0.35} strokeOpacity={0.25} strokeDasharray="1 1.5" />
    </>
  ),

  /* T4 — Street Racer */
  street_racer: (c) => (
    <>
      {shadowUnder(16, 17.5, 11.5, 3.2)}
      {wheel(8, 6.5, 2.6, 2)}
      {wheel(8, 25.5, 2.6, 2)}
      {wheel(25.5, 6.5, 2.4, 1.85)}
      {wheel(25.5, 25.5, 2.4, 1.85)}
      <path
        d="M6.5,8 L26.5,7 Q31.5,9.5 31.5,16 Q31.5,22.5 26.5,25 L6.5,24 Q3.5,22 3.5,16 Q3.5,10 6.5,8Z"
        fill={c}
      />
      {bodyHighlight("M7.5,9 L25,8.2 Q29,10 29.5,14 L7.5,11.5 Z")}
      {glassPanel("M21,9 L25.5,8.5 Q27.5,11.5 27.5,16 Q27.5,20.5 25.5,23.5 L21,23 Q22,19.5 22,16 Q22,12.5 21,9Z")}
      <path
        d="M13.5,9 L21,9 Q22,12.5 22,16 Q22,19.5 21,23 L13.5,23 Q14.5,19.5 14.5,16 Q14.5,12.5 13.5,9Z"
        fill={c}
        opacity={0.55}
      />
      {glassPanel("M10.5,10 L13.5,9 Q14.5,12.5 14.5,16 Q14.5,19.5 13.5,23 L10.5,22.5 Q11.5,19 11.5,16 Q11.5,13 10.5,10Z", 0.32)}
      <rect x="3.5" y="7" width="1.8" height="18" rx="0.5" fill="var(--text-muted)" opacity={0.75} />
      <path d="M3.5,7 L5.5,6.2 L5.5,25.8 L3.5,25 Z" fill="var(--text-muted)" opacity={0.45} />
      <rect x="29.5" y="11" width="1.8" height="2.8" rx="0.6" fill="#e8e8e8" opacity={0.85} />
      <rect x="29.5" y="18.2" width="1.8" height="2.8" rx="0.6" fill="#e8e8e8" opacity={0.85} />
      <rect x="7" y="15.4" width="18" height="1.2" rx="0.4" fill="var(--text-muted)" opacity={0.12} />
    </>
  ),

  /* T5 — Rally Car */
  rally_car: (c) => (
    <>
      {shadowUnder(16, 17.5, 11.8, 3.4)}
      {wheel(8, 5.5, 3.1, 2.35)}
      {wheel(8, 26.5, 3.1, 2.35)}
      {wheel(24.5, 5.5, 3.1, 2.35)}
      {wheel(24.5, 26.5, 3.1, 2.35)}
      <path
        d="M5.5,7.5 L26.5,6.5 Q31.5,9.5 31.5,16 Q31.5,22.5 26.5,26.5 L5.5,25.5 Q2.5,22.5 2.5,16 Q2.5,9.5 5.5,7.5Z"
        fill={c}
      />
      {bodyHighlight("M6.5,8.5 L25,7.5 Q29,10 29.5,14 L6.5,11 Z")}
      {glassPanel("M21,8 L25.5,7.5 Q27.5,11 27.5,16 Q27.5,21 25.5,24.5 L21,24 Q22,20 22,16 Q22,12 21,8Z")}
      <rect x="12" y="9" width="9" height="14" rx="2" fill={c} opacity={0.58} />
      <rect x="14" y="7.8" width="6" height="1.4" rx="0.5" fill="var(--text-muted)" />
      <rect x="14" y="22.8" width="6" height="1.4" rx="0.5" fill="var(--text-muted)" />
      <circle cx="28.2" cy="12" r="1.4" fill="#f5f5a8" opacity={0.95} />
      <circle cx="28.2" cy="20" r="1.4" fill="#f5f5a8" opacity={0.95} />
      <rect x="7.5" y="15" width="17" height="2" rx="0.5" fill="white" opacity={0.18} />
      <rect x="4.5" y="6" width="1.8" height="3.2" rx="0.5" fill="var(--text-muted)" opacity={0.55} />
      <rect x="4.5" y="22.8" width="1.8" height="3.2" rx="0.5" fill="var(--text-muted)" opacity={0.55} />
      <path d="M6,10 Q4,12 4,16 Q4,20 6,22" fill="none" stroke="var(--text-muted)" strokeWidth={0.6} opacity={0.35} />
    </>
  ),

  /* T6 — Stock Car */
  stock_car: (c) => (
    <>
      {shadowUnder(16, 17.5, 12, 3.5)}
      {wheel(8, 5.5, 3.1, 2.35)}
      {wheel(8, 26.5, 3.1, 2.35)}
      {wheel(25.5, 5.5, 3.1, 2.35)}
      {wheel(25.5, 26.5, 3.1, 2.35)}
      <ellipse cx="16" cy="16" rx="14" ry="10.5" fill={c} />
      {bodyHighlight("M8,9 Q16,7 24,9 L26,12 Q26,14 24,10 Q16,8.5 8,10 Z")}
      <path d="M26.5,8 Q31,11.5 31,16 Q31,20.5 26.5,24 L26.5,8Z" fill={c} opacity={0.82} />
      {glassPanel("M21,9 L25,8.5 Q27,12 27,16 Q27,20 25,23.5 L21,23 Q22,19.5 22,16 Q22,12.5 21,9Z")}
      <ellipse cx="15.5" cy="16" rx="6.5" ry="6.8" fill={c} opacity={0.52} />
      <circle cx="14.5" cy="16" r="3.8" fill="var(--panel-bg)" opacity={0.55} stroke="var(--text-muted)" strokeWidth={0.35} />
      <rect x="12" y="14.2" width="5" height="3.6" rx="0.6" fill="var(--text-muted)" opacity={0.5} />
      <rect x="13.2" y="15.4" width="2.6" height="1.2" rx="0.2" fill="var(--panel-bg)" opacity={0.7} />
      <rect x="1.8" y="7.5" width="1.8" height="17" rx="0.5" fill="var(--text-muted)" opacity={0.7} />
      <rect x="5" y="15.2" width="22" height="1.6" rx="0.5" fill="white" opacity={0.12} />
      <rect x="5" y="12.5" width="22" height="0.9" rx="0.3" fill="var(--text-muted)" opacity={0.15} />
    </>
  ),

  /* T7 — Prototype Racer */
  prototype_racer: (c) => (
    <>
      {shadowUnder(16, 17.5, 11.5, 3)}
      {wheel(7, 4.5, 3.6, 2.85, { hub: true })}
      {wheel(7, 27.5, 3.6, 2.85, { hub: true })}
      {wheel(26.5, 5.5, 2.6, 2.05)}
      {wheel(26.5, 26.5, 2.6, 2.05)}
      <path
        d="M8.5,9 L28.5,10 Q31.5,12.5 31.5,16 Q31.5,19.5 28.5,22 L8.5,23 Q5.5,20.5 5.5,16 Q5.5,11.5 8.5,9Z"
        fill={c}
      />
      {bodyHighlight("M9.5,10 L27,10.8 Q30,12.5 30,15 L9.5,12 Z")}
      <path d="M28.5,8 L32,9.2 L32,22.8 L28.5,24 Z" fill="var(--text-muted)" opacity={0.55} />
      {glassPanel("M16.5,12 L22.5,11.5 Q23.5,13.5 23.5,16 Q23.5,18.5 22.5,20.5 L16.5,20 Q17.5,18.5 17.5,16 Q17.5,13.5 16.5,12Z")}
      <path d="M5.5,9 L8.5,9 L8.5,23 L5.5,23 L3.5,21 L3.5,11 Z" fill="var(--text-muted)" opacity={0.45} />
      <rect x="2.2" y="4" width="2.2" height="24" rx="0.7" fill="var(--text-muted)" opacity={0.72} />
      <rect x="1.2" y="5.5" width="1" height="21" rx="0.3" fill="var(--text-muted)" opacity={0.35} />
      <rect x="11" y="8" width="8" height="2.5" rx="1" fill={c} opacity={0.75} />
      <rect x="11" y="21.5" width="8" height="2.5" rx="1" fill={c} opacity={0.75} />
      <rect x="14.5" y="11" width="2.2" height="1.6" rx="0.5" fill="var(--text-muted)" opacity={0.5} />
      <path d="M27,11 L30,12 L30,20 L27,21 Z" fill="var(--text-muted)" opacity={0.25} />
    </>
  ),

  /* T8 — Supercar */
  supercar: (c) => (
    <>
      {shadowUnder(16, 17.5, 12, 3.2)}
      {wheel(8, 5, 3.2, 2.75)}
      {wheel(8, 27, 3.2, 2.75)}
      {wheel(26.5, 5.5, 2.85, 2.35)}
      {wheel(26.5, 26.5, 2.85, 2.35)}
      <path
        d="M5.5,7.5 L27,6.5 Q31.5,9.5 31.5,16 Q31.5,22.5 27,25.5 L5.5,25 Q1.5,22.5 1.5,16 Q1.5,9.5 5.5,7.5Z"
        fill={c}
      />
      {bodyHighlight("M6.5,8.5 L25.5,7.5 Q30,10 30.5,14 L6.5,11 Z")}
      <path d="M24,7 Q30,9.5 30.5,16 Q30,22.5 24,25 L24,7Z" fill={c} opacity={0.78} />
      {glassPanel("M20.5,8 L24.5,7.2 Q26.5,11 26.5,16 Q26.5,21 24.5,24.8 L20.5,24 Q21.5,20 21.5,16 Q21.5,12 20.5,8Z", 0.48)}
      <path
        d="M14.5,8.5 L20.5,8 Q21.5,12 21.5,16 Q21.5,20 20.5,24 L14.5,23.5 Q15.5,19.5 15.5,16 Q15.5,12.5 14.5,8.5Z"
        fill={c}
        opacity={0.52}
      />
      {glassPanel("M11.5,10 L14.5,8.5 Q15.5,12.5 15.5,16 Q15.5,19.5 14.5,23.5 L11.5,22.8 Q12.5,19 12.5,16 Q12.5,13 11.5,10Z", 0.34)}
      <rect x="1.5" y="4" width="2.6" height="24" rx="0.85" fill="var(--text-muted)" opacity={0.75} />
      <rect x="3.8" y="6" width="2" height="20" rx="0.5" fill="var(--text-muted)" opacity={0.28} />
      <path d="M16.5,8 L19.5,7.3 L19.5,9.2 L16.5,9.5 Z" fill="var(--text-muted)" opacity={0.45} />
      <path d="M16.5,24 L19.5,24.7 L19.5,22.8 L16.5,22.5 Z" fill="var(--text-muted)" opacity={0.45} />
      <rect x="29.2" y="11" width="2.2" height="2.2" rx="0.85" fill="#e8f0ff" opacity={0.9} />
      <rect x="29.2" y="18.8" width="2.2" height="2.2" rx="0.85" fill="#e8f0ff" opacity={0.9} />
      <rect x="6" y="15.3" width="24" height="1.4" rx="0.5" fill="white" opacity={0.1} />
    </>
  ),
};

/* ── Component ──────────────────────────────────────────────────────────── */

export default function VehicleSprite({
  vehicleId,
  size = 32,
  color = "var(--accent)",
  className,
}: VehicleSpriteProps) {
  const renderer = sprites[vehicleId];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    >
      {renderer ? (
        renderer(color)
      ) : (
        <polygon points="9,11 23,16 9,21" fill={color} />
      )}
    </svg>
  );
}
