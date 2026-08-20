"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getEffectiveVehicleHandlingBonus, getVehicleBuildCost, getVehicleRepairCost, getVehicleSaleValue, resolveVehicleLoadout, useGameStore } from "@/state/store";
import { formatVehicleUnlockRequirement, VEHICLE_DEFINITIONS } from "@/data/vehicles";
import type { VehicleDefinition } from "@/data/vehicles";
import { getPartById, CONDITIONS, CONDITION_ADDON_SLOTS, CONDITION_LABELS, type CoreSlot } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import type { BuiltVehicle, VehicleStats } from "@/engine/build";
import { compareInstalledPart, degradeCondition, validateBuildSelection } from "@/engine/build";
import { formatNumber } from "@/utils/format";
import type { ScavengedPart } from "@/engine/scavenge";
import { isFeatureAvailable, type FeatureId } from "@/config/features";
import GameAssetImage from "@/components/GameAssetImage";
import type { EngineeringPriority } from "@/engine/engineeringDiagnostics";

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

interface GarageInspectionTarget {
  vehicleId: string;
  slot: CoreSlot;
  priority: EngineeringPriority;
  action: string;
}

export default function GaragePanel({
  inspectionTarget = null,
  onClearInspection,
}: {
  inspectionTarget?: GarageInspectionTarget | null;
  onClearInspection?: () => void;
}) {
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
  const addonBenchUnlocked = (workshopLevels["addon_bench"] ?? 0) >= 1;
  const autoFitterUnlocked = (workshopLevels["auto_fitter"] ?? 0) >= 1;

  const unlockedFeatures = useGameStore((s) => s.unlockedFeatures);

  // Show every blueprint whose required feature is available. Vehicles the
  // player hasn't unlocked yet are rendered dimmed with their unlock hint
  // so players know what to work toward.
  const visibleBlueprints = VEHICLE_DEFINITIONS.filter(
    (v) => !v.requiredFeature || (
      isFeatureAvailable(v.requiredFeature as FeatureId) && unlockedFeatures.includes(v.requiredFeature)
    ),
  );

  const pendingDef = VEHICLE_DEFINITIONS.find((v) => v.id === pendingBuildVehicleId);

  const actualBuildCost = useGameStore((state) =>
    pendingDef ? getVehicleBuildCost(state, pendingDef) : 0,
  );

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

  const buildSelection = useMemo(
    () => pendingDef ? validateBuildSelection(pendingDef, pendingBuildParts, inventory) : null,
    [inventory, pendingBuildParts, pendingDef],
  );
  const hasFunds = pendingDef ? scrapBucks >= actualBuildCost : false;
  const canBuild = !!pendingDef && buildSelection?.valid === true && hasFunds;
  const buildBlockReason = !pendingDef
    ? null
    : !buildSelection?.valid
      ? buildSelection?.reason ?? "Select a part for each required slot"
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
          {visibleBlueprints.map((v) => {
            const isUnlocked = unlockedVehicleIds.includes(v.id);
            const isSelected = pendingBuildVehicleId === v.id;
            return (
              <button
                key={v.id}
                onClick={isUnlocked ? () => setPendingVehicle(v.id) : undefined}
                disabled={!isUnlocked}
                title={isUnlocked ? undefined : `Locked \u2014 ${formatVehicleUnlockRequirement(v.unlockRequirement)}`}
                className="rounded-lg border px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm transition-colors"
                style={
                  !isUnlocked
                    ? {
                        borderColor: "var(--panel-border)",
                        color: "var(--text-muted)",
                        opacity: 0.45,
                        cursor: "not-allowed",
                        borderStyle: "dashed",
                      }
                    : isSelected
                    ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)", color: "var(--text-white)" }
                    : { borderColor: "var(--panel-border)", color: "var(--text-secondary)" }
                }
              >
                {!isUnlocked && <span style={{ marginRight: 4 }}>{"\u{1F512}"}</span>}
                T{v.tier} {v.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Locked blueprints show how to unlock them on hover. Most unlock via <strong style={{ color: "var(--text-secondary)" }}>Rep</strong> or <strong style={{ color: "var(--text-secondary)" }}>circuit wins</strong>.
        </p>

        {pendingDef && (
          <>
            <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>{pendingDef.description}</p>
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
                                {def.name} · {group.condition}
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
              Build {pendingDef.name} · ${formatNumber(actualBuildCost)}
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
                toolkitUnlocked={toolkitUnlocked}
                addonBenchUnlocked={addonBenchUnlocked}
                setActiveVehicle={setActiveVehicle}
                sellVehicle={sellVehicle}
                repairVehicle={repairVehicle}
                swapPart={swapPart}
                diagnosisSlot={inspectionTarget?.vehicleId === vehicle.id ? inspectionTarget.slot : null}
                diagnosisPriority={inspectionTarget?.vehicleId === vehicle.id ? inspectionTarget.priority : null}
                diagnosisAction={inspectionTarget?.vehicleId === vehicle.id ? inspectionTarget.action : null}
                onClearDiagnosis={onClearInspection}
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
  toolkitUnlocked,
  addonBenchUnlocked,
  setActiveVehicle,
  sellVehicle,
  repairVehicle,
  swapPart,
  diagnosisSlot,
  diagnosisPriority,
  diagnosisAction,
  onClearDiagnosis,
}: {
  vehicle: BuiltVehicle;
  isActive: boolean;
  scrapBucks: number;
  inventory: ScavengedPart[];
  toolkitUnlocked: boolean;
  addonBenchUnlocked: boolean;
  setActiveVehicle: (id: string) => void;
  sellVehicle: (id: string) => void;
  repairVehicle: (id: string) => void;
  swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => void;
  diagnosisSlot: CoreSlot | null;
  diagnosisPriority: EngineeringPriority | null;
  diagnosisAction: string | null;
  onClearDiagnosis?: () => void;
}) {
  const [swapSlot, setSwapSlot] = useState<string | null>(() =>
    toolkitUnlocked && diagnosisPriority === "component" ? diagnosisSlot : null,
  );
  const diagnosisRef = useRef<HTMLDivElement>(null);
  const vehicleCardRef = useRef<HTMLDivElement>(null);
  const repairButtonRef = useRef<HTMLButtonElement>(null);
  const [loadoutName, setLoadoutName] = useState("");
  const installAddon = useGameStore((s) => s.installAddon);
  const removeAddon = useGameStore((s) => s.removeAddon);
  const allVehicleLoadouts = useGameStore((s) => s.vehicleLoadouts);
  const vehicleLoadouts = useMemo(
    () => allVehicleLoadouts.filter((loadout) => loadout.vehicleId === vehicle.id),
    [allVehicleLoadouts, vehicle.id],
  );
  const saveVehicleLoadout = useGameStore((s) => s.saveVehicleLoadout);
  const applyVehicleLoadout = useGameStore((s) => s.applyVehicleLoadout);
  const deleteVehicleLoadout = useGameStore((s) => s.deleteVehicleLoadout);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const isTutorialRepair = tutorialStep === 13;
  const repairCost = useGameStore((state) => getVehicleRepairCost(state, vehicle));
  const saleValue = useGameStore((state) => getVehicleSaleValue(state, vehicle));
  const isRacing = useGameStore((state) => state.isRacing);
  const fleetAssignmentStatus = useGameStore((state) =>
    state.fleetAssignments.find((assignment) => assignment.vehicleId === vehicle.id)?.status ?? null,
  );
  const diagnosedInstalled = diagnosisSlot ? vehicle.parts[diagnosisSlot] : undefined;
  const diagnosedPart = diagnosedInstalled ? getPartById(diagnosedInstalled.part.definitionId) : undefined;
  const diagnosisTargetKey = diagnosisSlot ? `${vehicle.id}:${diagnosisSlot}` : null;
  const focusedDiagnosisTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!diagnosisTargetKey) {
      focusedDiagnosisTargetRef.current = null;
      return;
    }
    if (focusedDiagnosisTargetRef.current === diagnosisTargetKey) return;
    focusedDiagnosisTargetRef.current = diagnosisTargetKey;
    const focusTarget = diagnosisPriority === "repair" ? repairButtonRef.current : diagnosisRef.current;
    focusTarget?.focus();
    focusTarget?.scrollIntoView({ block: "nearest" });
  }, [diagnosisPriority, diagnosisTargetKey]);

  const def = VEHICLE_DEFINITIONS.find((v) => v.id === vehicle.definitionId);
  if (!def) return null;

  const condition = vehicle.condition ?? 100;
  const mutationLocked = fleetAssignmentStatus !== null || (isRacing && isActive);
  const activationLocked = isRacing || fleetAssignmentStatus !== null;
  const lockMessage = fleetAssignmentStatus === "running"
    ? "Vehicle is running a Fleet Program."
    : fleetAssignmentStatus === "complete"
      ? "Collect this vehicle's Fleet rewards first."
      : isRacing && isActive
        ? "Vehicle is currently racing."
        : undefined;
  const engineInstalled = vehicle.parts["engine"];
  const enginePart = engineInstalled?.part;
  const engineDef = enginePart ? getPartById(enginePart.definitionId) : null;


  return (
    <div
      ref={vehicleCardRef}
      tabIndex={-1}
      aria-label={`${def.name} vehicle`}
      data-vehicle-card-id={vehicle.id}
      className="rounded-lg border p-2.5 sm:p-4 transition-colors"
      style={
        diagnosisSlot
          ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)", boxShadow: "0 0 0 1px var(--panel-border-active)" }
          : isActive
          ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)" }
          : { borderColor: "var(--panel-border)", background: "var(--panel-bg)" }
      }
    >
      {diagnosisSlot && diagnosedInstalled && (
        <div
          ref={diagnosisRef}
          tabIndex={-1}
          role="region"
          aria-label={`Race diagnosis for ${def.name} ${diagnosisSlot}`}
          data-testid="garage-diagnosis"
          data-vehicle-id={vehicle.id}
          data-slot={diagnosisSlot}
          className="mb-3 rounded-md border p-2 outline-none focus-visible:ring-2"
          style={{ borderColor: "var(--panel-border-active)", background: "var(--panel-bg)" }}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 text-xs" style={{ color: "var(--text-heading)" }}>
              <strong className="block uppercase tracking-wide" style={{ color: "var(--accent)" }}>Race diagnosis</strong>
              <span className="break-words">Current {diagnosisSlot}: {diagnosedPart?.name ?? "Installed part"} · {CONDITION_LABELS[diagnosedInstalled.part.condition]}</span>
              {diagnosisPriority === "repair" && (
                <span className="mt-1 block" style={{ color: "var(--warning)" }}>
                  <strong>Repair first.</strong>{diagnosisAction ? ` ${diagnosisAction}` : ""}
                </span>
              )}
              {!toolkitUnlocked && (
                <span className="mt-1 block" style={{ color: "var(--warning)" }}>
                  Comparing and replacing parts unlocks with Toolkit at 40 Rep.
                </span>
              )}
            </div>
            {onClearDiagnosis && (
              <button
                type="button"
                onClick={() => {
                  onClearDiagnosis();
                  requestAnimationFrame(() => vehicleCardRef.current?.focus());
                }}
                className="min-h-11 min-w-11 shrink-0 rounded border px-2 text-xs min-[641px]:min-h-0 min-[641px]:min-w-0 min-[641px]:py-1"
                style={{ borderColor: "var(--panel-border)", color: "var(--text-secondary)" }}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
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
            {fleetAssignmentStatus && (
              <span
                className="rounded px-1.5 py-0.5 text-[.6rem] font-semibold"
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              >
                {fleetAssignmentStatus === "running" ? "Fleet Program" : "Fleet Rewards Ready"}
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
              disabled={activationLocked}
              title={activationLocked ? lockMessage ?? "Finish the current race before switching vehicles." : undefined}
              className="rounded border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              Activate
            </button>
          )}
          <button
            onClick={() => sellVehicle(vehicle.id)}
            disabled={mutationLocked}
            title={mutationLocked ? lockMessage : undefined}
            className="text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: "var(--text-muted)" }}
          >
            Sell ${formatNumber(saleValue)}
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
              ref={repairButtonRef}
              data-tutorial="repair-btn"
              onClick={() => repairVehicle(vehicle.id)}
              disabled={mutationLocked || (!isTutorialRepair && scrapBucks < repairCost)}
              title={mutationLocked ? lockMessage : undefined}
              className="min-h-11 w-full rounded border px-4 py-2 text-sm font-semibold transition-colors active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 min-[641px]:min-h-0 min-[641px]:w-auto min-[641px]:px-2 min-[641px]:py-1 min-[641px]:text-xs min-[641px]:font-normal min-[641px]:active:scale-100"
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

      {/* Named engineering loadouts */}
      <div className="mt-2 rounded border p-2" style={{ borderColor: "var(--panel-border)" }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={loadoutName}
            onChange={(event) => setLoadoutName(event.target.value)}
            placeholder="Loadout name"
            aria-label={`New loadout name for ${def.name}`}
            className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}
          />
          <button
            onClick={() => { saveVehicleLoadout(vehicle.id, loadoutName); setLoadoutName(""); }}
            disabled={!loadoutName.trim()}
            className="rounded border px-2 py-1 text-xs disabled:opacity-40"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            Save build
          </button>
        </div>
        {vehicleLoadouts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vehicleLoadouts.map((loadout) => {
              const resolution = resolveVehicleLoadout(vehicle, inventory, loadout);
              const disabledReason = mutationLocked ? lockMessage : resolution.reason ?? undefined;
              return (
                <span key={loadout.id} className="inline-flex max-w-56 flex-col">
                  <span className="inline-flex overflow-hidden rounded border" style={{ borderColor: "var(--btn-border)" }}>
                    <button disabled={Boolean(disabledReason)} title={disabledReason} onClick={() => applyVehicleLoadout(loadout.id)} className="min-w-0 truncate px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40" style={{ color: "var(--text-primary)" }}>{loadout.name}</button>
                    <button onClick={() => deleteVehicleLoadout(loadout.id)} aria-label={`Delete ${loadout.name} loadout`} className="shrink-0 border-l px-1.5 text-xs" style={{ borderColor: "var(--btn-border)", color: "var(--danger)" }}>×</button>
                  </span>
                  {resolution.reason && !mutationLocked && <span className="mt-0.5 text-[10px] leading-tight" style={{ color: "var(--warning)" }}>{resolution.reason}</span>}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Part swap UI */}
      {(toolkitUnlocked || addonBenchUnlocked) && !mutationLocked && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {def.slots.map((slotCfg) => {
              const slot = slotCfg.slot;
              const installed = vehicle.parts[slot];
              if (!installed) return null;
              const partDef = getPartById(installed.part.definitionId);
              const pickerId = `part-comparison-${vehicle.id}-${slot}`;
              return (
                <button
                  key={slot}
                  onClick={() => setSwapSlot(swapSlot === slot ? null : slot)}
                  aria-label={toolkitUnlocked
                    ? `Compare ${slot} installed part: ${partDef?.name ?? "unknown part"}`
                    : `Manage ${slot} add-ons: ${partDef?.name ?? "unknown part"}`}
                  aria-expanded={swapSlot === slot}
                  aria-controls={pickerId}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded border px-2 py-1 text-[.65rem] transition-colors min-[641px]:min-h-0 min-[641px]:min-w-0 min-[641px]:px-1.5 min-[641px]:py-0.5"
                  style={
                    swapSlot === slot
                      ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)", color: "var(--accent)" }
                      : { borderColor: "var(--panel-border)", color: "var(--text-muted)" }
                  }
                >
                  <GameAssetImage kind="part" id={installed.part.definitionId} width={20} height={20} />
                  {slot}:{" "}
                  <span style={{ color: CONDITION_COLORS[installed.part.condition] ?? undefined }}>
                    {partDef?.name ?? "?"}
                  </span>
                </button>
              );
            })}
          </div>
          {swapSlot && vehicle.parts[swapSlot] && (
            <div id={`part-comparison-${vehicle.id}-${swapSlot}`} className="flex flex-col gap-2">
              {toolkitUnlocked && (
                <SwapPartPicker
                  vehicle={vehicle}
                  vehicleDef={def}
                  slot={swapSlot}
                  inventory={inventory}
                  swapPart={swapPart}
                  onDone={() => setSwapSlot(null)}
                />
              )}
              {addonBenchUnlocked && (
                <AddonManager
                  vehicleId={vehicle.id}
                  slot={swapSlot}
                  installed={vehicle.parts[swapSlot]}
                  inventory={inventory}
                  installAddon={installAddon}
                  removeAddon={removeAddon}
                />
              )}
            </div>
          )}
        </div>
      )}
      {mutationLocked && (
        <p className="mt-2 text-xs" style={{ color: "var(--warning)" }}>{lockMessage}</p>
      )}
    </div>
  );
}

function AddonManager({
  vehicleId,
  slot,
  installed,
  inventory,
  installAddon,
  removeAddon,
}: {
  vehicleId: string;
  slot: string;
  installed: BuiltVehicle["parts"][string];
  inventory: ScavengedPart[];
  installAddon: (vehicleId: string, slot: string, addonId: string) => void;
  removeAddon: (vehicleId: string, slot: string, addonId: string) => void;
}) {
  const capacity = CONDITION_ADDON_SLOTS[installed.part.condition] ?? 0;
  const eligible = inventory.filter((part) => {
    if (part.type !== "addon") return false;
    return getAddonById(part.definitionId)?.targetSlot === slot;
  });

  return (
    <div
      className="rounded border p-2 text-xs"
      style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
    >
      <div className="mb-1 font-semibold" style={{ color: "var(--text-heading)" }}>
        Add-ons ({installed.addons.length}/{capacity})
      </div>
      {installed.addons.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {installed.addons.map((addon) => (
            <button
              key={addon.id}
              onClick={() => removeAddon(vehicleId, slot, addon.id)}
              className="inline-flex items-center gap-1 rounded border px-2 py-1"
              style={{ borderColor: "var(--danger)", color: "var(--text-primary)" }}
              title="Remove and return to inventory"
            >
              <GameAssetImage kind="addon" id={addon.definitionId} width={24} height={24} />
              {getAddonById(addon.definitionId)?.name ?? addon.definitionId} - Remove
            </button>
          ))}
        </div>
      )}
      {capacity === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Improve this part to decent condition to unlock an add-on slot.</p>
      ) : installed.addons.length >= capacity ? (
        <p style={{ color: "var(--text-muted)" }}>All add-on slots are occupied.</p>
      ) : eligible.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No compatible add-ons in inventory.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {eligible.map((addon) => (
            <button
              key={addon.id}
              onClick={() => installAddon(vehicleId, slot, addon.id)}
              className="inline-flex items-center gap-1 rounded border px-2 py-1"
              style={{ borderColor: "var(--success)", color: "var(--text-primary)" }}
            >
              <GameAssetImage kind="addon" id={addon.definitionId} width={24} height={24} />
              Install {getAddonById(addon.definitionId)?.name ?? addon.definitionId}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Swap Part Picker ─────────────────────────────────────────────────────────

function SwapPartPicker({
  vehicle,
  vehicleDef,
  slot,
  inventory,
  swapPart,
  onDone,
}: {
  vehicle: BuiltVehicle;
  vehicleDef: VehicleDefinition;
  slot: string;
  inventory: ScavengedPart[];
  swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => void;
  onDone: () => void;
}) {
  const handlingBonus = useGameStore(getEffectiveVehicleHandlingBonus);
  const gentleSwapUnlocked = useGameStore((state) => (state.workshopLevels.gentle_swap ?? 0) >= 1);
  const slotCfg = vehicleDef.slots.find((s) => s.slot === slot);
  if (!slotCfg) return null;
  const eligible = inventory.filter((p) =>
    p.type !== "addon" && slotCfg.acceptableParts.includes(p.definitionId),
  );
  const groups = groupParts(eligible);
  const currentPart = vehicle.parts[slot].part;
  const returnedCondition = gentleSwapUnlocked ? currentPart.condition : degradeCondition(currentPart.condition);
  const swapCostText = gentleSwapUnlocked
    ? `Gentle Swap returns the current part at ${CONDITION_LABELS[returnedCondition]} condition.`
    : `Without Gentle Swap, the current part returns at ${CONDITION_LABELS[returnedCondition]} condition.`;

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
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
        {groups.map((group) => {
          const partDef = getPartById(group.definitionId);
          if (!partDef) return null;
          const candidate = group.parts[0];
          const comparison = compareInstalledPart(vehicleDef, vehicle, slot, candidate, handlingBonus);
          if (!comparison) return null;
          const deltas: Array<{ short: string; accessible: string; stat: keyof VehicleStats }> = [
            { short: "Spd", accessible: "speed", stat: "speed" },
            { short: "Hnd", accessible: "handling", stat: "handling" },
            { short: "Rel", accessible: "reliability", stat: "reliability" },
            { short: "Perf", accessible: "performance", stat: "performance" },
            { short: "Wgt", accessible: "weight", stat: "weight" },
          ];
          const deltaText = deltas.map(({ short, stat }) => `${short} ${formatSignedDelta(comparison.deltas[stat])}`);
          const accessibleDeltaText = deltas.map(({ accessible, stat }) => `${accessible} ${formatSignedDelta(comparison.deltas[stat])}`);
          const displacementWarning = comparison.displacedAddonCount > 0
            ? ` Warning: ${comparison.displacedAddonCount} add-on${comparison.displacedAddonCount === 1 ? "" : "s"} will return to inventory.`
            : "";
          return (
            <button
              key={group.key}
              data-candidate-instance-id={candidate.id}
              aria-label={`Install ${partDef.name}, ${CONDITION_LABELS[candidate.condition]} condition; projected changes: ${accessibleDeltaText.join(", ")}. ${swapCostText}${displacementWarning}`}
              onClick={() => {
                swapPart(vehicle.id, slot, candidate);
                onDone();
              }}
              className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded border px-2 py-1.5 text-left text-xs transition-colors min-[641px]:min-h-0 min-[641px]:w-auto min-[641px]:max-w-full min-[641px]:py-1"
              style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
            >
              <GameAssetImage kind="part" id={group.definitionId} width={24} height={24} />
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-1">
                  <span style={{ color: CONDITION_COLORS[group.condition] ?? undefined }}>{partDef.name}</span>
                  {group.parts.length > 1 && <span style={{ color: "var(--text-muted)" }}>x{group.parts.length}</span>}
                </span>
                <span className="block text-[.65rem]" style={{ color: "var(--text-secondary)" }}>
                  Condition: {CONDITION_LABELS[candidate.condition]}
                </span>
                <span className="flex flex-wrap gap-x-2 text-[.65rem] font-mono" style={{ color: "var(--text-secondary)" }}>
                  {deltaText.map((text) => <span key={text}>{text}</span>)}
                </span>
                <span className="block text-[.65rem] font-semibold" style={{ color: gentleSwapUnlocked ? "var(--text-secondary)" : "var(--warning)" }}>
                  {swapCostText}
                </span>
                {comparison.displacedAddonCount > 0 && (
                  <span className="block text-[.65rem] font-semibold" style={{ color: "var(--warning)" }}>
                    Warning: {comparison.displacedAddonCount} add-on{comparison.displacedAddonCount === 1 ? "" : "s"} will return to inventory.
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatSignedDelta(value: number): string {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)}`;
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
