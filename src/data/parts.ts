export type PartCondition = "rusted" | "worn" | "decent" | "good" | "pristine";

export type CoreSlot =
  | "engine" | "wheel" | "frame" | "fuel"
  | "electronics" | "drivetrain" | "exhaust"
  | "suspension" | "aero";

export const CORE_SLOTS: CoreSlot[] = [
  "engine", "wheel", "frame", "fuel",
  "electronics", "drivetrain", "exhaust",
  "suspension", "aero",
];

export type PartCategory = CoreSlot | "misc";

export interface PartDefinition {
  id: string;
  name: string;
  category: PartCategory;
  basePower: number;     // contribution to speed
  baseReliability: number; // contribution to race win chance
  baseWeight: number;    // negative contribution to speed
  scrapValue: number;    // Scrap Bucks when sold
  minTier: number;       // minimum location tier to find it
}

export const CONDITIONS: PartCondition[] = ["rusted", "worn", "decent", "good", "pristine"];

export const CONDITION_MULTIPLIERS: Record<PartCondition, number> = {
  rusted: 0.3,
  worn: 0.55,
  decent: 0.75,
  good: 0.9,
  pristine: 1.0,
};

export const CONDITION_REPAIR_COST: Record<PartCondition, number> = {
  rusted: 0,
  worn: 5,
  decent: 15,
  good: 40,
  pristine: 0, // already pristine
};

/** How many add-on slots a core part gets based on its condition */
export const CONDITION_ADDON_SLOTS: Record<PartCondition, number> = {
  rusted: 0,
  worn: 0,
  decent: 1,
  good: 1,
  pristine: 2,
};

export const PART_DEFINITIONS: PartDefinition[] = [
  // ── Engines ───────────────────────────────────────────────────────────────
  { id: "engine_small", name: "Small Engine", category: "engine", basePower: 10, baseReliability: 8, baseWeight: 15, scrapValue: 5, minTier: 0 },
  { id: "engine_lawn", name: "Lawn Mower Engine", category: "engine", basePower: 15, baseReliability: 10, baseWeight: 20, scrapValue: 8, minTier: 1 },
  { id: "engine_v4", name: "V4 Engine", category: "engine", basePower: 40, baseReliability: 25, baseWeight: 80, scrapValue: 50, minTier: 2 },
  { id: "engine_v6", name: "V6 Engine", category: "engine", basePower: 70, baseReliability: 40, baseWeight: 120, scrapValue: 120, minTier: 3 },
  { id: "engine_v8", name: "V8 Engine", category: "engine", basePower: 120, baseReliability: 60, baseWeight: 180, scrapValue: 300, minTier: 4 },
  { id: "engine_turbo_v6", name: "Turbo V6", category: "engine", basePower: 160, baseReliability: 55, baseWeight: 130, scrapValue: 600, minTier: 5 },

  // ── Wheels ────────────────────────────────────────────────────────────────
  { id: "wheel_busted", name: "Busted Wheel", category: "wheel", basePower: 0, baseReliability: 3, baseWeight: 5, scrapValue: 1, minTier: 0 },
  { id: "wheel_basic", name: "Basic Tire", category: "wheel", basePower: 2, baseReliability: 8, baseWeight: 6, scrapValue: 4, minTier: 1 },
  { id: "wheel_sport", name: "Sport Tire", category: "wheel", basePower: 8, baseReliability: 15, baseWeight: 8, scrapValue: 25, minTier: 2 },
  { id: "wheel_racing", name: "Racing Slick", category: "wheel", basePower: 20, baseReliability: 20, baseWeight: 7, scrapValue: 80, minTier: 4 },

  // ── Frames ────────────────────────────────────────────────────────────────
  { id: "frame_scrap", name: "Scrap Frame", category: "frame", basePower: 0, baseReliability: 5, baseWeight: 30, scrapValue: 2, minTier: 0 },
  { id: "frame_mower", name: "Mower Deck", category: "frame", basePower: 0, baseReliability: 10, baseWeight: 25, scrapValue: 6, minTier: 1 },
  { id: "frame_kart", name: "Kart Chassis", category: "frame", basePower: 5, baseReliability: 20, baseWeight: 20, scrapValue: 30, minTier: 2 },
  { id: "frame_steel", name: "Steel Unibody", category: "frame", basePower: 0, baseReliability: 35, baseWeight: 200, scrapValue: 80, minTier: 3 },
  { id: "frame_carbon", name: "Carbon Fiber Frame", category: "frame", basePower: 15, baseReliability: 50, baseWeight: 80, scrapValue: 500, minTier: 5 },

  // ── Electronics ───────────────────────────────────────────────────────────
  { id: "elec_none", name: "No Electronics", category: "electronics", basePower: 0, baseReliability: 0, baseWeight: 0, scrapValue: 0, minTier: 0 },
  { id: "elec_basic", name: "Basic Wiring", category: "electronics", basePower: 2, baseReliability: 5, baseWeight: 2, scrapValue: 5, minTier: 1 },
  { id: "elec_ecu", name: "ECU Module", category: "electronics", basePower: 15, baseReliability: 15, baseWeight: 3, scrapValue: 60, minTier: 3 },
  { id: "elec_racing", name: "Racing Electronics", category: "electronics", basePower: 30, baseReliability: 25, baseWeight: 2, scrapValue: 200, minTier: 5 },

  // ── Fuel ──────────────────────────────────────────────────────────────────
  { id: "fuel_gas_can", name: "Gas Can", category: "fuel", basePower: 3, baseReliability: 2, baseWeight: 4, scrapValue: 2, minTier: 0 },
  { id: "fuel_tank_small", name: "Small Fuel Tank", category: "fuel", basePower: 5, baseReliability: 5, baseWeight: 8, scrapValue: 10, minTier: 1 },
  { id: "fuel_tank_large", name: "Large Fuel Tank", category: "fuel", basePower: 8, baseReliability: 10, baseWeight: 15, scrapValue: 25, minTier: 2 },

  // ── Drivetrain ────────────────────────────────────────────────────────────
  { id: "drive_chain", name: "Chain Drive", category: "drivetrain", basePower: 5, baseReliability: 8, baseWeight: 10, scrapValue: 15, minTier: 2 },
  { id: "drive_manual", name: "Manual Gearbox", category: "drivetrain", basePower: 15, baseReliability: 18, baseWeight: 40, scrapValue: 60, minTier: 3 },
  { id: "drive_sequential", name: "Sequential Shifter", category: "drivetrain", basePower: 35, baseReliability: 30, baseWeight: 35, scrapValue: 200, minTier: 5 },
  { id: "drive_dualclutch", name: "Dual-Clutch", category: "drivetrain", basePower: 55, baseReliability: 40, baseWeight: 30, scrapValue: 500, minTier: 7 },

  // ── Exhaust ───────────────────────────────────────────────────────────────
  { id: "exhaust_rusted", name: "Rusted Pipe", category: "exhaust", basePower: 2, baseReliability: 1, baseWeight: 8, scrapValue: 2, minTier: 0 },
  { id: "exhaust_straight", name: "Straight Pipe", category: "exhaust", basePower: 10, baseReliability: 5, baseWeight: 6, scrapValue: 20, minTier: 3 },
  { id: "exhaust_headers", name: "Tuned Headers", category: "exhaust", basePower: 25, baseReliability: 12, baseWeight: 10, scrapValue: 120, minTier: 5 },
  { id: "exhaust_titanium", name: "Titanium Exhaust", category: "exhaust", basePower: 40, baseReliability: 20, baseWeight: 4, scrapValue: 400, minTier: 7 },

  // ── Suspension ────────────────────────────────────────────────────────────
  { id: "susp_leaf", name: "Leaf Springs", category: "suspension", basePower: 0, baseReliability: 10, baseWeight: 20, scrapValue: 10, minTier: 2 },
  { id: "susp_coilovers", name: "Coilovers", category: "suspension", basePower: 5, baseReliability: 18, baseWeight: 12, scrapValue: 50, minTier: 4 },
  { id: "susp_adjustable", name: "Adjustable Dampers", category: "suspension", basePower: 10, baseReliability: 28, baseWeight: 14, scrapValue: 180, minTier: 6 },
  { id: "susp_active", name: "Active Suspension", category: "suspension", basePower: 20, baseReliability: 40, baseWeight: 10, scrapValue: 500, minTier: 7 },

  // ── Aero ──────────────────────────────────────────────────────────────────
  { id: "aero_cardboard", name: "Cardboard Wing", category: "aero", basePower: 1, baseReliability: 0, baseWeight: 2, scrapValue: 1, minTier: 2 },
  { id: "aero_spoiler", name: "Rear Spoiler", category: "aero", basePower: 10, baseReliability: 5, baseWeight: 8, scrapValue: 60, minTier: 5 },
  { id: "aero_diffuser", name: "Diffuser Kit", category: "aero", basePower: 20, baseReliability: 10, baseWeight: 6, scrapValue: 200, minTier: 6 },
  { id: "aero_carbon", name: "Carbon Aero Package", category: "aero", basePower: 35, baseReliability: 15, baseWeight: 5, scrapValue: 600, minTier: 7 },

  // ── Misc ──────────────────────────────────────────────────────────────────
  { id: "misc_junk", name: "Assorted Junk", category: "misc", basePower: 0, baseReliability: 0, baseWeight: 5, scrapValue: 1, minTier: 0 },
  { id: "misc_seat", name: "Old Seat", category: "misc", basePower: 0, baseReliability: 2, baseWeight: 8, scrapValue: 3, minTier: 0 },
  { id: "misc_roll_cage", name: "Roll Cage", category: "misc", basePower: 0, baseReliability: 20, baseWeight: 30, scrapValue: 40, minTier: 3 },
];

export function getPartById(id: string): PartDefinition | undefined {
  return PART_DEFINITIONS.find((p) => p.id === id);
}
