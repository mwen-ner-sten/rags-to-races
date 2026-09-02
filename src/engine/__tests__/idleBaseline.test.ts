import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import { computeTick, getIdleRates, getManualScavengeCooldownMs, getRaceTicksNeeded, RACE_TICKS_DEFAULT, TICK_MS_DEFAULT } from "@/engine/tick";
import { MANUAL_SCAVENGE_COOLDOWN_MS_DEFAULT, MANUAL_SCAVENGE_COOLDOWN_MS_MIN } from "@/config/gameplayLimits";
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

describe("idle baseline", () => {
  it("starts every run with both automations on", () => {
    const state = createInitialState();
    expect(state.autoScavengeUnlocked).toBe(true);
    expect(state.autoRaceUnlocked).toBe(true);
    expect(state.autoRaceMinCondition).toBeGreaterThan(0);
  });

  it("scavenges on the very first tick of a fresh save", () => {
    const result = withRandomSource(new SeededRandomSource("fresh-first-tick"), () => computeTick(createInitialState() as GameState));
    expect(result.scavengesCompleted).toBe(1);
    expect(result.partsScavenged).toBeGreaterThanOrEqual(1);
  });

  it("auto-races the first vehicle without a reset", () => {
    const result = withRandomSource(new SeededRandomSource("first-auto-race"), () => computeTick(raceReady({ prestigeCount: 0 })));
    expect(result.raceOutcome).not.toBeNull();
    expect(result.newRaceTickProgress).toBe(0);
  });

  it("pauses auto-race below the condition floor and resumes once repaired past it", () => {
    const base = raceReady();
    const vehicle = { ...base.garage[0], condition: 10 };
    const damaged = { ...base, garage: [vehicle], activeVehicleId: vehicle.id, autoRaceMinCondition: 25 };
    const paused = computeTick(damaged);
    expect(paused.raceOutcome).toBeNull();

    const permissive = computeTick({ ...damaged, autoRaceMinCondition: 0 });
    expect(permissive.raceOutcome).not.toBeNull();

    // Auto-repair that lifts the car over the floor lets the same tick race.
    const repaired = computeTick({ ...damaged, workshopLevels: { ...damaged.workshopLevels, auto_repair: 3 } });
    expect(repaired.vehicleRepairAmount).toBeGreaterThan(0);
    expect(repaired.raceOutcome).not.toBeNull();
  });

  it("applies Thorough Search to automated scavenging", () => {
    const state = { ...createInitialState(), workshopLevels: { thorough_search: 5 } } as unknown as GameState;
    const doubled = withRandomSource(new SeededRandomSource("thorough-auto"), () => computeTick(state));
    expect(doubled.partsScavenged).toBe(2);
    const single = withRandomSource(new SeededRandomSource("thorough-auto"), () => computeTick(createInitialState() as GameState));
    expect(single.partsScavenged).toBe(1);
  });

  it("paces manual scavenging with the hold-speed upgrades", () => {
    const fresh = createInitialState() as GameState;
    expect(getManualScavengeCooldownMs(fresh)).toBe(MANUAL_SCAVENGE_COOLDOWN_MS_DEFAULT);
    const maxed = { ...fresh, workshopLevels: { steady_hands: 3, lightning_fingers: 2, frantic_scavenger: 3 } } as GameState;
    expect(getManualScavengeCooldownMs(maxed)).toBe(MANUAL_SCAVENGE_COOLDOWN_MS_MIN);
  });

  it("reports idle rates the HUD can show", () => {
    const fresh = createInitialState() as GameState;
    expect(getIdleRates(fresh)).toEqual({ scavengesPerHour: 3_600_000 / TICK_MS_DEFAULT, racesPerHour: 0 });
    const racing = raceReady();
    expect(getIdleRates(racing).racesPerHour).toBeCloseTo((3_600_000 / TICK_MS_DEFAULT) / getRaceTicksNeeded(racing));
  });

  it("shortens the race cadence with Pit Rhythm after the first reset", () => {
    expect(getRaceTicksNeeded(raceReady({ prestigeCount: 0 }))).toBe(RACE_TICKS_DEFAULT);
    expect(getRaceTicksNeeded(raceReady({ prestigeCount: 1 }))).toBe(RACE_TICKS_DEFAULT - 1);
  });
});
