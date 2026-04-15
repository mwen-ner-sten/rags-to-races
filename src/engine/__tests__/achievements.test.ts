import { describe, it, expect } from "vitest";
import {
  checkAchievements,
  getAchievementBonuses,
  getAchievementProgress,
} from "@/engine/achievements";
import type { AchievementStats } from "@/data/achievements";
import { ACHIEVEMENT_DEFINITIONS } from "@/data/achievements";

function emptyStats(): AchievementStats {
  return {
    lifetimeRacesAllTime: 0,
    lifetimeWinsAllTime: 0,
    lifetimeScrapBucksAllTime: 0,
    lifetimePartsScavengedAllTime: 0,
    lifetimeVehiclesBuiltAllTime: 0,
    bestWinStreakAllTime: 0,
    highestVehicleTierBuilt: 0,
    totalForgeTokensEarned: 0,
    uniqueVehicleTypesBuiltCount: 0,
    lifetimeScrapResets: 0,
    lifetimeLPAllTime: 0,
    teamEraCount: 0,
    ownerEraCount: 0,
    lifetimeTotalDecomposed: 0,
    highestConditionReached: 0,
  };
}

describe("checkAchievements", () => {
  it("returns empty array when no achievements are met", () => {
    const stats = emptyStats();
    const result = checkAchievements(stats, []);
    expect(result).toEqual([]);
  });

  it("returns newly earned achievement IDs when stats meet targets", () => {
    const stats = emptyStats();
    stats.lifetimeWinsAllTime = 1; // meets ach_first_win target of 1
    const result = checkAchievements(stats, []);
    expect(result).toContain("ach_first_win");
  });

  it("does not return already-earned achievements", () => {
    const stats = emptyStats();
    stats.lifetimeWinsAllTime = 1;
    const result = checkAchievements(stats, ["ach_first_win"]);
    expect(result).not.toContain("ach_first_win");
  });
});

describe("getAchievementBonuses", () => {
  it("returns zero bonuses for empty earned list", () => {
    const bonuses = getAchievementBonuses([]);
    expect(bonuses.raceScrapMult).toBe(0);
    expect(bonuses.racePerformanceBonus).toBe(0);
    expect(bonuses.lpMultiplier).toBe(0);
    expect(bonuses.allMultiplier).toBe(0);
  });

  it("returns correct bonuses for earned achievements with bonus rewards", () => {
    // ach_wins_100 has bonusId "ach_race_scrap_15" => raceScrapMult +0.15
    const bonuses = getAchievementBonuses(["ach_wins_100"]);
    expect(bonuses.raceScrapMult).toBeCloseTo(0.15);
  });
});

describe("getAchievementProgress", () => {
  it("returns 0 for zero stats", () => {
    const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === "ach_first_win")!;
    const stats = emptyStats();
    expect(getAchievementProgress(def, stats)).toBe(0);
  });

  it("returns 0.5 for half progress", () => {
    const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === "ach_wins_100")!;
    const stats = emptyStats();
    stats.lifetimeWinsAllTime = 50; // target is 100
    expect(getAchievementProgress(def, stats)).toBeCloseTo(0.5);
  });

  it("returns 1.0 for met or exceeded target", () => {
    const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === "ach_first_win")!;
    const stats = emptyStats();
    stats.lifetimeWinsAllTime = 5; // target is 1, exceeded
    expect(getAchievementProgress(def, stats)).toBe(1.0);
  });
});
