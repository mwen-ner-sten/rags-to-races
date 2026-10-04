import { getGearBonuses } from "./gear";
import { getSkillBonuses } from "./skills";
import { getUpgradeEffectValue } from "./workshopEffects";
import { getMomentumEffectValue } from "@/data/momentumBonuses";
import { getPermanentRuntimeBonuses } from "./permanentBonuses";
import type { GameState } from "@/state/store";
import { CIRCUIT_DEFINITIONS, type CircuitDefinition } from "@/data/circuits";
import type { OwnedTrackConfig, HostedEvent } from "@/data/trackVenue";
import { getVehicleById } from "@/data/vehicles";
import { calculateOdds, simulateRace } from "./race";
import { deriveVehicleStats, vehiclePerformance } from "./performance";
import { evaluateRacePlan } from "@/data/raceStrategy";
import { collectBonuses, racePerformanceMultiplier } from "./bonuses";
import type { BuiltVehicle } from "./build";

const CLASS_TIERS = { open: [0, 10], scrap: [0, 3], street: [4, 7], prototype: [8, 10] } as const;
export function seriesEligible(state: GameState, vehicle: BuiltVehicle, config: OwnedTrackConfig): boolean {
  const tier = getVehicleById(vehicle.definitionId)?.tier ?? -1;
  const [min, max] = CLASS_TIERS[config.vehicleClass];
  return tier >= min && tier <= max && vehicle.condition >= 30 && vehicle.id !== state.activeVehicleId
    && !state.fleetAssignments.some((a) => a.vehicleId === vehicle.id)
    && !state.hostedEvents.some((e) => e.vehicleId === vehicle.id);
}
export function seriesCircuit(config: OwnedTrackConfig, vehicle: BuiltVehicle, round: number): CircuitDefinition {
  const tier = getVehicleById(vehicle.definitionId)?.tier ?? 0;
  const base = CIRCUIT_DEFINITIONS.find((c) => tier >= c.minVehicleTier && tier <= c.maxVehicleTier) ?? CIRCUIT_DEFINITIONS[0];
  const cornerDensity = round === 1 ? "high" : config.cornerDensity;
  const length = config.endurance || round === 2 ? "long" : config.length;
  return { ...base, id: "owned_series", name: `Round ${round + 1}`, difficulty: base.difficulty * (0.8 + config.riskReward * 0.25) * (config.timeRule === "night" ? 1.12 : 1),
    profile: { ...base.profile, surface: config.surface, cornerDensity, length,
      weather: config.timeRule === "variable_weather" && round === 1 ? "wet" : "dry",
      demands: { ...base.profile.demands, grip: cornerDensity === "high" ? 10 : 4, power: cornerDensity === "low" ? 10 : 4, reliability: length === "long" ? 10 : 4, fuel: length === "long" ? 10 : 3 },
      wearPressure: length === "long" ? 1.4 : 1, pitAvailable: length === "long" } };
}
export function seriesTerms(config: OwnedTrackConfig, vehicle: BuiltVehicle, state?: GameState) {
  const tier = getVehicleById(vehicle.definitionId)?.tier ?? 0;
  const prize = Math.floor(150 * (tier + 1) ** 2 * config.riskReward * (config.timeRule === "night" ? 1.25 : 1) * (config.endurance ? 2 : 1) * (1 + (state?.trackPerkLevels.track_sponsors ?? 0) * 0.2) * (state ? 1 + getPermanentRuntimeBonuses(state).allScrapIncomeMult : 1));
  return { prize, fee: Math.ceil(prize * 0.2), durationTicks: 15 * (config.endurance ? 2 : 1) };
}
function preparationBonuses(state: GameState, circuit: CircuitDefinition) {
  const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
  const permanent = getPermanentRuntimeBonuses(state);
  return { performance: racePerformanceMultiplier(collectBonuses(state, circuit.tier, circuit)) - 1,
    handling: getUpgradeEffectValue(state, "tuned_suspension") + gear.race_handling_pct,
    dnf: gear.race_dnf_reduction + permanent.raceDnfFlatReduction,
    skillDnf: getSkillBonuses(state.racerSkills, circuit.tier).drivingDnfReduction,
    momentum: getMomentumEffectValue(state.activeMomentumTiers, "race_win_bonus"), dnfMultiplier: permanent.raceDnfChanceMultiplier };
}
export function forecastSeries(state: GameState, vehicle: BuiltVehicle, config: OwnedTrackConfig): number[] {
  return [0, 1, 2].map((round) => {
    const circuit = seriesCircuit(config, vehicle, round);
    const bonus = preparationBonuses(state, circuit);
    const stats = deriveVehicleStats(vehicle, bonus.handling);
    const odds = calculateOdds(vehiclePerformance(vehicle, circuit, bonus.handling), stats.reliability, circuit.difficulty, state.fatigue,
      bonus.performance, bonus.dnf, 0, bonus.skillDnf, bonus.momentum, false, evaluateRacePlan(circuit.profile, state.currentRacePlan), bonus.dnfMultiplier);
    return (1 - odds.dnfChance) * odds.winChance;
  });
}
/** A committed vehicle races three actual rounds, carrying wear between them. */
export function completeSeries(state: GameState, event: HostedEvent): { event: HostedEvent; vehicle?: BuiltVehicle } {
  const original = state.garage.find((v) => v.id === event.vehicleId);
  if (!original || !event.plan) return { event: { ...event, status: "complete", remainingTicks: 0, reward: event.vehicleId ? 0 : event.reward } };
  let vehicle = { ...original };
  const rounds: NonNullable<HostedEvent["rounds"]> = [];
  for (let round = 0; round < 3; round++) {
    const circuit = seriesCircuit(event.config, vehicle, round);
    const bonus = preparationBonuses(state, circuit);
    const result = simulateRace(vehicle, circuit, state.fatigue, bonus.performance,
      bonus.dnf, 0, 1, bonus.momentum, 0, 0, bonus.skillDnf, vehicle.condition <= 0, event.plan, bonus.dnfMultiplier, bonus.handling);
    rounds.push({ result: result.result, position: result.position });
    vehicle = { ...vehicle, condition: Math.max(0, vehicle.condition - (result.result === "dnf" ? 12 : 5) * (event.config.endurance ? 2 : 1)) };
  }
  const points = rounds.reduce((sum, r) => sum + (r.result === "dnf" ? 0 : (9 - r.position) / 8), 0) / 3;
  const reward = Math.floor((event.prize ?? 0) * points);
  return { event: { ...event, remainingTicks: 0, status: "complete", reward, rounds }, vehicle: { ...vehicle, totalRaces: (vehicle.totalRaces ?? 0) + 3 } };
}
