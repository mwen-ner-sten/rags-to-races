"use client";

import { useGameStore } from "@/state/store";
import { MOMENTUM_TIERS } from "@/data/momentumBonuses";

export default function MomentumTracker() {
  const activeMomentumTiers = useGameStore((s) => s.activeMomentumTiers);
  const lifetimeRaces = useGameStore((s) => s.lifetimeRaces);
  const fatigue = useGameStore((s) => s.fatigue);
  const repPoints = useGameStore((s) => s.repPoints);

  if (MOMENTUM_TIERS.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3
        style={{ color: "var(--text-heading)" }}
        className="text-sm font-semibold uppercase tracking-widest"
      >
        Run Momentum
      </h3>
      <div
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
        }}
        className="rounded-lg border p-3"
      >
        <div className="flex flex-col gap-2">
          {MOMENTUM_TIERS.map((tier) => {
            const isActive = activeMomentumTiers.includes(tier.id);
            const progress = getMomentumProgress(
              tier.condition.type,
              tier.condition.value,
              lifetimeRaces,
              fatigue,
              repPoints,
            );
            const progressPct = Math.min(100, Math.round(progress * 100));

            return (
              <div key={tier.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      color: isActive
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    }}
                    className="text-xs font-semibold"
                  >
                    {isActive ? "\u2713 " : ""}
                    {tier.name}
                  </span>
                  <span
                    style={{
                      color: isActive
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    }}
                    className="text-xs"
                  >
                    {tier.description}
                  </span>
                </div>
                {!isActive && (
                  <div
                    className="h-1 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--panel-border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPct}%`,
                        background: "var(--accent)",
                        opacity: 0.6,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getMomentumProgress(
  type: string,
  target: number,
  lifetimeRaces: number,
  fatigue: number,
  repPoints: number,
): number {
  let current = 0;
  switch (type) {
    case "races_gte":
      current = lifetimeRaces;
      break;
    case "fatigue_gte":
      current = fatigue;
      break;
    case "rep_gte":
      current = repPoints;
      break;
    default:
      return 0;
  }
  return Math.min(1, current / target);
}
