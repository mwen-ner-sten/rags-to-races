import { readyCampaign } from "@/testing/campaignReady";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "../store";
import { calculateStats, type BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";
import { getVehicleById } from "@/data/vehicles";

const vehicle = (id: string): BuiltVehicle => ({ id, definitionId: "push_mower", parts: {}, stats: { speed: 10, handling: 10, reliability: 10, weight: 10, performance: 10 }, builtAt: 1, condition: 100, totalRaces: 0 });
const completedRace: RaceOutcome = { circuitId: "backyard_derby", result: "win", position: 1, totalRacers: 8, scrapsEarned: 10, repEarned: 1, log: [] };

afterEach(() => useGameStore.setState(createInitialState()));

describe("responsibility-layer programs", () => {
  it("runs a passive fleet program at 60% rewards without unlocking progression", () => {
    useGameStore.setState({ ...createInitialState(), campaign: readyCampaign(), garage: [vehicle("focus"), { ...vehicle("fleet"), condition: 52 }], activeVehicleId: "focus", eventWins: { backyard_derby: { sprint: 1 } }, raceHistory: [completedRace] });
    const beforeUnlocks = [...useGameStore.getState().unlockedCircuitIds];
    useGameStore.getState().startFleetAssignment("fleet", "backyard_derby");
    useGameStore.getState().advanceFleetAssignments(10);
    const assignment = useGameStore.getState().fleetAssignments[0];
    expect(assignment.status).toBe("complete");
    expect(assignment.rewards.scrap).toBe(6);
    useGameStore.getState().collectFleetAssignment(assignment.id);
    expect(useGameStore.getState().scrapBucks).toBe(6);
    const collectedVehicle = useGameStore.getState().garage.find((item) => item.id === "fleet");
    const definition = getVehicleById("push_mower");
    expect(collectedVehicle?.condition).toBe(47);
    expect(collectedVehicle?.stats).toEqual(calculateStats(definition!, {}, 47, 0));
    expect(useGameStore.getState().unlockedCircuitIds).toEqual(beforeUnlocks);
  });

  it("rejects missing or concurrently assigned crew while allowing a different eligible crew member", () => {
    const crewRoster = [
      { id: "crew-one", name: "Rico", role: "driver" as const, level: 1, xp: 0, specialization: null },
      { id: "crew-two", name: "Dave", role: "mechanic" as const, level: 1, xp: 0, specialization: null },
    ];
    useGameStore.setState({
      ...createInitialState(), campaign: readyCampaign(),
      garage: [vehicle("focus"), vehicle("fleet-one"), vehicle("fleet-two")],
      activeVehicleId: "focus",
      eventWins: { backyard_derby: { sprint: 1 } }, raceHistory: [completedRace],
      crewRoster,
      teamUpgradeLevels: { team_fleet: 1 },
    });

    useGameStore.getState().startFleetAssignment("fleet-one", "backyard_derby", "crew-one");
    useGameStore.getState().startFleetAssignment("fleet-two", "backyard_derby", "crew-one");
    useGameStore.getState().startFleetAssignment("fleet-two", "backyard_derby", "missing-crew");
    expect(useGameStore.getState().fleetAssignments).toHaveLength(1);

    useGameStore.getState().startFleetAssignment("fleet-two", "backyard_derby", "crew-two");
    expect(useGameStore.getState().fleetAssignments.map((assignment) => assignment.crewId)).toEqual(["crew-one", "crew-two"]);

    useGameStore.getState().advanceFleetAssignments(10);
    const firstAssignmentId = useGameStore.getState().fleetAssignments[0].id;
    useGameStore.getState().collectFleetAssignment(firstAssignmentId);
    expect(useGameStore.getState().crewRoster.find((member) => member.id === "crew-one")?.xp).toBe(5);
    expect(useGameStore.getState().activityLog.some((entry) => entry.message.includes("Rico +5 XP"))).toBe(true);
  });

  it("requires a compatible committed vehicle, charges the fee, and settles three rounds once", () => {
    useGameStore.setState({ ...createInitialState(), campaign: readyCampaign(), trackEraCount: 1, scrapBucks: 10000,
      garage: [vehicle("series")], ownedTrackConfig: { ...createInitialState().ownedTrackConfig, vehicleClass: "prototype" } });
    useGameStore.getState().hostTrackEvent("series");
    expect(useGameStore.getState().hostedEvents).toEqual([]);
    useGameStore.getState().updateOwnedTrackConfig({ ...createInitialState().ownedTrackConfig, vehicleClass: "scrap" });
    useGameStore.getState().hostTrackEvent("series");
    const running = useGameStore.getState().hostedEvents[0];
    expect(running).toMatchObject({ status: "running", vehicleId: "series", remainingTicks: 15 });
    expect(useGameStore.getState().scrapBucks).toBe(10000 - running.fee!);
    useGameStore.getState().sellVehicle("series");
    expect(useGameStore.getState().garage).toHaveLength(1);
    useGameStore.getState().advanceFleetAssignments(100);
    const event = useGameStore.getState().hostedEvents[0];
    expect(event.rounds).toHaveLength(3);
    expect(event.reward).toBeLessThanOrEqual(event.prize!);
    useGameStore.getState().collectHostedEvent(event.id);
    const balance = useGameStore.getState().scrapBucks;
    expect(balance).toBe(10000 - running.fee! + event.reward);
    useGameStore.getState().collectHostedEvent(event.id);
    expect(useGameStore.getState().scrapBucks).toBe(balance);
  });

  it("unlocks only released Owner facilities through purchased functional upgrades", () => {
    useGameStore.setState({ ...createInitialState(), campaign: readyCampaign(), ownerPoints: 1000 });
    useGameStore.getState().purchaseOwnerUpgrade("owner_adv_circuits");
    useGameStore.getState().purchaseOwnerUpgrade("owner_vehicle_mastery");
    useGameStore.getState().purchaseOwnerUpgrade("owner_rd_lab");
    expect(useGameStore.getState().unlockedFeatures).toEqual(expect.arrayContaining(["advanced_circuits", "vehicle_mastery"]));
    expect(useGameStore.getState().unlockedFeatures).not.toContain("new_workshop_cats");
  });
});
