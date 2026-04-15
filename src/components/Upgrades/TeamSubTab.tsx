"use client";

import { useGameStore } from "@/state/store";
import {
  TEAM_UPGRADE_DEFINITIONS,
  TEAM_CATEGORIES,
  TEAM_CATEGORY_LABELS,
  teamUpgradeCost,
  type TeamUpgradeCategory,
} from "@/data/teamUpgrades";

export default function TeamSubTab() {
  const teamPoints = useGameStore((s) => s.teamPoints);
  const teamUpgradeLevels = useGameStore((s) => s.teamUpgradeLevels);
  const purchaseTeamUpgrade = useGameStore((s) => s.purchaseTeamUpgrade);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Team Upgrades
        </h2>
        <span
          style={{ color: "var(--accent)" }}
          className="font-mono text-sm font-bold"
        >
          {teamPoints} TP
        </span>
      </div>

      {TEAM_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          currency={teamPoints}
          levels={teamUpgradeLevels}
          onPurchase={purchaseTeamUpgrade}
        />
      ))}
    </div>
  );
}

function CategorySection({
  category,
  currency,
  levels,
  onPurchase,
}: {
  category: TeamUpgradeCategory;
  currency: number;
  levels: Record<string, number>;
  onPurchase: (id: string) => void;
}) {
  const upgrades = TEAM_UPGRADE_DEFINITIONS.filter(
    (u) => u.category === category,
  );

  return (
    <div>
      <h3
        style={{ color: "var(--text-dim)" }}
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
      >
        {TEAM_CATEGORY_LABELS[category]}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {upgrades.map((def) => {
          const level = levels[def.id] ?? 0;
          const maxed = level >= def.maxLevel;
          const cost = maxed ? 0 : teamUpgradeCost(def, level + 1);
          const canAfford = currency >= cost;
          const currentEffect = def.effect.valuePerLevel * level;
          const nextEffect = maxed
            ? currentEffect
            : def.effect.valuePerLevel * (level + 1);

          return (
            <div
              key={def.id}
              style={{
                background: "var(--panel-bg)",
                borderColor: maxed
                  ? "var(--accent-border)"
                  : "var(--panel-border)",
              }}
              className="rounded-lg border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    style={{ color: "var(--text-heading)" }}
                    className="text-sm font-semibold"
                  >
                    {def.name}
                  </div>
                  <div
                    style={{ color: "var(--text-dim)" }}
                    className="text-xs"
                  >
                    {def.description}
                  </div>
                </div>
                <span
                  style={{
                    color: maxed ? "var(--accent)" : "var(--text-dim)",
                  }}
                  className="whitespace-nowrap font-mono text-xs"
                >
                  {level}/{def.maxLevel}
                </span>
              </div>

              {level > 0 && (
                <div
                  style={{ color: "var(--accent)" }}
                  className="mt-1 font-mono text-xs"
                >
                  Current: {formatEffect(def.effect.type, currentEffect)}
                  {!maxed && (
                    <span style={{ color: "var(--text-dim)" }}>
                      {" \u2192 "}
                      {formatEffect(def.effect.type, nextEffect)}
                    </span>
                  )}
                </div>
              )}

              {!maxed && (
                <button
                  onClick={() => onPurchase(def.id)}
                  disabled={!canAfford}
                  style={{
                    background: canAfford ? "var(--accent)" : "transparent",
                    color: canAfford
                      ? "var(--panel-bg)"
                      : "var(--text-dim)",
                    borderColor: "var(--panel-border)",
                  }}
                  className="mt-2 w-full rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cost} TP
                </button>
              )}
              {maxed && (
                <div
                  style={{ color: "var(--accent)" }}
                  className="mt-2 text-center text-xs font-semibold"
                >
                  MAXED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatEffect(type: string, value: number): string {
  switch (type) {
    case "lp_multiplier":
    case "momentum_threshold_reduction":
    case "crew_xp_multiplier":
    case "crew_xp_retention":
    case "enhancement_cost_reduction":
    case "gear_drop_rate":
    case "forge_token_rate":
    case "base_race_performance":
    case "starting_rep_multiplier":
      return `+${Math.round(value * 100)}%`;
    case "quick_start_bonus":
      return `$${value}`;
    case "keep_legacy_count":
    case "workshop_slot":
    case "active_vehicle_slot":
    case "crew_slot":
    case "starting_materials":
    case "talent_tier_unlock":
      return `${value}`;
    case "bonus_attr_points":
      return `${value} pts`;
    case "fatigue_cap_reduction":
      return `-${value}`;
    case "unlock_t6_parts":
    case "crew_second_spec":
      return value >= 1 ? "Unlocked" : "Locked";
    default:
      return `${value}`;
  }
}
