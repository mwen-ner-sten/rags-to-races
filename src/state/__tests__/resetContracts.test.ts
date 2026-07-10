import { afterEach, describe, expect, it } from "vitest";
import { buildResetRetentionMatrix } from "@/data/resetContracts";
import { getPersistedGameState } from "../persistence";
import { createInitialState, useGameStore, type GameState } from "../store";

afterEach(() => useGameStore.setState(createInitialState()));

describe("four-layer reset contracts", () => {
  it("classifies every canonical persisted field at every layer", () => {
    const fields = Object.keys(getPersistedGameState(createInitialState() as GameState));
    const matrix = buildResetRetentionMatrix(fields);
    for (const layer of ["scrap", "team", "owner", "track"] as const) {
      expect(Object.keys(matrix[layer])).toEqual(fields);
      expect(Object.values(matrix[layer]).every((value) => value === "reset" || value === "preserve")).toBe(true);
    }
  });

  it("Team clears station equipment, crew, vehicles, and Philosophy but preserves discoveries", () => {
    useGameStore.setState({ ...createInitialState(), garage: [{ id: "v", definitionId: "push_mower", parts: {}, stats: { speed: 1, handling: 1, reliability: 1, weight: 1, performance: 1 }, builtAt: 1, condition: 100, totalRaces: 0 }], crewRoster: [{ id: "c", name: "Crew", role: "driver", level: 1, xp: 0, specialization: null }], unlockedPlaystyleNodes: ["ps_scrap_t1"], discoveredBlueprintIds: ["known"], stationEquipmentInventory: [{ id: "e", slot: "workbench", rarity: "common", name: "Kit", effects: [], enhancementLevel: 0, source: "test" }] });
    useGameStore.getState().teamReset();
    const state = useGameStore.getState();
    expect(state.garage).toEqual([]); expect(state.crewRoster).toEqual([]); expect(state.unlockedPlaystyleNodes).toEqual([]); expect(state.stationEquipmentInventory).toEqual([]); expect(state.discoveredBlueprintIds).toEqual(["known"]);
  });

  it("Track clears lower-layer currencies and preserves venue, tokens, discoveries, and achievements", () => {
    useGameStore.setState({ ...createInitialState(), teamPoints: 5, ownerPoints: 7, trackPrestigeTokens: 11, discoveredBlueprintIds: ["known"], earnedAchievements: ["first_win"], ownedTrackConfig: { ...createInitialState().ownedTrackConfig, riskReward: 5 } });
    useGameStore.getState().trackReset();
    const state = useGameStore.getState();
    expect(state.teamPoints).toBe(0); expect(state.ownerPoints).toBe(0); expect(state.trackPrestigeTokens).toBeGreaterThanOrEqual(11); expect(state.discoveredBlueprintIds).toEqual(["known"]); expect(state.earnedAchievements).toEqual(["first_win"]); expect(state.ownedTrackConfig.riskReward).toBe(5);
  });
});
