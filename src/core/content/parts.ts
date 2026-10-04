import type { MaterialId, PartCategory } from "../types";

export interface PartDef {
  id: string;
  name: string;
  category: PartCategory;
  tier: number;
  power: number;
  handling: number;
  reliability: number;
  weight: number;
  /** Scrap Bucks at Good condition. */
  value: number;
  blurb: string;
}

/** Era 1 parts (tiers 0–3). Stats ported from the pre-rebuild parts table. */
export const PARTS: readonly PartDef[] = [
  { id: "engine_small", name: "Small Engine", category: "engine", tier: 0, power: 10, handling: 0, reliability: 8, weight: 15, value: 6, blurb: "Weed-whacker heart. It wants to run." },
  { id: "engine_lawn", name: "Lawn Mower Engine", category: "engine", tier: 1, power: 16, handling: 0, reliability: 10, weight: 20, value: 12, blurb: "A proper mower engine with a pull cord that bites." },
  { id: "engine_v4", name: "Four-Cylinder", category: "engine", tier: 2, power: 40, handling: 0, reliability: 24, weight: 80, value: 60, blurb: "Out of a hatchback. Heavy, but it's real power." },
  { id: "engine_v6", name: "V6 Engine", category: "engine", tier: 3, power: 70, handling: 0, reliability: 38, weight: 120, value: 150, blurb: "Six cylinders and a cracked valve cover." },

  { id: "wheel_busted", name: "Busted Wheel", category: "wheel", tier: 0, power: 0, handling: 2, reliability: 3, weight: 5, value: 2, blurb: "Round enough." },
  { id: "wheel_basic", name: "Turf Tire", category: "wheel", tier: 1, power: 2, handling: 5, reliability: 8, weight: 6, value: 6, blurb: "Grippy on grass, nervous on dirt." },
  { id: "wheel_kart", name: "Kart Slick", category: "wheel", tier: 2, power: 3, handling: 11, reliability: 12, weight: 6, value: 24, blurb: "Small, sticky, made to turn." },
  { id: "wheel_sport", name: "Sport Tire", category: "wheel", tier: 3, power: 4, handling: 16, reliability: 16, weight: 9, value: 45, blurb: "Off a coupe somebody wrapped around a pole." },

  { id: "frame_scrap", name: "Scrap Frame", category: "frame", tier: 0, power: 0, handling: 0, reliability: 5, weight: 30, value: 2, blurb: "Angle iron and optimism." },
  { id: "frame_mower", name: "Mower Deck", category: "frame", tier: 1, power: 0, handling: 3, reliability: 10, weight: 25, value: 8, blurb: "You can sit on it. You shouldn't." },
  { id: "frame_kart", name: "Kart Chassis", category: "frame", tier: 2, power: 4, handling: 9, reliability: 18, weight: 20, value: 35, blurb: "Bent tube, straight enough after a weld." },
  { id: "frame_steel", name: "Steel Subframe", category: "frame", tier: 3, power: 0, handling: 6, reliability: 32, weight: 200, value: 80, blurb: "The bones of a sedan." },

  { id: "fuel_gas_can", name: "Gas Can", category: "fuel", tier: 0, power: 2, handling: 0, reliability: 2, weight: 4, value: 2, blurb: "Bungee it on." },
  { id: "fuel_tank_small", name: "Small Fuel Tank", category: "fuel", tier: 2, power: 5, handling: 0, reliability: 5, weight: 8, value: 12, blurb: "A real tank with a real cap." },
  { id: "fuel_tank_large", name: "Large Fuel Tank", category: "fuel", tier: 3, power: 8, handling: 0, reliability: 10, weight: 15, value: 28, blurb: "Holds a whole race." },

  { id: "elec_basic", name: "Wiring Harness", category: "electronics", tier: 2, power: 2, handling: 1, reliability: 6, weight: 2, value: 8, blurb: "A rat's nest that mostly conducts." },
  { id: "elec_ecu", name: "ECU Module", category: "electronics", tier: 3, power: 14, handling: 5, reliability: 14, weight: 3, value: 70, blurb: "A little computer that thinks it's in a Camry." },

  { id: "drive_chain", name: "Chain Drive", category: "drivetrain", tier: 2, power: 5, handling: 0, reliability: 8, weight: 10, value: 16, blurb: "Off a dirt bike. Keep your fingers clear." },
  { id: "drive_manual", name: "Manual Gearbox", category: "drivetrain", tier: 3, power: 15, handling: 2, reliability: 18, weight: 40, value: 65, blurb: "Five forward, one grinding reverse." },

  { id: "exhaust_rusted", name: "Rusted Pipe", category: "exhaust", tier: 1, power: 2, handling: 0, reliability: 1, weight: 8, value: 2, blurb: "Loud in the wrong ways." },
  { id: "exhaust_straight", name: "Straight Pipe", category: "exhaust", tier: 3, power: 10, handling: 0, reliability: 5, weight: 6, value: 22, blurb: "Loud in the right ways." },

  { id: "beater_shell", name: "Sedan Shell", category: "body", tier: 3, power: 0, handling: 4, reliability: 10, weight: 500, value: 120, blurb: "Four doors, no engine, one opossum." },

  { id: "junk_misc", name: "Assorted Junk", category: "junk", tier: 0, power: 0, handling: 0, reliability: 0, weight: 5, value: 1, blurb: "Bolts, brackets, a doll's head. Strip it." },
  { id: "junk_seat", name: "Old Seat", category: "junk", tier: 1, power: 0, handling: 0, reliability: 0, weight: 8, value: 3, blurb: "Springs and foam. Strip it." },
];

export const PART_BY_ID: Record<string, PartDef> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export function getPart(id: string): PartDef {
  const part = PART_BY_ID[id];
  if (!part) throw new Error(`Unknown part ${id}`);
  return part;
}

export const CONDITION_NAMES = ["Scrap", "Rusted", "Worn", "Good", "Restored"] as const;
/** Stat multiplier by condition. */
export const CONDITION_STAT = [0.4, 0.6, 0.8, 1.0, 1.15] as const;
/** Sell-value multiplier by condition. */
export const CONDITION_VALUE = [0.2, 0.4, 0.7, 1.0, 1.4] as const;

/** Materials from stripping a part, by category. */
export const STRIP_YIELD: Record<PartCategory, Partial<Record<MaterialId, number>>> = {
  engine: { metal: 2, wiring: 1 },
  wheel: { rubber: 2 },
  frame: { metal: 3 },
  fuel: { metal: 1 },
  electronics: { wiring: 2 },
  drivetrain: { metal: 2 },
  exhaust: { metal: 1 },
  body: { metal: 6 },
  junk: { metal: 1 },
};

/** The know-how needed to repair (Worn → Good) each category. */
export const REPAIR_TECHNIQUE: Record<PartCategory, string | null> = {
  engine: "tech:rebuilding",
  wheel: "tech:patching",
  frame: "tech:welding",
  fuel: "tech:patching",
  electronics: "tech:wiring",
  drivetrain: "tech:rebuilding",
  exhaust: "tech:welding",
  body: "tech:bodywork",
  junk: null,
};

/** Base repair minutes per category (scaled by tier). */
export const REPAIR_MINUTES: Record<PartCategory, number> = {
  engine: 20,
  wheel: 5,
  frame: 45,
  fuel: 10,
  electronics: 30,
  drivetrain: 40,
  exhaust: 15,
  body: 360,
  junk: 0,
};

/** Material cost of a repair (Worn → Good); Restore costs double. */
export const REPAIR_COST: Record<PartCategory, Partial<Record<MaterialId, number>>> = {
  engine: { metal: 1, wiring: 1 },
  wheel: { rubber: 1 },
  frame: { metal: 2 },
  fuel: { metal: 1 },
  electronics: { wiring: 1 },
  drivetrain: { metal: 1 },
  exhaust: { metal: 1 },
  body: { metal: 6 },
  junk: {},
};
