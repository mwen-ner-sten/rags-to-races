export type PartCondition =
  | "rusted"     // index 0 — scavengeable
  | "worn"       // index 1 — scavengeable
  | "decent"     // index 2 — scavengeable
  | "good"       // index 3 — scavengeable, T0 cap
  | "pristine"   // index 4 — T1+ scavenge cap; enhancement gate
  | "polished"   // index 5 — enhancement only
  | "legendary"  // index 6 — enhancement only (rare materials)
  | "mythic"     // index 7 — enhancement only (mythic materials)
  | "artifact";  // index 8 — Artifact Forge only

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

export const CONDITIONS: PartCondition[] = [
  "rusted", "worn", "decent", "good", "pristine",
  "polished", "legendary", "mythic", "artifact",
];

/** Stat multiplier applied to a part's base stats based on its condition */
export const CONDITION_MULTIPLIERS: Record<PartCondition, number> = {
  rusted:    0.30,
  worn:      0.50,
  decent:    0.70,
  good:      0.85,
  pristine:  1.00,
  polished:  1.20,
  legendary: 1.45,
  mythic:    1.75,
  artifact:  2.10,
};

/**
 * Scrap cost to refurbish a part to this condition (via Refurbishment Bench).
 * Refurbishment only goes up to pristine — polished+ requires Enhancement.
 */
export const CONDITION_REPAIR_COST: Record<PartCondition, number> = {
  rusted:    0,
  worn:      5,
  decent:    15,
  good:      40,
  pristine:  0,   // cap for refurbishment bench
  polished:  0,   // enhancement only
  legendary: 0,   // enhancement only
  mythic:    0,   // enhancement only
  artifact:  0,   // forge only
};

/** How many add-on slots a core part gets based on its condition */
export const CONDITION_ADDON_SLOTS: Record<PartCondition, number> = {
  rusted:    0,
  worn:      0,
  decent:    1,
  good:      1,
  pristine:  2,
  polished:  2,
  legendary: 3,
  mythic:    3,
  artifact:  4,
};

/**
 * Maximum condition index reachable by scavenging at a given location tier.
 * Index maps to CONDITIONS array (0=rusted, 3=good, 4=pristine, 5=polished).
 * Legendary+ (6+) is never obtainable through scavenging.
 */
export const SCAVENGE_CONDITION_CAP_BY_LOCATION_TIER: Record<number, number> = {
  0: 3,  // T0: max "good"
  1: 4,  // T1: max "pristine"
  2: 5,  // T2: max "polished"
  3: 5,  // T3: max "polished"
  4: 5,  // T4: max "polished"
  5: 5,  // T5: max "polished"
};

/** Returns the condition cap index for a given location tier */
export function getScavengeCap(locationTier: number): number {
  return SCAVENGE_CONDITION_CAP_BY_LOCATION_TIER[locationTier] ?? 5;
}

/** Display labels for each condition (for UI) */
export const CONDITION_LABELS: Record<PartCondition, string> = {
  rusted:    "Rusted",
  worn:      "Worn",
  decent:    "Decent",
  good:      "Good",
  pristine:  "Pristine",
  polished:  "Polished",
  legendary: "Legendary",
  mythic:    "Mythic",
  artifact:  "Artifact",
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
