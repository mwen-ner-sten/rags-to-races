"use client";

import { useGameStore } from "@/state/store";
import {
  TRACK_PERK_DEFINITIONS,
  TRACK_PERK_CATEGORIES,
  TRACK_PERK_CATEGORY_LABELS,
  trackPerkCost,
  type TrackPerkCategory,
} from "@/data/trackPerks";

export default function TrackSubTab() {
  const trackPrestigeTokens = useGameStore((s) => s.trackPrestigeTokens);
  const trackPerkLevels = useGameStore((s) => s.trackPerkLevels);
  const purchaseTrackPerk = useGameStore((s) => s.purchaseTrackPerk);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Track Perks
        </h2>
        <span
          style={{ color: "var(--accent)" }}
          className="font-mono text-sm font-bold"
        >
          {trackPrestigeTokens} PT
        </span>
      </div>

      {TRACK_PERK_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          currency={trackPrestigeTokens}
          levels={trackPerkLevels}
          onPurchase={purchaseTrackPerk}
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
  category: TrackPerkCategory;
  currency: number;
  levels: Record<string, number>;
  onPurchase: (id: string) => void;
}) {
  const perks = TRACK_PERK_DEFINITIONS.filter(
    (u) => u.category === category,
  );

  return (
    <div>
      <h3
        style={{ color: "var(--text-dim)" }}
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
      >
        {TRACK_PERK_CATEGORY_LABELS[category]}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {perks.map((def) => {
          const level = levels[def.id] ?? 0;
          const maxed = level >= def.maxLevel;
          const cost = maxed ? 0 : trackPerkCost(def, level + 1);
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
                  {cost} PT
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
    case "custom_circuits":
    case "night_variants":
    case "endurance_races":
    case "crew_auto_recruit":
    case "eternal_workshop":
      return value >= 1 ? "Active" : "Inactive";
    case "lower_currency_mult":
      return `+${Math.round(value * 100)}%`;
    case "extra_track":
    case "passive_scrap":
      return `${value}`;
    case "tick_speed_reduction":
      return `-${value}s`;
    default:
      return `${value}`;
  }
}
