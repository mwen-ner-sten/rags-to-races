import type { CircuitProfile } from "./raceStrategy";
import { REP_UNLOCK_COSTS } from "@/config/progression";

export type EventId = "sprint" | "heat" | "feature";

/**
 * One rung of the per-venue event ladder. Multipliers apply to the venue's
 * Heat (x1) values; `opensAfter` names the event whose win here opens this one.
 */
export interface EventDefinition {
  id: EventId;
  name: string;
  description: string;
  difficultyMult: number;
  prizeMult: number;
  repMult: number;
  opensAfter: EventId | null;
}

/** Sprint opens with the venue; Heat after a Sprint win here; Feature after a Heat win here. */
export const EVENT_LADDER: readonly EventDefinition[] = [
  { id: "sprint", name: "Sprint", description: "A short, cheap opener. Open as soon as the venue is.", difficultyMult: 0.75, prizeMult: 0.5, repMult: 0.6, opensAfter: null },
  { id: "heat", name: "Heat", description: "The venue's main race. Win a Sprint here to enter.", difficultyMult: 1, prizeMult: 1, repMult: 1, opensAfter: "sprint" },
  { id: "feature", name: "Feature", description: "The headline event; rivals only show up here. Win a Heat here to enter.", difficultyMult: 1.4, prizeMult: 1.8, repMult: 1.6, opensAfter: "heat" },
];

/** Entry fee as a share of the prize (rounded to whole Scrap Bucks). */
export const ENTRY_FEE_SHARE = 0.15;

export function entryFeeForPrize(prize: number): number {
  return Math.round(prize * ENTRY_FEE_SHARE);
}

export interface CircuitDefinition {
  id: string;
  name: string;
  tier: number;
  description: string;
  minVehicleTier: number;
  maxVehicleTier: number;
  /**
   * Heat difficulty: circuit-fitted performance at which a build is at parity
   * (~45% win). Sprint and Feature scale it (see EVENT_LADDER and
   * scripts/calibrate-circuits.ts).
   */
  difficulty: number;
  entryFee: number;         // Scrap Bucks to enter the Heat (15% of prize; the tutorial venue is free)
  rewardBase: number;       // Scrap Bucks on a Heat win
  repReward: number;        // Rep Points on a Heat win
  /** Events hosted here, in ladder order. */
  events: readonly EventDefinition[];
  unlockRepCost: number;    // Rep Points to unlock circuit
  raceDuration: number;     // ms for race animation
  /** Feature unlock required to see this circuit (e.g. "advanced_circuits") */
  requiredFeature?: string;
  profile: CircuitProfile;
}

export const CIRCUIT_DEFINITIONS: CircuitDefinition[] = [
  {
    id: "backyard_derby",
    name: "Backyard Derby",
    tier: 0,
    description: "Held in Clyde's back forty. Prize: bragging rights and $10.",
    minVehicleTier: 0,
    maxVehicleTier: 1,
    difficulty: 8,
    entryFee: 0,
    rewardBase: 10,
    repReward: 2,
    unlockRepCost: REP_UNLOCK_COSTS.circuits.backyard_derby,
    events: EVENT_LADDER,
    raceDuration: 6000,
    profile: { surface: "grass", weather: "variable", length: "short", cornerDensity: "high", demands: { power: 2, grip: 5, aero: 1, reliability: 3, fuel: 1 }, wearPressure: 0.8, breakdownPressure: 0.95, pitAvailable: false, rewardProfile: "local" },
  },
  {
    id: "dirt_track",
    name: "Dirt Track",
    tier: 1,
    description: "A figure-eight on a gravel lot. Local legend material.",
    minVehicleTier: 2,
    maxVehicleTier: 3,
    difficulty: 58,
    entryFee: 3,
    rewardBase: 22,
    repReward: 8,
    unlockRepCost: REP_UNLOCK_COSTS.circuits.dirt_track,
    events: EVENT_LADDER,
    raceDuration: 8000,
    profile: { surface: "gravel", weather: "variable", length: "short", cornerDensity: "high", demands: { power: 4, grip: 7, aero: 2, reliability: 5, fuel: 2 }, wearPressure: 1.1, breakdownPressure: 1.02, pitAvailable: false, rewardProfile: "local" },
  },
  {
    id: "regional_circuit",
    name: "Regional Circuit",
    tier: 2,
    description: "Real track, real competition. Somebody brought a trailer.",
    minVehicleTier: 4,
    maxVehicleTier: 5,
    difficulty: 140,
    entryFee: 8,
    rewardBase: 50,
    repReward: 40,
    unlockRepCost: REP_UNLOCK_COSTS.circuits.regional_circuit,
    events: EVENT_LADDER,
    raceDuration: 10000,
    profile: { surface: "asphalt", weather: "dry", length: "medium", cornerDensity: "medium", demands: { power: 8, grip: 4, aero: 3, reliability: 5, fuel: 4 }, wearPressure: 1, breakdownPressure: 1, pitAvailable: true, rewardProfile: "regional" },
  },
  {
    id: "national_circuit",
    name: "National Circuit",
    tier: 3,
    description: "Corporate sponsors. Cameras. Your pit crew is still Dave.",
    minVehicleTier: 6,
    maxVehicleTier: 7,
    difficulty: 230,
    entryFee: 17,
    rewardBase: 110,
    repReward: 150,
    unlockRepCost: REP_UNLOCK_COSTS.circuits.national_circuit,
    events: EVENT_LADDER,
    raceDuration: 12000,
    profile: { surface: "asphalt", weather: "variable", length: "medium", cornerDensity: "high", demands: { power: 6, grip: 8, aero: 7, reliability: 7, fuel: 5 }, wearPressure: 1.15, breakdownPressure: 1.04, pitAvailable: true, rewardProfile: "national" },
  },
  {
    id: "world_championship",
    name: "World Championship",
    tier: 4,
    description: "The best cars on earth. One built from garbage.",
    minVehicleTier: 8,
    maxVehicleTier: 9,
    difficulty: 380,
    entryFee: 38,
    rewardBase: 250,
    repReward: 500,
    unlockRepCost: REP_UNLOCK_COSTS.circuits.world_championship,
    events: EVENT_LADDER,
    raceDuration: 15000,
    profile: { surface: "asphalt", weather: "variable", length: "long", cornerDensity: "medium", demands: { power: 10, grip: 4, aero: 6, reliability: 8, fuel: 8 }, wearPressure: 1.25, breakdownPressure: 1.06, pitAvailable: true, rewardProfile: "world" },
  },
  {
    id: "continental_grand_prix",
    name: "Continental Grand Prix",
    tier: 5,
    description: "International competition. Flags from every nation. Your pit crew finally has uniforms.",
    minVehicleTier: 8,
    maxVehicleTier: 10,
    difficulty: 385,
    entryFee: 84,
    rewardBase: 560,
    repReward: 1500,
    unlockRepCost: REP_UNLOCK_COSTS.circuits.continental_grand_prix,
    events: EVENT_LADDER,
    raceDuration: 18000,
    requiredFeature: "advanced_circuits",
    profile: { surface: "asphalt", weather: "variable", length: "long", cornerDensity: "high", demands: { power: 8, grip: 9, aero: 9, reliability: 9, fuel: 8 }, wearPressure: 1.35, breakdownPressure: 1.08, pitAvailable: true, rewardProfile: "world" },
  },
  {
    id: "endurance_series",
    name: "Endurance Series",
    tier: 6,
    description: "24 hours of racing. Your scrap heap against the world's finest. Beautiful.",
    minVehicleTier: 9,
    maxVehicleTier: 10,
    difficulty: 385,
    entryFee: 188,
    rewardBase: 1250,
    repReward: 5000,
    unlockRepCost: REP_UNLOCK_COSTS.circuits.endurance_series,
    events: EVENT_LADDER,
    raceDuration: 22000,
    requiredFeature: "advanced_circuits",
    profile: { surface: "asphalt", weather: "wet", length: "long", cornerDensity: "medium", demands: { power: 6, grip: 8, aero: 6, reliability: 10, fuel: 10 }, wearPressure: 1.6, breakdownPressure: 1.12, pitAvailable: true, rewardProfile: "endurance" },
  },
];

export function getCircuitById(id: string): CircuitDefinition | undefined {
  return CIRCUIT_DEFINITIONS.find((c) => c.id === id);
}
