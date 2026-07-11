import { afterEach, describe, expect, it } from "vitest";
import { buildResetRetentionMatrix, RESET_CONDITIONAL_FIELDS, RESET_PRESERVE_FIELDS } from "@/data/resetContracts";
import { RESPONSIBILITY_RESET_REQUIREMENTS, SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { createDefaultAttributes } from "@/data/racerAttributes";
import { getPersistedGameState } from "../persistence";
import { createInitialState, useGameStore, type GameState } from "../store";

afterEach(() => useGameStore.setState(createInitialState()));

describe("four-layer reset contracts", () => {
  it("classifies every canonical persisted field at every layer", () => {
    const fields = Object.keys(getPersistedGameState(createInitialState() as GameState));
    const fieldSet = new Set(fields);
    const matrix = buildResetRetentionMatrix(fields);
    for (const layer of ["scrap", "team", "owner", "track"] as const) {
      expect(Object.keys(matrix[layer])).toEqual(fields);
      expect(Object.values(matrix[layer]).every((value) => value === "reset" || value === "preserve" || value === "conditional")).toBe(true);
      for (const field of RESET_PRESERVE_FIELDS[layer]) expect(fieldSet.has(field), `${layer}.${field}`).toBe(true);
      for (const field of RESET_CONDITIONAL_FIELDS[layer]) expect(fieldSet.has(field), `${layer}.${field}`).toBe(true);
    }
    expect(matrix.scrap.workshopLevels).toBe("conditional");
    expect(matrix.team.workshopLevels).toBe("conditional");
    expect(matrix.owner.workshopLevels).toBe("conditional");
    expect(matrix.track.workshopLevels).toBe("conditional");
    expect(matrix.scrap.forgeTokens).toBe("preserve");
    expect(matrix.team.forgeTokens).toBe("reset");
    expect(matrix.scrap.lootGearInventory).toBe("preserve");
    expect(matrix.team.lootGearInventory).toBe("reset");
    expect(matrix.track.unlockedFeatures).toBe("conditional");
  });

  it("Team clears station equipment, crew, vehicles, and Philosophy but preserves discoveries", () => {
    useGameStore.setState({ ...createInitialState(), lifetimeLPAllTime: RESPONSIBILITY_RESET_REQUIREMENTS.team.lifetimeLegacyPoints, lifetimeLPThisTeamEra: 100, garage: [{ id: "v", definitionId: "push_mower", parts: {}, stats: { speed: 1, handling: 1, reliability: 1, weight: 1, performance: 1 }, builtAt: 1, condition: 100, totalRaces: 0 }], crewRoster: [{ id: "c", name: "Crew", role: "driver", level: 1, xp: 0, specialization: null }], unlockedPlaystyleNodes: ["ps_scrap_t1"], discoveredBlueprintIds: ["known"], stationEquipmentInventory: [{ id: "e", slot: "workbench", rarity: "common", name: "Kit", effects: [], enhancementLevel: 0, source: "test" }] });
    useGameStore.getState().teamReset();
    const state = useGameStore.getState();
    expect(state.garage).toEqual([]); expect(state.crewRoster).toEqual([]); expect(state.unlockedPlaystyleNodes).toEqual([]); expect(state.stationEquipmentInventory).toEqual([]); expect(state.discoveredBlueprintIds).toEqual(["known"]);
  });

  it("preserves attributes only through Scrap Reset and clears them at every higher layer", () => {
    const allocated = { ...createDefaultAttributes(), reflexes: 4, engineering: 3 };
    const resetVehicle = (id: string) => ({
      id,
      definitionId: "push_mower",
      parts: {},
      stats: { speed: 1, handling: 1, reliability: 1, weight: 1, performance: 1 },
      builtAt: 1,
      condition: 100,
      totalRaces: 0,
    });
    const matrix = buildResetRetentionMatrix(["racerAttributes"]);
    expect(matrix.scrap.racerAttributes).toBe("preserve");
    expect(matrix.team.racerAttributes).toBe("reset");
    expect(matrix.owner.racerAttributes).toBe("reset");
    expect(matrix.track.racerAttributes).toBe("reset");

    useGameStore.setState({
      ...createInitialState(),
      racerAttributes: allocated,
      garage: [resetVehicle("one"), resetVehicle("two"), resetVehicle("three")],
      repPoints: SCRAP_RESET_REQUIREMENTS.reputation,
      lifetimeScrapBucks: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
    });
    useGameStore.getState().prestige();
    expect(useGameStore.getState().racerAttributes).toEqual(allocated);

    const eligibleStates = {
      teamReset: { lifetimeLPAllTime: RESPONSIBILITY_RESET_REQUIREMENTS.team.lifetimeLegacyPoints, lifetimeLPThisTeamEra: 100 },
      ownerReset: {
        lifetimeTeamPoints: RESPONSIBILITY_RESET_REQUIREMENTS.owner.lifetimeTeamPoints,
        teamEraCount: RESPONSIBILITY_RESET_REQUIREMENTS.owner.teamEras,
        lifetimeTPThisOwnerEra: 100,
      },
      trackReset: {
        lifetimeOwnerPoints: RESPONSIBILITY_RESET_REQUIREMENTS.track.lifetimeOwnerPoints,
        ownerEraCount: RESPONSIBILITY_RESET_REQUIREMENTS.track.ownerEras,
        lifetimeOPThisTrackEra: 100,
      },
    };
    for (const reset of ["teamReset", "ownerReset", "trackReset"] as const) {
      useGameStore.setState({ ...createInitialState(), ...eligibleStates[reset], racerAttributes: allocated });
      useGameStore.getState()[reset]();
      expect(useGameStore.getState().racerAttributes, reset).toEqual(createDefaultAttributes());
    }
  });

  it("Track clears lower-layer currencies and preserves venue, tokens, discoveries, and achievements", () => {
    useGameStore.setState({ ...createInitialState(), lifetimeOwnerPoints: RESPONSIBILITY_RESET_REQUIREMENTS.track.lifetimeOwnerPoints, ownerEraCount: RESPONSIBILITY_RESET_REQUIREMENTS.track.ownerEras, teamPoints: 5, ownerPoints: 7, trackPrestigeTokens: 11, discoveredBlueprintIds: ["known"], earnedAchievements: ["first_win"], ownedTrackConfig: { ...createInitialState().ownedTrackConfig, riskReward: 5 } });
    useGameStore.getState().trackReset();
    const state = useGameStore.getState();
    expect(state.teamPoints).toBe(0); expect(state.ownerPoints).toBe(0); expect(state.trackPrestigeTokens).toBeGreaterThanOrEqual(11); expect(state.discoveredBlueprintIds).toEqual(["known"]); expect(state.earnedAchievements).toEqual(["first_win"]); expect(state.ownedTrackConfig.riskReward).toBe(5);
  });
});
