import type { GearSlot } from "@/data/gearSlots";

// ── Attribute identifiers ─────────────────────────────────────────────────
// Racer attributes (shared with /src/data/racerAttributes.ts semantics)
export const RACER_ATTRIBUTES = [
  "reflexes",
  "endurance",
  "instinct",
  "engineering",
  "charisma",
  "fortune",
] as const;
export type RacerAttributeId = (typeof RACER_ATTRIBUTES)[number];

// Vehicle attributes — gear-granted, feed vehicle-flavored derived effects
export const VEHICLE_ATTRIBUTES = [
  "power",
  "grip",
  "aero",
  "weight_reduction",
] as const;
export type VehicleAttributeId = (typeof VEHICLE_ATTRIBUTES)[number];

export type GearAttributeId = RacerAttributeId | VehicleAttributeId;

export const GEAR_ATTRIBUTES: GearAttributeId[] = [
  ...RACER_ATTRIBUTES,
  ...VEHICLE_ATTRIBUTES,
];

// Effect-type string form used on LootGearEffect, e.g. "attribute_power".
// Gear effects encode attribute grants as `type: "attribute_<id>"`, `value: N`.
export const ATTRIBUTE_EFFECT_PREFIX = "attribute_";

export function attributeEffectType(id: GearAttributeId): string {
  return `${ATTRIBUTE_EFFECT_PREFIX}${id}`;
}

export function parseAttributeEffectType(type: string): GearAttributeId | null {
  if (!type.startsWith(ATTRIBUTE_EFFECT_PREFIX)) return null;
  const id = type.slice(ATTRIBUTE_EFFECT_PREFIX.length) as GearAttributeId;
  return GEAR_ATTRIBUTES.includes(id) ? id : null;
}

export const ATTRIBUTE_LABELS: Record<GearAttributeId, string> = {
  reflexes: "Reflexes",
  endurance: "Endurance",
  instinct: "Instinct",
  engineering: "Engineering",
  charisma: "Charisma",
  fortune: "Fortune",
  power: "Power",
  grip: "Grip",
  aero: "Aero",
  weight_reduction: "Weight Reduction",
};

export const ATTRIBUTE_SHORT_LABELS: Record<GearAttributeId, string> = {
  reflexes: "REF",
  endurance: "END",
  instinct: "INS",
  engineering: "ENG",
  charisma: "CHA",
  fortune: "FOR",
  power: "POW",
  grip: "GRP",
  aero: "AER",
  weight_reduction: "WGT",
};

// ── Slot affinities: which attributes each slot prefers to roll ─────────────
// Primary roll draws from `primary`; secondaries draw from `secondary` pools.
export interface SlotAffinity {
  primary: GearAttributeId[];
  secondary: GearAttributeId[];
}

export const SLOT_AFFINITIES: Record<GearSlot, SlotAffinity> = {
  head: {
    primary: ["instinct", "aero"],
    secondary: ["reflexes", "fortune", "endurance", "power"],
  },
  body: {
    primary: ["endurance", "aero"],
    secondary: ["engineering", "weight_reduction", "instinct", "power"],
  },
  hands: {
    primary: ["engineering", "grip"],
    secondary: ["reflexes", "fortune", "power", "charisma"],
  },
  feet: {
    primary: ["reflexes", "grip"],
    secondary: ["weight_reduction", "endurance", "instinct", "aero"],
  },
  tool: {
    primary: ["engineering", "power"],
    secondary: ["fortune", "weight_reduction", "instinct", "charisma"],
  },
  accessory: {
    primary: ["fortune", "charisma"],
    secondary: ["instinct", "engineering", "power", "reflexes"],
  },
};
