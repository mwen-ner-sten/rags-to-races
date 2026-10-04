import type { GameState } from "@/state/store";
import { getCircuitById } from "@/data/circuits";
import { getPermanentRuntimeBonuses } from "./permanentBonuses";
import { completeSeries } from "./series";
import { getVehicleCircuitIneligibilityReason } from "./eligibility";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";

export function fleetStartReason(state: GameState, vehicleId: string, circuitId: string, crewId?: string): string | null {
  const vehicle = state.garage.find((v) => v.id === vehicleId);
  const circuit = getCircuitById(circuitId);
  if (!state.campaign.knowledge.team) return "Promote to Team to run fleet programs.";
  if (!vehicle || !circuit) return "Choose a vehicle and a completed venue.";
  if (vehicleId === state.activeVehicleId) return "Choose a spare vehicle.";
  if (state.hostedEvents.some((e) => e.vehicleId === vehicleId) || state.fleetAssignments.some((a) => a.vehicleId === vehicleId)) return "This vehicle is reserved; collect its work first.";
  if (getVehicleCircuitIneligibilityReason(vehicle, circuit)) return "This vehicle does not qualify for the venue.";
  if (vehicle.condition < Math.max(10, state.autoRaceMinCondition)) return "Repair this vehicle before assigning it.";
  if (!Object.values(state.eventWins[circuitId] ?? {}).some((n) => (n ?? 0) > 0)) return "Win a race at this venue first.";
  if (state.scrapBucks < circuit.entryFee * 4) return `Keep ${circuit.entryFee * 4} Scrap Bucks in reserve.`;
  if (crewId && !state.crewRoster.some((c) => c.id === crewId)) return "Choose an available crew member.";
  if (crewId && state.fleetAssignments.some((a) => a.crewId === crewId)) return "This crew member is already reserved.";
  const slots = 1 + Math.floor(getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "active_vehicle_slot"));
  if (state.fleetAssignments.filter((a) => a.status === "running").length >= slots) return "All fleet slots are running.";
  return null;
}
const multiplyReward = (base: number, bonus: number) => Math.floor(base * (1 + bonus));
function advanceSeries(state: GameState, ticks: number): Partial<GameState> {
  let garage = state.garage;
  const hostedEvents = state.hostedEvents.map((event) => {
    if (event.status !== "running") return event;
    if (event.remainingTicks > ticks) return { ...event, remainingTicks: event.remainingTicks - ticks };
    const result = completeSeries({ ...state, garage }, event);
    if (result.vehicle) garage = garage.map((v) => v.id === result.vehicle!.id ? result.vehicle! : v);
    return result.event;
  });
  return { garage, hostedEvents };
}

export function advancePrograms(current: GameState, ticks: number): Partial<GameState> {
  return { fleetAssignments: current.fleetAssignments.map((assignment) => {
        if (assignment.status !== "running") return assignment;
        const remainingTicks = Math.max(0, assignment.remainingTicks - Math.max(1, ticks));
        if (remainingTicks > 0) return { ...assignment, remainingTicks };
        const circuit = getCircuitById(assignment.circuitId);
        const permanent = getPermanentRuntimeBonuses(current);
        const crew = current.crewRoster.find((c) => c.id === assignment.crewId);
        const crewIncome = crew?.role === "trader" ? 0.2 : crew?.role === "driver" ? 0.1 : 0;
        const crewMaterials = crew?.role === "scout" ? 1 : 0;
        const wear = crew?.role === "mechanic" ? 3 : 5;
        return {
          ...assignment,
          remainingTicks: 0,
          status: "complete",
          accumulatedWear: assignment.accumulatedWear + wear,
          rewards: {
            scrap: multiplyReward(
              Math.floor((circuit?.rewardBase ?? 0) * (assignment.policy === "income" ? 0.8 : assignment.policy === "development" ? 0.4 : 0.6)),
              permanent.allScrapIncomeMult + crewIncome,
            ),
            materials: Math.max(
              1,
              multiplyReward(
                Math.max(1, Math.floor((circuit?.tier ?? 0) * 0.6)) + crewMaterials,
                permanent.materialYieldMult,
              ),
            ),
          },
        };
      }), ...advanceSeries(current, ticks) };
}
