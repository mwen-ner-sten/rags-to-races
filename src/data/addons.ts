import type { CoreSlot, PartCondition } from "./parts";
import { CONDITION_MULTIPLIERS } from "./parts";

export interface AddOnDefinition {
  id: string;
  name: string;
  targetSlot: CoreSlot;
  statBonuses: {
    power?: number;
    reliability?: number;
    weight?: number;       // can be negative for weight reduction
    handling?: number;
  };
  minTier: number;
  scrapValue: number;
  flavorText: string;
}

export const ADDON_DEFINITIONS: AddOnDefinition[] = [
  // ── Engine Add-Ons ────────────────────────────────────────────────────────
  {
    id: "addon_air_filter",
    name: "Clean Air Filter",
    targetSlot: "engine",
    statBonuses: { power: 3, weight: -1 },
    minTier: 0,
    scrapValue: 3,
    flavorText: "It's not clogged. That counts for something.",
  },
  {
    id: "addon_turbo_snail",
    name: "Turbo Snail",
    targetSlot: "engine",
    statBonuses: { power: 12, weight: 5 },
    minTier: 2,
    scrapValue: 40,
    flavorText: "A turbocharger the size of a snail. Sounds like one too.",
  },
  {
    id: "addon_nitrous",
    name: "Nitrous Bottle",
    targetSlot: "engine",
    statBonuses: { power: 25, reliability: -10, weight: 8 },
    minTier: 4,
    scrapValue: 150,
    flavorText: "One button. Maximum send.",
  },
  {
    id: "addon_forged_internals",
    name: "Forged Internals",
    targetSlot: "engine",
    statBonuses: { power: 10, reliability: 15 },
    minTier: 5,
    scrapValue: 250,
    flavorText: "Pistons that won't disintegrate. Revolutionary.",
  },

  // ── Wheel Add-Ons ────────────────────────────────────────────────────────
  {
    id: "addon_wheel_spacers",
    name: "Wheel Spacers",
    targetSlot: "wheel",
    statBonuses: { handling: 3, weight: 2 },
    minTier: 2,
    scrapValue: 12,
    flavorText: "Wider stance. More confident cornering. Looks cool too.",
  },
  {
    id: "addon_tire_warmers",
    name: "Tire Warmers",
    targetSlot: "wheel",
    statBonuses: { handling: 5, reliability: 3 },
    minTier: 3,
    scrapValue: 35,
    flavorText: "Pre-heated rubber grips better. Science.",
  },
  {
    id: "addon_slick_compound",
    name: "Slick Compound",
    targetSlot: "wheel",
    statBonuses: { handling: 10, reliability: -5 },
    minTier: 5,
    scrapValue: 100,
    flavorText: "Grips like glue. Wears out like tissue paper.",
  },

  // ── Frame Add-Ons ────────────────────────────────────────────────────────
  {
    id: "addon_roll_cage",
    name: "Roll Cage",
    targetSlot: "frame",
    statBonuses: { reliability: 15, weight: 20 },
    minTier: 3,
    scrapValue: 45,
    flavorText: "Safety third. But it does keep the roof from caving in.",
  },
  {
    id: "addon_weight_reduction",
    name: "Weight Reduction Kit",
    targetSlot: "frame",
    statBonuses: { weight: -30 },
    minTier: 4,
    scrapValue: 80,
    flavorText: "Removed the seats, the carpet, and most of the floor.",
  },
  {
    id: "addon_carbon_panels",
    name: "Carbon Fiber Panels",
    targetSlot: "frame",
    statBonuses: { power: 5, weight: -20 },
    minTier: 6,
    scrapValue: 300,
    flavorText: "Lighter than aluminum, stronger than excuses.",
  },

  // ── Fuel Add-Ons ─────────────────────────────────────────────────────────
  {
    id: "addon_fuel_filter",
    name: "Fuel Filter",
    targetSlot: "fuel",
    statBonuses: { reliability: 3 },
    minTier: 1,
    scrapValue: 5,
    flavorText: "Keeps the mystery chunks out of the carburetor.",
  },
  {
    id: "addon_racing_fuel",
    name: "Racing Fuel",
    targetSlot: "fuel",
    statBonuses: { power: 8, reliability: -3 },
    minTier: 4,
    scrapValue: 60,
    flavorText: "Smells expensive. Burns hotter. Worth it.",
  },

  // ── Electronics Add-Ons ──────────────────────────────────────────────────
  {
    id: "addon_traction_control",
    name: "Traction Control",
    targetSlot: "electronics",
    statBonuses: { handling: 8, reliability: 5 },
    minTier: 4,
    scrapValue: 70,
    flavorText: "Stops the wheels from spinning when you don't want them to.",
  },
  {
    id: "addon_launch_control",
    name: "Launch Control",
    targetSlot: "electronics",
    statBonuses: { power: 10 },
    minTier: 5,
    scrapValue: 120,
    flavorText: "Hold the brake, floor it, release. Maximum acceleration.",
  },

  // ── Drivetrain Add-Ons ───────────────────────────────────────────────────
  {
    id: "addon_lsd",
    name: "Limited-Slip Diff",
    targetSlot: "drivetrain",
    statBonuses: { handling: 6, reliability: 4 },
    minTier: 4,
    scrapValue: 80,
    flavorText: "Both wheels spin now. Corners feel... different.",
  },
  {
    id: "addon_short_ratio",
    name: "Short-Ratio Gears",
    targetSlot: "drivetrain",
    statBonuses: { power: 12, weight: 3 },
    minTier: 5,
    scrapValue: 140,
    flavorText: "Faster acceleration. The top speed? We'll talk about that later.",
  },

  // ── Exhaust Add-Ons ──────────────────────────────────────────────────────
  {
    id: "addon_cat_delete",
    name: "Cat Delete Pipe",
    targetSlot: "exhaust",
    statBonuses: { power: 6, weight: -4 },
    minTier: 3,
    scrapValue: 25,
    flavorText: "Louder. Faster. Smellier. The neighbors love it.",
  },
  {
    id: "addon_exhaust_wrap",
    name: "Exhaust Wrap",
    targetSlot: "exhaust",
    statBonuses: { reliability: 5, power: 3 },
    minTier: 4,
    scrapValue: 30,
    flavorText: "Keeps the heat in the pipes and out of the engine bay.",
  },

  // ── Suspension Add-Ons ───────────────────────────────────────────────────
  {
    id: "addon_sway_bar",
    name: "Sway Bar",
    targetSlot: "suspension",
    statBonuses: { handling: 7, weight: 4 },
    minTier: 3,
    scrapValue: 30,
    flavorText: "Less body roll. More confidence into corners.",
  },
  {
    id: "addon_camber_kit",
    name: "Camber Kit",
    targetSlot: "suspension",
    statBonuses: { handling: 10, reliability: -3 },
    minTier: 5,
    scrapValue: 90,
    flavorText: "Tilted wheels for maximum grip. Looks aggressive.",
  },

  // ── Aero Add-Ons ─────────────────────────────────────────────────────────
  {
    id: "addon_splitter",
    name: "Front Splitter",
    targetSlot: "aero",
    statBonuses: { handling: 5, power: 3, weight: 3 },
    minTier: 5,
    scrapValue: 50,
    flavorText: "Cuts through the air. Also cuts through speed bumps.",
  },
  {
    id: "addon_gurney_flap",
    name: "Gurney Flap",
    targetSlot: "aero",
    statBonuses: { handling: 8, weight: 1 },
    minTier: 6,
    scrapValue: 100,
    flavorText: "A tiny lip that makes a big difference. Downforce magic.",
  },
];

export function getAddonById(id: string): AddOnDefinition | undefined {
  return ADDON_DEFINITIONS.find((a) => a.id === id);
}

/** Get the effective stat value of an add-on accounting for its condition */
export function getAddonStatValue(
  addonDef: AddOnDefinition,
  stat: keyof AddOnDefinition["statBonuses"],
  condition: string,
): number {
  const base = addonDef.statBonuses[stat] ?? 0;
  if (base === 0) return 0;
  // Weight changes are not scaled by condition (physical property)
  if (stat === "weight") return base;
  const mult = CONDITION_MULTIPLIERS[condition as keyof typeof CONDITION_MULTIPLIERS] ?? 1;
  return base * mult;
}
