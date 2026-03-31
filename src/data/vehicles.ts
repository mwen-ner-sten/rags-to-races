import type { CoreSlot } from "./parts";

export interface SlotConfig {
  slot: CoreSlot;
  required: boolean;
  acceptableParts: string[];   // part definition IDs that fit this slot
}

export interface VehicleDefinition {
  id: string;
  name: string;
  tier: number;
  description: string;
  slots: SlotConfig[];
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
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_small", "engine_lawn"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_busted", "wheel_basic"] },
    ],
    baseStats: { speed: 5, handling: 3, reliability: 4, weight: 40 },
    unlockCondition: "Start",
    buildCost: 10,
    sellValue: 10,
    raceTiers: [0],
  },
  {
    id: "riding_mower",
    name: "Riding Mower",
    tier: 1,
    description: "You sit down on this one. Luxury.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_lawn", "engine_v4"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_basic", "wheel_sport"] },
      { slot: "frame", required: true, acceptableParts: ["frame_mower", "frame_kart"] },
    ],
    baseStats: { speed: 15, handling: 8, reliability: 12, weight: 80 },
    unlockCondition: "Build from scavenged parts",
    buildCost: 40,
    sellValue: 40,
    raceTiers: [0, 1],
  },
  {
    id: "go_kart",
    name: "Go-Kart",
    tier: 2,
    description: "A proper go-kart chassis welded together from salvage. Surprisingly quick.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_v4", "engine_v6"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_basic", "wheel_sport"] },
      { slot: "frame", required: true, acceptableParts: ["frame_kart", "frame_steel"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_small", "fuel_tank_large"] },
    ],
    baseStats: { speed: 35, handling: 30, reliability: 20, weight: 120 },
    unlockCondition: "Win Backyard Circuit",
    buildCost: 120,
    sellValue: 150,
    raceTiers: [1, 2],
  },
  {
    id: "beater_car",
    name: "Beater Car",
    tier: 3,
    description: "Four wheels, an engine that (mostly) starts, and a prayer. You're racing now.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_v4", "engine_v6"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_basic", "wheel_sport"] },
      { slot: "frame", required: true, acceptableParts: ["frame_steel"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_large"] },
      { slot: "electronics", required: false, acceptableParts: ["elec_none", "elec_basic", "elec_ecu"] },
    ],
    baseStats: { speed: 60, handling: 35, reliability: 30, weight: 900 },
    unlockCondition: "Reputation Level 5",
    buildCost: 300,
    sellValue: 400,
    raceTiers: [2, 3],
  },
  {
    id: "street_racer",
    name: "Street Racer",
    tier: 4,
    description: "A proper road car with performance mods. People notice when you pull up.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_v6", "engine_v8"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_sport", "wheel_racing"] },
      { slot: "frame", required: true, acceptableParts: ["frame_steel", "frame_carbon"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_large"] },
      { slot: "electronics", required: false, acceptableParts: ["elec_basic", "elec_ecu"] },
      { slot: "drivetrain", required: true, acceptableParts: ["drive_chain", "drive_manual"] },
    ],
    baseStats: { speed: 110, handling: 65, reliability: 45, weight: 1100 },
    unlockCondition: "First engine swap",
    buildCost: 900,
    sellValue: 1200,
    raceTiers: [3, 4],
  },
  {
    id: "rally_car",
    name: "Rally Car",
    tier: 5,
    description: "Built for any terrain. Dirt, gravel, tarmac — it doesn't care.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_v6", "engine_v8", "engine_turbo_v6"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_sport", "wheel_racing"] },
      { slot: "frame", required: true, acceptableParts: ["frame_steel", "frame_carbon"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_large"] },
      { slot: "electronics", required: false, acceptableParts: ["elec_ecu", "elec_racing"] },
      { slot: "drivetrain", required: true, acceptableParts: ["drive_manual", "drive_sequential"] },
      { slot: "suspension", required: true, acceptableParts: ["susp_leaf", "susp_coilovers"] },
    ],
    baseStats: { speed: 160, handling: 90, reliability: 60, weight: 1200 },
    unlockCondition: "Win Regional Circuit",
    buildCost: 2200,
    sellValue: 3000,
    raceTiers: [4, 5],
  },
  {
    id: "stock_car",
    name: "Stock Car",
    tier: 6,
    description: "Go left. Go left. Go left. Go left. Go left.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_v8", "engine_turbo_v6"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_racing"] },
      { slot: "frame", required: true, acceptableParts: ["frame_steel", "frame_carbon"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_large"] },
      { slot: "electronics", required: false, acceptableParts: ["elec_ecu", "elec_racing"] },
      { slot: "drivetrain", required: true, acceptableParts: ["drive_sequential", "drive_dualclutch"] },
      { slot: "exhaust", required: true, acceptableParts: ["exhaust_straight", "exhaust_headers"] },
      { slot: "suspension", required: true, acceptableParts: ["susp_coilovers", "susp_adjustable"] },
    ],
    baseStats: { speed: 220, handling: 70, reliability: 80, weight: 1450 },
    unlockCondition: "Reputation Level 20",
    buildCost: 6000,
    sellValue: 8000,
    raceTiers: [5, 6],
  },
  {
    id: "prototype_racer",
    name: "Prototype Racer",
    tier: 7,
    description: "Barely street legal. Actually not street legal.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_turbo_v6"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_racing"] },
      { slot: "frame", required: true, acceptableParts: ["frame_carbon"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_large"] },
      { slot: "electronics", required: true, acceptableParts: ["elec_racing"] },
      { slot: "drivetrain", required: true, acceptableParts: ["drive_sequential", "drive_dualclutch"] },
      { slot: "exhaust", required: true, acceptableParts: ["exhaust_headers", "exhaust_titanium"] },
      { slot: "suspension", required: true, acceptableParts: ["susp_adjustable", "susp_active"] },
      { slot: "aero", required: true, acceptableParts: ["aero_spoiler", "aero_diffuser", "aero_carbon"] },
    ],
    baseStats: { speed: 320, handling: 140, reliability: 65, weight: 700 },
    unlockCondition: "Blueprints + rare parts",
    buildCost: 18000,
    sellValue: 25000,
    raceTiers: [6, 7],
  },
  {
    id: "supercar",
    name: "Supercar",
    tier: 8,
    description: "Built from scrap. Won on a world stage. The rags-to-races story.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_turbo_v6"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_racing"] },
      { slot: "frame", required: true, acceptableParts: ["frame_carbon"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_large"] },
      { slot: "electronics", required: true, acceptableParts: ["elec_racing"] },
      { slot: "drivetrain", required: true, acceptableParts: ["drive_dualclutch"] },
      { slot: "exhaust", required: true, acceptableParts: ["exhaust_titanium"] },
      { slot: "suspension", required: true, acceptableParts: ["susp_active"] },
      { slot: "aero", required: true, acceptableParts: ["aero_diffuser", "aero_carbon"] },
    ],
    baseStats: { speed: 450, handling: 200, reliability: 85, weight: 1050 },
    unlockCondition: "Win National Circuit",
    buildCost: 60000,
    sellValue: 80000,
    raceTiers: [7, 8],
  },
];

export function getVehicleById(id: string): VehicleDefinition | undefined {
  return VEHICLE_DEFINITIONS.find((v) => v.id === id);
}

/** Get the slot config for a specific slot on a vehicle */
export function getSlotConfig(vehicleDef: VehicleDefinition, slot: CoreSlot): SlotConfig | undefined {
  return vehicleDef.slots.find((s) => s.slot === slot);
}

/** Get all core slot names for a vehicle */
export function getVehicleSlots(vehicleDef: VehicleDefinition): CoreSlot[] {
  return vehicleDef.slots.map((s) => s.slot);
}

// ── Vehicle wear & repair constants ──────────────────────────────────────────
export const BASE_WEAR_PER_RACE = 8;
export const DNF_WEAR_BONUS = 15;
export const RELIABILITY_WEAR_THRESHOLD = 60;
export const CONDITION_PENALTY_THRESHOLD = 70;
export const REPAIR_COST_PER_POINT_PER_TIER = 3;
export const REPAIR_COST_BASE = 1;
