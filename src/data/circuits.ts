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
}

export const CIRCUIT_DEFINITIONS: CircuitDefinition[] = [
  {
    id: "backyard_derby",
    name: "Backyard Derby",
    tier: 0,
    description: "Held in Clyde's back forty. Prize: bragging rights and $20.",
    minVehicleTier: 0,
    maxVehicleTier: 1,
    difficulty: 15,
    entryFee: 0,
    rewardBase: 10,
    repReward: 1,
    unlockRepCost: 0,
    raceDuration: 3000,
  },
  {
    id: "dirt_track",
    name: "Dirt Track",
    tier: 1,
    description: "A figure-eight on a gravel lot. Local legend material.",
    minVehicleTier: 2,
    maxVehicleTier: 3,
    difficulty: 35,
    entryFee: 15,
    rewardBase: 60,
    repReward: 3,
    unlockRepCost: 5000,
    raceDuration: 4000,
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
    unlockRepCost: 50000,
    raceDuration: 5000,
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
    unlockRepCost: 200000,
    raceDuration: 6000,
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
    unlockRepCost: 600000,
    raceDuration: 8000,
  },
];

export function getCircuitById(id: string): CircuitDefinition | undefined {
  return CIRCUIT_DEFINITIONS.find((c) => c.id === id);
}
