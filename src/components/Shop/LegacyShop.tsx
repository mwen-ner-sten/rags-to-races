"use client";

import { useGameStore } from "@/state/store";
import {
  LEGACY_UPGRADE_DEFINITIONS,
  LEGACY_CATEGORIES,
  LEGACY_CATEGORY_LABELS,
  legacyUpgradeCost,
  legacyEffectTotal,
  type LegacyUpgradeCategory,
} from "@/data/legacyUpgrades";

export default function LegacyShop() {
  const legacyPoints = useGameStore((s) => s.legacyPoints);
  const legacyUpgradeLevels = useGameStore((s) => s.legacyUpgradeLevels);
  const purchaseLegacyUpgrade = useGameStore((s) => s.purchaseLegacyUpgrade);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Legacy Upgrades
        </h2>
        <span
          style={{ color: "var(--accent)" }}
          className="font-mono text-sm font-bold"
        >
          {legacyPoints} LP
        </span>
      </div>

      {LEGACY_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          legacyPoints={legacyPoints}
          levels={legacyUpgradeLevels}
          onPurchase={purchaseLegacyUpgrade}
        />
      ))}
    </div>
  );
}

function CategorySection({
  category,
  legacyPoints,
  levels,
  onPurchase,
}: {
  category: LegacyUpgradeCategory;
  legacyPoints: number;
  levels: Record<string, number>;
  onPurchase: (id: string) => void;
}) {
  const upgrades = LEGACY_UPGRADE_DEFINITIONS.filter(
    (u) => u.category === category,
  );

  return (
    <div>
      <h3
        style={{ color: "var(--text-muted)" }}
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
      >
        {LEGACY_CATEGORY_LABELS[category]}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {upgrades.map((def) => {
          const level = levels[def.id] ?? 0;
          const maxed = level >= def.maxLevel;
          const cost = maxed ? 0 : legacyUpgradeCost(def, level + 1);
          const canAfford = legacyPoints >= cost;
          const currentEffect = legacyEffectTotal(def, level);
          const nextEffect = maxed ? currentEffect : legacyEffectTotal(def, level + 1);

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
                    style={{ color: "var(--text-white)" }}
                    className="text-sm font-semibold"
                  >
                    {def.name}
                  </div>
                  <div
                    style={{ color: "var(--text-secondary)" }}
                    className="text-xs"
                  >
                    {def.description}
                  </div>
                </div>
                <span
                  style={{ color: maxed ? "var(--accent)" : "var(--text-muted)" }}
                  className="whitespace-nowrap text-xs font-mono"
                >
                  {level}/{def.maxLevel}
                </span>
              </div>

              {level > 0 && (
                <div
                  style={{ color: "var(--accent)" }}
                  className="mt-1 text-xs font-mono"
                >
                  Current: {formatEffect(def.effect.type, currentEffect)}
                  {!maxed && (
                    <span style={{ color: "var(--text-muted)" }}>
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
                      ? "var(--btn-primary-text)"
                      : "var(--text-muted)",
                    borderColor: "var(--btn-border)",
                  }}
                  className="mt-2 w-full rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cost} LP
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
    case "scrap_multiplier":
    case "rep_multiplier":
      return `+${Math.round(value * 100)}%`;
    case "luck_bonus":
    case "decompose_yield_mult":
    case "wear_reduction":
      return `+${Math.round(value * 100)}%`;
    case "starting_scrap":
      return `$${value}`;
    case "starting_scav_clicks":
      return `${value} clicks`;
    case "fatigue_offset":
      return `${value} races`;
    case "keep_workshop_count":
      return `${value} upgrades`;
    case "starting_location_tier":
      return `tier ${value}`;
    default:
      return `${value}`;
  }
}
