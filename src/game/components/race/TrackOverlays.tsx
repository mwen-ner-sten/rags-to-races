"use client";

export const START_LIGHTS_UNTIL = 0.04;
const LIGHT_COUNT = 4;

interface Anchor {
  x: number;
  y: number;
}

/** Lit lights for a given progress: red ones build up, then all turn green just before the flag drops. */
export function startLightState(progress: number): { red: number; green: boolean } | null {
  if (progress >= START_LIGHTS_UNTIL) return null;
  const f = progress / START_LIGHTS_UNTIL;
  if (f >= 0.75) return { red: 0, green: true };
  return { red: Math.floor((f / 0.75) * (LIGHT_COUNT + 1)), green: false };
}

export function StartLights({ x, y, progress }: Anchor & { progress: number }) {
  const state = startLightState(progress);
  if (!state) return null;
  const width = LIGHT_COUNT * 12 + 6;
  return (
    <g aria-hidden="true">
      <rect x={x - width / 2} y={y - 8} width={width} height={16} rx={4} className="tk-light-housing" />
      {Array.from({ length: LIGHT_COUNT }, (_, i) => {
        const on = state.green || i < state.red;
        const cls = on ? (state.green ? "tk-light tk-light-go" : "tk-light tk-light-stop") : "tk-light";
        return <circle key={i} cx={x - width / 2 + 9 + i * 12} cy={y} r={4} className={cls} />;
      })}
    </g>
  );
}

export function FinishFlag({ x, y, patternId }: Anchor & { patternId: string }) {
  return (
    <g aria-hidden="true">
      <line x1={x} x2={x} y1={y - 16} y2={y + 12} className="tk-flag-pole" />
      <rect x={x} y={y - 16} width={30} height={18} fill={`url(#${patternId})`} className="tk-flag" />
    </g>
  );
}

/** The checkered pattern shared by the flag and the strip's finish line. */
export function CheckerPattern({ id }: { id: string }) {
  return (
    <pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse">
      <rect width={8} height={8} className="tk-chk-a" />
      <rect width={4} height={4} className="tk-chk-b" />
      <rect x={4} y={4} width={4} height={4} className="tk-chk-b" />
    </pattern>
  );
}
