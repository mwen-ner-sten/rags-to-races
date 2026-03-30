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

  // Prestige requires at least 1 vehicle built and some rep
  const canPrestige = garage.length >= 1 && repPoints >= 10 && lifetimeScrapBucks >= 100;

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Stats */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Stats
        </h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
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
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Prestige Bonuses
            </h2>
            <div className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <StatRow label="Scrap Multiplier" value={`×${prestigeBonus.scrapMultiplier.toFixed(1)}`} color="text-amber-400" />
                <StatRow label="Luck Bonus" value={`+${(prestigeBonus.luckBonus * 100).toFixed(0)}%`} color="text-amber-400" />
                <StatRow label="Rep Multiplier" value={`×${prestigeBonus.repMultiplier.toFixed(1)}`} color="text-amber-400" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Actions
        </h2>

        {/* Quick sell */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="font-semibold text-white mb-1">Quick Sell</div>
          <p className="text-sm text-zinc-400 mb-3">
            {inventory.length} parts in inventory. Sell them all for instant Scrap Bucks.
          </p>
          <button
            onClick={sellAllJunk}
            disabled={inventory.length === 0}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sell All Parts
          </button>
        </div>

        {/* Prestige */}
        <div className={`rounded-lg border p-4 ${canPrestige ? "border-amber-700 bg-amber-900/10" : "border-zinc-800 bg-zinc-900"}`}>
          <div className="font-semibold text-white mb-1">
            🔄 Scrap Reset (Prestige {prestigeCount + 1})
          </div>
          <p className="text-sm text-zinc-400 mb-3">
            Reset everything but keep permanent bonuses. Each prestige makes the early game faster
            and unlocks deeper mechanics.
          </p>
          {canPrestige ? (
            <div className="mb-3 text-xs text-zinc-400">
              <p className="text-amber-400 font-semibold mb-1">You will gain:</p>
              <p>Scrap Multiplier: ×{nextPrestigeBonus.scrapMultiplier.toFixed(1)}</p>
              <p>Luck Bonus: +{(nextPrestigeBonus.luckBonus * 100).toFixed(0)}%</p>
              <p>Rep Multiplier: ×{nextPrestigeBonus.repMultiplier.toFixed(1)}</p>
            </div>
          ) : (
            <p className="mb-3 text-xs text-zinc-600">
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
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
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
  color = "text-zinc-200",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <>
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{value}</span>
    </>
  );
}
