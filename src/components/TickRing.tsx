"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/state/store";
import { computeTickSpeedMs } from "@/engine/tick";

const RADIUS = 9;
const STROKE = 2.5;
const SIZE = (RADIUS + STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A small SVG ring that fills clockwise over the current tick interval.
 * Resets each time a tick fires. All animation is done via direct DOM
 * manipulation so there are zero React re-renders at 100ms cadence.
 */
export default function TickRing() {
  const arcRef  = useRef<SVGCircleElement>(null);
  const titleRef = useRef<SVGTitleElement>(null);

  // Track when the last tick fired (subscribe to lastActiveTimestamp changes)
  const lastTickTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    return useGameStore.subscribe((state, prev) => {
      if (state.lastActiveTimestamp !== prev.lastActiveTimestamp) {
        lastTickTimeRef.current = state.lastActiveTimestamp || Date.now();
      }
    });
  }, []);

  // 100ms animation loop — only updates DOM, never React state
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const tickMs = computeTickSpeedMs(state);
      const elapsed = Date.now() - lastTickTimeRef.current;
      const progress = Math.min(1, elapsed / tickMs);

      if (arcRef.current) {
        arcRef.current.style.strokeDashoffset = String(
          CIRCUMFERENCE * (1 - progress),
        );
      }
      if (titleRef.current) {
        const remaining = Math.max(0, tickMs - elapsed);
        titleRef.current.textContent =
          remaining >= 1000
            ? `Next tick in ${(remaining / 1000).toFixed(1)}s`
            : `Next tick in ${remaining}ms`;
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{
        transform: "rotate(-90deg)",
        flexShrink: 0,
        opacity: 0.85,
        cursor: "default",
      }}
      aria-label="Tick progress"
    >
      <title ref={titleRef}>Tick progress</title>
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
      {/* Progress arc */}
      <circle
        ref={arcRef}
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE}
        strokeLinecap="round"
        style={{ color: "var(--accent)" }}
      />
    </svg>
  );
}
