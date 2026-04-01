import type { GearSlot } from "@/data/gear";

export interface GearModTemplate {
  id: string;
  name: string;
  description: string;
  slots: GearSlot[];  // compatible gear slots
  effectType: string;
  minValue: number;
  maxValue: number;
}

export const GEAR_MOD_TEMPLATES: GearModTemplate[] = [
  {
    id: "mod_lucky_charm",
    name: "Lucky Charm",
    description: "A rabbit foot, a coin, something that feels right. Improves scavenging fortune.",
    slots: ["accessory", "head"],
    effectType: "scavenge_luck_bonus",
    minValue: 0.02,
    maxValue: 0.05,
  },
  {
    id: "mod_grip_tape",
    name: "Grip Tape",
    description: "Wrapped tight in all the right places. Better feel, better handling.",
    slots: ["hands", "feet"],
    effectType: "race_handling_pct",
    minValue: 0.02,
    maxValue: 0.04,
  },
  {
    id: "mod_padding",
    name: "Impact Padding",
    description: "Extra foam and stitching where it counts. Takes the edge off a rough race.",
    slots: ["head", "body"],
    effectType: "race_wear_reduction_pct",
    minValue: 0.03,
    maxValue: 0.06,
  },
  {
    id: "mod_quick_clasp",
    name: "Quick Clasp",
    description: "Faster on, faster off. Speeds up repairs in the heat of the moment.",
    slots: ["body", "accessory"],
    effectType: "repair_cost_reduction_pct",
    minValue: 0.03,
    maxValue: 0.07,
  },
  {
    id: "mod_sharp_eyes",
    name: "Sharp Eyes",
    description: "A polished lens, a reinforced brim. You spot things others walk past.",
    slots: ["head"],
    effectType: "scavenge_luck_bonus",
    minValue: 0.03,
    maxValue: 0.06,
  },
  {
    id: "mod_oil_rag",
    name: "Oil Rag",
    description: "Always at hand. Makes every refurbishment job go a little smoother.",
    slots: ["hands", "tool"],
    effectType: "refurb_cost_reduction_pct",
    minValue: 0.04,
    maxValue: 0.08,
  },
  {
    id: "mod_race_decal",
    name: "Race Decal",
    description: "Sponsor sticker, racing stripe, lucky number. Superstition or edge? Both.",
    slots: ["body", "accessory"],
    effectType: "race_performance_pct",
    minValue: 0.02,
    maxValue: 0.04,
  },
  {
    id: "mod_sponsor_patch",
    name: "Sponsor Patch",
    description: "Their logo, your gain. Sell finds for a little more with this deal.",
    slots: ["body"],
    effectType: "sell_value_bonus_pct",
    minValue: 0.05,
    maxValue: 0.10,
  },
  {
    id: "mod_weight_strip",
    name: "Weight Strip",
    description: "Cut away the excess. Lighter feet mean faster reaction, better performance.",
    slots: ["feet"],
    effectType: "race_performance_pct",
    minValue: 0.02,
    maxValue: 0.05,
  },
  {
    id: "mod_tool_loop",
    name: "Tool Loop",
    description: "A proper place for every tool. Reach what you need without hunting for it.",
    slots: ["tool", "accessory"],
    effectType: "build_cost_reduction_pct",
    minValue: 0.03,
    maxValue: 0.06,
  },
  {
    id: "mod_scrap_bag",
    name: "Scrap Bag",
    description: "A little extra pocket, bag, or pouch. More room means more finds.",
    slots: ["accessory"],
    effectType: "scavenge_yield_pct",
    minValue: 0.04,
    maxValue: 0.07,
  },
  {
    id: "mod_wrist_guard",
    name: "Wrist Guard",
    description: "Reinforced wrap around the wrist. You'll keep your grip when others don't.",
    slots: ["hands"],
    effectType: "race_dnf_reduction",
    minValue: 0.02,
    maxValue: 0.04,
  },
];

export function getModTemplateById(id: string): GearModTemplate | undefined {
  return GEAR_MOD_TEMPLATES.find((m) => m.id === id);
}
