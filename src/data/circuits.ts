import type { CircuitProfile } from "./raceStrategy";

export interface CircuitDefinition {
  id: string;
  name: string;
  tier: number;
  description: string;
  minVehicleTier: number;
  maxVehicleTier: number;
  difficulty: number;       // 1–100, used in race sim
  entryFee: number;         // Scrap Bucks to enter
  rewardBase: number;       // Scrap Bucks on win
  repReward: number;        // Rep Points on win
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
    difficulty: 25,
    entryFee: 0,
    rewardBase: 10,
    repReward: 1,
    unlockRepCost: 0,
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
    difficulty: 50,
    entryFee: 15,
    rewardBase: 60,
    repReward: 3,
    unlockRepCost: 25000,
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
    difficulty: 55,
    entryFee: 100,
    rewardBase: 500,
    repReward: 10,
    unlockRepCost: 200000,
    raceDuration: 10000,
    profile: { surface: "asphalt", weather: "dry", length: "medium", cornerDensity: "medium", demands: { power: 6, grip: 6, aero: 5, reliability: 5, fuel: 4 }, wearPressure: 1, breakdownPressure: 1, pitAvailable: true, rewardProfile: "regional" },
  },
  {
    id: "national_circuit",
    name: "National Circuit",
    tier: 3,
    description: "Corporate sponsors. Cameras. Your pit crew is still Dave.",
    minVehicleTier: 6,
    maxVehicleTier: 7,
    difficulty: 80,
    entryFee: 800,
    rewardBase: 4000,
    repReward: 30,
    unlockRepCost: 800000,
    raceDuration: 12000,
    profile: { surface: "asphalt", weather: "variable", length: "medium", cornerDensity: "high", demands: { power: 7, grip: 8, aero: 7, reliability: 7, fuel: 5 }, wearPressure: 1.15, breakdownPressure: 1.04, pitAvailable: true, rewardProfile: "national" },
  },
  {
    id: "world_championship",
    name: "World Championship",
    tier: 4,
    description: "The best cars on earth. One built from garbage.",
    minVehicleTier: 8,
    maxVehicleTier: 9,
    difficulty: 95,
    entryFee: 8000,
    rewardBase: 35000,
    repReward: 100,
    unlockRepCost: 2500000,
    raceDuration: 15000,
    profile: { surface: "asphalt", weather: "variable", length: "long", cornerDensity: "medium", demands: { power: 9, grip: 8, aero: 9, reliability: 8, fuel: 8 }, wearPressure: 1.25, breakdownPressure: 1.06, pitAvailable: true, rewardProfile: "world" },
  },
  {
    id: "continental_grand_prix",
    name: "Continental Grand Prix",
    tier: 5,
    description: "International competition. Flags from every nation. Your pit crew finally has uniforms.",
    minVehicleTier: 8,
    maxVehicleTier: 10,
    difficulty: 110,
    entryFee: 25000,
    rewardBase: 150000,
    repReward: 200,
    unlockRepCost: 8000000,
    raceDuration: 18000,
    requiredFeature: "advanced_circuits",
    profile: { surface: "asphalt", weather: "variable", length: "long", cornerDensity: "high", demands: { power: 9, grip: 10, aero: 10, reliability: 9, fuel: 8 }, wearPressure: 1.35, breakdownPressure: 1.08, pitAvailable: true, rewardProfile: "world" },
  },
  {
    id: "endurance_series",
    name: "Endurance Series",
    tier: 6,
    description: "24 hours of racing. Your scrap heap against the world's finest. Beautiful.",
    minVehicleTier: 9,
    maxVehicleTier: 10,
    difficulty: 130,
    entryFee: 100000,
    rewardBase: 500000,
    repReward: 500,
    unlockRepCost: 25000000,
    raceDuration: 22000,
    requiredFeature: "advanced_circuits",
    profile: { surface: "asphalt", weather: "wet", length: "long", cornerDensity: "medium", demands: { power: 8, grip: 10, aero: 8, reliability: 10, fuel: 10 }, wearPressure: 1.6, breakdownPressure: 1.12, pitAvailable: true, rewardProfile: "endurance" },
  },
];

export function getCircuitById(id: string): CircuitDefinition | undefined {
  return CIRCUIT_DEFINITIONS.find((c) => c.id === id);
}
