import { describe, it, expect } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { FATIGUE, fatiguePerRace } from "@/config/progression";
import {
  fatigueAfterRace,
  fatigueAfterTick,
  getFatigueCap,
  getFatigueGainMultiplier,
  getFatigueRecoveryPerHour,
  isTooTiredToAutoRace,
  recoverFatigue,
} from "../fatigue";
import { calcFatigue } from "@/components/Admin/charts/balanceUtils";

function state(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides } as GameState;
}

describe("fatigue rhythm", () => {
  it("adds 4 + tier per race", () => {
    expect(fatiguePerRace(0)).toBe(4);
    expect(fatiguePerRace(6)).toBe(10);
    expect(fatigueAfterRace(state(), 0, 0)).toBe(4);
    expect(fatigueAfterRace(state(), 10, 3)).toBe(17);
  });

  it("recovers 12 per hour of wall-clock time and never goes below zero", () => {
    expect(recoverFatigue(50, 3_600_000, FATIGUE.RECOVERY_PER_HOUR)).toBe(38);
    expect(recoverFatigue(50, 30_000, FATIGUE.RECOVERY_PER_HOUR)).toBe(49.9);
    expect(recoverFatigue(1, 3_600_000, FATIGUE.RECOVERY_PER_HOUR)).toBe(0);
    // A maxed driver is fresh again in ~8 hours.
    expect(recoverFatigue(99, 8.25 * 3_600_000, FATIGUE.RECOVERY_PER_HOUR)).toBe(0);
  });

  it("clamps to the cap, and team Second Wind lowers the cap", () => {
    expect(fatigueAfterRace(state(), 98, 6)).toBe(FATIGUE.MAX);
    const capped = state({ teamUpgradeLevels: { team_second_wind: 2 } });
    expect(getFatigueCap(capped)).toBe(89);
    expect(fatigueAfterRace(capped, 88, 6)).toBe(89);
  });

  it("maps gain reducers onto the per-race amount", () => {
    expect(getFatigueGainMultiplier(state())).toBe(1);
    const immune = state({ ownerUpgradeLevels: { owner_fatigue_immune: 1 } });
    expect(getFatigueGainMultiplier(immune)).toBe(0.5);
    expect(fatigueAfterRace(immune, 0, 0)).toBe(2);
    const secondWind = state({ activeMomentumTiers: ["momentum_second_wind"] });
    expect(getFatigueGainMultiplier(secondWind)).toBeCloseTo(0.85);
  });

  it("maps Iron Will and the Endurance skill onto the recovery rate", () => {
    expect(getFatigueRecoveryPerHour(state())).toBe(12);
    const ironWill = state({ legacyUpgradeLevels: { leg_fatigue_offset: 5 } });
    expect(getFatigueRecoveryPerHour(ironWill)).toBeCloseTo(18);
    const enduring = state({ racerSkills: { ...createInitialState().racerSkills, endurance: { xp: 0, level: 50 } } });
    expect(getFatigueRecoveryPerHour(enduring, 1)).toBeGreaterThan(12);
  });

  it("settles a tick as rest first, then the races that fired", () => {
    const tickMs = 30_000;
    expect(fatigueAfterTick(state(), 20, tickMs, 0, 0)).toBe(19.9);
    expect(fatigueAfterTick(state(), 20, tickMs, 1, 0)).toBe(23.9);
    expect(fatigueAfterTick(state(), 0, tickMs, 2, 1)).toBe(10);
  });

  it("auto-race rests above the ceiling and races at or below it", () => {
    expect(isTooTiredToAutoRace(state({ fatigue: 70 }))).toBe(false);
    expect(isTooTiredToAutoRace(state({ fatigue: 70.5 }))).toBe(true);
    expect(isTooTiredToAutoRace(state({ fatigue: 90, autoRaceMaxFatigue: 99 }))).toBe(false);
    expect(createInitialState().autoRaceMaxFatigue).toBe(FATIGUE.AUTO_RACE_MAX_DEFAULT);
  });
});

describe("calcFatigue (balance charts)", () => {
  it("is zero for no races, rises with races, and caps at 99", () => {
    expect(calcFatigue(0, 0)).toBe(0);
    expect(calcFatigue(10, 0)).toBeGreaterThan(0);
    expect(calcFatigue(10, 0)).toBeLessThan(calcFatigue(20, 0));
    expect(calcFatigue(100_000, 0)).toBe(99);
  });

  it("recovers faster with Iron Will", () => {
    expect(calcFatigue(20, 25)).toBeLessThanOrEqual(calcFatigue(20, 0));
  });
});
