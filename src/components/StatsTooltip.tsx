"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/state/store";
import { computeTickSpeedMs, getRaceTicksNeeded } from "@/engine/tick";
import { MATERIAL_DEFINITIONS } from "@/data/materials";
import type { MaterialType } from "@/data/materials";
import TickRing from "@/components/TickRing";

function StatsTooltipContent({ anchorRect }: { anchorRect: DOMRect }) {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const fatigue = useGameStore((s) => s.fatigue);
  const lifetimeRaces = useGameStore((s) => s.lifetimeRaces);
  const legacyPoints = useGameStore((s) => s.legacyPoints);
  const forgeTokens = useGameStore((s) => s.forgeTokens);
  const materials = useGameStore((s) => s.materials);
  const winStreak = useGameStore((s) => s.winStreak);
  const bestWinStreak = useGameStore((s) => s.bestWinStreak);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const prestigeBonus = useGameStore((s) => s.prestigeBonus);
  const activeMomentumTiers = useGameStore((s) => s.activeMomentumTiers);
  const raceTickProgress = useGameStore((s) => s.raceTickProgress);
  const autoRaceUnlocked = useGameStore((s) => s.autoRaceUnlocked);

  // Live tick countdown via interval + ref (no re-renders)
  const tickRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const tickMs = computeTickSpeedMs(state);
      const elapsed = Date.now() - state.lastActiveTimestamp;
      const remaining = Math.max(0, tickMs - elapsed);
      if (tickRef.current) {
        tickRef.current.textContent =
          remaining >= 1000
            ? `${(remaining / 1000).toFixed(1)}s`
            : `${remaining}ms`;
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const state = useGameStore.getState();
  const tickSpeedMs = computeTickSpeedMs(state);
  const raceTicksNeeded = getRaceTicksNeeded(state);

  const fatigueColor =
    fatigue >= 75 ? "var(--danger)" :
    fatigue >= 50 ? "var(--warning)" :
    fatigue >= 25 ? "var(--accent-secondary)" :
    "var(--text-secondary)";

  // Position: below the anchor, aligned to right edge
  const top = anchorRect.bottom + 8;
  const right = window.innerWidth - anchorRect.right;

  const hasMaterials = MATERIAL_DEFINITIONS.some((m) => materials[m.id as MaterialType] > 0);

  return createPortal(
    <div
      style={{
        position: "fixed",
        top,
        right: Math.max(8, right),
        zIndex: 9999,
        background: "var(--panel-bg, #181008)",
        border: "1px solid var(--panel-border, #3a2510)",
        borderRadius: 6,
        padding: "0.75rem 1rem",
        minWidth: 240,
        maxWidth: 320,
        boxShadow: "0 8px 32px rgba(0,0,0,.6)",
        color: "var(--text-primary, #d4b896)",
        fontSize: "0.72rem",
        lineHeight: 1.6,
        fontFamily: "inherit",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Tick Info */}
      <Section label="Tick">
        <Row label="Next tick in" value={<span ref={tickRef}>—</span>} />
        <Row label="Tick speed" value={`${(tickSpeedMs / 1000).toFixed(1)}s`} />
        {autoRaceUnlocked && (
          <Row label="Race progress" value={`${raceTickProgress} / ${raceTicksNeeded} ticks`} />
        )}
      </Section>

      {/* Currencies */}
      <Section label="Currencies">
        <Row label="Scrap Bucks" value={`$${scrapBucks.toLocaleString()}`} color="var(--success, #6aaa3a)" />
        <Row label="Lifetime Scrap" value={`$${lifetimeScrapBucks.toLocaleString()}`} dim />
        <Row label="Rep Points" value={repPoints.toLocaleString()} color="var(--info, #6aaa3a)" />
        {legacyPoints > 0 && (
          <Row label="Legacy Points" value={legacyPoints.toLocaleString()} color="#a78bfa" />
        )}
        {forgeTokens > 0 && (
          <Row label="Forge Tokens" value={forgeTokens.toLocaleString()} color="var(--accent-secondary, #c4872a)" />
        )}
      </Section>

      {/* Fatigue & Racing */}
      <Section label="Racing">
        <Row label="Fatigue" value={`${fatigue}%`} color={fatigueColor} />
        <Row label="Lifetime races" value={lifetimeRaces.toLocaleString()} dim />
        <Row label="Win streak" value={String(winStreak)} />
        {bestWinStreak > 0 && (
          <Row label="Best streak" value={String(bestWinStreak)} dim />
        )}
      </Section>

      {/* Prestige */}
      {prestigeCount > 0 && (
        <Section label="Prestige">
          <Row label="Prestige level" value={String(prestigeCount)} color="var(--accent, #c83e0c)" />
          <Row label="Scrap multiplier" value={`${prestigeBonus.scrapMultiplier.toFixed(2)}x`} />
          <Row label="Rep multiplier" value={`${prestigeBonus.repMultiplier.toFixed(2)}x`} />
          {activeMomentumTiers.length > 0 && (
            <Row label="Momentum tiers" value={`${activeMomentumTiers.length} active`} color="var(--accent-secondary, #c4872a)" />
          )}
        </Section>
      )}

      {/* Materials */}
      {hasMaterials && (
        <Section label="Materials">
          {MATERIAL_DEFINITIONS.map((m) => {
            const count = materials[m.id as MaterialType];
            if (count <= 0) return null;
            return <Row key={m.id} label={m.name} value={count.toLocaleString()} />;
          })}
        </Section>
      )}
    </div>,
    document.body,
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div
        style={{
          fontSize: "0.6rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--accent, #c83e0c)",
          borderBottom: "1px solid var(--divider, rgba(255,255,255,.08))",
          paddingBottom: "0.2rem",
          marginBottom: "0.25rem",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  color,
  dim,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  dim?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ color: dim ? "var(--text-muted, #7a6040)" : "var(--text-secondary, #9a8570)" }}>
        {label}
      </span>
      <span
        style={{
          fontWeight: 600,
          fontFamily: "monospace",
          color: dim ? "var(--text-muted, #7a6040)" : color ?? "var(--text-primary, #d4b896)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function StatsTooltip() {
  const [hovered, setHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const handleEnter = () => {
    if (wrapperRef.current) {
      setAnchorRect(wrapperRef.current.getBoundingClientRect());
    }
    setHovered(true);
  };

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.5rem",
        margin: "-0.5rem",
        cursor: "help",
        position: "relative",
      }}
    >
      <TickRing suppressTitle />
      {hovered && anchorRect && <StatsTooltipContent anchorRect={anchorRect} />}
    </div>
  );
}
