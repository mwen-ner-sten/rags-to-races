import { describe, it, expect } from "vitest";
import {
  getActivePrestigeMilestones,
  getNewlyUnlockedMilestones,
  getPrestigeMilestoneBonuses,
} from "@/data/prestigeMilestones";

describe("getActivePrestigeMilestones", () => {
  it("returns empty at prestige 0", () => {
    const result = getActivePrestigeMilestones(0);
    expect(result).toEqual([]);
  });

  it("returns milestones with prestigeRequired <= 1 at prestige 1", () => {
    const result = getActivePrestigeMilestones(1);
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.prestigeRequired).toBeLessThanOrEqual(1);
    }
  });
});

describe("getNewlyUnlockedMilestones", () => {
  it("returns only milestones with prestigeRequired === 1 at prestige 1", () => {
    const result = getNewlyUnlockedMilestones(1);
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.prestigeRequired).toBe(1);
    }
  });

  it("returns only milestones with prestigeRequired === 2 at prestige 2", () => {
    const result = getNewlyUnlockedMilestones(2);
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.prestigeRequired).toBe(2);
    }
  });
});

describe("getPrestigeMilestoneBonuses", () => {
  it("has all QoL flags false and all bonuses 0 at prestige 0", () => {
    const bonuses = getPrestigeMilestoneBonuses(0);
    expect(bonuses.autoRace).toBe(false);
    expect(bonuses.autoActivateVehicle).toBe(false);
    expect(bonuses.autoSellRusted).toBe(false);
    expect(bonuses.freeDecomposeAll).toBe(false);
    expect(bonuses.autoEquipBest).toBe(false);
    expect(bonuses.scavengeYieldMult).toBe(0);
    expect(bonuses.scavengeLuckBonus).toBe(0);
    expect(bonuses.raceScrapMult).toBe(0);
    expect(bonuses.raceRepMult).toBe(0);
    expect(bonuses.allMultiplier).toBe(0);
    expect(bonuses.lpMultiplier).toBe(0);
  });

  it("has autoRace and autoActivateVehicle true at prestige 1", () => {
    const bonuses = getPrestigeMilestoneBonuses(1);
    expect(bonuses.autoRace).toBe(true);
    expect(bonuses.autoActivateVehicle).toBe(true);
  });

  it("has lpMultiplier > 0 and allMultiplier > 0 at prestige 50", () => {
    const bonuses = getPrestigeMilestoneBonuses(50);
    expect(bonuses.lpMultiplier).toBeGreaterThan(0);
    expect(bonuses.allMultiplier).toBeGreaterThan(0);
  });
});
