import { describe, expect, it } from "vitest";
import { createInitialState, getSellValueBonus, type GameState } from "@/state/store";
import { addToClass, applyRacePayout, collectBonuses, composeBonus, racePerformanceMultiplier } from "../bonuses";

function state(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides } as GameState;
}

describe("bonus algebra", () => {
  it("adds within a source class", () => {
    const stack = addToClass(addToClass({}, "permanent", 0.1), "permanent", 0.2);
    expect(stack.permanent).toBeCloseTo(0.3);
    expect(composeBonus(stack)).toBeCloseTo(1.3);
  });

  it("multiplies across source classes", () => {
    expect(composeBonus({})).toBe(1);
    expect(composeBonus({ legacy: 0.5, momentum: 0.1 })).toBeCloseTo(1.65);
    expect(composeBonus({ legacy: 0.5, momentum: 0.1, permanent: 0.2 })).toBeCloseTo(1.98);
  });

  it("never lets one class drive a payout negative", () => {
    expect(composeBonus({ plan: -2 })).toBe(0);
  });
});

describe("collectBonuses", () => {
  it("routes momentum, legacy, and milestone sources into distinct classes", () => {
    const bonuses = collectBonuses(state({
      activeMomentumTiers: ["momentum_warmed_up", "momentum_reputation"],
      prestigeBonus: { scrapMultiplier: 1.2, luckBonus: 0, repMultiplier: 1.15 },
    }));
    expect(bonuses.raceScrap.momentum).toBeCloseTo(0.1);
    expect(bonuses.raceScrap.legacy).toBeCloseTo(0.2);
    expect(bonuses.raceRep.momentum).toBeCloseTo(0.25);
    expect(bonuses.raceRep.legacy).toBeCloseTo(0.15);
    expect(bonuses.sellValue.momentum).toBeCloseTo(0.1);
  });

  it("puts the Consolation Sponsor workshop upgrade in the workshop class of non-win payouts only", () => {
    const bonuses = collectBonuses(state({ workshopLevels: { consolation_sponsor: 1 } }));
    expect(bonuses.consolationScrap.workshop).toBeCloseTo(0.2);
    expect(bonuses.raceScrap.workshop ?? 0).toBe(0);
  });
});

describe("applyRacePayout", () => {
  const outcome = (result: "win" | "loss" | "dnf", scrapsEarned: number, repEarned: number) => ({ result, scrapsEarned, repEarned });

  it("composes Scrap Bucks and Rep with the same algebra", () => {
    const bonuses = collectBonuses(state({
      activeMomentumTiers: ["momentum_warmed_up", "momentum_reputation"],
      prestigeBonus: { scrapMultiplier: 1.2, luckBonus: 0, repMultiplier: 1.15 },
    }));
    const payout = applyRacePayout(bonuses, outcome("win", 100, 10), 1);
    expect(payout.scraps).toBe(Math.floor(100 * 1.1 * 1.2));
    expect(payout.rep).toBeCloseTo(10 * 1.25 * 1.15);
  });

  it("applies Consolation Sponsor to losses but not wins", () => {
    const bonuses = collectBonuses(state({ workshopLevels: { consolation_sponsor: 1 } }));
    expect(applyRacePayout(bonuses, outcome("loss", 50, 1), 0).scraps).toBe(60);
    expect(applyRacePayout(bonuses, outcome("win", 50, 1), 1).scraps).toBe(50);
  });

  it("is a no-op for a fresh save", () => {
    const payout = applyRacePayout(collectBonuses(state()), outcome("win", 77, 3.5), 1);
    expect(payout).toEqual({ scraps: 77, rep: 3.5 });
  });
});

describe("getSellValueBonus", () => {
  it("includes the Warmed Up momentum tier, as its description promises (+10% scrap from all sources)", () => {
    expect(getSellValueBonus(state())).toBeCloseTo(0);
    expect(getSellValueBonus(state({ activeMomentumTiers: ["momentum_warmed_up"] }))).toBeCloseTo(0.1);
  });
});

describe("racePerformanceMultiplier", () => {
  it("is 1 for a fresh save and grows with the racer's driving skill", () => {
    const fresh = state();
    expect(racePerformanceMultiplier(collectBonuses(fresh, 0))).toBeCloseTo(1);
    const skilled = state({ racerSkills: { ...fresh.racerSkills, driving: { xp: 0, level: 10 } } });
    expect(racePerformanceMultiplier(collectBonuses(skilled, 0))).toBeGreaterThan(1);
  });
});
