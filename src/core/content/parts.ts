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

/**
 * Era 1 parts (tiers 0–4). Every part is authored: there are no random stats.
 * Most slots have two or three parts per tier with different strengths, so the
 * right one depends on the venue (see `demand` in events.ts) and on how much
 * breaking down you can afford.
 */
export const PARTS: readonly PartDef[] = [
  { id: "engine_small", name: "Small Engine", category: "engine", tier: 0, power: 10, handling: 0, reliability: 8, weight: 15, value: 6, blurb: "Weed-whacker heart. It wants to run." },
  { id: "engine_lawn", name: "Lawn Mower Engine", category: "engine", tier: 1, power: 16, handling: 0, reliability: 10, weight: 20, value: 12, blurb: "A proper mower engine with a pull cord that bites." },
  { id: "engine_v4", name: "Four-Cylinder", category: "engine", tier: 2, power: 40, handling: 0, reliability: 24, weight: 80, value: 60, blurb: "Out of a hatchback. Heavy, but it's real power." },
  { id: "engine_v6", name: "V6 Engine", category: "engine", tier: 3, power: 70, handling: 0, reliability: 38, weight: 120, value: 150, blurb: "Six cylinders and a cracked valve cover." },
  { id: "engine_tiller", name: "Tiller Engine", category: "engine", tier: 1, power: 9, handling: 0, reliability: 18, weight: 26, value: 12, blurb: "Built to chew dirt all day. Slow, heavy and unkillable." },
  { id: "engine_twin", name: "Motorcycle Twin", category: "engine", tier: 2, power: 48, handling: 0, reliability: 14, weight: 45, value: 65, blurb: "Screams to eleven thousand. Has opinions about staying in one piece." },
  { id: "engine_turbo4", name: "Turbo Four", category: "engine", tier: 3, power: 80, handling: 0, reliability: 20, weight: 95, value: 160, blurb: "Nothing, nothing, nothing, then all of it at once." },
  { id: "engine_v8", name: "Small-Block V8", category: "engine", tier: 4, power: 105, handling: 0, reliability: 46, weight: 180, value: 320, blurb: "Pulled from a pickup with 300,000 miles. It's just getting started." },
  { id: "engine_six", name: "Built Straight-Six", category: "engine", tier: 4, power: 92, handling: 0, reliability: 66, weight: 150, value: 300, blurb: "Somebody's grandfather blueprinted this. It will outlive you." },

  { id: "wheel_busted", name: "Busted Wheel", category: "wheel", tier: 0, power: 0, handling: 2, reliability: 3, weight: 5, value: 2, blurb: "Round enough." },
  { id: "wheel_basic", name: "Turf Tire", category: "wheel", tier: 1, power: 2, handling: 5, reliability: 8, weight: 6, value: 6, blurb: "Grippy on grass, nervous on dirt." },
  { id: "wheel_kart", name: "Kart Slick", category: "wheel", tier: 2, power: 3, handling: 11, reliability: 12, weight: 6, value: 24, blurb: "Small, sticky, made to turn." },
  { id: "wheel_sport", name: "Sport Tire", category: "wheel", tier: 3, power: 4, handling: 16, reliability: 16, weight: 9, value: 45, blurb: "Off a coupe somebody wrapped around a pole." },
  { id: "wheel_knobby", name: "Knobby Tire", category: "wheel", tier: 1, power: 1, handling: 3, reliability: 12, weight: 7, value: 6, blurb: "Off a wheelbarrow. Never goes flat, never goes fast." },
  { id: "wheel_dirt", name: "Dirt Tire", category: "wheel", tier: 2, power: 2, handling: 8, reliability: 18, weight: 8, value: 24, blurb: "Tall blocks that dig in and shrug off rocks." },
  { id: "wheel_at", name: "All-Terrain Tire", category: "wheel", tier: 3, power: 3, handling: 12, reliability: 23, weight: 12, value: 45, blurb: "Truck rubber. Vague in the corners, there at the finish." },
  { id: "wheel_slick", name: "Racing Slick", category: "wheel", tier: 4, power: 6, handling: 24, reliability: 16, weight: 10, value: 110, blurb: "Bald on purpose. Sticks like a secret." },
  { id: "wheel_groove", name: "Grooved Dirt Tire", category: "wheel", tier: 4, power: 4, handling: 18, reliability: 28, weight: 12, value: 100, blurb: "Hand-cut grooves. Good for a hundred hard laps." },

  { id: "frame_scrap", name: "Scrap Frame", category: "frame", tier: 0, power: 0, handling: 0, reliability: 5, weight: 30, value: 2, blurb: "Angle iron and optimism." },
  { id: "frame_mower", name: "Mower Deck", category: "frame", tier: 1, power: 0, handling: 3, reliability: 10, weight: 25, value: 8, blurb: "You can sit on it. You shouldn't." },
  { id: "frame_kart", name: "Kart Chassis", category: "frame", tier: 2, power: 4, handling: 9, reliability: 18, weight: 20, value: 35, blurb: "Bent tube, straight enough after a weld." },
  { id: "frame_steel", name: "Steel Subframe", category: "frame", tier: 3, power: 0, handling: 6, reliability: 32, weight: 200, value: 80, blurb: "The bones of a sedan." },
  { id: "frame_wagon", name: "Wagon Frame", category: "frame", tier: 1, power: 0, handling: 6, reliability: 5, weight: 14, value: 7, blurb: "Your old red wagon, promoted. Light, twitchy, a little bent." },
  { id: "frame_tube", name: "Tube Subframe", category: "frame", tier: 3, power: 0, handling: 12, reliability: 16, weight: 120, value: 90, blurb: "Somebody cut out everything that wasn't racing." },
  { id: "frame_cage", name: "Caged Chassis", category: "frame", tier: 4, power: 0, handling: 14, reliability: 44, weight: 180, value: 220, blurb: "Roll cage, door bars, a window net. The tech inspector nods." },

  { id: "fuel_gas_can", name: "Gas Can", category: "fuel", tier: 0, power: 2, handling: 0, reliability: 2, weight: 4, value: 2, blurb: "Bungee it on." },
  { id: "fuel_tank_small", name: "Small Fuel Tank", category: "fuel", tier: 2, power: 5, handling: 0, reliability: 5, weight: 8, value: 12, blurb: "A real tank with a real cap." },
  { id: "fuel_tank_large", name: "Large Fuel Tank", category: "fuel", tier: 3, power: 8, handling: 0, reliability: 10, weight: 15, value: 28, blurb: "Holds a whole race." },
  { id: "fuel_cell", name: "Fuel Cell", category: "fuel", tier: 4, power: 10, handling: 0, reliability: 18, weight: 14, value: 80, blurb: "A foam-filled box that won't slosh, leak or explode. Mostly." },

  { id: "elec_basic", name: "Wiring Harness", category: "electronics", tier: 2, power: 2, handling: 1, reliability: 6, weight: 2, value: 8, blurb: "A rat's nest that mostly conducts." },
  { id: "elec_ecu", name: "ECU Module", category: "electronics", tier: 3, power: 14, handling: 5, reliability: 14, weight: 3, value: 70, blurb: "A little computer that thinks it's in a family sedan." },
  { id: "elec_ignition", name: "Race Ignition", category: "electronics", tier: 4, power: 18, handling: 2, reliability: 16, weight: 3, value: 140, blurb: "A red box, four wires and a much bigger spark." },

  { id: "drive_chain", name: "Chain Drive", category: "drivetrain", tier: 2, power: 5, handling: 0, reliability: 8, weight: 10, value: 16, blurb: "Off a dirt bike. Keep your fingers clear." },
  { id: "drive_manual", name: "Manual Gearbox", category: "drivetrain", tier: 3, power: 15, handling: 2, reliability: 18, weight: 40, value: 65, blurb: "Five forward, one grinding reverse." },
  { id: "drive_auto", name: "Slushbox Automatic", category: "drivetrain", tier: 3, power: 9, handling: 0, reliability: 32, weight: 55, value: 60, blurb: "Lazy shifts, but it has never once let anybody down." },
  { id: "drive_race", name: "Four-Speed Race Box", category: "drivetrain", tier: 4, power: 24, handling: 3, reliability: 26, weight: 45, value: 180, blurb: "Straight-cut gears. You'll hear it from the parking lot." },

  { id: "exhaust_rusted", name: "Rusted Pipe", category: "exhaust", tier: 1, power: 2, handling: 0, reliability: 1, weight: 8, value: 2, blurb: "Loud in the wrong ways." },
  { id: "exhaust_straight", name: "Straight Pipe", category: "exhaust", tier: 3, power: 10, handling: 0, reliability: 5, weight: 6, value: 22, blurb: "Loud in the right ways." },
  { id: "exhaust_glasspack", name: "Glasspack", category: "exhaust", tier: 2, power: 6, handling: 0, reliability: 3, weight: 5, value: 14, blurb: "A cherry-red tube that makes anything sound fast." },
  { id: "exhaust_headers", name: "Long-Tube Headers", category: "exhaust", tier: 4, power: 18, handling: 0, reliability: 6, weight: 8, value: 90, blurb: "Eight pipes into one. Worth every burned knuckle." },

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
