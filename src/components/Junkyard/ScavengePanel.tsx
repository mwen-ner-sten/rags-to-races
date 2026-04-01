"use client";

import { useGameStore, _getUpgradeEffectValue } from "@/state/store";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { getPartById, CONDITION_MULTIPLIERS } from "@/data/parts";
import { calculateRefurbishCost } from "@/engine/build";
import { formatNumber, capitalize } from "@/utils/format";
import { useMemo, useState, useEffect } from "react";
import type { ScavengedPart } from "@/engine/scavenge";

const CONDITION_COLORS: Record<string, string> = {
  rusted:    "#f87171",
  worn:      "#fb923c",
  decent:    "#facc15",
  good:      "#4ade80",
  pristine:  "#22d3ee",
  polished:  "#818cf8",  // indigo
  legendary: "#c084fc",  // purple
  mythic:    "#f472b6",  // pink
  artifact:  "#fbbf24",  // gold
};

const CONDITION_ORDER = ["artifact", "mythic", "legendary", "polished", "pristine", "good", "decent", "worn", "rusted"];

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
  const manualScavengeClicks = useGameStore((s) => s.manualScavengeClicks);
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const refurbishPart = useGameStore((s) => s.refurbishPart);
  const refurbBenchUnlocked = (workshopLevels["refurbishment_bench"] ?? 0) >= 1;

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
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-heading)" }}
        >
          Locations
        </h2>
        {/* Horizontal scroll on mobile, vertical stack on desktop */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
          {unlockedLocations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className="shrink-0 rounded-lg border p-3 text-left transition-colors lg:shrink"
              style={
                selectedLocationId === loc.id
                  ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)" }
                  : { borderColor: "var(--panel-border)", background: "var(--panel-bg)" }
              }
            >
              <div className="font-semibold text-sm" style={{ color: "var(--text-white)" }}>{loc.name}</div>
              <div className="mt-0.5 text-xs hidden lg:block" style={{ color: "var(--text-secondary)" }}>{loc.description}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                T{loc.tier} · {loc.maxPartsPerScavenge} parts
              </div>
            </button>
          ))}
        </div>

        {lockedLocations.map((loc) => (
          <div
            key={loc.id}
            className="hidden lg:block rounded-lg border p-3 opacity-50"
            style={{ borderColor: "var(--divider)", background: "var(--panel-bg)" }}
          >
            <div className="font-semibold" style={{ color: "var(--text-muted)" }}>🔒 {loc.name}</div>
            <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
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
            className={`rounded-lg px-5 py-2 font-semibold text-sm transition-all ${
              isScavengeAnimating ? "scale-90" : "scale-100"
            }`}
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            Scavenge!
          </button>
          {autoScavengeUnlocked ? (
            <span
              className="rounded px-2 py-1 text-xs"
              style={{ background: "var(--accent-bg)", color: "var(--info)" }}
            >
              Auto
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="h-1.5 w-24 rounded-full overflow-hidden"
                style={{ background: "var(--divider)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (manualScavengeClicks / 100) * 100)}%`,
                    background: "var(--info)",
                  }}
                />
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {manualScavengeClicks}/100 for Auto
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{inventory.length} items</span>
            {inventory.length > 0 && (
              <button
                onClick={sellAllJunk}
                className="rounded border px-2 py-1 text-xs transition-colors"
                style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
              >
                Sell All
              </button>
            )}
          </div>
        </div>

        {inventory.length === 0 ? (
          <div
            className="rounded-lg border p-6 text-center text-sm"
            style={{ borderColor: "var(--divider)", background: "var(--panel-bg)", color: "var(--text-muted)" }}
          >
            Your inventory is empty. Hit Scavenge to find parts.
          </div>
        ) : (
          <div
            className="rounded-lg border"
            style={{ borderColor: "var(--divider)", background: "var(--panel-bg)" }}
          >
            {/* Desktop table header */}
            <div
              className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 border-b px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{ borderColor: "var(--divider)", color: "var(--text-muted)" }}
            >
              <span>Part</span>
              <span>Condition</span>
              <span>Qty</span>
              <span>Value</span>
              <span></span>
            </div>
            <div className="max-h-72 sm:max-h-96 overflow-y-scroll inventory-scroll">
              {groups.map((group) => {
                const def = getPartById(group.definitionId);
                if (!def) return null;
                const condColor = CONDITION_COLORS[group.condition] ?? "var(--text-secondary)";
                return (
                  <div
                    key={group.key}
                    className={`flex items-center justify-between gap-2 border-b px-3 py-1.5 last:border-0 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-x-4 sm:px-4 sm:py-2 ${
                      newPartKeys.has(group.key) ? "animate-fade-up" : ""
                    } ${
                      newPartKeys.has(group.key) && ["good", "pristine", "polished", "legendary", "mythic", "artifact"].includes(group.condition)
                        ? "animate-pulse-gold"
                        : ""
                    }`}
                    style={{ borderColor: "var(--divider)" }}
                  >
                    <div className="min-w-0">
                      <span className="text-sm" style={{ color: condColor }}>{def.name}</span>
                      {group.count > 1 && (
                        <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>x{group.count}</span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{group.count}</span>
                    <span className="font-mono text-xs shrink-0" style={{ color: "var(--success)" }}>${formatNumber(group.unitValue)}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {refurbBenchUnlocked && !["rusted", "good", "pristine", "polished", "legendary", "mythic", "artifact"].includes(group.condition) && (() => {
                        const refurbDiscount = _getUpgradeEffectValue(useGameStore.getState(), "cheap_refurb");
                        const refurbInfo = calculateRefurbishCost(group.parts[0], refurbDiscount);
                        if (!refurbInfo) return null;
                        return (
                          <button
                            onClick={() => refurbishPart(group.parts[0].id)}
                            disabled={scrapBucks < refurbInfo.cost}
                            className="text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ color: "var(--info)" }}
                            title={`Refurbish to ${capitalize(refurbInfo.newCondition)} — $${refurbInfo.cost}`}
                          >
                            Fix ${refurbInfo.cost}
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => sellPart(group.parts[0].id)}
                        className="text-xs transition-colors"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Sell 1
                      </button>
                    </div>
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
