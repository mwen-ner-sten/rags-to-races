import type { GearSlot } from "@/data/gearSlots";
import type { LootGearEffect } from "@/data/lootGear";
import { attributeEffectType } from "@/data/gearAttributes";

export interface GearSetBonusTier {
  /** Minimum pieces equipped to activate this tier (2 or 4) */
  piecesRequired: number;
  description: string;
  effects: LootGearEffect[];
}

export interface GearSetDefinition {
  id: string;
  name: string;
  description: string;
  /** Which slots the set pieces occupy */
  slots: GearSlot[];
  tiers: GearSetBonusTier[];
}

// ── Curated sets ───────────────────────────────────────────────────────────
export const GEAR_SETS: GearSetDefinition[] = [
  {
    id: "grease_monkey",
    name: "Grease Monkey",
    description: "Workshop-forged gear for the perpetual tinkerer.",
    slots: ["head", "body", "hands", "tool"],
    tiers: [
      {
        piecesRequired: 2,
        description: "+5 Engineering",
        effects: [{ type: attributeEffectType("engineering"), value: 5 }],
      },
      {
        piecesRequired: 4,
        description: "-15% repair cost, +10 Engineering total",
        effects: [
          { type: attributeEffectType("engineering"), value: 5 },
          { type: "repair_cost_reduction_pct", value: 0.15 },
        ],
      },
    ],
  },
  {
    id: "redline",
    name: "Redline",
    description: "Built for flat-out speed and nothing else.",
    slots: ["head", "body", "feet", "accessory"],
    tiers: [
      {
        piecesRequired: 2,
        description: "+10 Power",
        effects: [{ type: attributeEffectType("power"), value: 10 }],
      },
      {
        piecesRequired: 4,
        description: "+5% race performance, +15 Power total",
        effects: [
          { type: attributeEffectType("power"), value: 5 },
          { type: "race_performance_pct", value: 0.05 },
        ],
      },
    ],
  },
  {
    id: "scrapper",
    name: "Scrapper",
    description: "A salvager's kit — every broken part is opportunity.",
    slots: ["hands", "feet", "tool", "accessory"],
    tiers: [
      {
        piecesRequired: 2,
        description: "+5 Fortune",
        effects: [{ type: attributeEffectType("fortune"), value: 5 }],
      },
      {
        piecesRequired: 4,
        description: "+15% scavenge yield, +8 Fortune total",
        effects: [
          { type: attributeEffectType("fortune"), value: 3 },
          { type: "scavenge_yield_pct", value: 0.15 },
        ],
      },
    ],
  },
  {
    id: "slipstream",
    name: "Slipstream",
    description: "Aero-tuned for relentless cornering.",
    slots: ["head", "body", "feet", "accessory"],
    tiers: [
      {
        piecesRequired: 2,
        description: "+8 Aero",
        effects: [{ type: attributeEffectType("aero"), value: 8 }],
      },
      {
        piecesRequired: 4,
        description: "+5% DNF reduction, +12 Aero total",
        effects: [
          { type: attributeEffectType("aero"), value: 4 },
          { type: "race_dnf_reduction", value: 0.05 },
        ],
      },
    ],
  },
];

export function getGearSetById(id: string): GearSetDefinition | undefined {
  return GEAR_SETS.find((s) => s.id === id);
}
