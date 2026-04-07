"use client";

import { useGameStore } from "@/state/store";
import {
  ATTRIBUTE_DEFINITIONS,
  getTotalAttributePoints,
} from "@/data/racerAttributes";

const MAX_ATTRIBUTE_VALUE = 20;

export default function AttributesSubTab() {
  const racerAttributes = useGameStore((s) => s.racerAttributes);
  const allocateAttribute = useGameStore((s) => s.allocateAttribute);
  const teamUpgradeLevels = useGameStore((s) => s.teamUpgradeLevels);

  // Available points = team upgrade "team_attr_points" * 2 per level
  const maxPoints = (teamUpgradeLevels["team_attr_points"] ?? 0) * 2;
  const usedPoints = getTotalAttributePoints(racerAttributes);
  const availablePoints = maxPoints - usedPoints;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Racer Attributes
        </h2>
        <span
          style={{
            color: availablePoints > 0 ? "var(--success)" : "var(--text-dim)",
          }}
          className="font-mono text-sm font-bold"
        >
          {availablePoints} / {maxPoints} pts
        </span>
      </div>

      {maxPoints === 0 && (
        <div
          className="rounded-lg border p-4 text-center text-xs"
          style={{
            background: "var(--accent-bg)",
            borderColor: "var(--accent-border)",
            color: "var(--text-dim)",
          }}
        >
          Purchase the <strong style={{ color: "var(--text-heading)" }}>Attribute Points</strong> team
          upgrade to unlock attribute allocation.
        </div>
      )}

      <div className="grid gap-3">
        {ATTRIBUTE_DEFINITIONS.map((def) => {
          const value = racerAttributes[def.id];
          const canIncrement = availablePoints > 0 && value < MAX_ATTRIBUTE_VALUE;
          const canDecrement = value > 0;

          return (
            <div
              key={def.id}
              style={{
                background: "var(--panel-bg)",
                borderColor: "var(--panel-border)",
              }}
              className="rounded-lg border p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{def.icon}</span>
                  <div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-heading)" }}
                    >
                      {def.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => allocateAttribute(def.id, -1)}
                    disabled={!canDecrement}
                    style={{
                      borderColor: "var(--panel-border)",
                      color: canDecrement
                        ? "var(--danger)"
                        : "var(--text-dim)",
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded border text-sm font-bold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    -
                  </button>
                  <span
                    style={{ color: "var(--accent)" }}
                    className="w-8 text-center font-mono text-sm font-bold"
                  >
                    {value}
                  </span>
                  <button
                    onClick={() => allocateAttribute(def.id, 1)}
                    disabled={!canIncrement}
                    style={{
                      borderColor: "var(--panel-border)",
                      color: canIncrement
                        ? "var(--success)"
                        : "var(--text-dim)",
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded border text-sm font-bold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>

              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {def.description}
              </p>

              {value > 0 && (
                <div
                  className="mt-1 font-mono text-xs"
                  style={{ color: "var(--accent)" }}
                >
                  {formatAttributeBonus(def, value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatAttributeBonus(
  def: (typeof ATTRIBUTE_DEFINITIONS)[number],
  value: number,
): string {
  if (def.ratingPerPoint > 0) {
    return `+${value * def.ratingPerPoint} ${capitalize(def.ratingType)} Rating`;
  }
  if (def.flatBonuses && def.flatBonuses.length > 0) {
    return def.flatBonuses
      .map((b) => {
        const total = b.valuePerPoint * value;
        switch (b.type) {
          case "rep_per_race":
            return `+${total} Rep/race`;
          case "unlock_cost_reduction":
            return `-$${total} unlock cost`;
          case "luck":
            return `+${total.toFixed(1)} luck`;
          case "forge_token_chance":
            return `+${(total * 100).toFixed(1)}% forge chance`;
          default:
            return `+${total}`;
        }
      })
      .join(", ");
  }
  return "";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
