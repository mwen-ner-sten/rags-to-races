import { afterEach, describe, expect, it } from "vitest";
import { getPartById } from "@/data/parts";
import { createInitialState, type GameState, useGameStore } from "../store";
import { getPersistedGameState, mergePersistedGameState, migratePersistedState, PERSISTENCE_VERSION } from "../persistence";
import { withRandomSource, type RandomSource } from "@/utils/random";

class ScriptedRandomSource implements RandomSource {
  private index = 0;

  constructor(private readonly values: readonly number[]) {}

  next(): number {
    const value = this.values[this.index] ?? 0.99;
    this.index += 1;
    return value;
  }
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("Scouting Orders state", () => {
  it("is earned with Auto-Scavenge and influences manual scavenging", () => {
    useGameStore.setState({
      ...createInitialState(),
      autoScavengeUnlocked: true,
      prestigeCount: 1,
      scoutingOrder: null,
    });

    useGameStore.getState().setScoutingOrder("engine");
    withRandomSource(
      new ScriptedRandomSource([0, 0.5, 0, 0, 0.99, 0.99]),
      () => useGameStore.getState().manualScavenge(),
    );

    const state = useGameStore.getState();
    expect(state.scoutingOrder).toBe("engine");
    expect(getPartById(state.inventory[0].definitionId)?.category).toBe("engine");
  });

  it("rejects unearned or unavailable orders and clears one after a location change", () => {
    useGameStore.setState({
      ...createInitialState(),
      autoScavengeUnlocked: false,
      unlockedLocationIds: ["curbside", "industrial_surplus"],
    });
    useGameStore.getState().setScoutingOrder("engine");
    expect(useGameStore.getState().scoutingOrder).toBeNull();

    useGameStore.setState({ scoutingOrder: "engine", prestigeCount: 1 });
    withRandomSource(
      new ScriptedRandomSource([0, 0.5, 0, 0, 0.99, 0.99]),
      () => useGameStore.getState().manualScavenge(),
    );
    expect(getPartById(useGameStore.getState().inventory[0].definitionId)?.category).toBe("wheel");
    expect(useGameStore.getState().scoutingOrder).toBeNull();

    useGameStore.setState({ autoScavengeUnlocked: true });
    useGameStore.getState().setScoutingOrder("electronics");
    expect(useGameStore.getState().scoutingOrder).toBeNull();

    useGameStore.getState().setScoutingOrder("misc");
    expect(useGameStore.getState().scoutingOrder).toBe("misc");
    useGameStore.getState().setSelectedLocation("industrial_surplus");
    expect(useGameStore.getState().scoutingOrder).toBeNull();
  });
});

describe("Scouting Orders persistence", () => {
  it("defaults old saves to Open Search and round-trips an earned available order", () => {
    const initial = createInitialState() as GameState;
    const oldSave = mergePersistedGameState({
      selectedLocationId: "curbside",
      autoScavengeUnlocked: true,
    }, initial);
    expect(oldSave.scoutingOrder).toBeNull();

    const persisted = getPersistedGameState({
      ...initial,
      autoScavengeUnlocked: true,
      scoutingOrder: "engine",
    });
    const hydrated = mergePersistedGameState(persisted, initial);
    expect(hydrated.scoutingOrder).toBe("engine");
  });

  it("normalizes invalid, unearned, and location-unavailable persisted orders", () => {
    const migrate = (scoutingOrder: unknown, autoScavengeUnlocked: boolean, selectedLocationId = "curbside") =>
      migratePersistedState({ scoutingOrder, autoScavengeUnlocked, selectedLocationId }, PERSISTENCE_VERSION);

    expect(migrate("engine", false).scoutingOrder).toBeNull();
    expect(migrate("electronics", true).scoutingOrder).toBeNull();
    expect(migrate("fabricated_category", true).scoutingOrder).toBeNull();
    expect(migrate("electronics", true, "local_junkyard").scoutingOrder).toBe("electronics");
  });
});
