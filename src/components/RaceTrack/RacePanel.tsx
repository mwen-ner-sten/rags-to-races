"use client";

import { useGameStore } from "@/state/store";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { formatNumber } from "@/utils/format";

const RESULT_COLORS = {
  win: "text-green-400",
  loss: "text-yellow-400",
  dnf: "text-red-400",
};

export default function RacePanel() {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const selectedCircuitId = useGameStore((s) => s.selectedCircuitId);
  const unlockedCircuitIds = useGameStore((s) => s.unlockedCircuitIds);
  const isRacing = useGameStore((s) => s.isRacing);
  const lastRaceOutcome = useGameStore((s) => s.lastRaceOutcome);
  const raceHistory = useGameStore((s) => s.raceHistory);
  const autoRaceUnlocked = useGameStore((s) => s.autoRaceUnlocked);
  const setSelectedCircuit = useGameStore((s) => s.setSelectedCircuit);
  const enterRace = useGameStore((s) => s.enterRace);

  const activeVehicle = garage.find((v) => v.id === activeVehicleId);
  const activeVehicleDef = activeVehicle
    ? VEHICLE_DEFINITIONS.find((v) => v.id === activeVehicle.definitionId)
    : null;

  const unlockedCircuits = CIRCUIT_DEFINITIONS.filter((c) =>
    unlockedCircuitIds.includes(c.id),
  );
  const lockedCircuits = CIRCUIT_DEFINITIONS.filter(
    (c) => !unlockedCircuitIds.includes(c.id),
  );

  const selectedCircuit = CIRCUIT_DEFINITIONS.find((c) => c.id === selectedCircuitId);
  const canEnter =
    !isRacing &&
    activeVehicle &&
    selectedCircuit &&
    scrapBucks >= selectedCircuit.entryFee &&
    activeVehicleDef &&
    activeVehicleDef.tier >= selectedCircuit.minVehicleTier;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
      {/* Circuit selector */}
      <div className="col-span-1 flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Circuits
        </h2>
        {/* Horizontal scroll on mobile, vertical stack on desktop */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
          {unlockedCircuits.map((circuit) => (
            <button
              key={circuit.id}
              onClick={() => setSelectedCircuit(circuit.id)}
              className={`shrink-0 rounded-lg border p-2.5 sm:p-3 text-left transition-colors lg:shrink ${
                selectedCircuitId === circuit.id
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
              }`}
            >
              <div className="font-semibold text-white text-sm">{circuit.name}</div>
              <div className="mt-0.5 text-xs text-zinc-400 hidden lg:block">{circuit.description}</div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                <span>${formatNumber(circuit.entryFee)}</span>
                <span>Prize: ${formatNumber(circuit.rewardBase)}</span>
                <span>+{circuit.repReward} Rep</span>
              </div>
              <div className="mt-0.5 text-xs text-zinc-600">
                T{circuit.minVehicleTier}+ vehicle
              </div>
            </button>
          ))}
        </div>
        {lockedCircuits.map((circuit) => (
          <div key={circuit.id} className="hidden lg:block rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 opacity-50">
            <div className="font-semibold text-zinc-500">🔒 {circuit.name}</div>
            <div className="mt-1 text-xs text-zinc-600">
              Need {circuit.unlockRepCost} Rep to unlock
            </div>
          </div>
        ))}
      </div>

      {/* Race action */}
      <div className="col-span-1 lg:col-span-2 flex flex-col gap-3 sm:gap-4">
        {/* Active vehicle info */}
        {activeVehicle && activeVehicleDef ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Racing with</span>
              <span className="font-semibold text-white text-sm">
                T{activeVehicleDef.tier} {activeVehicleDef.name}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-zinc-400 sm:flex sm:gap-4">
              <span>Spd: {Math.floor(activeVehicle.stats.speed)}</span>
              <span>Hnd: {Math.floor(activeVehicle.stats.handling)}</span>
              <span>Rel: {Math.floor(activeVehicle.stats.reliability)}</span>
              <span className="font-semibold text-orange-400">
                Perf: {Math.floor(activeVehicle.stats.performance)}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 sm:p-4 text-sm text-zinc-500">
            No active vehicle. Build one in the Garage tab.
          </div>
        )}

        {/* Race button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <button
            onClick={enterRace}
            disabled={!canEnter}
            className="rounded-lg bg-orange-600 px-6 py-2.5 font-bold text-white text-sm transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRacing ? "Racing..." : "Enter Race"}
          </button>
          {isRacing && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.3s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.15s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-orange-500" />
            </div>
          )}
          {autoRaceUnlocked && !isRacing && (
            <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
              Auto-race
            </span>
          )}
          {selectedCircuit && !canEnter && !isRacing && (
            <span className="text-xs text-zinc-500">
              {!activeVehicle
                ? "No vehicle"
                : scrapBucks < selectedCircuit.entryFee
                ? `Need $${formatNumber(selectedCircuit.entryFee)}`
                : activeVehicleDef && activeVehicleDef.tier < selectedCircuit.minVehicleTier
                ? `Need T${selectedCircuit.minVehicleTier}+ vehicle`
                : ""}
            </span>
          )}
        </div>

        {/* Last result */}
        {lastRaceOutcome && (
          <div
            className={`rounded-lg border p-4 ${
              lastRaceOutcome.result === "win"
                ? "border-green-800 bg-green-900/20"
                : lastRaceOutcome.result === "dnf"
                ? "border-red-800 bg-red-900/20"
                : "border-yellow-800 bg-yellow-900/20"
            }`}
          >
            <div
              className={`mb-2 font-bold ${RESULT_COLORS[lastRaceOutcome.result]}`}
            >
              {lastRaceOutcome.result === "win"
                ? "🏆 WIN"
                : lastRaceOutcome.result === "dnf"
                ? "💥 DNF"
                : `P${lastRaceOutcome.position}/${lastRaceOutcome.totalRacers}`}
            </div>
            {lastRaceOutcome.log.map((line, i) => (
              <div key={i} className="text-sm text-zinc-300">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Race history */}
        {raceHistory.length > 1 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              History
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {raceHistory.slice(1).map((r, i) => (
                <span
                  key={i}
                  className={`rounded px-2 py-0.5 text-xs font-mono ${
                    r.result === "win"
                      ? "bg-green-900/30 text-green-400"
                      : r.result === "dnf"
                      ? "bg-red-900/30 text-red-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                  title={r.log[0]}
                >
                  {r.result === "win" ? "W" : r.result === "dnf" ? "X" : `P${r.position}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rep display */}
        <div className="text-sm text-zinc-500">
          Rep Points: <span className="font-semibold text-blue-400">{Math.floor(repPoints)}</span>
          {repPoints >= 8 && !autoRaceUnlocked && (
            <span className="ml-2 text-xs text-zinc-600">(Auto-scavenge unlocks at 8 Rep)</span>
          )}
        </div>
      </div>
    </div>
  );
}
