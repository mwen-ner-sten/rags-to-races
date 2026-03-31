"use client";

import { useGameStore } from "@/state/store";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { calculateOdds } from "@/engine/race";
import { getGearBonuses } from "@/engine/gear";
import { RACE_TICKS_DEFAULT } from "@/engine/tick";
import { formatNumber } from "@/utils/format";
import { useState, useEffect, useRef, useMemo } from "react";
import Confetti from "@/components/effects/Confetti";
import type { RaceEvent } from "@/engine/raceEvents";

const RESULT_STYLES: Record<string, React.CSSProperties> = {
  win: { color: "var(--success)" },
  loss: { color: "var(--warning)" },
  dnf: { color: "var(--danger)" },
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
    <div
      className="rounded-lg p-4 space-y-3"
      style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--accent-border)", background: "var(--panel-bg)" }}
    >
      {/* Position indicator */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Position
          </span>
          <span className="font-mono text-lg font-bold" style={{ color: "var(--accent)" }}>
            P{position}
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>/{totalRacers}</span>
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
                  isPlayer ? "font-bold scale-110 shadow-lg" : ""
                }`}
                style={
                  isPlayer
                    ? { background: "var(--accent)", color: "var(--btn-primary-text)" }
                    : pos < position
                      ? { background: "var(--panel-border)", color: "var(--text-muted)" }
                      : { background: "var(--panel-bg)", color: "var(--text-muted)" }
                }
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
          className="animate-fade-up rounded-md px-3 py-2"
          style={{ background: "var(--panel-bg)" }}
        >
          <span
            className={`text-sm font-medium ${currentEvent.type === "finish" ? "font-bold" : ""}`}
            style={
              currentEvent.type === "finish" ? { color: "var(--text-white)" } :
              currentEvent.type === "position_change" ? { color: "var(--accent)" } :
              currentEvent.type === "mechanical" ? { color: "var(--danger)" } :
              currentEvent.type === "close_call" ? { color: "var(--warning)" } :
              { color: "var(--text-heading)" }
            }
          >
            {currentEvent.commentary}
          </span>
        </div>
      )}

      {/* Progress bar (track) */}
      <div className="relative">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--panel-bg)" }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress * 100}%`, background: "linear-gradient(to right, var(--btn-primary-bg), var(--accent))" }}
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
  fatigue,
  gearPerformanceBonus,
  gearDnfReduction,
}: {
  performance: number;
  reliability: number;
  difficulty: number;
  prestigeBonus: number;
  fatigue: number;
  gearPerformanceBonus: number;
  gearDnfReduction: number;
}) {
  const odds = useMemo(
    () => calculateOdds(performance, reliability, difficulty, prestigeBonus, fatigue, gearPerformanceBonus, gearDnfReduction),
    [performance, reliability, difficulty, prestigeBonus, fatigue, gearPerformanceBonus, gearDnfReduction],
  );

  const winStyle: React.CSSProperties = odds.winChance >= 0.5
    ? { color: "var(--success)" }
    : odds.winChance >= 0.2
      ? { color: "var(--warning)" }
      : { color: "var(--danger)" };

  const dnfStyle: React.CSSProperties = odds.dnfChance <= 0.05
    ? { color: "var(--success)" }
    : odds.dnfChance <= 0.15
      ? { color: "var(--warning)" }
      : { color: "var(--danger)" };

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-3 py-1.5 text-xs"
      style={{ background: "var(--panel-bg)" }}
    >
      <span style={{ color: "var(--text-muted)" }}>Odds:</span>
      <span className="font-semibold" style={winStyle}>
        {Math.round(odds.winChance * 100)}% Win
      </span>
      <span style={{ color: "var(--text-muted)" }}>·</span>
      <span className="font-medium" style={winStyle}>{odds.oddsLabel}</span>
      {odds.dnfChance > 0 && (
        <>
          <span style={{ color: "var(--text-muted)" }}>·</span>
          <span style={dnfStyle}>
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

  const intensityStyle: React.CSSProperties = streak >= 5
    ? { color: "var(--danger)" }
    : streak >= 3
      ? { color: "var(--accent)" }
      : { color: "var(--warning)" };

  const fires = streak >= 10 ? "🔥🔥🔥" : streak >= 5 ? "🔥🔥" : streak >= 1 ? "🔥" : "";

  return (
    <div className="flex items-center gap-2 text-xs">
      {streak > 0 && (
        <span
          className={`font-bold ${streak >= 5 ? "animate-pulse-fire" : ""}`}
          style={intensityStyle}
        >
          {fires} {streak}W Streak
        </span>
      )}
      {best > 0 && (
        <span style={{ color: "var(--text-muted)" }}>
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
  const raceTickProgress = useGameStore((s) => s.raceTickProgress);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const raceEvents = useGameStore((s) => s.raceEvents);
  const raceStartTime = useGameStore((s) => s.raceStartTime);
  const winStreak = useGameStore((s) => s.winStreak);
  const bestWinStreak = useGameStore((s) => s.bestWinStreak);
  const prestigeBonus = useGameStore((s) => s.prestigeBonus);
  const fatigue = useGameStore((s) => s.fatigue);
  const equippedGear = useGameStore((s) => s.equippedGear);
  const setSelectedCircuit = useGameStore((s) => s.setSelectedCircuit);
  const enterRace = useGameStore((s) => s.enterRace);

  // Compute how many ticks are needed between auto-races
  const raceTicksNeeded = Math.max(
    1,
    RACE_TICKS_DEFAULT - (workshopLevels["pit_crew"] ?? 0),
  );

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
  const gb = useMemo(() => getGearBonuses(equippedGear), [equippedGear]);

  const unlockedCircuits = CIRCUIT_DEFINITIONS.filter((c) =>
    unlockedCircuitIds.includes(c.id),
  );
  const lockedCircuits = CIRCUIT_DEFINITIONS.filter(
    (c) => !unlockedCircuitIds.includes(c.id),
  );

  const selectedCircuit = CIRCUIT_DEFINITIONS.find((c) => c.id === selectedCircuitId);
  const vehicleCondition = activeVehicle ? (activeVehicle.condition ?? 100) : 0;
  const canEnter =
    !isRacing &&
    activeVehicle &&
    selectedCircuit &&
    scrapBucks >= selectedCircuit.entryFee &&
    activeVehicleDef &&
    activeVehicleDef.tier >= selectedCircuit.minVehicleTier &&
    vehicleCondition > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
      {confettiKey !== null && <Confetti key={confettiKey} />}

      {/* Circuit selector */}
      <div className="col-span-1 flex flex-col gap-3">
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-heading)" }}
        >
          Circuits
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
          {unlockedCircuits.map((circuit) => (
            <button
              key={circuit.id}
              onClick={() => setSelectedCircuit(circuit.id)}
              className="shrink-0 rounded-lg p-2.5 sm:p-3 text-left transition-colors lg:shrink"
              style={
                selectedCircuitId === circuit.id
                  ? { borderWidth: 1, borderStyle: "solid", borderColor: "var(--panel-border-active)", background: "var(--accent-bg)" }
                  : { borderWidth: 1, borderStyle: "solid", borderColor: "var(--panel-border)", background: "var(--panel-bg)" }
              }
            >
              <div className="font-semibold text-sm" style={{ color: "var(--text-white)" }}>{circuit.name}</div>
              <div className="mt-0.5 text-xs hidden lg:block" style={{ color: "var(--text-heading)" }}>{circuit.description}</div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>${formatNumber(circuit.entryFee)}</span>
                <span>Prize: ${formatNumber(circuit.rewardBase)}</span>
                <span>+{circuit.repReward} Rep</span>
              </div>
              <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                T{circuit.minVehicleTier}+ vehicle
              </div>
            </button>
          ))}
        </div>
        {lockedCircuits.map((circuit) => (
          <div
            key={circuit.id}
            className="hidden lg:block rounded-lg p-3 opacity-50"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
          >
            <div className="font-semibold" style={{ color: "var(--text-muted)" }}>🔒 {circuit.name}</div>
            <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Need {circuit.unlockRepCost} Rep to unlock
            </div>
          </div>
        ))}
      </div>

      {/* Race action */}
      <div className="col-span-1 lg:col-span-2 flex flex-col gap-3 sm:gap-4">
        {/* Active vehicle info */}
        {activeVehicle && activeVehicleDef ? (
          <div
            className="rounded-lg p-3 sm:p-4"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Racing with</span>
              <span className="font-semibold text-sm" style={{ color: "var(--text-white)" }}>
                T{activeVehicleDef.tier} {activeVehicleDef.name}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs sm:flex sm:gap-4" style={{ color: "var(--text-heading)" }}>
              <span>Spd: {Math.floor(activeVehicle.stats.speed)}</span>
              <span>Hnd: {Math.floor(activeVehicle.stats.handling)}</span>
              <span>Rel: {Math.floor(activeVehicle.stats.reliability)}</span>
              <span className="font-semibold" style={{ color: "var(--accent)" }}>
                Perf: {Math.floor(activeVehicle.stats.performance)}
              </span>
              <span
                className="font-semibold"
                style={
                  vehicleCondition > 70
                    ? { color: "var(--success)" }
                    : vehicleCondition > 30
                      ? { color: "var(--warning)" }
                      : { color: "var(--danger)" }
                }
              >
                Cond: {vehicleCondition}%
              </span>
            </div>
            {vehicleCondition <= 0 && (
              <div className="mt-1.5 text-xs font-semibold" style={{ color: "var(--danger)" }}>
                Vehicle is broken! Repair it in the Garage tab.
              </div>
            )}
            {vehicleCondition > 0 && vehicleCondition <= 30 && (
              <div className="mt-1.5 text-xs" style={{ color: "var(--warning)" }}>
                Your vehicle is falling apart! Consider repairing.
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-lg p-3 sm:p-4 text-sm"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--text-muted)" }}
          >
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
            fatigue={fatigue}
            gearPerformanceBonus={gb.race_performance_pct}
            gearDnfReduction={gb.race_dnf_reduction}
          />
        )}

        {/* Race button + streak */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <button
            onClick={enterRace}
            disabled={!canEnter}
            className="rounded-lg px-6 py-2.5 font-bold text-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            {isRacing ? "Racing..." : "Enter Race"}
          </button>
          {!autoRaceUnlocked && prestigeCount === 0 && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Auto-Race unlocks after first Prestige
            </span>
          )}
          {autoRaceUnlocked && !isRacing && (
            <div className="flex items-center gap-2">
              <span
                className="rounded px-2 py-1 text-xs"
                style={{ background: "rgba(59,130,246,.2)", color: "var(--info)" }}
              >
                Auto-race
              </span>
              {raceTicksNeeded > 1 && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-1.5 w-16 rounded-full overflow-hidden"
                    style={{ background: "var(--divider)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((raceTickProgress / raceTicksNeeded) * 100)}%`,
                        background: "var(--info)",
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {raceTickProgress}/{raceTicksNeeded}
                  </span>
                </div>
              )}
            </div>
          )}
          <StreakDisplay streak={winStreak} best={bestWinStreak} />
          {selectedCircuit && !canEnter && !isRacing && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {!activeVehicle
                ? "No vehicle"
                : vehicleCondition <= 0
                ? "Vehicle broken — repair in Garage"
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
            className={`rounded-lg p-4 ${resultAnimClass}`}
            style={
              lastRaceOutcome.result === "win"
                ? { borderWidth: 1, borderStyle: "solid", borderColor: "var(--success)", background: "rgba(92,184,92,.12)" }
                : lastRaceOutcome.result === "dnf"
                ? { borderWidth: 1, borderStyle: "solid", borderColor: "var(--danger)", background: "rgba(224,92,92,.12)" }
                : { borderWidth: 1, borderStyle: "solid", borderColor: "var(--warning)", background: "rgba(234,179,8,.12)" }
            }
          >
            <div
              className="mb-2 font-bold text-lg"
              style={RESULT_STYLES[lastRaceOutcome.result]}
            >
              {lastRaceOutcome.result === "win"
                ? "🏆 WIN"
                : lastRaceOutcome.result === "dnf"
                ? "💥 DNF"
                : `P${lastRaceOutcome.position}/${lastRaceOutcome.totalRacers}`}
            </div>
            {lastRaceOutcome.log.map((line, i) => (
              <div
                key={i}
                className={`text-sm ${i === 0 ? "" : "animate-fade-up"}`}
                style={{ color: "var(--text-heading)" }}
              >
                {line}
              </div>
            ))}
            {lastRaceOutcome.scrapsEarned > 0 && (
              <div
                className="mt-2 inline-block animate-number-pop font-mono text-sm font-bold"
                style={{ color: "var(--success)" }}
              >
                +${formatNumber(lastRaceOutcome.scrapsEarned)}
              </div>
            )}
          </div>
        )}

        {/* Race history */}
        {raceHistory.length > 1 && (
          <div>
            <h3
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              History
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {raceHistory.slice(1).map((r, i) => (
                <span
                  key={i}
                  className="rounded px-2 py-0.5 text-xs font-mono"
                  style={
                    r.result === "win"
                      ? { background: "rgba(92,184,92,.12)", color: "var(--success)" }
                      : r.result === "dnf"
                      ? { background: "rgba(224,92,92,.12)", color: "var(--danger)" }
                      : { background: "var(--panel-bg)", color: "var(--text-heading)" }
                  }
                  title={r.log[0]}
                >
                  {r.result === "win" ? "W" : r.result === "dnf" ? "X" : `P${r.position}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rep display */}
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
          Rep Points: <span className="font-semibold" style={{ color: "var(--info)" }}>{Math.floor(repPoints)}</span>
          {!autoRaceUnlocked && prestigeCount === 0 && (
            <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>(Auto-Race unlocks after first Prestige)</span>
          )}
        </div>
      </div>
    </div>
  );
}
