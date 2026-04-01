import type { GearSlot } from "@/data/gear";

export interface TalentNode {
  id: string;
  slot: GearSlot;
  name: string;
  description: string;
  cost: number;            // scrapBucks
  repRequirement?: number;
  prerequisiteGearId?: string;   // must OWN this static gear id
  prerequisiteNodeId?: string;   // must have unlocked this talent node
  effect: { type: string; value: number };
  tier: number;            // 1–4 (visual position in tree)
}

export const TALENT_NODES: TalentNode[] = [
  // ── Head (4 nodes) ─────────────────────────────────────────────────────────
  {
    id: "head_t1_scout",
    slot: "head",
    name: "Street Scout",
    description: "+2% scavenge luck. You've learned to spot the good stuff faster.",
    cost: 150,
    prerequisiteGearId: "head_bandana",
    effect: { type: "scavenge_luck_bonus", value: 0.02 },
    tier: 1,
  },
  {
    id: "head_t2_dodge",
    slot: "head",
    name: "Debris Dodge",
    description: "+3% DNF reduction. Your head on a swivel, always.",
    cost: 500,
    repRequirement: 3000,
    prerequisiteGearId: "head_goggles",
    effect: { type: "race_dnf_reduction", value: 0.03 },
    tier: 2,
  },
  {
    id: "head_t2_hawk",
    slot: "head",
    name: "Hawk Eye",
    description: "+3% scavenge luck. Nothing escapes you now.",
    cost: 600,
    repRequirement: 3000,
    prerequisiteNodeId: "head_t1_scout",
    effect: { type: "scavenge_luck_bonus", value: 0.03 },
    tier: 2,
  },
  {
    id: "head_t3_hardhat",
    slot: "head",
    name: "Hardhat Pro",
    description: "+4% wear reduction. Protect the noggin, protect the ride.",
    cost: 1800,
    repRequirement: 12000,
    prerequisiteGearId: "head_mechanic_helmet",
    effect: { type: "race_wear_reduction_pct", value: 0.04 },
    tier: 3,
  },

  // ── Body (4 nodes) ─────────────────────────────────────────────────────────
  {
    id: "body_t1_pockets",
    slot: "body",
    name: "Hidden Pockets",
    description: "+3% repair cost reduction. Tools where you need them.",
    cost: 200,
    prerequisiteGearId: "body_coveralls",
    effect: { type: "repair_cost_reduction_pct", value: 0.03 },
    tier: 1,
  },
  {
    id: "body_t2_grease",
    slot: "body",
    name: "Grease Monkey",
    description: "+4% build cost reduction. You've done this so many times it's muscle memory.",
    cost: 700,
    repRequirement: 3000,
    prerequisiteGearId: "body_overalls",
    effect: { type: "build_cost_reduction_pct", value: 0.04 },
    tier: 2,
  },
  {
    id: "body_t2_tough",
    slot: "body",
    name: "Tough Fabric",
    description: "+3% wear reduction. The suit takes the beating so you don't have to.",
    cost: 650,
    repRequirement: 3000,
    prerequisiteNodeId: "body_t1_pockets",
    effect: { type: "race_wear_reduction_pct", value: 0.03 },
    tier: 2,
  },
  {
    id: "body_t3_pro",
    slot: "body",
    name: "Pro Fitted",
    description: "+3% race performance. When you look the part, you race the part.",
    cost: 2000,
    repRequirement: 12000,
    prerequisiteGearId: "body_jumpsuit",
    effect: { type: "race_performance_pct", value: 0.03 },
    tier: 3,
  },

  // ── Hands (4 nodes) ────────────────────────────────────────────────────────
  {
    id: "hands_t1_steady",
    slot: "hands",
    name: "Steady Grip",
    description: "+2% scavenge luck. Fewer drops, more finds.",
    cost: 120,
    prerequisiteGearId: "hands_garden",
    effect: { type: "scavenge_luck_bonus", value: 0.02 },
    tier: 1,
  },
  {
    id: "hands_t2_craft",
    slot: "hands",
    name: "Craftsman's Touch",
    description: "+4% build cost reduction. Your hands know the work now.",
    cost: 500,
    repRequirement: 3000,
    prerequisiteGearId: "hands_work",
    effect: { type: "build_cost_reduction_pct", value: 0.04 },
    tier: 2,
  },
  {
    id: "hands_t2_careful",
    slot: "hands",
    name: "Careful Hands",
    description: "+4% refurb cost reduction. Gentle and effective.",
    cost: 550,
    repRequirement: 3000,
    prerequisiteNodeId: "hands_t1_steady",
    effect: { type: "refurb_cost_reduction_pct", value: 0.04 },
    tier: 2,
  },
  {
    id: "hands_t3_feel",
    slot: "hands",
    name: "Road Feel",
    description: "+3% handling. You feel every vibration through the wheel.",
    cost: 1600,
    repRequirement: 12000,
    prerequisiteGearId: "hands_mechanic",
    effect: { type: "race_handling_pct", value: 0.03 },
    tier: 3,
  },

  // ── Feet (4 nodes) ─────────────────────────────────────────────────────────
  {
    id: "feet_t1_cover",
    slot: "feet",
    name: "Covered Ground",
    description: "+2% scavenge yield. More ground covered, more found.",
    cost: 120,
    prerequisiteGearId: "feet_sneakers",
    effect: { type: "scavenge_yield_pct", value: 0.02 },
    tier: 1,
  },
  {
    id: "feet_t2_trample",
    slot: "feet",
    name: "Heavy Tread",
    description: "+3% scavenge yield. You dig through rubble like it's nothing.",
    cost: 450,
    repRequirement: 3000,
    prerequisiteGearId: "feet_boots",
    effect: { type: "scavenge_yield_pct", value: 0.03 },
    tier: 2,
  },
  {
    id: "feet_t2_quick",
    slot: "feet",
    name: "Light Step",
    description: "+3% scavenge luck. You move faster, find more.",
    cost: 400,
    repRequirement: 3000,
    prerequisiteNodeId: "feet_t1_cover",
    effect: { type: "scavenge_luck_bonus", value: 0.03 },
    tier: 2,
  },
  {
    id: "feet_t3_pedal",
    slot: "feet",
    name: "Pedal Feel",
    description: "+3% handling. Your feet talk to the car.",
    cost: 1800,
    repRequirement: 12000,
    prerequisiteGearId: "feet_mechanic_boots",
    effect: { type: "race_handling_pct", value: 0.03 },
    tier: 3,
  },

  // ── Tool (4 nodes) ─────────────────────────────────────────────────────────
  {
    id: "tool_t1_handy",
    slot: "tool",
    name: "Handy",
    description: "+3% repair cost reduction. You know which end to use.",
    cost: 150,
    prerequisiteGearId: "tool_screwdriver",
    effect: { type: "repair_cost_reduction_pct", value: 0.03 },
    tier: 1,
  },
  {
    id: "tool_t2_wrench",
    slot: "tool",
    name: "Torque Master",
    description: "+4% build cost reduction. Right tool, right time, every time.",
    cost: 600,
    repRequirement: 3000,
    prerequisiteGearId: "tool_wrench",
    effect: { type: "build_cost_reduction_pct", value: 0.04 },
    tier: 2,
  },
  {
    id: "tool_t2_value",
    slot: "tool",
    name: "Sharp Trader",
    description: "+4% sell value. You know what junk is worth.",
    cost: 550,
    repRequirement: 3000,
    prerequisiteNodeId: "tool_t1_handy",
    effect: { type: "sell_value_bonus_pct", value: 0.04 },
    tier: 2,
  },
  {
    id: "tool_t3_rapid",
    slot: "tool",
    name: "Rapid Rebuild",
    description: "+5% build cost reduction. Your pit stop would embarrass Formula 1.",
    cost: 2200,
    repRequirement: 12000,
    prerequisiteGearId: "tool_pro_toolbox",
    effect: { type: "build_cost_reduction_pct", value: 0.05 },
    tier: 3,
  },

  // ── Accessory (4 nodes) ────────────────────────────────────────────────────
  {
    id: "acc_t1_eye",
    slot: "accessory",
    name: "Eye for Value",
    description: "+3% sell value. You can smell money in a junk pile.",
    cost: 140,
    prerequisiteGearId: "acc_plastic_bag",
    effect: { type: "sell_value_bonus_pct", value: 0.03 },
    tier: 1,
  },
  {
    id: "acc_t2_haul",
    slot: "accessory",
    name: "Extra Haul",
    description: "+4% scavenge yield. Bigger bag, bigger finds.",
    cost: 480,
    repRequirement: 3000,
    prerequisiteGearId: "acc_satchel",
    effect: { type: "scavenge_yield_pct", value: 0.04 },
    tier: 2,
  },
  {
    id: "acc_t2_bonus",
    slot: "accessory",
    name: "Race Day Bonus",
    description: "+3% race scrap bonus. The crowd throws money. You catch it.",
    cost: 520,
    repRequirement: 3000,
    prerequisiteNodeId: "acc_t1_eye",
    effect: { type: "race_scrap_bonus_pct", value: 0.03 },
    tier: 2,
  },
  {
    id: "acc_t3_sponsor",
    slot: "accessory",
    name: "Sponsor Network",
    description: "+5% sell value. Your name opens doors and wallets.",
    cost: 2400,
    repRequirement: 12000,
    prerequisiteGearId: "acc_belt",
    effect: { type: "sell_value_bonus_pct", value: 0.05 },
    tier: 3,
  },
];

export function getTalentNodeById(id: string): TalentNode | undefined {
  return TALENT_NODES.find((n) => n.id === id);
}

export function getTalentNodesForSlot(slot: GearSlot): TalentNode[] {
  return TALENT_NODES.filter((n) => n.slot === slot);
}
