"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RaceEvent } from "@/engine/raceEvents";

// ── Start Sequence (traffic lights) ─────────────────────────────────────

interface StartSequenceProps {
  progress: number;
  eventType: RaceEvent["type"] | null;
  raceDuration: number;
}

export function StartSequence({ progress, eventType, raceDuration }: StartSequenceProps) {
  const [phase, setPhase] = useState<"hidden" | "red" | "yellow" | "green" | "go">("hidden");
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Derive whether the start sequence should be active from props
  const isStartActive = eventType === "start" && progress <= 0.15;

  useEffect(() => {
    // Clean up previous timers
    for (const t of timerRefs.current) clearTimeout(t);
    timerRefs.current = [];

    if (!isStartActive) {
      // Use a timeout to avoid sync setState in effect
      const t = setTimeout(() => setPhase("hidden"), 0);
      timerRefs.current = [t];
      return () => clearTimeout(t);
    }

    const stepMs = Math.min(400, raceDuration * 0.08);
    const t0 = setTimeout(() => setPhase("red"), 0);
    const t1 = setTimeout(() => setPhase("yellow"), stepMs);
    const t2 = setTimeout(() => setPhase("green"), stepMs * 2);
    const t3 = setTimeout(() => setPhase("go"), stepMs * 2.5);
    const t4 = setTimeout(() => setPhase("hidden"), stepMs * 3.5);

    timerRefs.current = [t0, t1, t2, t3, t4];
    return () => { for (const t of timerRefs.current) clearTimeout(t); };
  }, [isStartActive, raceDuration]);

  if (phase === "hidden") return null;

  const isGo = phase === "go";

  return (
    <g
      style={{
        opacity: isGo ? 0 : 1,
        transition: "opacity 300ms ease-out",
      }}
    >
      {/* Light housing */}
      <rect
        x={188} y={72} width={24} height={56} rx={4}
        fill="#1a1a1a" stroke="#333" strokeWidth={1}
      />

      {/* Red light */}
      <circle
        cx={200} cy={82} r={6}
        fill={phase === "red" || phase === "yellow" ? "#ff2222" : "#331111"}
        opacity={phase === "red" || phase === "yellow" ? 1 : 0.2}
        style={{ transition: "fill 150ms, opacity 150ms" }}
      />

      {/* Yellow light */}
      <circle
        cx={200} cy={97} r={6}
        fill={phase === "yellow" ? "#ffaa00" : "#332200"}
        opacity={phase === "yellow" ? 1 : 0.2}
        style={{ transition: "fill 150ms, opacity 150ms" }}
      />

      {/* Green light */}
      <circle
        cx={200} cy={112} r={6}
        fill={phase === "green" || phase === "go" ? "#00dd00" : "#003300"}
        opacity={phase === "green" || phase === "go" ? 1 : 0.2}
        style={{ transition: "fill 150ms, opacity 150ms" }}
      />

      {/* Green glow */}
      {(phase === "green" || phase === "go") && (
        <circle cx={200} cy={112} r={12} fill="#00dd00" opacity={0.15} />
      )}
    </g>
  );
}

// ── Finish Overlay (checkered flag + result) ────────────────────────────

interface FinishOverlayProps {
  eventType: RaceEvent["type"] | null;
  playerPosition: number;
}

export function FinishOverlay({ eventType, playerPosition }: FinishOverlayProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive finish state from props
  const isFinish = eventType === "finish";
  const prevFinishRef = useRef(false);

  useEffect(() => {
    const wasFinish = prevFinishRef.current;
    prevFinishRef.current = isFinish;

    if (isFinish && !wasFinish) {
      // Became finish — show overlay via timeout to avoid sync setState
      if (timerRef.current) clearTimeout(timerRef.current);
      const t1 = setTimeout(() => setVisible(true), 0);
      const t2 = setTimeout(() => setVisible(false), 2500);
      timerRef.current = t2;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    if (!isFinish && wasFinish) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }
  }, [isFinish]);

  const isWin = useMemo(() => playerPosition === 1, [playerPosition]);

  if (!visible) return null;

  return (
    <g>
      {/* Checkered flag pattern definition */}
      <defs>
        <pattern id="checkerboard" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="3" height="3" fill="#ffffff" />
          <rect x="3" y="0" width="3" height="3" fill="#111111" />
          <rect x="0" y="3" width="3" height="3" fill="#111111" />
          <rect x="3" y="3" width="3" height="3" fill="#ffffff" />
        </pattern>
      </defs>

      {/* Checkered flag near finish line */}
      <g className="animate-flag-wave" style={{ transformOrigin: "120px 30px" }}>
        {/* Flag pole */}
        <line x1={118} y1={15} x2={118} y2={38} stroke="#888" strokeWidth={1.5} />
        {/* Flag */}
        <rect
          x={119} y={15} width={18} height={12} rx={0.5}
          fill="url(#checkerboard)"
          opacity={0.9}
        />
      </g>

      {/* Result text */}
      <text
        x={200}
        y={100}
        textAnchor="middle"
        fontSize={isWin ? "22" : "16"}
        fontWeight="bold"
        fontFamily="var(--font-mono)"
        fill={isWin ? "var(--success)" : "var(--text-heading)"}
        className="animate-number-pop"
        opacity={0.9}
      >
        {isWin ? "P1!" : `P${playerPosition}`}
      </text>

      {/* Win glow */}
      {isWin && (
        <circle cx={200} cy={95} r={30} fill="var(--success)" opacity={0.06}>
          <animate attributeName="r" from="20" to="40" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.08" to="0" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}
