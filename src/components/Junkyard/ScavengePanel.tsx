"use client";

import { useGameStore, _getUpgradeEffectValue } from "@/state/store";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { getPartById, CONDITION_MULTIPLIERS, CONDITIONS, CONDITION_ADDON_SLOTS } from "@/data/parts";
import type { PartCondition } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
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

const VEHICLE_USABLE_PART_IDS = new Set<string>(
  VEHICLE_DEFINITIONS.flatMap((v) => v.slots.flatMap((s) => s.acceptableParts)),
);

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

interface InventoryGroup {
  key: string;
  definitionId: string;
  condition: string;
  count: number;
  unitValue: number;
  parts: ScavengedPart[];
  name: string;
  slot: string;
  partType: "part" | "addon";
}

function groupInventory(inventory: ScavengedPart[]): InventoryGroup[] {
  const map = new Map<string, InventoryGroup>();
  for (const p of inventory) {
    const key = `${p.definitionId}:${p.condition}`;
    let g = map.get(key);
    if (!g) {
      const defPart = p.type === "part" ? getPartById(p.definitionId) : undefined;
      const defAddon = !defPart ? getAddonById(p.definitionId) : undefined;
      const src = defPart ?? defAddon;
      if (!src) continue;
      const mult = CONDITION_MULTIPLIERS[p.condition as keyof typeof CONDITION_MULTIPLIERS];
      g = {
        key,
        definitionId: p.definitionId,
        condition: p.condition,
        count: 0,
        unitValue: Math.floor(src.scrapValue * mult),
        parts: [],
        name: src.name,
        slot: defPart ? defPart.category : defAddon!.targetSlot,
        partType: defPart ? "part" : "addon",
      };
      map.set(key, g);
    }
    g.count++;
    g.parts.push(p);
  }
  return Array.from(map.values()).sort((a, b) => {
    const ci = CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition);
    if (ci !== 0) return ci;
    return a.name.localeCompare(b.name);
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
  const sellAllScrap = useGameStore((s) => s.sellAllScrap);
  const sellBelowQuality = useGameStore((s) => s.sellBelowQuality);
  const setSelectedLocation = useGameStore((s) => s.setSelectedLocation);
  const autoScavengeUnlocked = useGameStore((s) => s.autoScavengeUnlocked);
  const manualScavengeClicks = useGameStore((s) => s.manualScavengeClicks);
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const refurbishPart = useGameStore((s) => s.refurbishPart);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
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

  const [qualityThreshold, setQualityThreshold] = useState<PartCondition>("decent");
  const [hoveredGroup, setHoveredGroup] = useState<{ group: InventoryGroup; x: number; y: number } | null>(null);
  const hasScrap = useMemo(
    () => inventory.some((p) => p.type === "part" && getPartById(p.definitionId)?.category === "misc"),
    [inventory],
  );

  // Scavenge button animation
  const [isScavengeAnimating, setIsScavengeAnimating] = useState(false);
  const handleScavenge = () => {
    setIsScavengeAnimating(true);
    manualScavenge();
    setTimeout(() => setIsScavengeAnimating(false), 300);
  };

  return (
    <>
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
            data-tutorial="scavenge-btn"
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
          <div data-tutorial="sell-area" className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{inventory.length} items</span>
            {(hasScrap || tutorialStep === 2) && (
              <button
                onClick={sellAllScrap}
                disabled={!hasScrap}
                data-tutorial="sell-scrap-btn"
                className="rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
              >
                Sell Scrap
              </button>
            )}
            {inventory.length > 0 && (
              <>
                <select
                  value={qualityThreshold}
                  onChange={(e) => setQualityThreshold(e.target.value as PartCondition)}
                  className="rounded border px-1 py-1 text-xs"
                  style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)", background: "var(--panel-bg)" }}
                >
                  {CONDITIONS.slice(1).map((c) => (
                    <option key={c} value={c}>{capitalize(c)}</option>
                  ))}
                </select>
                <button
                  onClick={() => sellBelowQuality(qualityThreshold)}
                  className="rounded border px-2 py-1 text-xs transition-colors"
                  style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
                >
                  Sell Below
                </button>
                <button
                  onClick={sellAllJunk}
                  className="rounded border px-2 py-1 text-xs transition-colors"
                  style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
                >
                  Sell All
                </button>
              </>
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
              <span>Actions</span>
            </div>
            <div className="max-h-72 sm:max-h-96 overflow-y-scroll inventory-scroll" onMouseLeave={() => setHoveredGroup(null)}>
              {groups.map((group) => {
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
                    onMouseEnter={(e) => setHoveredGroup({ group, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHoveredGroup(null)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-sm" style={{ color: condColor }}>{group.name}</span>
                      {group.partType === "addon" ? (
                        <span className="rounded border px-1 py-0.5 text-xs shrink-0" style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
                          +{capitalize(group.slot)}
                        </span>
                      ) : group.slot === "misc" || !VEHICLE_USABLE_PART_IDS.has(group.definitionId) ? (
                        <span className="rounded border px-1 py-0.5 text-xs shrink-0" style={{ borderColor: "var(--btn-border)", color: "var(--text-muted)" }}>
                          {group.slot === "misc" ? "Scrap" : capitalize(group.slot)}
                        </span>
                      ) : (
                        <span className="rounded border px-1 py-0.5 text-xs shrink-0" style={{ borderColor: "var(--info)", color: "var(--info)" }}>
                          {capitalize(group.slot)}
                        </span>
                      )}
                      <span className="text-xs sm:hidden" style={{ color: "var(--text-muted)" }}>{capitalize(group.condition)}</span>
                    </div>
                    <span className="hidden sm:inline text-xs font-mono" style={{ color: condColor }}>{capitalize(group.condition)}</span>
                    <span className="hidden sm:inline text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{group.count}</span>
                    <span className="font-mono text-xs shrink-0" style={{ color: "var(--success)" }}>${formatNumber(group.unitValue)}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {refurbBenchUnlocked && group.partType === "part" && !["rusted", "good", "pristine", "polished", "legendary", "mythic", "artifact"].includes(group.condition) && (() => {
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
    {hoveredGroup && (() => {
      const { group, x, y } = hoveredGroup;
      const mult = CONDITION_MULTIPLIERS[group.condition as keyof typeof CONDITION_MULTIPLIERS] ?? 1;
      const addonSlots = CONDITION_ADDON_SLOTS[group.condition as keyof typeof CONDITION_ADDON_SLOTS] ?? 0;
      const defPart = group.partType === "part" ? getPartById(group.definitionId) : undefined;
      const defAddon = group.partType === "addon" ? getAddonById(group.definitionId) : undefined;
      const isUsable = group.slot !== "misc" && VEHICLE_USABLE_PART_IDS.has(group.definitionId);
      const acceptedBy = defPart && isUsable
        ? VEHICLE_DEFINITIONS.filter((v) => v.slots.some((s) => s.acceptableParts.includes(group.definitionId))).map((v) => v.name)
        : [];
      return (
        <div
          style={{
            position: "fixed",
            left: Math.min(x + 16, (typeof window !== "undefined" ? window.innerWidth : 800) - 224),
            top: y - 8,
            zIndex: 50,
            width: 208,
            background: "var(--panel-bg)",
            border: "1px solid var(--panel-border)",
            borderRadius: 6,
            padding: "8px 10px",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            {group.name}
            <span style={{ fontWeight: 400, color: "var(--text-muted)" }}> · {capitalize(group.condition)}</span>
          </div>
          {defPart && (
            <>
              <div style={{ borderTop: "1px solid var(--divider)", paddingTop: 4, marginBottom: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                {defPart.basePower > 0 && <StatRow label="Power" value={Math.round(defPart.basePower * mult)} />}
                {defPart.baseReliability > 0 && <StatRow label="Reliability" value={Math.round(defPart.baseReliability * mult)} />}
                <StatRow label="Weight" value={`${defPart.baseWeight}kg`} />
                <StatRow label="Addon slots" value={addonSlots} />
              </div>
              <div style={{ borderTop: "1px solid var(--divider)", paddingTop: 4, fontSize: 10 }}>
                {isUsable && acceptedBy.length > 0
                  ? <span style={{ color: "var(--text-muted)" }}>{acceptedBy.join(", ")}</span>
                  : <span style={{ color: "var(--warning)" }}>Not accepted by any vehicle</span>
                }
              </div>
            </>
          )}
          {defAddon && (
            <>
              <div style={{ borderTop: "1px solid var(--divider)", paddingTop: 4, marginBottom: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                {(defAddon.statBonuses.power ?? 0) !== 0 && <StatRow label="Power" value={`+${Math.round(defAddon.statBonuses.power! * mult)}`} />}
                {(defAddon.statBonuses.reliability ?? 0) !== 0 && <StatRow label="Reliability" value={`+${Math.round(defAddon.statBonuses.reliability! * mult)}`} />}
                {(defAddon.statBonuses.handling ?? 0) !== 0 && <StatRow label="Handling" value={`+${Math.round(defAddon.statBonuses.handling! * mult)}`} />}
                {(defAddon.statBonuses.weight ?? 0) !== 0 && <StatRow label="Weight" value={`${defAddon.statBonuses.weight! > 0 ? "+" : ""}${defAddon.statBonuses.weight}kg`} />}
              </div>
              <div style={{ borderTop: "1px solid var(--divider)", paddingTop: 4, fontSize: 10, fontStyle: "italic", color: "var(--text-muted)" }}>
                "{defAddon.flavorText}"
              </div>
            </>
          )}
        </div>
      );
    })()}
    </>
  );
}
