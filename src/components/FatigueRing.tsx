"use client";

import { useGameStore } from "@/state/store";

const RADIUS = 9;
const STROKE = 2.5;
const SIZE = (RADIUS + STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function fatigueColor(fatigue: number): string {
  if (fatigue >= 75) return "var(--danger, #e05c1a)";
  if (fatigue >= 50) return "var(--warning, #c4872a)";
  if (fatigue >= 25) return "var(--accent-secondary, #c4872a)";
  return "var(--text-secondary, #9a8570)";
}

export default function FatigueRing() {
  const fatigue = useGameStore((s) => s.fatigue);
  const progress = Math.min(1, fatigue / 99);
  const color = fatigueColor(fatigue);
  // Single-expression label: avoids hydration mismatch in SVG <title>, where
  // mixed text + expression children get split into multiple text nodes on
  // the client but render as one text node from SSR.
  const label = `Fatigue ${fatigue}%`;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ transform: "rotate(-90deg)", flexShrink: 0, opacity: 0.85, cursor: "default" }}
      aria-label={label}
    >
      <title>{label}</title>
      {/* Track */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={STROKE}
      />
      {/* Fatigue arc */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .4s ease, stroke .3s ease" }}
      />
    </svg>
  );
}
