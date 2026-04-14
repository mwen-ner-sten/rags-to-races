"use client";

import { useEffect, useState } from "react";
import { useGameStore, _getUpgradeEffectValue } from "@/state/store";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import type { VehicleDefinition } from "@/data/vehicles";
import { getPartById, CONDITION_MULTIPLIERS, CONDITIONS } from "@/data/parts";
import { calculateRepairCost } from "@/engine/build";
import type { BuiltVehicle } from "@/engine/build";
import { formatNumber } from "@/utils/format";
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
  const fatigue = useGameStore((s) => s.fatigue);
  const setPendingVehicle = useGameStore((s) => s.setPendingVehicle);
  const setPendingPart = useGameStore((s) => s.setPendingPart);
  const buildSelectedVehicle = useGameStore((s) => s.buildSelectedVehicle);
  const setActiveVehicle = useGameStore((s) => s.setActiveVehicle);
  const sellVehicle = useGameStore((s) => s.sellVehicle);
  const repairVehicle = useGameStore((s) => s.repairVehicle);
  const swapPart = useGameStore((s) => s.swapPart);

  const toolkitUnlocked = (workshopLevels["toolkit"] ?? 0) >= 1;
  const autoFitterUnlocked = (workshopLevels["auto_fitter"] ?? 0) >= 1;

  const unlockedVehicles = VEHICLE_DEFINITIONS.filter((v) =>
    unlockedVehicleIds.includes(v.id),
  );

  const pendingDef = VEHICLE_DEFINITIONS.find((v) => v.id === pendingBuildVehicleId);

  // Apply bargain builder discount
  const buildReduction = _getUpgradeEffectValue(useGameStore.getState(), "bargain_builder");
  const actualBuildCost = pendingDef ? Math.max(0, Math.floor(pendingDef.buildCost * (1 - buildReduction))) : 0;

  // Auto-Fitter: when blueprint changes and the upgrade is owned, pre-select
  // the best-condition compatible part for each required slot. Skips slots
  // the player has already filled so we don't overwrite intentional choices.
  useEffect(() => {
    if (!autoFitterUnlocked || !pendingDef) return;
    for (const slotCfg of pendingDef.slots) {
      if (!slotCfg.required) continue;
      if (pendingBuildParts[slotCfg.slot]) continue;
      const best = inventory
        .filter((p) => p.type !== "addon" && slotCfg.acceptableParts.includes(p.definitionId))
        .sort((a, b) => CONDITIONS.indexOf(b.condition) - CONDITIONS.indexOf(a.condition))[0];
      if (best) setPendingPart(slotCfg.slot, best);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to blueprint change
  }, [pendingBuildVehicleId, autoFitterUnlocked]);

  const requiredSlotsFilled = pendingDef
    ? pendingDef.slots.every((s) => !s.required || pendingBuildParts[s.slot])
    : false;
  const hasFunds = pendingDef ? scrapBucks >= actualBuildCost : false;
  const canBuild = !!pendingDef && requiredSlotsFilled && hasFunds;
  const buildBlockReason = !pendingDef
    ? null
    : !requiredSlotsFilled
      ? "Select a part for each slot"
      : !hasFunds
        ? `Need $${formatNumber(actualBuildCost - scrapBucks)} more`
        : null;

  function eligibleGroups(slot: string): PartGroup[] {
    if (!pendingDef) return [];
    const slotCfg = pendingDef.slots.find((s) => s.slot === slot);
    if (!slotCfg) return [];
    const eligible = inventory.filter((p) =>
      p.type !== "addon" && slotCfg.acceptableParts.includes(p.definitionId),
    );
    return groupParts(eligible);
  }

  function isGroupSelected(group: PartGroup, slot: string): boolean {
    const sel = pendingBuildParts[slot];
    return sel ? group.parts.some((p) => p.id === sel.id) : false;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      {/* Build a vehicle */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-heading)" }}
        >
          Build a Vehicle
        </h2>

        <div className="flex flex-wrap gap-1.5 sm:gap-2" data-tutorial="blueprint-btn">
          {unlockedVehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setPendingVehicle(v.id)}
              className="rounded-lg border px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm transition-colors"
              style={
                pendingBuildVehicleId === v.id
                  ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)", color: "var(--text-white)" }
                  : { borderColor: "var(--panel-border)", color: "var(--text-secondary)" }
              }
            >
              T{v.tier} {v.name}
            </button>
          ))}
        </div>

        {pendingDef && (
          <>
            <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>{pendingDef.description}</p>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Build cost:{" "}
              <span style={{ color: scrapBucks >= actualBuildCost ? "var(--success)" : "var(--danger)" }}>
                ${formatNumber(actualBuildCost)}
              </span>
              {buildReduction > 0 && (
                <span className="ml-1 line-through" style={{ color: "var(--text-muted)" }}>${formatNumber(pendingDef.buildCost)}</span>
              )}
            </div>

            <div className="flex flex-col gap-2" data-tutorial="part-slots">
              {pendingDef.slots.map((slotCfg) => {
                const slot = slotCfg.slot;
                const selectedPart = pendingBuildParts[slot];
                const groups = eligibleGroups(slot);
                const totalCount = groups.reduce((n, g) => n + g.parts.length, 0);
                return (
                  <div
                    key={slot}
                    className="rounded-lg border p-2 sm:p-3"
                    data-tutorial-slot={slot}
                    data-tutorial-slot-filled={selectedPart ? "true" : undefined}
                    style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {slot}{!slotCfg.required && " (optional)"}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{totalCount} parts</span>
                    </div>
                    {groups.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>No compatible parts</p>
                    ) : (
                      <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1 sm:gap-1.5">
                        {groups.map((group) => {
                          const def = getPartById(group.definitionId);
                          if (!def) return null;
                          const selected = isGroupSelected(group, slot);
                          return (
                            <button
                              key={group.key}
                              data-tutorial="part-btn"
                              data-tutorial-selected={selected ? "true" : undefined}
                              onClick={() => {
                                if (selected) {
                                  setPendingPart(slot, null);
                                } else {
                                  setPendingPart(slot, group.parts[0]);
                                }
                              }}
                              className="rounded border px-1.5 py-0.5 text-xs transition-colors sm:px-2 sm:py-1"
                              style={
                                selected
                                  ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)", color: "var(--text-white)" }
                                  : { borderColor: "var(--panel-border)", color: "var(--text-secondary)" }
                              }
                            >
                              <span style={{ color: CONDITION_COLORS[group.condition] ?? "var(--text-secondary)" }}>
                                {def.name}
                              </span>
                              {group.parts.length > 1 && (
                                <span className="ml-0.5" style={{ color: "var(--text-muted)" }}>
                                  x{group.parts.length}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {selectedPart && (
                      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: CONDITION_COLORS[selectedPart.condition] ?? undefined }}>
                          {getPartById(selectedPart.definitionId)?.name}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              data-tutorial="build-btn"
              onClick={buildSelectedVehicle}
              disabled={!canBuild}
              className="rounded-lg px-5 py-2 sm:px-6 sm:py-2.5 font-semibold text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              Build {pendingDef.name}
            </button>
            {buildBlockReason && (
              <p
                aria-live="polite"
                className="text-xs"
                style={{ color: "var(--text-muted)", marginTop: -4 }}
              >
                {buildBlockReason}
              </p>
            )}
          </>
        )}
      </div>

      {/* Garage — built vehicles */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-heading)" }}
        >
          Your Garage ({garage.length})
        </h2>

        {garage.length === 0 ? (
          <div
            className="rounded-lg border p-6 text-center text-sm"
            style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--text-muted)" }}
          >
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
                fatigue={fatigue}
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
  fatigue,
  toolkitUnlocked,
  setActiveVehicle,
  sellVehicle,
  repairVehicle,
  swapPart,
}: {
  vehicle: BuiltVehicle;
  isActive: boolean;
  scrapBucks: number;
  inventory: ScavengedPart[];
  workshopLevels: Record<string, number>;
  fatigue: number;
  toolkitUnlocked: boolean;
  setActiveVehicle: (id: string) => void;
  sellVehicle: (id: string) => void;
  repairVehicle: (id: string) => void;
  swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => void;
}) {
  const [swapSlot, setSwapSlot] = useState<string | null>(null);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const isTutorialRepair = tutorialStep === 13;

  const def = VEHICLE_DEFINITIONS.find((v) => v.id === vehicle.definitionId);
  if (!def) return null;

  const condition = vehicle.condition ?? 100;
  const engineInstalled = vehicle.parts["engine"];
  const enginePart = engineInstalled?.part;
  const mult = enginePart ? CONDITION_MULTIPLIERS[enginePart.condition] : 1;
  const engineDef = enginePart ? getPartById(enginePart.definitionId) : null;

  // Repair cost
  const repairReduction = _getUpgradeEffectValue({ workshopLevels } as import("@/state/store").GameState, "budget_repairs");
  const repairCost = condition < 100 ? calculateRepairCost(def, condition, 100, repairReduction, fatigue) : 0;

  return (
    <div
      className="rounded-lg border p-2.5 sm:p-4 transition-colors"
      style={
        isActive
          ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)" }
          : { borderColor: "var(--panel-border)", background: "var(--panel-bg)" }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: "var(--text-white)" }}>
              T{def.tier} {def.name}
            </span>
            {isActive && (
              <span
                className="rounded px-1.5 py-0.5 text-[.6rem] font-semibold"
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              >
                Active
              </span>
            )}
            {condition <= 0 && (
              <span
                className="rounded px-1.5 py-0.5 text-[.6rem] font-semibold"
                style={{ background: "rgba(239,68,68,0.2)", color: "var(--danger)" }}
              >
                Broken
              </span>
            )}
          </div>
          {enginePart && (
            <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: CONDITION_COLORS[enginePart.condition] ?? undefined }}>
                {engineDef?.name}
              </span>
            </div>
          )}
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
              data-tutorial="activate-btn"
              onClick={() => setActiveVehicle(vehicle.id)}
              className="rounded border px-2 py-1 text-xs transition-colors"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              Activate
            </button>
          )}
          <button
            onClick={() => sellVehicle(vehicle.id)}
            className="text-xs transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Sell ${formatNumber(def.sellValue * mult)}
          </button>
        </div>
      </div>

      {/* Condition bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Condition</span>
          <span
            className="text-xs font-mono font-semibold"
            style={{ color: condition > 70 ? "var(--success)" : condition > 30 ? "#facc15" : "var(--danger)" }}
          >
            {condition}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${condition}%`,
              background: condition > 70 ? "#22c55e" : condition > 30 ? "#eab308" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Repair button */}
      {condition < 100 && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <button
              data-tutorial="repair-btn"
              onClick={() => repairVehicle(vehicle.id)}
              disabled={!isTutorialRepair && scrapBucks < repairCost}
              className="rounded border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderColor: "#16a34a", color: "var(--success)" }}
            >
              {isTutorialRepair ? "Repair to 100% — Free" : `Repair to 100% — $${formatNumber(repairCost)}`}
            </button>
          </div>
          {isTutorialRepair && (
            <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
              Clyde owes you a favor for racing in his derby. This one&apos;s on the house.
            </p>
          )}
        </div>
      )}

      {/* Part swap UI */}
      {toolkitUnlocked && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {def.slots.map((slotCfg) => {
              const slot = slotCfg.slot;
              const installed = vehicle.parts[slot];
              if (!installed) return null;
              const partDef = getPartById(installed.part.definitionId);
              return (
                <button
                  key={slot}
                  onClick={() => setSwapSlot(swapSlot === slot ? null : slot)}
                  className="rounded border px-1.5 py-0.5 text-[.65rem] transition-colors"
                  style={
                    swapSlot === slot
                      ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)", color: "var(--accent)" }
                      : { borderColor: "var(--panel-border)", color: "var(--text-muted)" }
                  }
                >
                  {slot}:{" "}
                  <span style={{ color: CONDITION_COLORS[installed.part.condition] ?? undefined }}>
                    {partDef?.name ?? "?"}
                  </span>
                </button>
              );
            })}
          </div>
          {swapSlot && vehicle.parts[swapSlot] && (
            <SwapPartPicker
              vehicleId={vehicle.id}
              vehicleDef={def}
              slot={swapSlot}
              currentPart={vehicle.parts[swapSlot].part}
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
  vehicleDef: VehicleDefinition;
  slot: string;
  currentPart: ScavengedPart;
  inventory: ScavengedPart[];
  swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => void;
  onDone: () => void;
}) {
  const slotCfg = vehicleDef.slots.find((s) => s.slot === slot);
  if (!slotCfg) return null;
  const eligible = inventory.filter((p) =>
    p.type !== "addon" && slotCfg.acceptableParts.includes(p.definitionId),
  );
  const groups = groupParts(eligible);

  if (groups.length === 0) {
    return (
      <div
        className="mt-1.5 rounded border p-2 text-xs"
        style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--text-muted)" }}
      >
        No compatible parts in inventory for {slot}.
      </div>
    );
  }

  return (
    <div
      className="mt-1.5 rounded border p-2"
      style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
    >
      <div className="mb-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Swap {slot} (current: <span style={{ color: CONDITION_COLORS[currentPart.condition] ?? undefined }}>{getPartById(currentPart.definitionId)?.name}</span>)
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
              className="rounded border px-1.5 py-0.5 text-xs transition-colors"
              style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
            >
              <span style={{ color: CONDITION_COLORS[group.condition] ?? undefined }}>
                {partDef.name}
              </span>
              {group.parts.length > 1 && <span className="ml-0.5" style={{ color: "var(--text-muted)" }}>x{group.parts.length}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatBadge({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <span
      className={highlight ? "font-semibold" : ""}
      style={{ color: highlight ? "var(--accent)" : "var(--text-secondary)" }}
    >
      {label}: {value}
    </span>
  );
}
