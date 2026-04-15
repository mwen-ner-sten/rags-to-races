"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/state/store";
import { MOMENTUM_TIERS } from "@/data/momentumBonuses";

interface Props {
  /** Optional: jump to Upgrades > Prestige sub-tab when clicked. */
  onActivate?: () => void;
}

/**
 * Compact run-momentum indicator for the HUD. Shows the highest-tier milestone
 * achieved this run and progress toward the next one. Hidden when no tiers exist.
 */
export default function MomentumChip({ onActivate }: Props) {
  // Match StatsTooltip's hydration-safe pattern — store hydrates from
  // localStorage post-mount, so render an empty placeholder until then.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration flag
  useEffect(() => { setMounted(true); }, []);

  const activeMomentumTiers = useGameStore((s) => s.activeMomentumTiers);
  const lifetimeRaces = useGameStore((s) => s.lifetimeRaces);
  const fatigue = useGameStore((s) => s.fatigue);
  const repPoints = useGameStore((s) => s.repPoints);

  if (!mounted || MOMENTUM_TIERS.length === 0) return null;

  const activeCount = activeMomentumTiers.length;
  const total = MOMENTUM_TIERS.length;

  // Find the next un-achieved tier and its progress
  const nextTier = MOMENTUM_TIERS.find((t) => !activeMomentumTiers.includes(t.id));
  let nextProgress = 0;
  if (nextTier) {
    const { type, value } = nextTier.condition;
    const current =
      type === "races_gte" ? lifetimeRaces :
      type === "fatigue_gte" ? fatigue :
      type === "rep_gte" ? repPoints :
      0;
    nextProgress = Math.min(1, current / value);
  }

  // Highest active tier name for the label
  const highestActive = [...MOMENTUM_TIERS]
    .reverse()
    .find((t) => activeMomentumTiers.includes(t.id));
  const label = highestActive?.name ?? "Run";

  const Wrapper = onActivate ? "button" : "div";

  return (
    <Wrapper
      onClick={onActivate}
      title={highestActive ? `${highestActive.name} — ${highestActive.description}` : "Run momentum"}
      aria-label={`Run momentum: ${activeCount} of ${total} tiers active`}
      className={onActivate ? "cursor-pointer" : ""}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
        padding: "0.25rem 0.5rem",
        borderRadius: 6,
        background: "var(--panel-bg, rgba(255,255,255,0.04))",
        border: "1px solid var(--panel-border, rgba(255,255,255,0.08))",
        minWidth: 92,
        ...(onActivate ? {} : { cursor: "default" as const }),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%" }}>
        <span style={{ fontSize: ".55rem", letterSpacing: ".15em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          MOMENTUM
        </span>
        <span style={{ fontSize: ".6rem", fontVariantNumeric: "tabular-nums", color: activeCount > 0 ? "var(--accent)" : "var(--text-muted)" }}>
          {activeCount}/{total}
        </span>
      </div>
      <div style={{ fontSize: ".65rem", color: highestActive ? "var(--accent)" : "var(--text-secondary)", lineHeight: 1.1 }}>
        {label}
      </div>
      <div
        aria-hidden
        style={{
          height: 2,
          width: "100%",
          borderRadius: 1,
          background: "var(--panel-border, rgba(255,255,255,0.08))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(nextProgress * 100)}%`,
            background: "var(--accent, #c83e0c)",
            transition: "width .4s ease",
          }}
        />
      </div>
    </Wrapper>
  );
}
