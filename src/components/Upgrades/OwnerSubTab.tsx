"use client";

import { useGameStore } from "@/state/store";
import {
  OWNER_UPGRADE_DEFINITIONS,
  OWNER_CATEGORIES,
  OWNER_CATEGORY_LABELS,
  ownerUpgradeCost,
  type OwnerUpgradeCategory,
} from "@/data/ownerUpgrades";

export default function OwnerSubTab() {
  const ownerPoints = useGameStore((s) => s.ownerPoints);
  const ownerUpgradeLevels = useGameStore((s) => s.ownerUpgradeLevels);
  const purchaseOwnerUpgrade = useGameStore((s) => s.purchaseOwnerUpgrade);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Owner Upgrades
        </h2>
        <span
          style={{ color: "var(--accent)" }}
          className="font-mono text-sm font-bold"
        >
          {ownerPoints} OP
        </span>
      </div>

      {OWNER_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          currency={ownerPoints}
          levels={ownerUpgradeLevels}
          onPurchase={purchaseOwnerUpgrade}
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
  category: OwnerUpgradeCategory;
  currency: number;
  levels: Record<string, number>;
  onPurchase: (id: string) => void;
}) {
  const upgrades = OWNER_UPGRADE_DEFINITIONS.filter(
    (u) => u.category === category,
  );

  return (
    <div>
      <h3
        style={{ color: "var(--text-dim)" }}
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
      >
        {OWNER_CATEGORY_LABELS[category]}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {upgrades.map((def) => {
          const level = levels[def.id] ?? 0;
          const maxed = level >= def.maxLevel;
          const cost = maxed ? 0 : ownerUpgradeCost(def, level + 1);
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
                  {cost} OP
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
    case "scrap_mult_squared":
    case "rep_mult_squared":
    case "lp_triple":
    case "auto_all":
    case "unlock_adv_circuits":
    case "unlock_t9_vehicles":
    case "unlock_research":
    case "infinite_garage":
    case "material_conversion":
    case "crew_starting_level":
    case "legacy_starting_level":
      return value >= 1 ? "Active" : "Inactive";
    case "keep_team_upgrades":
    case "talent_cost_reduction":
    case "fatigue_rate_reduction":
    case "unlock_cost_reduction":
      return `${Math.round(value * 100)}%`;
    case "starting_scrap":
      return `$${value}`;
    default:
      return `${value}`;
  }
}
