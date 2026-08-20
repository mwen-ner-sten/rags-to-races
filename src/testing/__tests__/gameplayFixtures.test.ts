import { afterEach, describe, expect, it } from "vitest";
import { RESET_PRESERVE_FIELDS, type ResetLayer } from "@/data/resetContracts";
import { createInitialState, type GameState, useGameStore } from "@/state/store";
import { getPersistedGameState } from "@/state/persistence";
import { createAllGameplayFixtures, createGameplayFixture, GAMEPLAY_FIXTURE_NAMES, validateGameplayFixture } from "../gameplayFixtures";
import { AUTO_SCAVENGE_MANUAL_TARGET } from "@/config/gameplayLimits";
import { SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { LEGACY_UPGRADE_DEFINITIONS } from "@/data/legacyUpgrades";
import { PLAYSTYLE_PATHS } from "@/data/playstyleUpgrades";
import { GARAGE_STATION_IDS } from "@/data/garageStations";

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

  it("rejects stale or unknown scenario identifiers", () => {
    const fixture = createGameplayFixture("workshop_ready");
    const invalid = {
      ...fixture,
      payload: {
        ...fixture.payload,
        state: {
          ...fixture.payload.state,
          completedChallenges: ["not_a_challenge"],
          earnedAchievements: ["not_an_achievement"],
          unlockedPlaystyleNodes: ["not_a_node"],
          activeMomentumTiers: ["not_momentum"],
          crewRoster: [{ id: "bad_crew", name: "Bad Crew", role: "mechanic", level: 3, xp: 0, specialization: null }],
          unlockedFeatures: ["not_a_feature"],
          unlockedLocationIds: [...fixture.payload.state.unlockedLocationIds, "not_a_location"],
          unlockedCircuitIds: [...fixture.payload.state.unlockedCircuitIds, "not_a_circuit"],
          unlockedVehicleIds: [...fixture.payload.state.unlockedVehicleIds, "not_a_vehicle"],
        } as typeof fixture.payload.state,
      },
    };
    expect(validateGameplayFixture(invalid)).toEqual(expect.arrayContaining([
      "unknown challenge not_a_challenge",
      "unknown achievement not_an_achievement",
      "unknown playstyle node not_a_node",
      "unknown momentum tier not_momentum",
      "crew level/xp mismatch for bad_crew",
      "unknown feature not_a_feature",
      "unknown location not_a_location",
      "unknown circuit not_a_circuit",
      "unknown vehicle unlock not_a_vehicle",
    ]));
  });

  it("unlocks auto-scavenge at exactly the configured manual-action target", () => {
    load("auto_scavenge_boundary");
    expect(useGameStore.getState()).toMatchObject({ manualScavengeClicks: AUTO_SCAVENGE_MANUAL_TARGET - 1, autoScavengeUnlocked: false });
    useGameStore.getState().manualScavenge();
    expect(useGameStore.getState()).toMatchObject({ manualScavengeClicks: AUTO_SCAVENGE_MANUAL_TARGET, autoScavengeUnlocked: true });
  });

  it("unlocks both automation systems on the first Scrap Reset, not before", () => {
    load("first_scrap_reset_ready");
    expect(useGameStore.getState()).toMatchObject({ autoScavengeUnlocked: false, autoRaceUnlocked: false });
    useGameStore.getState().prestige();
    expect(useGameStore.getState()).toMatchObject({ prestigeCount: 1, autoScavengeUnlocked: true, autoRaceUnlocked: true });
  });

  it("clears per-run challenge snapshots on Scrap Reset", () => {
    load("first_scrap_reset_ready");
    useGameStore.setState((state) => ({
      challengeProgress: { ...state.challengeProgress, winStreak: 9, fatigue: 72, lifetimeRaces: 99, totalRaceSalvage: 12 },
    }));
    useGameStore.getState().prestige();
    expect(useGameStore.getState().challengeProgress).toMatchObject({
      winStreak: 0,
      fatigue: 0,
      lifetimeRaces: 0,
      totalRaceSalvage: 12,
    });
  });

  it("models the first post-reset run with both automation systems", () => {
    load("post_scrap_reset");
    expect(useGameStore.getState()).toMatchObject({
      prestigeCount: 1,
      manualScavengeClicks: 0,
      autoScavengeUnlocked: true,
      autoRaceUnlocked: true,
    });
  });

  it("keeps the first-reset ready and post-reset fixtures at the exact live contract", () => {
    const expectedPost = createGameplayFixture("post_scrap_reset").payload.state;
    load("first_scrap_reset_ready");
    const ready = useGameStore.getState();
    expect(ready.garage).toHaveLength(SCRAP_RESET_REQUIREMENTS.vehiclesBuilt);
    expect(ready.repPoints).toBe(SCRAP_RESET_REQUIREMENTS.reputation);
    expect(ready.lifetimeScrapBucks).toBe(SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks);

    ready.prestige();
    const actual = useGameStore.getState();
    expect(actual).toMatchObject({
      prestigeCount: expectedPost.prestigeCount,
      legacyPoints: expectedPost.legacyPoints,
      lifetimeLegacyPoints: expectedPost.lifetimeLegacyPoints,
      autoScavengeUnlocked: expectedPost.autoScavengeUnlocked,
      autoRaceUnlocked: expectedPost.autoRaceUnlocked,
      forgeTokens: expectedPost.forgeTokens,
    });
    expect(actual.completedChallenges).toEqual(expect.arrayContaining(expectedPost.completedChallenges));
    expect(actual.earnedAchievements).toEqual(expect.arrayContaining(expectedPost.earnedAchievements));
  });

  it("makes the maxed fixture cover every released maxable system", () => {
    load("maxed");
    const state = useGameStore.getState();
    for (const definition of LEGACY_UPGRADE_DEFINITIONS) expect(state.legacyUpgradeLevels[definition.id]).toBe(definition.maxLevel);
    for (const path of PLAYSTYLE_PATHS) expect(state.unlockedPlaystyleNodes.some((nodeId) => nodeId.startsWith(path.id === "scrapper" ? "ps_scrap" : path.id === "speedster" ? "ps_speed" : "ps_eng"))).toBe(true);
    expect(state.stationEquipmentInventory).toHaveLength(GARAGE_STATION_IDS.length);
    expect(state.stationEquipmentInventory.every((item) => item.rarity === "legendary" && item.enhancementLevel === 13)).toBe(true);
    expect(Object.values(state.equippedStationEquipment).filter(Boolean)).toHaveLength(GARAGE_STATION_IDS.length);
    expect(state.earnedAchievements.length).toBeGreaterThan(0);
    expect(state.completedChallenges.length).toBeGreaterThan(0);
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
      if (testCase.action === "teamReset") useGameStore.getState().teamReset("engineering_works");
      else useGameStore.getState()[testCase.action]();
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
