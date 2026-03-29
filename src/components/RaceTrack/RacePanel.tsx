"use client";

import { useGameStore } from "@/state/store";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { calculateOdds } from "@/engine/race";
import { formatNumber } from "@/utils/format";
import { useState, useEffect, useRef, useMemo } from "react";
import Confetti from "@/components/effects/Confetti";
import type { RaceEvent } from "@/engine/raceEvents";

const RESULT_COLORS = {
  win: "text-green-400",
  loss: "text-yellow-400",
  dnf: "text-red-400",
};

// ── Live Race View ──────────────────────────────────────────────────────

function LiveRaceView({
  events,
  startTime,
  durationMs,
}: {
  events: RaceEvent[];
  startTime: number;
  durationMs: number;
}) {
  const [currentEvent, setCurrentEvent] = useState<RaceEvent | null>(null);
  const [progress, setProgress] = useState(0);
  const eventIndexRef = useRef(0);

  useEffect(() => {
    eventIndexRef.current = 0;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(1, elapsed / durationMs);
      setProgress(pct);

      // Find the latest event that should have fired
      let latest = eventIndexRef.current;
      while (latest < events.length && events[latest].timeOffset <= elapsed) {
        latest++;
      }
      if (latest > eventIndexRef.current) {
        eventIndexRef.current = latest;
        setCurrentEvent(events[latest - 1]);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [events, startTime, durationMs]);

  const position = currentEvent?.position ?? 8;
  const totalRacers = 8;

  return (
    <div className="rounded-lg border border-orange-500/30 bg-zinc-900 p-4 space-y-3">
      {/* Position indicator */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Position
          </span>
          <span className="font-mono text-lg font-bold text-orange-400">
            P{position}
            <span className="text-zinc-600 text-sm">/{totalRacers}</span>
          </span>
        </div>
        {/* Position bar */}
        <div className="flex gap-1">
          {Array.from({ length: totalRacers }, (_, i) => {
            const pos = i + 1;
            const isPlayer = pos === position;
            return (
              <div
                key={pos}
                className={`h-6 flex-1 rounded text-xs font-mono flex items-center justify-center transition-all duration-300 ${
                  isPlayer
                    ? "bg-orange-500 text-white font-bold scale-110 shadow-lg shadow-orange-500/30"
                    : pos < position
                      ? "bg-zinc-700 text-zinc-500"
                      : "bg-zinc-800 text-zinc-600"
                }`}
              >
                {isPlayer ? "YOU" : `P${pos}`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Commentary ticker */}
      {currentEvent && (
        <div
          key={currentEvent.timeOffset}
          className="animate-fade-up rounded-md bg-zinc-800/60 px-3 py-2"
        >
          <span className={`text-sm font-medium ${
            currentEvent.type === "finish" ? "text-white font-bold" :
            currentEvent.type === "position_change" ? "text-orange-300" :
            currentEvent.type === "mechanical" ? "text-red-400" :
            currentEvent.type === "close_call" ? "text-yellow-300" :
            "text-zinc-300"
          }`}>
            {currentEvent.commentary}
          </span>
        </div>
      )}

      {/* Progress bar (track) */}
      <div className="relative">
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {/* Car emoji riding along */}
        <div
          className="absolute -top-3 transition-all duration-100 text-sm"
          style={{ left: `calc(${progress * 100}% - 8px)` }}
        >
          🏎
        </div>
      </div>
    </div>
  );
}

// ── Odds Display ────────────────────────────────────────────────────────

function OddsDisplay({
  performance,
  reliability,
  difficulty,
  prestigeBonus,
}: {
  performance: number;
  reliability: number;
  difficulty: number;
  prestigeBonus: number;
}) {
  const odds = useMemo(
    () => calculateOdds(performance, reliability, difficulty, prestigeBonus),
    [performance, reliability, difficulty, prestigeBonus],
  );

  const winColor = odds.winChance >= 0.5 ? "text-green-400" : odds.winChance >= 0.2 ? "text-yellow-400" : "text-red-400";
  const dnfColor = odds.dnfChance <= 0.05 ? "text-green-400" : odds.dnfChance <= 0.15 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-zinc-800/50 px-3 py-1.5 text-xs">
      <span className="text-zinc-500">Odds:</span>
      <span className={`font-semibold ${winColor}`}>
        {Math.round(odds.winChance * 100)}% Win
      </span>
      <span className="text-zinc-600">·</span>
      <span className={`${winColor} font-medium`}>{odds.oddsLabel}</span>
      {odds.dnfChance > 0 && (
        <>
          <span className="text-zinc-600">·</span>
          <span className={dnfColor}>
            {Math.round(odds.dnfChance * 100)}% DNF Risk
          </span>
        </>
      )}
    </div>
  );
}

// ── Streak Display ──────────────────────────────────────────────────────

function StreakDisplay({ streak, best }: { streak: number; best: number }) {
  if (streak === 0 && best === 0) return null;

  const intensity = streak >= 5 ? "text-red-400 animate-pulse-fire" : streak >= 3 ? "text-orange-400" : "text-yellow-500";
  const fires = streak >= 10 ? "🔥🔥🔥" : streak >= 5 ? "🔥🔥" : streak >= 1 ? "🔥" : "";

  return (
    <div className="flex items-center gap-2 text-xs">
      {streak > 0 && (
        <span className={`font-bold ${intensity}`}>
          {fires} {streak}W Streak
        </span>
      )}
      {best > 0 && (
        <span className="text-zinc-600">
          Best: {best}W
        </span>
      )}
    </div>
  );
}

// ── Main RacePanel ──────────────────────────────────────────────────────

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
  const raceEvents = useGameStore((s) => s.raceEvents);
  const raceStartTime = useGameStore((s) => s.raceStartTime);
  const winStreak = useGameStore((s) => s.winStreak);
  const bestWinStreak = useGameStore((s) => s.bestWinStreak);
  const prestigeBonus = useGameStore((s) => s.prestigeBonus);
  const setSelectedCircuit = useGameStore((s) => s.setSelectedCircuit);
  const enterRace = useGameStore((s) => s.enterRace);

  // Track when result changes to trigger confetti/shake via Zustand subscription
  const [confettiKey, setConfettiKey] = useState<number | null>(null);
  const [resultAnimClass, setResultAnimClass] = useState("");
  const confettiCounterRef = useRef(0);

  useEffect(() => {
    let prevOutcome: typeof lastRaceOutcome = null;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGameStore.subscribe((state) => {
      const outcome = state.lastRaceOutcome;
      if (outcome && outcome !== prevOutcome) {
        if (outcome.result === "win") {
          confettiCounterRef.current++;
          setConfettiKey(confettiCounterRef.current);
          setResultAnimClass("animate-pulse-gold");
        } else if (outcome.result === "dnf") {
          setResultAnimClass("animate-shake");
        } else {
          setResultAnimClass("");
        }
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
          setResultAnimClass("");
          setConfettiKey(null);
        }, 3500);
      }
      prevOutcome = outcome;
    });
    return () => { unsub(); if (clearTimer) clearTimeout(clearTimer); };
  }, []);

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
      {confettiKey !== null && <Confetti key={confettiKey} />}

      {/* Circuit selector */}
      <div className="col-span-1 flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Circuits
        </h2>
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

        {/* Pre-race odds */}
        {activeVehicle && selectedCircuit && !isRacing && (
          <OddsDisplay
            performance={activeVehicle.stats.performance}
            reliability={activeVehicle.stats.reliability}
            difficulty={selectedCircuit.difficulty}
            prestigeBonus={prestigeBonus.scrapMultiplier}
          />
        )}

        {/* Race button + streak */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <button
            onClick={enterRace}
            disabled={!canEnter}
            className="rounded-lg bg-orange-600 px-6 py-2.5 font-bold text-white text-sm transition-all hover:bg-orange-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            {isRacing ? "Racing..." : "Enter Race"}
          </button>
          {autoRaceUnlocked && !isRacing && (
            <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
              Auto-race
            </span>
          )}
          <StreakDisplay streak={winStreak} best={bestWinStreak} />
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

        {/* Live race view */}
        {isRacing && raceStartTime && raceEvents.length > 0 && selectedCircuit && (
          <LiveRaceView
            events={raceEvents}
            startTime={raceStartTime}
            durationMs={selectedCircuit.raceDuration}
          />
        )}

        {/* Last result */}
        {!isRacing && lastRaceOutcome && (
          <div
            className={`rounded-lg border p-4 ${resultAnimClass} ${
              lastRaceOutcome.result === "win"
                ? "border-green-800 bg-green-900/20"
                : lastRaceOutcome.result === "dnf"
                ? "border-red-800 bg-red-900/20"
                : "border-yellow-800 bg-yellow-900/20"
            }`}
          >
            <div
              className={`mb-2 font-bold text-lg ${RESULT_COLORS[lastRaceOutcome.result]}`}
            >
              {lastRaceOutcome.result === "win"
                ? "🏆 WIN"
                : lastRaceOutcome.result === "dnf"
                ? "💥 DNF"
                : `P${lastRaceOutcome.position}/${lastRaceOutcome.totalRacers}`}
            </div>
            {lastRaceOutcome.log.map((line, i) => (
              <div key={i} className={`text-sm text-zinc-300 ${i === 0 ? "" : "animate-fade-up"}`}>
                {line}
              </div>
            ))}
            {lastRaceOutcome.scrapsEarned > 0 && (
              <div className="mt-2 inline-block animate-number-pop font-mono text-sm font-bold text-green-400">
                +${formatNumber(lastRaceOutcome.scrapsEarned)}
              </div>
            )}
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
