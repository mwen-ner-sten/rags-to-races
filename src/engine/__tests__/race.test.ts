import { describe, it, expect } from "vitest";
import { calculateOdds, getCircuitPerformance, losingPosition, WIN_CHANCE_CAP, WIN_CHANCE_FLOOR, winChanceFromRatio } from "../race";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

describe("winChanceFromRatio", () => {
  it("is a contest at parity and saturates with diminishing returns", () => {
    expect(winChanceFromRatio(1)).toBeCloseTo(0.45);
    expect(winChanceFromRatio(0.5)).toBeLessThan(0.2);
    expect(winChanceFromRatio(2)).toBeGreaterThan(0.7);
    expect(winChanceFromRatio(3)).toBeLessThan(WIN_CHANCE_CAP);
    // Strictly increasing
    let previous = 0;
    for (let ratio = 0; ratio <= 4; ratio += 0.25) {
      const value = winChanceFromRatio(ratio);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("calculateOdds", () => {
  it("clamps win chance to the floor", () => {
    expect(calculateOdds(1, 100, 1000).winChance).toBeCloseTo(WIN_CHANCE_FLOOR, 5);
    expect(calculateOdds(1, 100, 1000, 0, 0, 0, 0, 0, -0.5).winChance).toBe(WIN_CHANCE_FLOOR);
  });

  it("clamps win chance to the cap so no race is a lock", () => {
    expect(calculateOdds(1000, 100, 1).winChance).toBeCloseTo(WIN_CHANCE_CAP, 5);
    expect(calculateOdds(1000, 100, 1, 0, 0, 0, 0, 0, 0.5).winChance).toBe(WIN_CHANCE_CAP);
  });

  it("returns the parity win chance when performance matches difficulty", () => {
    expect(calculateOdds(50, 100, 50).winChance).toBeCloseTo(0.45);
  });

  it("applies fatigue as a performance penalty", () => {
    // fatigue=50 → ×0.75 performance → ratio 0.75
    expect(calculateOdds(100, 100, 100, 50).winChance).toBeCloseTo(winChanceFromRatio(0.75));
  });

  it("applies gear performance bonus multiplicatively", () => {
    expect(calculateOdds(40, 100, 50, 0, 0.5).winChance).toBeCloseTo(winChanceFromRatio(1.2));
  });

  it("decays DNF chance smoothly with reliability instead of cliffing to zero", () => {
    const at0 = calculateOdds(50, 0, 50).dnfChance;
    const at30 = calculateOdds(50, 30, 50).dnfChance;
    const at60 = calculateOdds(50, 60, 50).dnfChance;
    const at200 = calculateOdds(50, 200, 50).dnfChance;
    expect(at0).toBeCloseTo(0.32);
    expect(at30).toBeLessThan(at0);
    expect(at60).toBeLessThan(at30);
    expect(at60).toBeGreaterThan(0.05);
    expect(at200).toBeGreaterThan(0);
    expect(at200).toBeLessThan(0.01);
  });

  it("applies gear DNF reduction as a flat subtraction", () => {
    const base = calculateOdds(50, 0, 50).dnfChance;
    expect(calculateOdds(50, 0, 50, 0, 0, 0.1).dnfChance).toBeCloseTo(base - 0.1);
  });

  it("returns correct odds labels", () => {
    expect(calculateOdds(150, 100, 50).oddsLabel).toBe("Heavy Favorite");
    expect(calculateOdds(60, 100, 50).oddsLabel).toBe("Favored");
    expect(calculateOdds(10, 100, 50).oddsLabel).toBe("Long Shot");
  });
});

describe("getCircuitPerformance", () => {
  it("rewards grip on corner-heavy circuits and pace on power circuits", () => {
    const backyard = CIRCUIT_DEFINITIONS.find((c) => c.id === "backyard_derby")!;
    const regional = CIRCUIT_DEFINITIONS.find((c) => c.id === "regional_circuit")!;
    const gripBuild = { speed: 100, handling: 100, reliability: 50 };
    const powerBuild = { speed: 140, handling: 60, reliability: 50 };
    expect(getCircuitPerformance(gripBuild, backyard)).toBeGreaterThan(getCircuitPerformance(powerBuild, backyard));
    expect(getCircuitPerformance(powerBuild, regional)).toBeGreaterThan(getCircuitPerformance(gripBuild, regional));
  });
});

describe("losingPosition", () => {
  const sample = (ratio: number) => withRandomSource(new SeededRandomSource(`pos-${ratio}`), () => {
    let total = 0;
    for (let i = 0; i < 500; i++) total += losingPosition(ratio);
    return total / 500;
  });

  it("finishes higher the stronger the car, and never in the DNF slot", () => {
    const weak = sample(0.4);
    const par = sample(1);
    const strong = sample(2);
    expect(strong).toBeLessThan(par);
    expect(par).toBeLessThan(weak);
    expect(strong).toBeLessThan(2.5);
    withRandomSource(new SeededRandomSource("pos-range"), () => {
      for (let i = 0; i < 200; i++) {
        const position = losingPosition(Math.random() * 3);
        expect(position).toBeGreaterThanOrEqual(2);
        expect(position).toBeLessThanOrEqual(7);
      }
    });
  });
});
