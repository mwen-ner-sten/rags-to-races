import { describe, it, expect } from "vitest";
import {
  calculateLegacyPoints,
  applyMomentumLpBonus,
  deriveHighestCircuitTier,
  type RunStats,
} from "../prestige";

describe("calculateLegacyPoints", () => {
  const baseStats: RunStats = {
    lifetimeScrapBucks: 10000,
    lifetimeRaces: 80,
    fatigue: 35,
    repPoints: 5000,
    highestCircuitTier: 2,
    workshopUpgradesBought: 10,
  };

  it("returns at least 1 LP for minimal stats", () => {
    const minimal: RunStats = {
      lifetimeScrapBucks: 0,
      lifetimeRaces: 0,
      fatigue: 0,
      repPoints: 0,
      highestCircuitTier: 0,
      workshopUpgradesBought: 0,
    };
    expect(calculateLegacyPoints(minimal)).toBe(1);
  });

  it("computes expected LP for known inputs", () => {
    // Manually compute:
    // scrapComponent = sqrt(10000 / 100) = sqrt(100) = 10
    // raceComponent = log2(1 + 80/10) = log2(9) ≈ 3.1699
    // tierMultiplier = 1 + 2 * 0.5 = 2
    // fatigueFloor = max(0.3, min(1, 35/30)) = min(1, 1.167) = 1
    // workshopBonus = 1 + 10 * 0.05 = 1.5
    // raw = (10 + 3.1699*3) * 2 * 1 * 1.5 = (10 + 9.5097) * 3 = 58.529
    // floor(58.529) = 58
    expect(calculateLegacyPoints(baseStats)).toBe(58);
  });

  it("applies fatigue floor at 0.3 when fatigue is 0", () => {
    const noFatigue: RunStats = { ...baseStats, fatigue: 0 };
    // fatigueFloor = max(0.3, min(1, 0/30)) = 0.3
    // raw = (10 + 9.5097) * 2 * 0.3 * 1.5 = 17.5587 → 17
    expect(calculateLegacyPoints(noFatigue)).toBe(17);
  });

  it("caps fatigue floor at 1.0 when fatigue >= 30", () => {
    const fatigue30 = calculateLegacyPoints({ ...baseStats, fatigue: 30 });
    const fatigue50 = calculateLegacyPoints({ ...baseStats, fatigue: 50 });
    // Both should have fatigueFloor = 1.0, so same LP
    expect(fatigue30).toBe(fatigue50);
  });

  it("higher tier multiplies LP", () => {
    const tier0 = calculateLegacyPoints({ ...baseStats, highestCircuitTier: 0 });
    const tier4 = calculateLegacyPoints({ ...baseStats, highestCircuitTier: 4 });
    expect(tier4).toBeGreaterThan(tier0);
  });

  it("workshop upgrades increase LP", () => {
    const noWorkshop = calculateLegacyPoints({ ...baseStats, workshopUpgradesBought: 0 });
    const manyWorkshop = calculateLegacyPoints({ ...baseStats, workshopUpgradesBought: 20 });
    expect(manyWorkshop).toBeGreaterThan(noWorkshop);
  });
});

describe("applyMomentumLpBonus", () => {
  it("returns same LP when no momentum tiers are active", () => {
    expect(applyMomentumLpBonus(100, [])).toBe(100);
  });

  it("applies Deep Run bonus (1.5x)", () => {
    // Deep Run effect: lp_multiplier = 0.5, so total mult = 1 + 0.5 = 1.5
    expect(applyMomentumLpBonus(100, ["momentum_deep_run"])).toBe(150);
  });

  it("stacks Deep Run + Legendary (2.5x)", () => {
    // Deep Run 0.5 + Legendary 1.0 = 1.5, total mult = 1 + 1.5 = 2.5
    expect(applyMomentumLpBonus(100, ["momentum_deep_run", "momentum_legendary"])).toBe(250);
  });

  it("floors the result", () => {
    // 33 * 1.5 = 49.5 → floor → 49
    expect(applyMomentumLpBonus(33, ["momentum_deep_run"])).toBe(49);
  });

  it("ignores non-lp_multiplier momentum tiers", () => {
    // "momentum_warmed_up" has effect type "scrap_multiplier", not "lp_multiplier"
    expect(applyMomentumLpBonus(100, ["momentum_warmed_up"])).toBe(100);
  });
});

describe("deriveHighestCircuitTier", () => {
  it("returns 0 for empty array", () => {
    expect(deriveHighestCircuitTier([])).toBe(0);
  });

  it("returns correct tier for known circuits", () => {
    expect(deriveHighestCircuitTier(["backyard_derby"])).toBe(0);
    expect(deriveHighestCircuitTier(["dirt_track"])).toBe(1);
    expect(deriveHighestCircuitTier(["regional_circuit"])).toBe(2);
    expect(deriveHighestCircuitTier(["world_championship"])).toBe(4);
  });

  it("returns highest tier from mixed circuits", () => {
    expect(
      deriveHighestCircuitTier(["backyard_derby", "national_circuit", "dirt_track"]),
    ).toBe(3);
  });

  it("ignores unknown circuit IDs", () => {
    expect(deriveHighestCircuitTier(["nonexistent_circuit"])).toBe(0);
  });
});
