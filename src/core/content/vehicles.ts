import type { Condition, MaterialId } from "../types";

export interface SlotDef {
  slot: string;
  required: boolean;
  accepts: string[];
  /** Minimum condition the part must be in to be installed. */
  minCondition?: Condition;
}

export interface VehicleDef {
  id: string;
  name: string;
  tier: number;
  blurb: string;
  slots: SlotDef[];
  base: { power: number; handling: number; reliability: number; weight: number };
  cash: number;
  materials: Partial<Record<MaterialId, number>>;
  /** Assembly job length in ms. */
  assembleMs: number;
  /** Carry capacity this vehicle provides while you own it (0 = none). */
  carry: number;
  /** Habit slots granted the first time you build one this Season. */
  habitSlot: boolean;
  /** Blueprint know-how id; null = known from the start. */
  blueprint: string | null;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

export const VEHICLES: readonly VehicleDef[] = [
  {
    id: "push_mower",
    name: "Push Mower",
    tier: 0,
    blurb: "A push mower with a death wish. It goes forward. Sometimes.",
    slots: [
      { slot: "engine", required: true, accepts: ["engine_small", "engine_lawn", "engine_tiller"] },
      { slot: "wheel", required: true, accepts: ["wheel_busted", "wheel_basic", "wheel_knobby"] },
    ],
    base: { power: 4, handling: 3, reliability: 4, weight: 40 },
    cash: 0,
    materials: {},
    assembleMs: 1 * MIN,
    carry: 0,
    habitSlot: false,
    blueprint: null,
  },
  {
    id: "riding_mower",
    name: "Riding Mower",
    tier: 1,
    blurb: "You sit down on this one. Luxury. It tows a trailer, too.",
    slots: [
      { slot: "engine", required: true, accepts: ["engine_lawn", "engine_small", "engine_tiller", "engine_v4"] },
      { slot: "wheel", required: true, accepts: ["wheel_basic", "wheel_busted", "wheel_knobby", "wheel_kart"] },
      { slot: "frame", required: true, accepts: ["frame_mower", "frame_scrap", "frame_wagon", "frame_kart"] },
      { slot: "exhaust", required: false, accepts: ["exhaust_rusted", "exhaust_glasspack", "exhaust_straight"] },
    ],
    base: { power: 8, handling: 6, reliability: 8, weight: 80 },
    cash: 20,
    materials: { metal: 2 },
    assembleMs: 1 * HOUR,
    carry: 5,
    habitSlot: true,
    blueprint: "blueprint:riding_mower",
  },
  {
    id: "go_kart",
    name: "Go-Kart",
    tier: 2,
    blurb: "A welded kart chassis with an engine that's honestly too big for it.",
    slots: [
      { slot: "engine", required: true, accepts: ["engine_v4", "engine_lawn", "engine_twin", "engine_tiller"] },
      { slot: "wheel", required: true, accepts: ["wheel_kart", "wheel_basic", "wheel_dirt", "wheel_knobby", "wheel_sport"] },
      { slot: "frame", required: true, accepts: ["frame_kart"] },
      { slot: "fuel", required: true, accepts: ["fuel_tank_small", "fuel_gas_can", "fuel_tank_large"] },
      { slot: "drivetrain", required: false, accepts: ["drive_chain"] },
      { slot: "exhaust", required: false, accepts: ["exhaust_glasspack", "exhaust_rusted"] },
    ],
    base: { power: 14, handling: 12, reliability: 10, weight: 110 },
    cash: 80,
    materials: { metal: 6, rubber: 2 },
    assembleMs: 6 * HOUR,
    carry: 0,
    habitSlot: true,
    blueprint: "blueprint:go_kart",
  },
  {
    id: "beater_car",
    name: "Beater",
    tier: 3,
    blurb: "Four wheels, an engine that mostly starts, and a trunk. You're racing now.",
    slots: [
      { slot: "body", required: true, accepts: ["beater_shell"], minCondition: 3 },
      { slot: "engine", required: true, accepts: ["engine_v6", "engine_v4", "engine_turbo4", "engine_twin"] },
      { slot: "wheel", required: true, accepts: ["wheel_sport", "wheel_kart", "wheel_at", "wheel_dirt"] },
      { slot: "frame", required: true, accepts: ["frame_steel", "frame_tube"] },
      { slot: "fuel", required: true, accepts: ["fuel_tank_large", "fuel_tank_small"] },
      { slot: "drivetrain", required: true, accepts: ["drive_manual", "drive_chain", "drive_auto"] },
      { slot: "electronics", required: false, accepts: ["elec_ecu", "elec_basic"] },
      { slot: "exhaust", required: false, accepts: ["exhaust_straight", "exhaust_rusted", "exhaust_glasspack"] },
    ],
    base: { power: 25, handling: 18, reliability: 20, weight: 300 },
    cash: 400,
    materials: { metal: 15, rubber: 6, wiring: 4 },
    assembleMs: 8 * HOUR,
    carry: 10,
    habitSlot: true,
    blueprint: "blueprint:beater_car",
  },
  {
    id: "street_stock",
    name: "Street Stock",
    tier: 4,
    blurb: "A sedan with the glass out, the doors welded and a cage where the back seat was. Built for the Invitationals.",
    slots: [
      { slot: "body", required: true, accepts: ["beater_shell"], minCondition: 3 },
      { slot: "frame", required: true, accepts: ["frame_cage"] },
      { slot: "engine", required: true, accepts: ["engine_v8", "engine_six", "engine_v6", "engine_turbo4"] },
      { slot: "wheel", required: true, accepts: ["wheel_slick", "wheel_groove", "wheel_sport", "wheel_at"] },
      { slot: "fuel", required: true, accepts: ["fuel_cell", "fuel_tank_large"] },
      { slot: "drivetrain", required: true, accepts: ["drive_race", "drive_manual", "drive_auto"] },
      { slot: "electronics", required: false, accepts: ["elec_ignition", "elec_ecu"] },
      { slot: "exhaust", required: false, accepts: ["exhaust_headers", "exhaust_straight"] },
    ],
    base: { power: 38, handling: 28, reliability: 30, weight: 260 },
    cash: 900,
    materials: { metal: 30, rubber: 10, wiring: 8 },
    assembleMs: 8 * HOUR,
    carry: 0,
    habitSlot: false,
    blueprint: "blueprint:street_stock",
  },
];

export const VEHICLE_BY_ID: Record<string, VehicleDef> = Object.fromEntries(VEHICLES.map((v) => [v.id, v]));

export function getVehicle(id: string): VehicleDef {
  const def = VEHICLE_BY_ID[id];
  if (!def) throw new Error(`Unknown vehicle ${id}`);
  return def;
}

/** Price of a sedan shell at the Salvage Auction. */
export const SHELL_PRICE = 250;
