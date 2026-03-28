"use client";

import { useGameStore } from "@/state/store";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { getPartById, CONDITION_MULTIPLIERS } from "@/data/parts";
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

export default function GaragePanel() {
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const inventory = useGameStore((s) => s.inventory);
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const unlockedVehicleIds = useGameStore((s) => s.unlockedVehicleIds);
  const pendingBuildVehicleId = useGameStore((s) => s.pendingBuildVehicleId);
  const pendingBuildParts = useGameStore((s) => s.pendingBuildParts);
  const setPendingVehicle = useGameStore((s) => s.setPendingVehicle);
  const setPendingPart = useGameStore((s) => s.setPendingPart);
  const buildSelectedVehicle = useGameStore((s) => s.buildSelectedVehicle);
  const setActiveVehicle = useGameStore((s) => s.setActiveVehicle);
  const sellVehicle = useGameStore((s) => s.sellVehicle);

  const unlockedVehicles = VEHICLE_DEFINITIONS.filter((v) =>
    unlockedVehicleIds.includes(v.id),
  );

  const pendingDef = VEHICLE_DEFINITIONS.find((v) => v.id === pendingBuildVehicleId);

  const canBuild =
    pendingDef &&
    pendingBuildParts.engine &&
    pendingBuildParts.wheel &&
    pendingBuildParts.frame &&
    pendingBuildParts.fuel &&
    scrapBucks >= pendingDef.buildCost;

  // Parts eligible for each slot
  function eligibleParts(slot: Slot): ScavengedPart[] {
    if (!pendingDef) return [];
    const allowed = pendingDef.requiredParts[slot];
    return inventory.filter((p) => allowed.includes(p.definitionId));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Build a vehicle */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Build a Vehicle
        </h2>

        {/* Vehicle selector */}
        <div className="flex flex-wrap gap-2">
          {unlockedVehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setPendingVehicle(v.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
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
            <p className="text-sm text-zinc-400">{pendingDef.description}</p>
            <div className="text-xs text-zinc-500">
              Build cost:{" "}
              <span className={scrapBucks >= pendingDef.buildCost ? "text-green-400" : "text-red-400"}>
                ${formatNumber(pendingDef.buildCost)}
              </span>
            </div>

            {/* Part slots */}
            <div className="flex flex-col gap-2">
              {SLOTS.map((slot) => {
                const selectedPart = pendingBuildParts[slot];
                const options = eligibleParts(slot);
                return (
                  <div key={slot} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 sm:p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {slot}
                      </span>
                      <span className="text-xs text-zinc-600">{options.length} available</span>
                    </div>
                    {options.length === 0 ? (
                      <p className="text-xs text-zinc-600">No compatible parts in inventory</p>
                    ) : (
                      <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1 sm:gap-1.5 sm:max-h-32">
                        {options.map((part) => {
                          const def = getPartById(part.definitionId);
                          if (!def) return null;
                          return (
                            <button
                              key={part.id}
                              onClick={() =>
                                setPendingPart(slot, selectedPart?.id === part.id ? null : part)
                              }
                              className={`rounded border px-1.5 py-0.5 text-xs transition-colors sm:px-2 sm:py-1 ${
                                selectedPart?.id === part.id
                                  ? "border-orange-500 bg-orange-500/10 text-white"
                                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                              }`}
                            >
                              {def.name}{" "}
                              <span className={CONDITION_COLORS[part.condition] ?? "text-zinc-400"}>
                                {capitalize(part.condition).slice(0, 3)}
                              </span>
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
              className="rounded-lg bg-orange-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Build {pendingDef.name}
            </button>
          </>
        )}
      </div>

      {/* Garage — built vehicles */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Your Garage ({garage.length})
        </h2>

        {garage.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
            No vehicles yet. Build one from scavenged parts.
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3 max-h-[60vh] overflow-y-auto">
            {garage.map((vehicle) => {
              const def = VEHICLE_DEFINITIONS.find((v) => v.id === vehicle.definitionId);
              if (!def) return null;
              const isActive = vehicle.id === activeVehicleId;
              const mult = CONDITION_MULTIPLIERS[vehicle.parts.engine.condition];
              const engineDef = getPartById(vehicle.parts.engine.definitionId);

              return (
                <div
                  key={vehicle.id}
                  className={`rounded-lg border p-3 sm:p-4 transition-colors ${
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
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        <span className={CONDITION_COLORS[vehicle.parts.engine.condition] ?? ""}>
                          {engineDef?.name} ({capitalize(vehicle.parts.engine.condition).slice(0, 3)})
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
                </div>
              );
            })}
          </div>
        )}
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
