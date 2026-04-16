"use client";

import { useRef, useEffect } from "react";
import { useGameStore } from "@/state/store";
import { computeTickSpeedMs, getRaceTicksNeeded } from "@/engine/tick";
import { MATERIAL_DEFINITIONS } from "@/data/materials";
import type { MaterialType } from "@/data/materials";
import { Section, Row, TooltipPanel, HoverTooltipWrapper } from "@/components/TooltipPrimitives";
import FatigueRing from "@/components/FatigueRing";
import MomentumChip from "@/components/Shop/MomentumChip";

function StatsTooltipContent({ anchorRect }: { anchorRect: DOMRect }) {
  // Currencies are now shown via per-currency hover tooltips (see CurrencyBar).
  // This tooltip covers tick/race/prestige/material details only.
  const fatigue = useGameStore((s) => s.fatigue);
  const lifetimeRaces = useGameStore((s) => s.lifetimeRaces);
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

  const hasMaterials = MATERIAL_DEFINITIONS.some((m) => materials[m.id as MaterialType] > 0);

  return (
    <TooltipPanel anchorRect={anchorRect}>
      {/* Tick Info */}
      <Section label="Tick">
        <Row label="Next tick in" value={<span ref={tickRef}>—</span>} />
        <Row label="Tick speed" value={`${(tickSpeedMs / 1000).toFixed(1)}s`} />
        {autoRaceUnlocked && (
          <Row label="Race progress" value={`${raceTickProgress} / ${raceTicksNeeded} ticks`} />
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
    </TooltipPanel>
  );
}

export default function StatsTooltip() {
  return (
    <HoverTooltipWrapper
      renderTooltip={(anchorRect) => <StatsTooltipContent anchorRect={anchorRect} />}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem", margin: "-0.5rem" }}>
        <FatigueRing />
        <MomentumChip />
      </div>
    </HoverTooltipWrapper>
  );
}
