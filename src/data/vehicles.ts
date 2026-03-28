export interface VehicleDefinition {
  id: string;
  name: string;
  tier: number;
  description: string;
  requiredParts: {
    engine: string[];   // acceptable engine part ids
    wheel: string[];
    frame: string[];
    fuel: string[];
  };
  baseStats: {
    speed: number;
    handling: number;
    reliability: number;
    weight: number;
  };
  unlockCondition: string;
  buildCost: number; // Scrap Bucks to build (workbench fee)
  sellValue: number;
  raceTiers: number[]; // which race circuits this can enter
}

export const VEHICLE_DEFINITIONS: VehicleDefinition[] = [
  {
    id: "push_mower",
    name: "Push Mower",
    tier: 0,
    description: "A barely-functional push mower you found at the curb. It goes... forward. Sometimes.",
    requiredParts: {
      engine: ["engine_small", "engine_lawn"],
      wheel: ["wheel_busted", "wheel_basic"],
      frame: ["frame_scrap", "frame_mower"],
      fuel: ["fuel_gas_can", "fuel_tank_small"],
    },
    baseStats: { speed: 5, handling: 3, reliability: 4, weight: 40 },
    unlockCondition: "Start",
    buildCost: 0,
    sellValue: 10,
    raceTiers: [0],
  },
  {
    id: "riding_mower",
    name: "Riding Mower",
    tier: 1,
    description: "You sit down on this one. Luxury.",
    requiredParts: {
      engine: ["engine_lawn", "engine_v4"],
      wheel: ["wheel_basic", "wheel_sport"],
      frame: ["frame_mower", "frame_kart"],
      fuel: ["fuel_tank_small", "fuel_tank_large"],
    },
    baseStats: { speed: 15, handling: 8, reliability: 12, weight: 80 },
    unlockCondition: "Build from scavenged parts",
    buildCost: 25,
    sellValue: 40,
    raceTiers: [0, 1],
  },
  {
    id: "go_kart",
    name: "Go-Kart",
    tier: 2,
    description: "A proper go-kart chassis welded together from salvage. Surprisingly quick.",
    requiredParts: {
      engine: ["engine_v4", "engine_v6"],
      wheel: ["wheel_basic", "wheel_sport"],
      frame: ["frame_kart", "frame_steel"],
      fuel: ["fuel_tank_small", "fuel_tank_large"],
    },
    baseStats: { speed: 35, handling: 30, reliability: 20, weight: 120 },
    unlockCondition: "Win Backyard Circuit",
    buildCost: 80,
    sellValue: 150,
    raceTiers: [1, 2],
  },
  {
    id: "beater_car",
    name: "Beater Car",
    tier: 3,
    description: "Four wheels, an engine that (mostly) starts, and a prayer. You're racing now.",
    requiredParts: {
      engine: ["engine_v4", "engine_v6"],
      wheel: ["wheel_basic", "wheel_sport"],
      frame: ["frame_steel"],
      fuel: ["fuel_tank_large"],
    },
    baseStats: { speed: 60, handling: 35, reliability: 30, weight: 900 },
    unlockCondition: "Reputation Level 5",
    buildCost: 200,
    sellValue: 400,
    raceTiers: [2, 3],
  },
  {
    id: "street_racer",
    name: "Street Racer",
    tier: 4,
    description: "A proper road car with performance mods. People notice when you pull up.",
    requiredParts: {
      engine: ["engine_v6", "engine_v8"],
      wheel: ["wheel_sport", "wheel_racing"],
      frame: ["frame_steel", "frame_carbon"],
      fuel: ["fuel_tank_large"],
    },
    baseStats: { speed: 110, handling: 65, reliability: 45, weight: 1100 },
    unlockCondition: "First engine swap",
    buildCost: 600,
    sellValue: 1200,
    raceTiers: [3, 4],
  },
  {
    id: "rally_car",
    name: "Rally Car",
    tier: 5,
    description: "Built for any terrain. Dirt, gravel, tarmac — it doesn't care.",
    requiredParts: {
      engine: ["engine_v6", "engine_v8", "engine_turbo_v6"],
      wheel: ["wheel_sport", "wheel_racing"],
      frame: ["frame_steel", "frame_carbon"],
      fuel: ["fuel_tank_large"],
    },
    baseStats: { speed: 160, handling: 90, reliability: 60, weight: 1200 },
    unlockCondition: "Win Regional Circuit",
    buildCost: 1500,
    sellValue: 3000,
    raceTiers: [4, 5],
  },
  {
    id: "stock_car",
    name: "Stock Car",
    tier: 6,
    description: "Go left. Go left. Go left. Go left. Go left.",
    requiredParts: {
      engine: ["engine_v8", "engine_turbo_v6"],
      wheel: ["wheel_racing"],
      frame: ["frame_steel", "frame_carbon"],
      fuel: ["fuel_tank_large"],
    },
    baseStats: { speed: 220, handling: 70, reliability: 80, weight: 1450 },
    unlockCondition: "Reputation Level 20",
    buildCost: 4000,
    sellValue: 8000,
    raceTiers: [5, 6],
  },
  {
    id: "prototype_racer",
    name: "Prototype Racer",
    tier: 7,
    description: "Barely street legal. Actually not street legal.",
    requiredParts: {
      engine: ["engine_turbo_v6"],
      wheel: ["wheel_racing"],
      frame: ["frame_carbon"],
      fuel: ["fuel_tank_large"],
    },
    baseStats: { speed: 320, handling: 140, reliability: 65, weight: 700 },
    unlockCondition: "Blueprints + rare parts",
    buildCost: 12000,
    sellValue: 25000,
    raceTiers: [6, 7],
  },
  {
    id: "supercar",
    name: "Supercar",
    tier: 8,
    description: "Built from scrap. Won on a world stage. The rags-to-races story.",
    requiredParts: {
      engine: ["engine_turbo_v6"],
      wheel: ["wheel_racing"],
      frame: ["frame_carbon"],
      fuel: ["fuel_tank_large"],
    },
    baseStats: { speed: 450, handling: 200, reliability: 85, weight: 1050 },
    unlockCondition: "Win National Circuit",
    buildCost: 40000,
    sellValue: 80000,
    raceTiers: [7, 8],
  },
];

export function getVehicleById(id: string): VehicleDefinition | undefined {
  return VEHICLE_DEFINITIONS.find((v) => v.id === id);
}
