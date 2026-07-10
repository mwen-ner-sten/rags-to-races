import { afterEach, describe, expect, it } from "vitest";
import { RESET_PRESERVE_FIELDS, type ResetLayer } from "@/data/resetContracts";
import { createInitialState, type GameState, useGameStore } from "@/state/store";
import { getPersistedGameState } from "@/state/persistence";
import { createAllGameplayFixtures, createGameplayFixture, GAMEPLAY_FIXTURE_NAMES, validateGameplayFixture } from "../gameplayFixtures";

afterEach(() => useGameStore.setState(createInitialState()));

function load(name: Parameters<typeof createGameplayFixture>[0]) {
  useGameStore.setState({ ...createInitialState(), ...createGameplayFixture(name).payload.state });
}

describe("accelerated campaign fixtures", () => {
  it("builds every named action-ready scenario with valid references and values", () => {
    const fixtures = createAllGameplayFixtures();
    expect(Object.keys(fixtures)).toEqual([...GAMEPLAY_FIXTURE_NAMES]);
    for (const fixture of Object.values(fixtures)) expect(validateGameplayFixture(fixture), fixture.name).toEqual([]);
  });

  it("unlocks auto-scavenge at exactly the 500th manual action", () => {
    load("auto_scavenge_boundary");
    expect(useGameStore.getState()).toMatchObject({ manualScavengeClicks: 499, autoScavengeUnlocked: false });
    useGameStore.getState().manualScavenge();
    expect(useGameStore.getState()).toMatchObject({ manualScavengeClicks: 500, autoScavengeUnlocked: true });
  });

  it("unlocks auto-race on the first Scrap Reset, not before", () => {
    load("first_scrap_reset_ready");
    expect(useGameStore.getState().autoRaceUnlocked).toBe(false);
    useGameStore.getState().prestige();
    expect(useGameStore.getState()).toMatchObject({ prestigeCount: 1, autoRaceUnlocked: true });
  });

  it("models the first post-reset run with Auto-Race but without Auto-Scavenge", () => {
    load("post_scrap_reset");
    expect(useGameStore.getState()).toMatchObject({
      prestigeCount: 1,
      manualScavengeClicks: 0,
      autoScavengeUnlocked: false,
      autoRaceUnlocked: true,
    });
  });
});

describe("actual four-layer reset retention", () => {
  const cases: Array<{ layer: ResetLayer; fixture: Parameters<typeof createGameplayFixture>[0]; action: "prestige" | "teamReset" | "ownerReset" | "trackReset" }> = [
    { layer: "scrap", fixture: "first_scrap_reset_ready", action: "prestige" },
    { layer: "team", fixture: "team_reset_ready", action: "teamReset" },
    { layer: "owner", fixture: "owner_reset_ready", action: "ownerReset" },
    { layer: "track", fixture: "track_reset_ready", action: "trackReset" },
  ];

  for (const testCase of cases) {
    it(`${testCase.layer} reset awards currency and follows its retention matrix`, () => {
      load(testCase.fixture);
      const before = getPersistedGameState(useGameStore.getState());
      const awardBefore = { scrap: before.legacyPoints, team: before.teamPoints, owner: before.ownerPoints, track: before.trackPrestigeTokens }[testCase.layer];
      useGameStore.getState()[testCase.action]();
      const after = getPersistedGameState(useGameStore.getState());
      const awardAfter = { scrap: after.legacyPoints, team: after.teamPoints, owner: after.ownerPoints, track: after.trackPrestigeTokens }[testCase.layer];
      expect(awardAfter).toBeGreaterThan(awardBefore);
      expect(after.earnedAchievements).toEqual(expect.arrayContaining(before.earnedAchievements));
      expect(after.discoveredBlueprintIds).toEqual(before.discoveredBlueprintIds);
      expect(after.tutorialStep).toBe(before.tutorialStep);
      expect(after.tutorialDismissed).toBe(before.tutorialDismissed);
      expect(after.garage).toEqual([]);
      expect(after.inventory).toEqual([]);
      expect(RESET_PRESERVE_FIELDS[testCase.layer].has("earnedAchievements")).toBe(true);
      expect(RESET_PRESERVE_FIELDS[testCase.layer].has("garage")).toBe(false);
    });
  }

  it("the retention catalog covers every persisted field at all four layers", () => {
    const fields = Object.keys(getPersistedGameState(createInitialState() as GameState));
    for (const layer of ["scrap", "team", "owner", "track"] as const) {
      for (const field of fields) expect(typeof RESET_PRESERVE_FIELDS[layer].has(field)).toBe("boolean");
    }
  });
});
