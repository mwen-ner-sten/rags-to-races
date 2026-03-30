"use client";

import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";
import { calculatePrestigeBonus } from "@/engine/prestige";

export default function ShopPanel() {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const prestigeBonus = useGameStore((s) => s.prestigeBonus);
  const garage = useGameStore((s) => s.garage);
  const inventory = useGameStore((s) => s.inventory);
  const sellAllJunk = useGameStore((s) => s.sellAllJunk);
  const prestige = useGameStore((s) => s.prestige);

  const nextPrestigeBonus = calculatePrestigeBonus(prestigeCount + 1);

  const canPrestige = garage.length >= 1 && repPoints >= 10 && lifetimeScrapBucks >= 100;

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Stats */}
      <div className="flex flex-col gap-4">
        <h2 style={{ color: "var(--text-heading)" }} className="text-sm font-semibold uppercase tracking-widest">
          Stats
        </h2>
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatRow label="Scrap Bucks" value={`$${formatNumber(scrapBucks)}`} />
            <StatRow label="Rep Points" value={formatNumber(repPoints)} />
            <StatRow label="Lifetime Scrap" value={`$${formatNumber(lifetimeScrapBucks)}`} />
            <StatRow label="Vehicles Built" value={String(garage.length)} />
            <StatRow label="Parts in Inventory" value={String(inventory.length)} />
            <StatRow label="Prestige Count" value={String(prestigeCount)} />
          </div>
        </div>

        {/* Current bonuses */}
        {prestigeCount > 0 && (
          <>
            <h2 style={{ color: "var(--text-heading)" }} className="text-sm font-semibold uppercase tracking-widest">
              Prestige Bonuses
            </h2>
            <div style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }} className="rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <StatRow label="Scrap Multiplier" value={`\u00d7${prestigeBonus.scrapMultiplier.toFixed(1)}`} accent />
                <StatRow label="Luck Bonus" value={`+${(prestigeBonus.luckBonus * 100).toFixed(0)}%`} accent />
                <StatRow label="Rep Multiplier" value={`\u00d7${prestigeBonus.repMultiplier.toFixed(1)}`} accent />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4">
        <h2 style={{ color: "var(--text-heading)" }} className="text-sm font-semibold uppercase tracking-widest">
          Actions
        </h2>

        {/* Quick sell */}
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="rounded-lg border p-4">
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">Quick Sell</div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            {inventory.length} parts in inventory. Sell them all for instant Scrap Bucks.
          </p>
          <button
            onClick={sellAllJunk}
            disabled={inventory.length === 0}
            style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
            className="rounded-lg border px-4 py-2 text-sm transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sell All Parts
          </button>
        </div>

        {/* Prestige */}
        <div
          style={{
            background: canPrestige ? "var(--accent-bg)" : "var(--panel-bg)",
            borderColor: canPrestige ? "var(--accent-border)" : "var(--panel-border)",
          }}
          className="rounded-lg border p-4"
        >
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">
            &#128260; Scrap Reset (Prestige {prestigeCount + 1})
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            Reset everything but keep permanent bonuses. Each prestige makes the early game faster
            and unlocks deeper mechanics.
          </p>
          {canPrestige ? (
            <div style={{ color: "var(--text-secondary)" }} className="mb-3 text-xs">
              <p style={{ color: "var(--accent)" }} className="font-semibold mb-1">You will gain:</p>
              <p>Scrap Multiplier: \u00d7{nextPrestigeBonus.scrapMultiplier.toFixed(1)}</p>
              <p>Luck Bonus: +{(nextPrestigeBonus.luckBonus * 100).toFixed(0)}%</p>
              <p>Rep Multiplier: \u00d7{nextPrestigeBonus.repMultiplier.toFixed(1)}</p>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)" }} className="mb-3 text-xs">
              Requirements: 1 vehicle built, 10 Rep, $100 lifetime Scrap Bucks
            </p>
          )}
          <button
            onClick={() => {
              if (confirm("Are you sure? This resets your progress but keeps prestige bonuses.")) {
                prestige();
              }
            }}
            disabled={!canPrestige}
            style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Scrap Reset
          </button>
        </div>
      </div>
    </div>

    </>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: accent ? "var(--accent)" : "var(--text-white)" }} className="font-mono font-semibold">{value}</span>
    </>
  );
}
