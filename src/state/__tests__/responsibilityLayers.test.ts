import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "../store";
import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";

const vehicle = (id: string): BuiltVehicle => ({ id, definitionId: "push_mower", parts: {}, stats: { speed: 10, handling: 10, reliability: 10, weight: 10, performance: 10 }, builtAt: 1, condition: 100, totalRaces: 0 });
const completedRace: RaceOutcome = { circuitId: "backyard_derby", result: "win", position: 1, totalRacers: 8, scrapsEarned: 10, repEarned: 1, log: [] };

afterEach(() => useGameStore.setState(createInitialState()));

describe("responsibility-layer programs", () => {
  it("runs a passive fleet program at 60% rewards without unlocking progression", () => {
    useGameStore.setState({ ...createInitialState(), garage: [vehicle("focus"), vehicle("fleet")], activeVehicleId: "focus", raceHistory: [completedRace], teamUpgradeLevels: { team_active_slots: 1 } });
    const beforeUnlocks = [...useGameStore.getState().unlockedCircuitIds];
    useGameStore.getState().startFleetAssignment("fleet", "backyard_derby");
    useGameStore.getState().advanceFleetAssignments(10);
    const assignment = useGameStore.getState().fleetAssignments[0];
    expect(assignment.status).toBe("complete");
    expect(assignment.rewards.scrap).toBe(6);
    useGameStore.getState().collectFleetAssignment(assignment.id);
    expect(useGameStore.getState().scrapBucks).toBe(6);
    expect(useGameStore.getState().garage.find((item) => item.id === "fleet")?.condition).toBe(95);
    expect(useGameStore.getState().unlockedCircuitIds).toEqual(beforeUnlocks);
  });

  it("hosts and collects a bounded owned-track event", () => {
    useGameStore.setState({ ...createInitialState(), trackEraCount: 1, ownedTrackConfig: { surface: "asphalt", length: "long", cornerDensity: "high", timeRule: "night", vehicleClass: "prototype", endurance: true, riskReward: 5 } });
    useGameStore.getState().hostTrackEvent();
    expect(useGameStore.getState().hostedEvents[0]).toMatchObject({ status: "running", remainingTicks: 10 });
    useGameStore.getState().advanceFleetAssignments(10);
    const event = useGameStore.getState().hostedEvents[0];
    expect(event.status).toBe("complete");
    expect(event.reward).toBeGreaterThan(100000);
    useGameStore.getState().collectHostedEvent(event.id);
    expect(useGameStore.getState().scrapBucks).toBe(event.reward);
  });

  it("unlocks advanced Owner facilities through purchased functional upgrades", () => {
    useGameStore.setState({ ...createInitialState(), ownerPoints: 1000 });
    useGameStore.getState().purchaseOwnerUpgrade("owner_adv_circuits");
    useGameStore.getState().purchaseOwnerUpgrade("owner_vehicle_mastery");
    useGameStore.getState().purchaseOwnerUpgrade("owner_rd_lab");
    expect(useGameStore.getState().unlockedFeatures).toEqual(expect.arrayContaining(["advanced_circuits", "vehicle_mastery", "new_workshop_cats"]));
  });
});
