"use client";

import { useGameStore } from "@/state/store";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { getPartById, CONDITION_MULTIPLIERS } from "@/data/parts";
import { formatNumber, capitalize } from "@/utils/format";

const CONDITION_COLORS: Record<string, string> = {
  rusted: "text-red-400",
  worn: "text-orange-400",
  decent: "text-yellow-400",
  good: "text-green-400",
  pristine: "text-cyan-400",
};

export default function ScavengePanel() {
  const inventory = useGameStore((s) => s.inventory);
  const selectedLocationId = useGameStore((s) => s.selectedLocationId);
  const unlockedLocationIds = useGameStore((s) => s.unlockedLocationIds);
  const repPoints = useGameStore((s) => s.repPoints);
  const manualScavenge = useGameStore((s) => s.manualScavenge);
  const sellPart = useGameStore((s) => s.sellPart);
  const sellAllJunk = useGameStore((s) => s.sellAllJunk);
  const setSelectedLocation = useGameStore((s) => s.setSelectedLocation);
  const autoScavengeUnlocked = useGameStore((s) => s.autoScavengeUnlocked);

  const unlockedLocations = LOCATION_DEFINITIONS.filter((l) =>
    unlockedLocationIds.includes(l.id),
  );
  const lockedLocations = LOCATION_DEFINITIONS.filter(
    (l) => !unlockedLocationIds.includes(l.id),
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Location picker */}
      <div className="col-span-1 flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Locations
        </h2>
        {/* Horizontal scroll on mobile, vertical stack on desktop */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
          {unlockedLocations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`shrink-0 rounded-lg border p-3 text-left transition-colors lg:shrink ${
                selectedLocationId === loc.id
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
              }`}
            >
              <div className="font-semibold text-white text-sm">{loc.name}</div>
              <div className="mt-0.5 text-xs text-zinc-400 hidden lg:block">{loc.description}</div>
              <div className="mt-1 text-xs text-zinc-500">
                T{loc.tier} · {loc.maxPartsPerScavenge} parts
              </div>
            </button>
          ))}
        </div>

        {lockedLocations.map((loc) => (
          <div
            key={loc.id}
            className="hidden lg:block rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 opacity-50"
          >
            <div className="font-semibold text-zinc-500">🔒 {loc.name}</div>
            <div className="mt-1 text-xs text-zinc-600">
              {loc.unlockCost > repPoints
                ? `Need ${loc.unlockCost} Rep (you have ${Math.floor(repPoints)})`
                : "Unlocks with reputation"}
            </div>
          </div>
        ))}
      </div>

      {/* Scavenge action + inventory */}
      <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={manualScavenge}
            className="rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white text-sm transition-colors hover:bg-orange-500 active:bg-orange-700"
          >
            Scavenge!
          </button>
          {autoScavengeUnlocked && (
            <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
              Auto
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-zinc-400">{inventory.length} items</span>
            {inventory.length > 0 && (
              <button
                onClick={sellAllJunk}
                className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-400 hover:text-white"
              >
                Sell All
              </button>
            )}
          </div>
        </div>

        {inventory.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500 text-sm">
            Your inventory is empty. Hit Scavenge to find parts.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900">
            {/* Desktop table header */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-zinc-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <span>Part</span>
              <span>Condition</span>
              <span>Value</span>
              <span></span>
            </div>
            <div className="max-h-72 sm:max-h-96 overflow-y-auto">
              {inventory.map((part) => {
                const def = getPartById(part.definitionId);
                if (!def) return null;
                const mult = CONDITION_MULTIPLIERS[part.condition];
                const value = Math.floor(def.scrapValue * mult);
                return (
                  <div
                    key={part.id}
                    className="flex items-center justify-between gap-2 border-b border-zinc-800/50 px-3 py-1.5 last:border-0 sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:gap-x-4 sm:px-4 sm:py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-white">{def.name}</span>
                      <span className={`ml-1.5 text-xs font-mono sm:hidden ${CONDITION_COLORS[part.condition] ?? "text-zinc-400"}`}>
                        {capitalize(part.condition).slice(0, 3)}
                      </span>
                      <span className="ml-1.5 text-xs text-zinc-500 hidden sm:inline">{def.category}</span>
                    </div>
                    <span className={`hidden sm:inline text-xs font-mono ${CONDITION_COLORS[part.condition] ?? "text-zinc-400"}`}>
                      {capitalize(part.condition)}
                    </span>
                    <span className="font-mono text-xs text-green-400 shrink-0">${formatNumber(value)}</span>
                    <button
                      onClick={() => sellPart(part.id)}
                      className="text-xs text-zinc-500 transition-colors hover:text-red-400 shrink-0"
                    >
                      Sell
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
