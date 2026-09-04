import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "../store";
import { REP_DECAY, REP_UNLOCK_COSTS, SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { migratePersistedState, PERSISTENCE_VERSION } from "../persistence";
import type { BuiltVehicle } from "@/engine/build";

function vehicle(id: string): BuiltVehicle {
  return {
    id,
    definitionId: "push_mower",
    parts: {},
    stats: { speed: 1, handling: 1, reliability: 1, weight: 1, performance: 1 },
    builtAt: 0,
    condition: 100,
    totalRaces: 0,
  };
}

afterEach(() => {
  useGameStore.setState(createInitialState());
});

describe("spendable Rep", () => {
  it("spends Rep to unlock a circuit and refuses when unaffordable", () => {
    const cost = REP_UNLOCK_COSTS.circuits.dirt_track;
    useGameStore.setState({ ...createInitialState(), repPoints: cost - 1, lifetimeRep: cost - 1 });
    expect(useGameStore.getState().canAffordRep(cost)).toBe(false);
    useGameStore.getState().unlockCircuit("dirt_track");
    expect(useGameStore.getState().unlockedCircuitIds).not.toContain("dirt_track");

    useGameStore.setState({ repPoints: cost + 5, lifetimeRep: cost + 5 });
    expect(useGameStore.getState().canAffordRep(cost)).toBe(true);
    useGameStore.getState().unlockCircuit("dirt_track");
    const after = useGameStore.getState();
    expect(after.unlockedCircuitIds).toContain("dirt_track");
    expect(after.repPoints).toBeCloseTo(5, 9);
    // Lifetime Rep is never reduced by spending.
    expect(after.lifetimeRep).toBe(cost + 5);
    // Buying again is a no-op.
    after.unlockCircuit("dirt_track");
    expect(useGameStore.getState().repPoints).toBeCloseTo(5, 9);
  });

  it("spends Rep for locations and vehicle blueprints, tier-0 items stay free", () => {
    const locationCost = REP_UNLOCK_COSTS.locations.neighborhood_yards;
    const vehicleCost = REP_UNLOCK_COSTS.vehicles.go_kart;
    useGameStore.setState({ ...createInitialState(), repPoints: locationCost + vehicleCost, lifetimeRep: locationCost + vehicleCost });
    useGameStore.getState().unlockLocation("neighborhood_yards");
    useGameStore.getState().unlockVehicle("go_kart");
    const state = useGameStore.getState();
    expect(state.unlockedLocationIds).toContain("neighborhood_yards");
    expect(state.unlockedVehicleIds).toContain("go_kart");
    expect(state.repPoints).toBeCloseTo(0, 9);
    // Free tier-0 entries never charge.
    state.unlockLocation("curbside");
    state.unlockCircuit("backyard_derby");
    expect(useGameStore.getState().repPoints).toBeCloseTo(0, 9);
  });

  it("charges Rep once for a Rep-gated workshop line, then Scrap Bucks only", () => {
    const repCost = REP_UNLOCK_COSTS.workshop.toolkit;
    useGameStore.setState({ ...createInitialState(), repPoints: repCost, lifetimeRep: repCost, scrapBucks: 100_000 });
    useGameStore.getState().purchaseUpgrade("toolkit");
    expect(useGameStore.getState().workshopLevels.toolkit).toBe(1);
    expect(useGameStore.getState().repPoints).toBeCloseTo(0, 9);

    useGameStore.setState({ ...createInitialState(), repPoints: repCost - 1, lifetimeRep: repCost - 1, scrapBucks: 100_000 });
    useGameStore.getState().purchaseUpgrade("toolkit");
    expect(useGameStore.getState().workshopLevels.toolkit ?? 0).toBe(0);
  });

  it("no longer auto-unlocks circuits, locations, or blueprints from earned Rep", () => {
    useGameStore.setState({ ...createInitialState(), repPoints: 0, lifetimeRep: 0 });
    useGameStore.getState().applyTickResult([], 0, 10_000);
    const state = useGameStore.getState();
    expect(state.repPoints).toBeCloseTo(10_000, 6);
    expect(state.lifetimeRep).toBeCloseTo(10_000, 6);
    expect(state.unlockedCircuitIds).toEqual(["backyard_derby"]);
    expect(state.unlockedLocationIds).toEqual(["curbside"]);
    expect(state.unlockedVehicleIds).not.toContain("go_kart");
  });

  it("gates the Scrap Reset on lifetime Rep and stores a legacy floor", () => {
    const lifetimeRep = SCRAP_RESET_REQUIREMENTS.reputation * 2;
    useGameStore.setState({
      ...createInitialState(),
      garage: [vehicle("a"), vehicle("b"), vehicle("c")],
      repPoints: 10,
      lifetimeRep,
      lifetimeScrapBucks: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
    });
    useGameStore.getState().prestige();
    const reset = useGameStore.getState();
    expect(reset.prestigeCount).toBe(1);
    expect(reset.legacyRepFloor).toBe(Math.floor(lifetimeRep * REP_DECAY.LEGACY_FLOOR_SHARE));
    // The floor is what resets have earned: the new run starts on it.
    expect(reset.repPoints).toBe(reset.legacyRepFloor);
    expect(reset.lifetimeRep).toBe(reset.legacyRepFloor);
    expect(reset.lifetimeRepAllTime).toBe(lifetimeRep);
  });

  it("migrates older saves: lifetime Rep from the balance, unlocked items kept for free", () => {
    const migrated = migratePersistedState({
      repPoints: 120,
      unlockedCircuitIds: ["backyard_derby", "dirt_track"],
      unlockedLocationIds: ["curbside", "neighborhood_yards"],
      unlockedVehicleIds: ["push_mower"],
    }, 4) as Record<string, unknown>;
    expect(migrated.lifetimeRep).toBe(120);
    expect(migrated.lifetimeRepAllTime).toBe(120);
    expect(migrated.legacyRepFloor).toBe(0);
    expect(migrated.repPoints).toBe(120);
    expect(migrated.unlockedCircuitIds).toEqual(expect.arrayContaining(["dirt_track"]));
    expect(migrated.unlockedLocationIds).toEqual(expect.arrayContaining(["neighborhood_yards"]));
    // Rep-threshold blueprints already reachable at migration time are kept.
    expect(migrated.unlockedVehicleIds).toEqual(expect.arrayContaining(["go_kart", "beater_car"]));
    expect(PERSISTENCE_VERSION).toBe(5);
  });

  it("does not hand out Rep-priced blueprints on a current-version rehydrate", () => {
    const rehydrated = migratePersistedState({
      repPoints: 10_000,
      lifetimeRep: 10_000,
      unlockedVehicleIds: ["push_mower"],
    }, PERSISTENCE_VERSION) as Record<string, unknown>;
    expect(rehydrated.unlockedVehicleIds).not.toContain("go_kart");
  });
});
