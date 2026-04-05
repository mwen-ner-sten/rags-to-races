/**
 * Inline SVG sprites for each vehicle tier (top-down view, pointing right).
 *
 * All sprites use a 32×32 viewBox and accept a `color` prop for theming.
 * Internal details reference CSS custom properties so they adapt to any theme.
 */

interface VehicleSpriteProps {
  vehicleId: string;
  size?: number;
  color?: string;
  className?: string;
}

type SpriteRenderer = (color: string) => React.ReactNode;

/* ── Sprite definitions ─────────────────────────────────────────────────── */

const sprites: Record<string, SpriteRenderer> = {
  /* T0 — Push Mower: small body, handle bar, two wheels */
  push_mower: (c) => (
    <>
      {/* wheels */}
      <rect x="9" y="8" width="4" height="3" rx="1" fill="var(--text-muted)" />
      <rect x="9" y="21" width="4" height="3" rx="1" fill="var(--text-muted)" />
      {/* body */}
      <rect x="11" y="10" width="12" height="12" rx="2" fill={c} />
      {/* engine block */}
      <rect x="19" y="12" width="5" height="8" rx="1" fill={c} opacity={0.7} />
      {/* handle */}
      <rect x="4" y="14" width="8" height="1.5" rx="0.5" fill="var(--text-muted)" />
      <rect x="3" y="13" width="2" height="4" rx="1" fill="var(--text-muted)" />
      {/* blade housing */}
      <circle cx="17" cy="16" r="3.5" fill={c} opacity={0.5} stroke="var(--text-muted)" strokeWidth="0.5" />
    </>
  ),

  /* T1 — Riding Mower: wider body, seat, 4 wheels, steering column */
  riding_mower: (c) => (
    <>
      {/* rear wheels */}
      <rect x="8" y="6" width="5" height="3.5" rx="1.2" fill="var(--text-muted)" />
      <rect x="8" y="22.5" width="5" height="3.5" rx="1.2" fill="var(--text-muted)" />
      {/* front wheels */}
      <rect x="22" y="8" width="3" height="3" rx="1" fill="var(--text-muted)" />
      <rect x="22" y="21" width="3" height="3" rx="1" fill="var(--text-muted)" />
      {/* body */}
      <rect x="10" y="8" width="14" height="16" rx="3" fill={c} />
      {/* engine hood */}
      <rect x="21" y="10" width="6" height="12" rx="2" fill={c} opacity={0.8} />
      {/* seat */}
      <rect x="11" y="12" width="5" height="8" rx="2" fill="var(--panel-bg)" opacity={0.6} />
      {/* steering column */}
      <line x1="17" y1="16" x2="21" y2="16" stroke="var(--text-muted)" strokeWidth="1" />
      <circle cx="21" cy="16" r="1.5" fill="var(--text-muted)" opacity={0.7} />
    </>
  ),

  /* T2 — Go-Kart: low narrow open body, exposed rear axle, front fairing */
  go_kart: (c) => (
    <>
      {/* rear axle */}
      <rect x="8" y="6" width="1.5" height="20" rx="0.5" fill="var(--text-muted)" />
      {/* rear wheels */}
      <rect x="6" y="5" width="5" height="3.5" rx="1.2" fill="var(--text-muted)" />
      <rect x="6" y="23.5" width="5" height="3.5" rx="1.2" fill="var(--text-muted)" />
      {/* front wheels */}
      <rect x="24" y="8" width="3.5" height="3" rx="1" fill="var(--text-muted)" />
      <rect x="24" y="21" width="3.5" height="3" rx="1" fill="var(--text-muted)" />
      {/* chassis */}
      <rect x="10" y="11" width="16" height="10" rx="2" fill={c} />
      {/* cockpit */}
      <rect x="12" y="13" width="6" height="6" rx="1.5" fill="var(--panel-bg)" opacity={0.5} />
      {/* front nose fairing */}
      <path d="M24,12 L29,15 L29,17 L24,20 Z" fill={c} opacity={0.85} />
      {/* steering tie rods */}
      <line x1="24" y1="9.5" x2="24" y2="13" stroke="var(--text-muted)" strokeWidth="0.7" />
      <line x1="24" y1="19" x2="24" y2="22.5" stroke="var(--text-muted)" strokeWidth="0.7" />
    </>
  ),

  /* T3 — Beater Car: basic sedan, rectangular with rounded hood */
  beater_car: (c) => (
    <>
      {/* wheels */}
      <ellipse cx="9" cy="7" rx="2.5" ry="2" fill="var(--text-muted)" />
      <ellipse cx="9" cy="25" rx="2.5" ry="2" fill="var(--text-muted)" />
      <ellipse cx="24" cy="7" rx="2.5" ry="2" fill="var(--text-muted)" />
      <ellipse cx="24" cy="25" rx="2.5" ry="2" fill="var(--text-muted)" />
      {/* body */}
      <rect x="6" y="8" width="22" height="16" rx="3" fill={c} />
      {/* hood */}
      <path d="M25,9 Q30,12 30,16 Q30,20 25,23 L25,9Z" fill={c} opacity={0.8} />
      {/* trunk */}
      <path d="M8,10 Q4,12 4,16 Q4,20 8,22 L8,10Z" fill={c} opacity={0.75} />
      {/* windshield */}
      <rect x="20" y="10.5" width="4" height="11" rx="1.5" fill="var(--panel-bg)" opacity={0.45} />
      {/* rear window */}
      <rect x="9" y="11" width="3" height="10" rx="1" fill="var(--panel-bg)" opacity={0.35} />
      {/* roof */}
      <rect x="13" y="10" width="7" height="12" rx="2" fill={c} opacity={0.6} />
      {/* rust spot */}
      <circle cx="11" cy="20" r="1" fill="var(--text-muted)" opacity={0.3} />
    </>
  ),

  /* T4 — Street Racer: sleek coupe, rear spoiler, refined curves */
  street_racer: (c) => (
    <>
      {/* wheels */}
      <ellipse cx="8" cy="6.5" rx="2.5" ry="2.2" fill="var(--text-muted)" />
      <ellipse cx="8" cy="25.5" rx="2.5" ry="2.2" fill="var(--text-muted)" />
      <ellipse cx="25" cy="6.5" rx="2.5" ry="2.2" fill="var(--text-muted)" />
      <ellipse cx="25" cy="25.5" rx="2.5" ry="2.2" fill="var(--text-muted)" />
      {/* body — sleek shape */}
      <path d="M7,8 L26,7 Q31,10 31,16 Q31,22 26,25 L7,24 Q4,22 4,16 Q4,10 7,8Z" fill={c} />
      {/* windshield */}
      <path d="M21,9.5 L25,8.5 Q27,12 27,16 Q27,20 25,23.5 L21,22.5 Q22,19 22,16 Q22,13 21,9.5Z" fill="var(--panel-bg)" opacity={0.45} />
      {/* roof line */}
      <path d="M13,9.5 L21,9.5 Q22,13 22,16 Q22,19 21,22.5 L13,22.5 Q14,19 14,16 Q14,13 13,9.5Z" fill={c} opacity={0.6} />
      {/* rear window */}
      <path d="M10,10 L13,9.5 Q14,13 14,16 Q14,19 13,22.5 L10,22 Q11,19 11,16 Q11,13 10,10Z" fill="var(--panel-bg)" opacity={0.35} />
      {/* spoiler */}
      <rect x="4" y="6" width="1.5" height="20" rx="0.5" fill="var(--text-muted)" opacity={0.7} />
      {/* headlights */}
      <rect x="29" y="11" width="1.5" height="2.5" rx="0.5" fill="var(--text-muted)" opacity={0.8} />
      <rect x="29" y="18.5" width="1.5" height="2.5" rx="0.5" fill="var(--text-muted)" opacity={0.8} />
    </>
  ),

  /* T5 — Rally Car: roof rack/lights, wider fenders, raised stance */
  rally_car: (c) => (
    <>
      {/* wheels — slightly larger / raised */}
      <ellipse cx="8" cy="5.5" rx="3" ry="2.5" fill="var(--text-muted)" />
      <ellipse cx="8" cy="26.5" rx="3" ry="2.5" fill="var(--text-muted)" />
      <ellipse cx="24" cy="5.5" rx="3" ry="2.5" fill="var(--text-muted)" />
      <ellipse cx="24" cy="26.5" rx="3" ry="2.5" fill="var(--text-muted)" />
      {/* wide body / fenders */}
      <path d="M6,7 L26,6 Q31,10 31,16 Q31,22 26,26 L6,25 Q3,22 3,16 Q3,10 6,7Z" fill={c} />
      {/* windshield */}
      <path d="M21,8 L25,7.5 Q27,11 27,16 Q27,21 25,24.5 L21,24 Q22,20 22,16 Q22,12 21,8Z" fill="var(--panel-bg)" opacity={0.4} />
      {/* roof */}
      <rect x="12" y="9" width="9" height="14" rx="2" fill={c} opacity={0.6} />
      {/* roof rack / light bar */}
      <rect x="14" y="8" width="6" height="1.2" rx="0.4" fill="var(--text-muted)" />
      <rect x="14" y="22.8" width="6" height="1.2" rx="0.4" fill="var(--text-muted)" />
      {/* rally lights on hood */}
      <circle cx="28" cy="12" r="1.2" fill="var(--text-muted)" opacity={0.9} />
      <circle cx="28" cy="20" r="1.2" fill="var(--text-muted)" opacity={0.9} />
      {/* side stripe */}
      <rect x="8" y="15" width="17" height="2" rx="0.5" fill="var(--text-muted)" opacity={0.25} />
      {/* mud flaps */}
      <rect x="5" y="6" width="1.5" height="3" rx="0.5" fill="var(--text-muted)" opacity={0.5} />
      <rect x="5" y="23" width="1.5" height="3" rx="0.5" fill="var(--text-muted)" opacity={0.5} />
    </>
  ),

  /* T6 — Stock Car: wide oval body, number circle, very rounded */
  stock_car: (c) => (
    <>
      {/* wheels */}
      <ellipse cx="8" cy="5.5" rx="3" ry="2.5" fill="var(--text-muted)" />
      <ellipse cx="8" cy="26.5" rx="3" ry="2.5" fill="var(--text-muted)" />
      <ellipse cx="25" cy="5.5" rx="3" ry="2.5" fill="var(--text-muted)" />
      <ellipse cx="25" cy="26.5" rx="3" ry="2.5" fill="var(--text-muted)" />
      {/* body — wide, rounded, NASCAR-style */}
      <ellipse cx="16" cy="16" rx="14" ry="10.5" fill={c} />
      {/* hood slope */}
      <path d="M27,8 Q32,12 32,16 Q32,20 27,24 L27,8Z" fill={c} opacity={0.8} />
      {/* windshield */}
      <path d="M21,9 L25,8 Q27,12 27,16 Q27,20 25,24 L21,23 Q22,19 22,16 Q22,13 21,9Z" fill="var(--panel-bg)" opacity={0.4} />
      {/* roof */}
      <ellipse cx="15" cy="16" rx="6" ry="6.5" fill={c} opacity={0.55} />
      {/* number circle */}
      <circle cx="14" cy="16" r="3.5" fill="var(--panel-bg)" opacity={0.5} />
      <text x="14" y="18" textAnchor="middle" fontSize="5" fontWeight="bold" fill="var(--text-muted)" opacity={0.7}>6</text>
      {/* rear spoiler */}
      <rect x="2" y="7" width="1.5" height="18" rx="0.5" fill="var(--text-muted)" opacity={0.6} />
      {/* decal stripe */}
      <rect x="5" y="15" width="22" height="2" rx="0.5" fill="var(--text-muted)" opacity={0.2} />
    </>
  ),

  /* T7 — Prototype Racer: low, wide, aero elements, open-wheel hints */
  prototype_racer: (c) => (
    <>
      {/* exposed wheels */}
      <ellipse cx="7" cy="4.5" rx="3.5" ry="2.8" fill="var(--text-muted)" />
      <ellipse cx="7" cy="27.5" rx="3.5" ry="2.8" fill="var(--text-muted)" />
      <ellipse cx="26" cy="5.5" rx="2.5" ry="2.2" fill="var(--text-muted)" />
      <ellipse cx="26" cy="26.5" rx="2.5" ry="2.2" fill="var(--text-muted)" />
      {/* monocoque / central body */}
      <path d="M9,9 L28,10 Q31,13 31,16 Q31,19 28,22 L9,23 Q6,20 6,16 Q6,12 9,9Z" fill={c} />
      {/* front splitter */}
      <path d="M28,8 L32,9 L32,23 L28,24 Z" fill="var(--text-muted)" opacity={0.5} />
      {/* cockpit */}
      <path d="M16,12 L22,11.5 Q23,14 23,16 Q23,18 22,20.5 L16,20 Q17,18 17,16 Q17,14 16,12Z" fill="var(--panel-bg)" opacity={0.5} />
      {/* rear diffuser */}
      <path d="M6,8 L9,9 L9,23 L6,24 L4,22 L4,10 Z" fill="var(--text-muted)" opacity={0.4} />
      {/* rear wing */}
      <rect x="3" y="4" width="2" height="24" rx="0.7" fill="var(--text-muted)" opacity={0.65} />
      <rect x="2" y="5" width="1" height="22" rx="0.3" fill="var(--text-muted)" opacity={0.4} />
      {/* side pods */}
      <rect x="11" y="8" width="8" height="2.5" rx="1" fill={c} opacity={0.7} />
      <rect x="11" y="21.5" width="8" height="2.5" rx="1" fill={c} opacity={0.7} />
      {/* air intake */}
      <rect x="14" y="11" width="2" height="1.5" rx="0.5" fill="var(--text-muted)" opacity={0.5} />
    </>
  ),

  /* T8 — Supercar: flowing curves, large rear wing, wide body — the pinnacle */
  supercar: (c) => (
    <>
      {/* wheels */}
      <ellipse cx="8" cy="5" rx="3" ry="2.8" fill="var(--text-muted)" />
      <ellipse cx="8" cy="27" rx="3" ry="2.8" fill="var(--text-muted)" />
      <ellipse cx="26" cy="5.5" rx="2.8" ry="2.5" fill="var(--text-muted)" />
      <ellipse cx="26" cy="26.5" rx="2.8" ry="2.5" fill="var(--text-muted)" />
      {/* body — flowing supercar shape */}
      <path d="M6,7 L27,6 Q33,10 33,16 Q33,22 27,26 L6,25 Q2,22 2,16 Q2,10 6,7Z" fill={c} />
      {/* hood contour */}
      <path d="M24,7 Q30,10 30,16 Q30,22 24,25 L24,7Z" fill={c} opacity={0.75} />
      {/* windshield */}
      <path d="M20,8 L24,7 Q26,11 26,16 Q26,21 24,25 L20,24 Q21,20 21,16 Q21,12 20,8Z" fill="var(--panel-bg)" opacity={0.5} />
      {/* roof / canopy */}
      <path d="M14,9 L20,8 Q21,12 21,16 Q21,20 20,24 L14,23 Q15,19 15,16 Q15,13 14,9Z" fill={c} opacity={0.55} />
      {/* rear window */}
      <path d="M11,10 L14,9 Q15,13 15,16 Q15,19 14,23 L11,22 Q12,19 12,16 Q12,13 11,10Z" fill="var(--panel-bg)" opacity={0.35} />
      {/* large rear wing */}
      <rect x="2" y="4" width="2.5" height="24" rx="0.8" fill="var(--text-muted)" opacity={0.7} />
      <rect x="4" y="6" width="2" height="20" rx="0.5" fill="var(--text-muted)" opacity={0.3} />
      {/* side intakes */}
      <path d="M16,8 L19,7.5 L19,9 L16,9.5Z" fill="var(--text-muted)" opacity={0.4} />
      <path d="M16,24 L19,24.5 L19,23 L16,22.5Z" fill="var(--text-muted)" opacity={0.4} />
      {/* headlights */}
      <rect x="30" y="11" width="2" height="2" rx="0.8" fill="var(--text-muted)" opacity={0.85} />
      <rect x="30" y="19" width="2" height="2" rx="0.8" fill="var(--text-muted)" opacity={0.85} />
      {/* center stripe */}
      <rect x="6" y="15.2" width="24" height="1.6" rx="0.5" fill="var(--text-muted)" opacity={0.15} />
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
        /* Fallback: original triangle */
        <polygon points="9,11 23,16 9,21" fill={color} />
      )}
    </svg>
  );
}
