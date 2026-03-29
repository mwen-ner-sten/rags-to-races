"use client";

import { useGameStore } from "@/state/store";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { getPartById, CONDITION_MULTIPLIERS } from "@/data/parts";
import { formatNumber, capitalize } from "@/utils/format";
import { useMemo, useState, useEffect } from "react";
import type { ScavengedPart } from "@/engine/scavenge";

const CONDITION_COLORS: Record<string, string> = {
  rusted: "text-red-400",
  worn: "text-orange-400",
  decent: "text-yellow-400",
  good: "text-green-400",
  pristine: "text-cyan-400",
};

const CONDITION_ORDER = ["pristine", "good", "decent", "worn", "rusted"];
const CONDITION_SHORT: Record<string, string> = {
  rusted: "Rst",
  worn: "Wrn",
  decent: "Dec",
  good: "Gd",
  pristine: "Pri",
};

interface InventoryGroup {
  key: string;
  definitionId: string;
  condition: string;
  count: number;
  unitValue: number;
  parts: ScavengedPart[];
}

function groupInventory(inventory: ScavengedPart[]): InventoryGroup[] {
  const map = new Map<string, InventoryGroup>();
  for (const p of inventory) {
    const key = `${p.definitionId}:${p.condition}`;
    let g = map.get(key);
    if (!g) {
      const def = getPartById(p.definitionId);
      const mult = CONDITION_MULTIPLIERS[p.condition as keyof typeof CONDITION_MULTIPLIERS];
      g = {
        key,
        definitionId: p.definitionId,
        condition: p.condition,
        count: 0,
        unitValue: def ? Math.floor(def.scrapValue * mult) : 0,
        parts: [],
      };
      map.set(key, g);
    }
    g.count++;
    g.parts.push(p);
  }
  return Array.from(map.values()).sort((a, b) => {
    const ci = CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition);
    if (ci !== 0) return ci;
    return (getPartById(a.definitionId)?.name ?? "").localeCompare(getPartById(b.definitionId)?.name ?? "");
  });
}

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

  const groups = useMemo(() => groupInventory(inventory), [inventory]);

  // Track inventory changes for new-part animations via Zustand subscription
  const [newPartKeys, setNewPartKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let prevLen = useGameStore.getState().inventory.length;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGameStore.subscribe((state) => {
      if (state.inventory.length > prevLen) {
        const keys = new Set<string>();
        for (const p of state.inventory.slice(prevLen)) {
          keys.add(`${p.definitionId}:${p.condition}`);
        }
        setNewPartKeys(keys);
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(() => setNewPartKeys(new Set()), 600);
      }
      prevLen = state.inventory.length;
    });
    return () => { unsub(); if (clearTimer) clearTimeout(clearTimer); };
  }, []);

  // Scavenge button animation
  const [isScavengeAnimating, setIsScavengeAnimating] = useState(false);
  const handleScavenge = () => {
    setIsScavengeAnimating(true);
    manualScavenge();
    setTimeout(() => setIsScavengeAnimating(false), 300);
  };

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
            onClick={handleScavenge}
            className={`rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white text-sm transition-all hover:bg-orange-500 active:bg-orange-700 ${
              isScavengeAnimating ? "scale-90" : "scale-100"
            }`}
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
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 border-b border-zinc-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <span>Part</span>
              <span>Condition</span>
              <span>Qty</span>
              <span>Value</span>
              <span></span>
            </div>
            <div className="max-h-72 sm:max-h-96 overflow-y-auto">
              {groups.map((group) => {
                const def = getPartById(group.definitionId);
                if (!def) return null;
                return (
                  <div
                    key={group.key}
                    className={`flex items-center justify-between gap-2 border-b border-zinc-800/50 px-3 py-1.5 last:border-0 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-x-4 sm:px-4 sm:py-2 ${
                      newPartKeys.has(group.key) ? "animate-fade-up" : ""
                    } ${
                      newPartKeys.has(group.key) && (group.condition === "pristine" || group.condition === "good")
                        ? "animate-pulse-gold"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-white">{def.name}</span>
                      {group.count > 1 && (
                        <span className="ml-1 text-xs text-zinc-500">x{group.count}</span>
                      )}
                      <span className={`ml-1.5 text-xs font-mono sm:hidden ${CONDITION_COLORS[group.condition] ?? "text-zinc-400"}`}>
                        {CONDITION_SHORT[group.condition] ?? group.condition}
                      </span>
                    </div>
                    <span className={`hidden sm:inline text-xs font-mono ${CONDITION_COLORS[group.condition] ?? "text-zinc-400"}`}>
                      {capitalize(group.condition)}
                    </span>
                    <span className="hidden sm:inline text-xs font-mono text-zinc-400">{group.count}</span>
                    <span className="font-mono text-xs text-green-400 shrink-0">${formatNumber(group.unitValue)}</span>
                    <button
                      onClick={() => sellPart(group.parts[0].id)}
                      className="text-xs text-zinc-500 transition-colors hover:text-red-400 shrink-0"
                    >
                      Sell 1
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
