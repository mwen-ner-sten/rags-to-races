import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { MAX_OFFLINE_DURATION_MS, OFFLINE_TICK_MS_MIN } from "@/config/gameplayLimits";
import {
  computeOfflineTickBudget,
  computeTick,
  computeTickSpeedMs,
  getIdleRates,
  RACE_TICKS_DEFAULT,
  TICK_MS_DEFAULT,
  TICK_MS_MIN,
} from "../tick";
import { calculateOdds, simulateRace } from "../race";
import { expectedLoadedWeight, type BuiltVehicle, type InstalledPart } from "../build";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

function raceReady(overrides: Partial<GameState> = {}): GameState {
  const fixture = createGameplayFixture("first_race_ready");
  return {
    ...createInitialState(),
    ...fixture.payload.state,
    raceTickProgress: RACE_TICKS_DEFAULT - 1,
    ...overrides,
  } as GameState;
}

describe("computeTickSpeedMs", () => {
  it("converts Time Dilation seconds into milliseconds like every other reduction", () => {
    const state = { ...createInitialState(), trackPerkLevels: { track_time_dilate: 1 } } as unknown as GameState;
    expect(computeTickSpeedMs(state)).toBe(TICK_MS_DEFAULT - 5_000);
  });

  it("always returns whole milliseconds, never below the floor", () => {
    const states = [
      createInitialState(),
      { ...createInitialState(), workshopLevels: { tick_accelerator: 1 }, unlockedPlaystyleNodes: ["ps_eng_t3a"] },
      { ...createInitialState(), workshopLevels: { tick_accelerator: 100 } },
    ] as unknown as GameState[];
    for (const state of states) {
      const ms = computeTickSpeedMs(state);
      expect(Number.isInteger(ms)).toBe(true);
      expect(ms).toBeGreaterThanOrEqual(TICK_MS_MIN);
    }
  });
});

describe("getIdleRates", () => {
  it("reports zero races while the active vehicle sits below the auto-race condition floor", () => {
    const base = raceReady();
    const vehicle = { ...base.garage[0], condition: 10 };
    const damaged = { ...base, garage: [vehicle], activeVehicleId: vehicle.id, autoRaceMinCondition: 25 };
    expect(getIdleRates(damaged).racesPerHour).toBe(0);
    expect(getIdleRates({ ...damaged, autoRaceMinCondition: 0 }).racesPerHour).toBeGreaterThan(0);
    // Auto-repair that lifts the car over the floor counts, exactly as in computeTick.
    expect(getIdleRates({ ...damaged, workshopLevels: { ...damaged.workshopLevels, auto_repair: 3 } }).racesPerHour).toBeGreaterThan(0);
  });
});

describe("auto-race progress banking", () => {
  it("keeps the accumulated progress when the race cannot fire, and fires as soon as it can", () => {
    const base = raceReady();
    const vehicle = { ...base.garage[0], condition: 10 };
    const blocked = { ...base, garage: [vehicle], activeVehicleId: vehicle.id, autoRaceMinCondition: 25 };
    const paused = computeTick(blocked);
    expect(paused.raceOutcome).toBeNull();
    expect(paused.newRaceTickProgress).toBe(RACE_TICKS_DEFAULT);

    const resumed = computeTick({ ...blocked, raceTickProgress: paused.newRaceTickProgress, autoRaceMinCondition: 0 });
    expect(resumed.raceOutcome).not.toBeNull();
    expect(resumed.newRaceTickProgress).toBe(0);
  });

  it("does not duplicate the junk-filter counters", () => {
    const result = computeTick(createInitialState() as GameState);
    expect("junkFilteredParts" in result).toBe(false);
    expect("junkFilterScrap" in result).toBe(false);
  });
});

describe("computeOfflineTickBudget", () => {
  const fastState = { ...createInitialState(), workshopLevels: { tick_accelerator: 100 } } as unknown as GameState;

  it("matches the online tick floor for short absences", () => {
    expect(OFFLINE_TICK_MS_MIN).toBe(TICK_MS_MIN);
    const budget = computeOfflineTickBudget(fastState, 10 * 60_000);
    expect(budget.tickMs).toBe(TICK_MS_MIN);
    expect(budget.ticks).toBe(6_000);
  });

  it("bounds the number of simulated ticks for long absences", () => {
    const budget = computeOfflineTickBudget(fastState, MAX_OFFLINE_DURATION_MS);
    expect(budget.ticks).toBe(Math.floor(MAX_OFFLINE_DURATION_MS / budget.tickMs));
    expect(computeOfflineTickBudget(fastState, MAX_OFFLINE_DURATION_MS * 3).ticks).toBe(Math.floor(MAX_OFFLINE_DURATION_MS / budget.tickMs));
  });

  it("caps elapsed time at the offline duration limit and never returns negative ticks", () => {
    const slow = createInitialState() as GameState;
    expect(computeOfflineTickBudget(slow, MAX_OFFLINE_DURATION_MS * 2).ticks).toBe(Math.floor(MAX_OFFLINE_DURATION_MS / TICK_MS_DEFAULT));
    expect(computeOfflineTickBudget(slow, -5).ticks).toBe(0);
    expect(computeOfflineTickBudget(slow, Number.NaN).ticks).toBe(0);
  });
});

describe("finishing position uses effective performance", () => {
  it("exposes the effective ratio behind the odds", () => {
    expect(calculateOdds(100, 100, 100, 0, 0.5).ratio).toBeCloseTo(1.5);
    expect(calculateOdds(100, 100, 100, 50).ratio).toBeCloseTo(0.75);
  });

  it("lets performance bonuses improve losing positions, not just win chance", () => {
    // A synthetic venue at the pre-ladder Regional difficulty keeps this build a mid-field car.
    const regional = { ...CIRCUIT_DEFINITIONS.find((c) => c.id === "regional_circuit")!, difficulty: 166 };
    const vehicle: BuiltVehicle = {
      id: "fixture",
      definitionId: "simulation_fixture",
      parts: {},
      stats: { speed: regional.difficulty * 0.6, handling: regional.difficulty * 0.6, reliability: 300, weight: 500, performance: 0 },
      builtAt: 0,
      condition: 100,
      totalRaces: 0,
    };
    const averageLoss = (performanceBonus: number) => withRandomSource(new SeededRandomSource("effective-position"), () => {
      let total = 0;
      let losses = 0;
      for (let i = 0; i < 400; i++) {
        const outcome = simulateRace(vehicle, regional, 0, performanceBonus);
        if (outcome.result !== "loss") continue;
        total += outcome.position;
        losses++;
      }
      return total / Math.max(1, losses);
    });
    expect(averageLoss(1.5)).toBeLessThan(averageLoss(0));
  });
});

describe("expectedLoadedWeight", () => {
  function installed(slot: string, definitionId: string): [string, InstalledPart] {
    return [slot, { part: { id: `${slot}_${definitionId}`, definitionId, condition: "pristine", foundAt: "test", type: "part" }, addons: [] }];
  }

  it("counts an installed optional slot so optional parts are a fair trade rather than a pure penalty", () => {
    const streetRacer = getVehicleById("street_racer")!;
    const required = Object.fromEntries([
      installed("engine", "engine_v6"), installed("wheel", "wheel_sport"), installed("frame", "frame_steel"),
      installed("fuel", "fuel_tank_large"), installed("drivetrain", "drive_chain"),
    ]);
    const withOptional = { ...required, ...Object.fromEntries([installed("electronics", "elec_basic")]) };
    const baseline = expectedLoadedWeight(streetRacer);
    expect(expectedLoadedWeight(streetRacer, required)).toBe(baseline);
    // elec_basic weighs 2 and elec_ecu 3: the slot's expected load is their average.
    expect(expectedLoadedWeight(streetRacer, withOptional) - baseline).toBeCloseTo(2.5);
  });
});
