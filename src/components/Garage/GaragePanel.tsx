"use client";

import { useState } from "react";
import { useGameStore, _getUpgradeEffectValue } from "@/state/store";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { getPartById, CONDITION_MULTIPLIERS } from "@/data/parts";
import { calculateRepairCost } from "@/engine/build";
import { formatNumber, capitalize } from "@/utils/format";
import type { ScavengedPart } from "@/engine/scavenge";

const SLOTS = ["engine", "wheel", "frame", "fuel"] as const;
type Slot = (typeof SLOTS)[number];

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

interface PartGroup {
  key: string;
  definitionId: string;
  condition: string;
  parts: ScavengedPart[];
}

function groupParts(parts: ScavengedPart[]): PartGroup[] {
  const map = new Map<string, PartGroup>();
  for (const p of parts) {
    const key = `${p.definitionId}:${p.condition}`;
    let group = map.get(key);
    if (!group) {
      group = { key, definitionId: p.definitionId, condition: p.condition, parts: [] };
      map.set(key, group);
    }
    group.parts.push(p);
  }
  return Array.from(map.values()).sort((a, b) => {
    const ci = CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition);
    if (ci !== 0) return ci;
    const nameA = getPartById(a.definitionId)?.name ?? "";
    const nameB = getPartById(b.definitionId)?.name ?? "";
    return nameA.localeCompare(nameB);
  });
}

export default function GaragePanel() {
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const inventory = useGameStore((s) => s.inventory);
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const unlockedVehicleIds = useGameStore((s) => s.unlockedVehicleIds);
  const pendingBuildVehicleId = useGameStore((s) => s.pendingBuildVehicleId);
  const pendingBuildParts = useGameStore((s) => s.pendingBuildParts);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const setPendingVehicle = useGameStore((s) => s.setPendingVehicle);
  const setPendingPart = useGameStore((s) => s.setPendingPart);
  const buildSelectedVehicle = useGameStore((s) => s.buildSelectedVehicle);
  const setActiveVehicle = useGameStore((s) => s.setActiveVehicle);
  const sellVehicle = useGameStore((s) => s.sellVehicle);
  const repairVehicle = useGameStore((s) => s.repairVehicle);
  const swapPart = useGameStore((s) => s.swapPart);

  const toolkitUnlocked = (workshopLevels["toolkit"] ?? 0) >= 1;

  const unlockedVehicles = VEHICLE_DEFINITIONS.filter((v) =>
    unlockedVehicleIds.includes(v.id),
  );

  const pendingDef = VEHICLE_DEFINITIONS.find((v) => v.id === pendingBuildVehicleId);

  // Apply bargain builder discount
  const buildReduction = _getUpgradeEffectValue(useGameStore.getState(), "bargain_builder");
  const actualBuildCost = pendingDef ? Math.max(0, Math.floor(pendingDef.buildCost * (1 - buildReduction))) : 0;

  const canBuild =
    pendingDef &&
    pendingBuildParts.engine &&
    pendingBuildParts.wheel &&
    pendingBuildParts.frame &&
    pendingBuildParts.fuel &&
    scrapBucks >= actualBuildCost;

  function eligibleGroups(slot: Slot): PartGroup[] {
    if (!pendingDef) return [];
    const allowed = pendingDef.requiredParts[slot];
    const eligible = inventory.filter((p) => allowed.includes(p.definitionId));
    return groupParts(eligible);
  }

  function isGroupSelected(group: PartGroup, slot: Slot): boolean {
    const sel = pendingBuildParts[slot];
    return sel ? group.parts.some((p) => p.id === sel.id) : false;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      {/* Build a vehicle */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Build a Vehicle
        </h2>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {unlockedVehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setPendingVehicle(v.id)}
              className={`rounded-lg border px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm transition-colors ${
                pendingBuildVehicleId === v.id
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
              }`}
            >
              T{v.tier} {v.name}
            </button>
          ))}
        </div>

        {pendingDef && (
          <>
            <p className="text-xs sm:text-sm text-zinc-400">{pendingDef.description}</p>
            <div className="text-xs text-zinc-500">
              Build cost:{" "}
              <span className={scrapBucks >= actualBuildCost ? "text-green-400" : "text-red-400"}>
                ${formatNumber(actualBuildCost)}
              </span>
              {buildReduction > 0 && (
                <span className="ml-1 text-zinc-600 line-through">${formatNumber(pendingDef.buildCost)}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {SLOTS.map((slot) => {
                const selectedPart = pendingBuildParts[slot];
                const groups = eligibleGroups(slot);
                const totalCount = groups.reduce((n, g) => n + g.parts.length, 0);
                return (
                  <div key={slot} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 sm:p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {slot}
                      </span>
                      <span className="text-xs text-zinc-600">{totalCount} parts</span>
                    </div>
                    {groups.length === 0 ? (
                      <p className="text-xs text-zinc-600">No compatible parts</p>
                    ) : (
                      <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1 sm:gap-1.5">
                        {groups.map((group) => {
                          const def = getPartById(group.definitionId);
                          if (!def) return null;
                          const selected = isGroupSelected(group, slot);
                          return (
                            <button
                              key={group.key}
                              onClick={() => {
                                if (selected) {
                                  setPendingPart(slot, null);
                                } else {
                                  setPendingPart(slot, group.parts[0]);
                                }
                              }}
                              className={`rounded border px-1.5 py-0.5 text-xs transition-colors sm:px-2 sm:py-1 ${
                                selected
                                  ? "border-orange-500 bg-orange-500/10 text-white"
                                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                              }`}
                            >
                              {def.name}{" "}
                              <span className={CONDITION_COLORS[group.condition] ?? "text-zinc-400"}>
                                {CONDITION_SHORT[group.condition] ?? group.condition}
                              </span>
                              {group.parts.length > 1 && (
                                <span className="ml-0.5 text-zinc-500">
                                  x{group.parts.length}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {selectedPart && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {getPartById(selectedPart.definitionId)?.name} —{" "}
                        <span className={CONDITION_COLORS[selectedPart.condition] ?? ""}>
                          {capitalize(selectedPart.condition)}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={buildSelectedVehicle}
              disabled={!canBuild}
              className="rounded-lg bg-orange-600 px-5 py-2 sm:px-6 sm:py-2.5 font-semibold text-sm text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Build {pendingDef.name}
            </button>
          </>
        )}
      </div>

      {/* Garage — built vehicles */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Your Garage ({garage.length})
        </h2>

        {garage.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500 text-sm">
            No vehicles yet. Build one from scavenged parts.
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3 max-h-[60vh] overflow-y-auto">
            {garage.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isActive={vehicle.id === activeVehicleId}
                scrapBucks={scrapBucks}
                inventory={inventory}
                workshopLevels={workshopLevels}
                toolkitUnlocked={toolkitUnlocked}
                setActiveVehicle={setActiveVehicle}
                sellVehicle={sellVehicle}
                repairVehicle={repairVehicle}
                swapPart={swapPart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vehicle Card ─────────────────────────────────────────────────────────────

function VehicleCard({
  vehicle,
  isActive,
  scrapBucks,
  inventory,
  workshopLevels,
  toolkitUnlocked,
  setActiveVehicle,
  sellVehicle,
  repairVehicle,
  swapPart,
}: {
  vehicle: import("@/engine/build").BuiltVehicle;
  isActive: boolean;
  scrapBucks: number;
  inventory: ScavengedPart[];
  workshopLevels: Record<string, number>;
  toolkitUnlocked: boolean;
  setActiveVehicle: (id: string) => void;
  sellVehicle: (id: string) => void;
  repairVehicle: (id: string) => void;
  swapPart: (vehicleId: string, slot: "engine" | "wheel" | "frame" | "fuel", newPart: ScavengedPart) => void;
}) {
  const [swapSlot, setSwapSlot] = useState<Slot | null>(null);

  const def = VEHICLE_DEFINITIONS.find((v) => v.id === vehicle.definitionId);
  if (!def) return null;

  const condition = vehicle.condition ?? 100;
  const mult = CONDITION_MULTIPLIERS[vehicle.parts.engine.condition];
  const engineDef = getPartById(vehicle.parts.engine.definitionId);

  // Repair cost
  const repairReduction = _getUpgradeEffectValue({ workshopLevels } as import("@/state/store").GameState, "budget_repairs");
  const repairCost = condition < 100 ? calculateRepairCost(def, condition, 100, repairReduction) : 0;

  return (
    <div
      className={`rounded-lg border p-2.5 sm:p-4 transition-colors ${
        isActive ? "border-orange-500 bg-orange-500/5" : "border-zinc-700 bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">
              T{def.tier} {def.name}
            </span>
            {isActive && (
              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[.6rem] font-semibold text-orange-400">
                Active
              </span>
            )}
            {condition <= 0 && (
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[.6rem] font-semibold text-red-400">
                Broken
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            <span className={CONDITION_COLORS[vehicle.parts.engine.condition] ?? ""}>
              {engineDef?.name} ({CONDITION_SHORT[vehicle.parts.engine.condition] ?? vehicle.parts.engine.condition})
            </span>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs sm:flex sm:gap-4">
            <StatBadge label="Spd" value={Math.floor(vehicle.stats.speed)} />
            <StatBadge label="Hnd" value={Math.floor(vehicle.stats.handling)} />
            <StatBadge label="Rel" value={Math.floor(vehicle.stats.reliability)} />
            <StatBadge label="Perf" value={Math.floor(vehicle.stats.performance)} highlight />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {!isActive && (
            <button
              onClick={() => setActiveVehicle(vehicle.id)}
              className="rounded border border-orange-600 px-2 py-1 text-xs text-orange-400 transition-colors hover:bg-orange-600/20"
            >
              Activate
            </button>
          )}
          <button
            onClick={() => sellVehicle(vehicle.id)}
            className="text-xs text-zinc-600 transition-colors hover:text-red-400"
          >
            Sell ${formatNumber(def.sellValue * mult)}
          </button>
        </div>
      </div>

      {/* Condition bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500">Condition</span>
          <span className={`text-xs font-mono font-semibold ${
            condition > 70 ? "text-green-400" : condition > 30 ? "text-yellow-400" : "text-red-400"
          }`}>
            {condition}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              condition > 70 ? "bg-green-500" : condition > 30 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${condition}%` }}
          />
        </div>
      </div>

      {/* Repair button */}
      {condition < 100 && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => repairVehicle(vehicle.id)}
            disabled={scrapBucks < repairCost}
            className="rounded border border-green-600 px-2 py-1 text-xs text-green-400 transition-colors hover:bg-green-600/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Repair to 100% — ${formatNumber(repairCost)}
          </button>
        </div>
      )}

      {/* Part swap UI */}
      {toolkitUnlocked && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {SLOTS.map((slot) => {
              const part = vehicle.parts[slot];
              const partDef = getPartById(part.definitionId);
              return (
                <button
                  key={slot}
                  onClick={() => setSwapSlot(swapSlot === slot ? null : slot)}
                  className={`rounded border px-1.5 py-0.5 text-[.65rem] transition-colors ${
                    swapSlot === slot
                      ? "border-orange-500 bg-orange-500/10 text-orange-300"
                      : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {slot}: {partDef?.name ?? "?"}{" "}
                  <span className={CONDITION_COLORS[part.condition] ?? ""}>
                    {CONDITION_SHORT[part.condition] ?? ""}
                  </span>
                </button>
              );
            })}
          </div>
          {swapSlot && (
            <SwapPartPicker
              vehicleId={vehicle.id}
              vehicleDef={def}
              slot={swapSlot}
              currentPart={vehicle.parts[swapSlot]}
              inventory={inventory}
              swapPart={swapPart}
              onDone={() => setSwapSlot(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Swap Part Picker ─────────────────────────────────────────────────────────

function SwapPartPicker({
  vehicleId,
  vehicleDef,
  slot,
  currentPart,
  inventory,
  swapPart,
  onDone,
}: {
  vehicleId: string;
  vehicleDef: import("@/data/vehicles").VehicleDefinition;
  slot: Slot;
  currentPart: ScavengedPart;
  inventory: ScavengedPart[];
  swapPart: (vehicleId: string, slot: Slot, newPart: ScavengedPart) => void;
  onDone: () => void;
}) {
  const allowed = vehicleDef.requiredParts[slot];
  const eligible = inventory.filter((p) => allowed.includes(p.definitionId));
  const groups = groupParts(eligible);

  if (groups.length === 0) {
    return (
      <div className="mt-1.5 rounded border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-500">
        No compatible parts in inventory for {slot}.
      </div>
    );
  }

  return (
    <div className="mt-1.5 rounded border border-zinc-800 bg-zinc-900 p-2">
      <div className="mb-1 text-xs text-zinc-500">
        Swap {slot} (current: {getPartById(currentPart.definitionId)?.name} {CONDITION_SHORT[currentPart.condition]})
      </div>
      <div className="flex flex-wrap gap-1">
        {groups.map((group) => {
          const partDef = getPartById(group.definitionId);
          if (!partDef) return null;
          return (
            <button
              key={group.key}
              onClick={() => {
                swapPart(vehicleId, slot, group.parts[0]);
                onDone();
              }}
              className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-300 transition-colors hover:border-orange-500 hover:text-white"
            >
              {partDef.name}{" "}
              <span className={CONDITION_COLORS[group.condition] ?? ""}>
                {CONDITION_SHORT[group.condition]}
              </span>
              {group.parts.length > 1 && <span className="ml-0.5 text-zinc-500">x{group.parts.length}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatBadge({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <span className={highlight ? "font-semibold text-orange-400" : "text-zinc-400"}>
      {label}: {value}
    </span>
  );
}
