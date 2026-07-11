import type { CoreSlot } from "./parts";
import { getCircuitById } from "./circuits";
import { REP_PROGRESSION } from "@/config/progression";

export type VehicleUnlockRequirement =
  | { type: "start" }
  | { type: "reputation"; amount: number }
  | { type: "circuit_win"; circuitId: string }
  | { type: "circuit_win_streak"; circuitId: string; wins: number }
  | { type: "owner_upgrade"; upgradeId: string };

export interface VehicleUnlockProgress {
  reputation: number;
  wonCircuitIds: readonly string[];
  circuitWinStreaks: Readonly<Record<string, number>>;
  ownerUpgradeLevels: Readonly<Record<string, number>>;
}

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
  unlockRequirement: VehicleUnlockRequirement;
  buildCost: number; // Scrap Bucks to build (workbench fee)
  sellValue: number;
  /** Feature unlock required to see this vehicle (e.g. "vehicle_mastery") */
  requiredFeature?: string;
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
    unlockRequirement: { type: "start" },
    buildCost: 10,
    sellValue: 10,
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
    baseStats: { speed: 35, handling: 22, reliability: 25, weight: 80 },
    unlockRequirement: { type: "circuit_win", circuitId: "backyard_derby" },
    buildCost: 40,
    sellValue: 40,
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
    unlockRequirement: { type: "circuit_win_streak", circuitId: "backyard_derby", wins: 5 },
    buildCost: 120,
    sellValue: 150,
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
    unlockRequirement: { type: "reputation", amount: REP_PROGRESSION.vehicles.beater_car },
    buildCost: 300,
    sellValue: 400,
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
    unlockRequirement: { type: "reputation", amount: REP_PROGRESSION.vehicles.street_racer },
    buildCost: 900,
    sellValue: 1200,
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
    unlockRequirement: { type: "circuit_win", circuitId: "regional_circuit" },
    buildCost: 2200,
    sellValue: 3000,
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
    unlockRequirement: { type: "reputation", amount: REP_PROGRESSION.vehicles.stock_car },
    buildCost: 6000,
    sellValue: 8000,
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
    unlockRequirement: { type: "circuit_win", circuitId: "national_circuit" },
    buildCost: 18000,
    sellValue: 25000,
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
    unlockRequirement: { type: "reputation", amount: REP_PROGRESSION.vehicles.supercar },
    buildCost: 60000,
    sellValue: 80000,
  },
  {
    id: "hypercar",
    name: "Hypercar",
    tier: 9,
    description: "Carbon fiber dreams and turbocharged nightmares. Built from scrap, faster than anything on Earth.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_turbo_v6"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_racing"] },
      { slot: "frame", required: true, acceptableParts: ["frame_carbon"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_large"] },
      { slot: "electronics", required: true, acceptableParts: ["elec_racing"] },
      { slot: "drivetrain", required: true, acceptableParts: ["drive_dualclutch"] },
      { slot: "exhaust", required: true, acceptableParts: ["exhaust_titanium"] },
      { slot: "suspension", required: true, acceptableParts: ["susp_active"] },
      { slot: "aero", required: true, acceptableParts: ["aero_carbon"] },
    ],
    baseStats: { speed: 550, handling: 250, reliability: 90, weight: 900 },
    unlockRequirement: { type: "owner_upgrade", upgradeId: "owner_vehicle_mastery" },
    buildCost: 200000,
    sellValue: 250000,
    requiredFeature: "vehicle_mastery",
  },
  {
    id: "prototype_x",
    name: "Prototype Racer X",
    tier: 10,
    description: "They said it couldn't be done. A car built entirely from scrap that defies physics. You proved them wrong.",
    slots: [
      { slot: "engine", required: true, acceptableParts: ["engine_turbo_v6"] },
      { slot: "wheel", required: true, acceptableParts: ["wheel_racing"] },
      { slot: "frame", required: true, acceptableParts: ["frame_carbon"] },
      { slot: "fuel", required: true, acceptableParts: ["fuel_tank_large"] },
      { slot: "electronics", required: true, acceptableParts: ["elec_racing"] },
      { slot: "drivetrain", required: true, acceptableParts: ["drive_dualclutch"] },
      { slot: "exhaust", required: true, acceptableParts: ["exhaust_titanium"] },
      { slot: "suspension", required: true, acceptableParts: ["susp_active"] },
      { slot: "aero", required: true, acceptableParts: ["aero_carbon"] },
    ],
    baseStats: { speed: 700, handling: 300, reliability: 95, weight: 800 },
    unlockRequirement: { type: "owner_upgrade", upgradeId: "owner_vehicle_mastery" },
    buildCost: 800000,
    sellValue: 1000000,
    requiredFeature: "vehicle_mastery",
  },
];

export function getVehicleById(id: string): VehicleDefinition | undefined {
  return VEHICLE_DEFINITIONS.find((v) => v.id === id);
}

function titleCaseIdentifier(id: string): string {
  return id
    .replace(/^owner_/, "")
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Player-facing copy derived from the same structured requirement the store evaluates. */
export function formatVehicleUnlockRequirement(requirement: VehicleUnlockRequirement): string {
  switch (requirement.type) {
    case "start":
      return "Start";
    case "reputation":
      return `Reach ${requirement.amount.toLocaleString("en-US")} Reputation`;
    case "circuit_win":
      return `Win a ${getCircuitById(requirement.circuitId)?.name ?? titleCaseIdentifier(requirement.circuitId)} race`;
    case "circuit_win_streak":
      return `${requirement.wins}-win streak at the ${getCircuitById(requirement.circuitId)?.name ?? titleCaseIdentifier(requirement.circuitId)}`;
    case "owner_upgrade":
      return `Owner upgrade: ${titleCaseIdentifier(requirement.upgradeId)}`;
  }
}

export function isVehicleUnlockRequirementMet(
  requirement: VehicleUnlockRequirement,
  progress: VehicleUnlockProgress,
): boolean {
  switch (requirement.type) {
    case "start":
      return true;
    case "reputation":
      return progress.reputation >= requirement.amount;
    case "circuit_win":
      return progress.wonCircuitIds.includes(requirement.circuitId);
    case "circuit_win_streak":
      return (progress.circuitWinStreaks[requirement.circuitId] ?? 0) >= requirement.wins;
    case "owner_upgrade":
      return (progress.ownerUpgradeLevels[requirement.upgradeId] ?? 0) > 0;
  }
}

export function getVehicleIdsUnlockedByProgress(progress: VehicleUnlockProgress): string[] {
  return VEHICLE_DEFINITIONS
    .filter((vehicle) => isVehicleUnlockRequirementMet(vehicle.unlockRequirement, progress))
    .map((vehicle) => vehicle.id);
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
