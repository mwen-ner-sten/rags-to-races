import { describe, it, expect } from "vitest";
import { calculateOdds } from "../race";

describe("calculateOdds", () => {
  it("clamps win chance to minimum 0.05", () => {
    // Very low performance vs high difficulty
    const { winChance } = calculateOdds(1, 100, 1000);
    expect(winChance).toBe(0.05);
  });

  it("clamps win chance to maximum 0.95", () => {
    // Very high performance vs low difficulty
    const { winChance } = calculateOdds(1000, 100, 1);
    expect(winChance).toBe(0.95);
  });

  it("calculates win chance correctly for balanced inputs", () => {
    // performance=50, difficulty=50: effectivePerformance / (difficulty*2) = 50/100 = 0.5
    const { winChance } = calculateOdds(50, 100, 50);
    expect(winChance).toBe(0.5);
  });

  it("applies fatigue penalty at fatigue=50 (25% reduction)", () => {
    // performance=100, difficulty=50, no prestige bonus
    // Without fatigue: 100 / (50*2) = 1.0 → clamped to 0.95
    // With fatigue=50: fatigueMult = 1 - 50*0.005 = 0.75
    // effectivePerf = 100 * 1 * 0.75 = 75, winChance = 75/100 = 0.75
    const { winChance } = calculateOdds(100, 100, 50, 1, 50);
    expect(winChance).toBe(0.75);
  });

  it("calculates DNF chance from reliability", () => {
    // dnfChance = max(0, 0.3 - reliability/200)
    // reliability=0: 0.3
    // reliability=60: 0.3 - 0.3 = 0.0
    // reliability=100: 0.3 - 0.5 → 0 (clamped)
    expect(calculateOdds(50, 0, 50).dnfChance).toBe(0.3);
    expect(calculateOdds(50, 60, 50).dnfChance).toBe(0);
    expect(calculateOdds(50, 100, 50).dnfChance).toBe(0);
  });

  it("applies gear DNF reduction", () => {
    // reliability=0, gearDnfReduction=0.1: 0.3 - 0 - 0.1 = 0.2
    const { dnfChance } = calculateOdds(50, 0, 50, 1, 0, 0, 0.1);
    expect(dnfChance).toBeCloseTo(0.2);
  });

  it("applies gear performance bonus", () => {
    // performance=40, difficulty=50, gearPerformanceBonus=0.5
    // effectivePerf = 40 * 1 * 1 * 1.5 = 60, winChance = 60/100 = 0.6
    const { winChance } = calculateOdds(40, 100, 50, 1, 0, 0.5);
    expect(winChance).toBeCloseTo(0.6);
  });

  it("returns correct odds labels", () => {
    // Heavy Favorite: winChance >= 0.7
    expect(calculateOdds(80, 100, 50).oddsLabel).toBe("Heavy Favorite");
    // Favored: winChance >= 0.5
    expect(calculateOdds(50, 100, 50).oddsLabel).toBe("Favored");
    // Long Shot: winChance < 0.2
    expect(calculateOdds(10, 100, 50).oddsLabel).toBe("Long Shot");
  });
});
