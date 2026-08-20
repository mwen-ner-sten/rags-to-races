import { describe, expect, it } from "vitest";
import { REP_PROGRESSION, SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { hasComparableInstalledPart, selectContextualCoach, type ContextualCoachProgress } from "../contextualCoaching";
import type { BuiltVehicle } from "../build";
import type { ScavengedPart } from "../scavenge";

function progress(overrides: Partial<ContextualCoachProgress> = {}): ContextualCoachProgress {
  return {
    tutorialStep: -1,
    tutorialCompleted: true,
    raceHistoryCount: 1,
    dismissedCoachIds: [],
    reputation: 0,
    workshopLevels: {},
    hasComparablePart: false,
    autoScavengeUnlocked: false,
    prestigeCount: 0,
    vehiclesBuilt: 1,
    lifetimeScrapBucks: 100,
    ...overrides,
  };
}

describe("contextual post-tutorial coaching", () => {
  it("requires a loose compatible part and an installed part to compare it with", () => {
    const candidate = {
      id: "candidate",
      definitionId: "elec_basic",
      condition: "decent",
      foundAt: "test",
      type: "part",
    } as ScavengedPart;
    const beater = {
      definitionId: "beater_car",
      parts: {},
    } as BuiltVehicle;

    expect(hasComparableInstalledPart([candidate], [beater])).toBe(false);
    expect(hasComparableInstalledPart([candidate], [{
      ...beater,
      parts: { electronics: { part: candidate, addons: [] } },
    }])).toBe(true);
  });

  it("does not coach before the mandatory first loop is complete", () => {
    expect(selectContextualCoach(progress({ tutorialStep: 13 }))).toBeNull();
    expect(selectContextualCoach(progress({ raceHistoryCount: 0 }))).toBeNull();
    expect(selectContextualCoach({
      ...progress({ reputation: REP_PROGRESSION.workshop.refurbishment_bench }),
      tutorialCompleted: false,
    } as ContextualCoachProgress)).toBeNull();
  });

  it("offers Toolkit coaching at the existing preceding Workshop gate", () => {
    expect(selectContextualCoach(progress({
      reputation: REP_PROGRESSION.workshop.refurbishment_bench - 1,
    }))).toBeNull();

    expect(selectContextualCoach(progress({
      reputation: REP_PROGRESSION.workshop.refurbishment_bench,
    }))).toMatchObject({
      id: "toolkit",
      targetTab: "gear",
      targetSection: "facilities",
    });
  });

  it("moves Toolkit coaching to installed-part comparison after purchase", () => {
    expect(selectContextualCoach(progress({
      reputation: REP_PROGRESSION.workshop.toolkit,
      workshopLevels: { toolkit: 1 },
      hasComparablePart: true,
    }))).toMatchObject({
      id: "toolkit",
      targetTab: "garage",
      actionName: "Compare installed parts",
    });
  });

  it("does not suggest installed-part comparison for unrelated loose inventory", () => {
    expect(selectContextualCoach({
      ...progress({
        reputation: REP_PROGRESSION.workshop.toolkit,
        workshopLevels: { toolkit: 1 },
        hasComparablePart: true,
      }),
      hasComparablePart: false,
    } as ContextualCoachProgress)).toBeNull();
  });

  it("transitions away from irrelevant or dismissed suggestions as progress changes", () => {
    const toolkitOwned = {
      reputation: REP_PROGRESSION.workshop.toolkit,
      workshopLevels: { toolkit: 1 },
    };

    expect(selectContextualCoach(progress(toolkitOwned))).toBeNull();
    expect(selectContextualCoach(progress({ ...toolkitOwned, hasComparablePart: true }))?.id).toBe("toolkit");
    expect(selectContextualCoach(progress({
      ...toolkitOwned,
      hasComparablePart: true,
      autoScavengeUnlocked: true,
      dismissedCoachIds: ["toolkit"],
    }))?.id).toBe("automation");
    expect(selectContextualCoach(progress({
      ...toolkitOwned,
      hasComparablePart: true,
      autoScavengeUnlocked: true,
      dismissedCoachIds: ["toolkit", "automation"],
    }))).toBeNull();
  });

  it("offers automation mastery only after canonical automation unlock state", () => {
    const base = { dismissedCoachIds: ["toolkit"] as const };
    expect(selectContextualCoach(progress(base))).toBeNull();
    expect(selectContextualCoach(progress({
      ...base,
      autoScavengeUnlocked: true,
    }))?.id).toBe("automation");
  });

  it("prioritizes the first Scrap Reset when two canonical requirements are met", () => {
    const base = { dismissedCoachIds: ["toolkit"] as const };
    expect(selectContextualCoach(progress({
      ...base,
      vehiclesBuilt: SCRAP_RESET_REQUIREMENTS.vehiclesBuilt,
    }))).toBeNull();

    expect(selectContextualCoach(progress({
      ...base,
      vehiclesBuilt: SCRAP_RESET_REQUIREMENTS.vehiclesBuilt,
      reputation: SCRAP_RESET_REQUIREMENTS.reputation,
      autoScavengeUnlocked: true,
    }))).toMatchObject({
      id: "scrap-reset",
      targetTab: "upgrades",
      targetSection: "prestige",
    });
  });

  it("lets an urgent first Scrap Reset displace an earlier Toolkit suggestion", () => {
    expect(selectContextualCoach(progress({
      vehiclesBuilt: SCRAP_RESET_REQUIREMENTS.vehiclesBuilt,
      reputation: SCRAP_RESET_REQUIREMENTS.reputation,
      lifetimeScrapBucks: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
      workshopLevels: { toolkit: 1 },
      hasComparablePart: true,
    }))?.id).toBe("scrap-reset");
  });
});
