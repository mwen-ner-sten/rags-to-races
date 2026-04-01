"use client";

import { useGameStore } from "@/state/store";
import { calculateLegacyPoints, applyMomentumLpBonus, deriveHighestCircuitTier, type RunStats } from "@/engine/prestige";
import { formatNumber } from "@/utils/format";
import { MOMENTUM_TIERS } from "@/data/momentumBonuses";

export default function PrestigeConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const lifetimeRaces = useGameStore((s) => s.lifetimeRaces);
  const fatigue = useGameStore((s) => s.fatigue);
  const repPoints = useGameStore((s) => s.repPoints);
  const unlockedCircuitIds = useGameStore((s) => s.unlockedCircuitIds);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const activeMomentumTiers = useGameStore((s) => s.activeMomentumTiers);
  const legacyPoints = useGameStore((s) => s.legacyPoints);
  const prestigeCount = useGameStore((s) => s.prestigeCount);

  const runStats: RunStats = {
    lifetimeScrapBucks,
    lifetimeRaces,
    fatigue,
    repPoints,
    highestCircuitTier: deriveHighestCircuitTier(unlockedCircuitIds),
    workshopUpgradesBought: Object.values(workshopLevels).reduce((a, b) => a + b, 0),
  };

  const baseLp = calculateLegacyPoints(runStats);
  const finalLp = applyMomentumLpBonus(baseLp, activeMomentumTiers);
  const lpBonusPct = baseLp > 0 ? Math.round(((finalLp - baseLp) / baseLp) * 100) : 0;

  const activeBonuses = MOMENTUM_TIERS.filter((t) =>
    activeMomentumTiers.includes(t.id),
  );

  return (
    <div
      style={{ background: "var(--panel-bg)", borderColor: "var(--accent-border)" }}
      className="rounded-lg border p-4"
    >
      <h3
        style={{ color: "var(--text-white)" }}
        className="mb-3 text-base font-bold"
      >
        Scrap Reset (Prestige {prestigeCount + 1})
      </h3>

      {/* LP Earned */}
      <div
        style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
        className="mb-3 rounded-lg border p-3"
      >
        <div className="flex items-baseline justify-between">
          <span style={{ color: "var(--text-secondary)" }} className="text-sm">
            Legacy Points earned:
          </span>
          <span style={{ color: "var(--accent)" }} className="font-mono text-lg font-bold">
            +{finalLp} LP
          </span>
        </div>
        {lpBonusPct > 0 && (
          <div style={{ color: "var(--accent)" }} className="text-xs mt-1">
            ({baseLp} base + {lpBonusPct}% momentum bonus)
          </div>
        )}
        <div style={{ color: "var(--text-muted)" }} className="text-xs mt-1">
          Total after prestige: {formatNumber(legacyPoints + finalLp)} LP
        </div>
      </div>

      {/* Active Momentum */}
      {activeBonuses.length > 0 && (
        <div className="mb-3">
          <div style={{ color: "var(--text-muted)" }} className="text-xs font-semibold mb-1">
            Active Momentum:
          </div>
          {activeBonuses.map((b) => (
            <div
              key={b.id}
              style={{ color: "var(--accent)" }}
              className="text-xs"
            >
              {b.name}: {b.description}
            </div>
          ))}
        </div>
      )}

      {/* What resets */}
      <div className="mb-3">
        <div style={{ color: "var(--text-muted)" }} className="text-xs font-semibold mb-1">
          Will reset:
        </div>
        <div style={{ color: "var(--text-secondary)" }} className="text-xs">
          Scrap, Rep, Inventory, Garage, Workshop, Fatigue, Unlocks
        </div>
      </div>

      {/* What persists */}
      <div className="mb-4">
        <div style={{ color: "var(--text-muted)" }} className="text-xs font-semibold mb-1">
          Will keep:
        </div>
        <div style={{ color: "var(--text-secondary)" }} className="text-xs">
          Legacy Points & Upgrades, Gear, Materials, Forge Tokens, Talent Nodes, Challenges
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
          className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          Prestige (+{finalLp} LP)
        </button>
        <button
          onClick={onCancel}
          style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
          className="rounded-lg border px-4 py-2 text-sm transition-colors hover:opacity-80"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
