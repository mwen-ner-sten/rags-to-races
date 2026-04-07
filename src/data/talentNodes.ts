export interface TalentTree {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const TALENT_TREES: TalentTree[] = [
  {
    id: "racer",
    name: "Race Driver",
    description: "Push yourself harder on the track. Choose between safety and aggression.",
    icon: "🏁",
  },
  {
    id: "wrench",
    name: "Wrench Jockey",
    description: "Master the workshop. Choose between materials mastery or speed and efficiency.",
    icon: "🔩",
  },
  {
    id: "hunter",
    name: "Scrap Hunter",
    description: "Work the hustle. Choose between trading sharp or digging deep.",
    icon: "🗑️",
  },
];

export interface TalentNode {
  id: string;
  treeId: string;
  name: string;
  description: string;
  cost: number;
  prerequisiteNodeId?: string;
  /** If set, you cannot unlock this node if the named node is already unlocked. */
  mutuallyExclusiveWith?: string;
  effect: { type: string; value: number };
  tier: number;
  /** Feature unlock required to see/purchase this node (e.g. "expanded_talents") */
  requiredFeature?: string;
}

export const TALENT_NODES: TalentNode[] = [
  // ── Race Driver tree ───────────────────────────────────────────────────────

  {
    id: "racer_t1_rev",
    treeId: "racer",
    name: "Rev Limiter",
    description: "+2% race performance. You've learned to wring every bit out of your build.",
    cost: 200,
    effect: { type: "race_performance_pct", value: 0.02 },
    tier: 1,
  },
  {
    id: "racer_t2_smooth",
    treeId: "racer",
    name: "Smooth Lines",
    description: "+3% DNF reduction. Consistent and clean. Finishing beats crashing.",
    cost: 600,
    prerequisiteNodeId: "racer_t1_rev",
    mutuallyExclusiveWith: "racer_t2_throttle",
    effect: { type: "race_dnf_reduction", value: 0.03 },
    tier: 2,
  },
  {
    id: "racer_t2_throttle",
    treeId: "racer",
    name: "Throttle Control",
    description: "+3% race scrap bonus. You put on a show. The crowd pays accordingly.",
    cost: 600,
    prerequisiteNodeId: "racer_t1_rev",
    mutuallyExclusiveWith: "racer_t2_smooth",
    effect: { type: "race_scrap_bonus_pct", value: 0.03 },
    tier: 2,
  },
  {
    id: "racer_t3_fatigue",
    treeId: "racer",
    name: "Fatigue Proof",
    description: "-20% fatigue gained per race. You've built a body that doesn't quit.",
    cost: 1800,
    prerequisiteNodeId: "racer_t2_smooth",
    effect: { type: "fatigue_rate_reduction", value: 0.2 },
    tier: 3,
  },
  {
    id: "racer_t3_leadfoot",
    treeId: "racer",
    name: "Lead Foot",
    description: "+5% race performance. The gas pedal is just for show — it's always floored.",
    cost: 1800,
    prerequisiteNodeId: "racer_t2_throttle",
    effect: { type: "race_performance_pct", value: 0.05 },
    tier: 3,
  },

  // ── Wrench Jockey tree ────────────────────────────────────────────────────

  {
    id: "wrench_t1_grease",
    treeId: "wrench",
    name: "Grease Hands",
    description: "+3% build cost reduction. Muscle memory doesn't charge by the hour.",
    cost: 200,
    effect: { type: "build_cost_reduction_pct", value: 0.03 },
    tier: 1,
  },
  {
    id: "wrench_t2_material",
    treeId: "wrench",
    name: "Material Eye",
    description: "+15% material yield from decomposing parts. Nothing gets wasted in your shop.",
    cost: 600,
    prerequisiteNodeId: "wrench_t1_grease",
    mutuallyExclusiveWith: "wrench_t2_speed",
    effect: { type: "material_bonus_pct", value: 0.15 },
    tier: 2,
  },
  {
    id: "wrench_t2_speed",
    treeId: "wrench",
    name: "Speed Wrench",
    description: "+3% repair cost reduction. In and out. No wasted motion.",
    cost: 600,
    prerequisiteNodeId: "wrench_t1_grease",
    mutuallyExclusiveWith: "wrench_t2_material",
    effect: { type: "repair_cost_reduction_pct", value: 0.03 },
    tier: 2,
  },
  {
    id: "wrench_t3_forge",
    treeId: "wrench",
    name: "Forge Sense",
    description: "+1% forge token drop rate. You can smell quality metal in a wreck.",
    cost: 1800,
    prerequisiteNodeId: "wrench_t2_material",
    effect: { type: "forge_token_chance_bonus", value: 0.01 },
    tier: 3,
  },
  {
    id: "wrench_t3_zero",
    treeId: "wrench",
    name: "Zero Downtime",
    description: "+5% build cost reduction. Your garage is a well-oiled machine. Literally.",
    cost: 1800,
    prerequisiteNodeId: "wrench_t2_speed",
    effect: { type: "build_cost_reduction_pct", value: 0.05 },
    tier: 3,
  },

  // ── Scrap Hunter tree ─────────────────────────────────────────────────────

  {
    id: "hunter_t1_eyes",
    treeId: "hunter",
    name: "Sharp Eyes",
    description: "+2% scavenge luck. You know where the good stuff hides.",
    cost: 200,
    effect: { type: "scavenge_luck_bonus", value: 0.02 },
    tier: 1,
  },
  {
    id: "hunter_t2_trade",
    treeId: "hunter",
    name: "Trade Routes",
    description: "+4% sell value. You know who's buying and what they'll pay.",
    cost: 600,
    prerequisiteNodeId: "hunter_t1_eyes",
    mutuallyExclusiveWith: "hunter_t2_dig",
    effect: { type: "sell_value_bonus_pct", value: 0.04 },
    tier: 2,
  },
  {
    id: "hunter_t2_dig",
    treeId: "hunter",
    name: "Deep Dig",
    description: "+3% scavenge yield. You go deeper than anyone else dares.",
    cost: 600,
    prerequisiteNodeId: "hunter_t1_eyes",
    mutuallyExclusiveWith: "hunter_t2_trade",
    effect: { type: "scavenge_yield_pct", value: 0.03 },
    tier: 2,
  },
  {
    id: "hunter_t3_market",
    treeId: "hunter",
    name: "Black Market",
    description: "+6% sell value. Your network stretches further than anyone knows.",
    cost: 1800,
    prerequisiteNodeId: "hunter_t2_trade",
    effect: { type: "sell_value_bonus_pct", value: 0.06 },
    tier: 3,
  },
  {
    id: "hunter_t3_jackpot",
    treeId: "hunter",
    name: "Jackpot",
    description: "+5% scavenge luck. When you dig, you always hit something good.",
    cost: 1800,
    prerequisiteNodeId: "hunter_t2_dig",
    effect: { type: "scavenge_luck_bonus", value: 0.05 },
    tier: 3,
  },

  // ── T4/T5 Expanded Talent Nodes (require "expanded_talents" feature unlock) ──

  // Race Driver T4/T5
  {
    id: "racer_t4_iron",
    treeId: "racer",
    name: "Iron Constitution",
    description: "Fatigue cap reduced by 10. Your body refuses to quit.",
    cost: 5000,
    prerequisiteNodeId: "racer_t3_fatigue",
    effect: { type: "fatigue_cap_reduction", value: 10 },
    tier: 4,
    requiredFeature: "expanded_talents",
  },
  {
    id: "racer_t4_nitro",
    treeId: "racer",
    name: "Nitro Instinct",
    description: "+8% race performance, but +5% DNF risk. All or nothing.",
    cost: 5000,
    prerequisiteNodeId: "racer_t3_leadfoot",
    effect: { type: "race_performance_pct", value: 0.08 },
    tier: 4,
    requiredFeature: "expanded_talents",
  },
  {
    id: "racer_t5_aura",
    treeId: "racer",
    name: "Champion's Aura",
    description: "+15% rep earned, -20% vehicle wear. Legends don't burn out.",
    cost: 15000,
    prerequisiteNodeId: "racer_t4_iron",
    effect: { type: "champion_aura", value: 1 },
    tier: 5,
    requiredFeature: "expanded_talents",
  },

  // Wrench Jockey T4/T5
  {
    id: "wrench_t4_forger",
    treeId: "wrench",
    name: "Master Forger",
    description: "+3% forge token drop rate, -10% enhancement costs.",
    cost: 5000,
    prerequisiteNodeId: "wrench_t3_forge",
    effect: { type: "forge_token_chance_bonus", value: 0.03 },
    tier: 4,
    requiredFeature: "expanded_talents",
  },
  {
    id: "wrench_t4_assembly",
    treeId: "wrench",
    name: "Assembly Line",
    description: "-15% workshop upgrade costs. Industrial efficiency.",
    cost: 5000,
    prerequisiteNodeId: "wrench_t3_zero",
    effect: { type: "workshop_cost_reduction_pct", value: 0.15 },
    tier: 4,
    requiredFeature: "expanded_talents",
  },
  {
    id: "wrench_t5_legendary",
    treeId: "wrench",
    name: "Legendary Hands",
    description: "Scavenged parts start at +1 condition tier. Your touch makes junk into gold.",
    cost: 15000,
    prerequisiteNodeId: "wrench_t4_forger",
    effect: { type: "scavenge_condition_boost", value: 1 },
    tier: 5,
    requiredFeature: "expanded_talents",
  },

  // Scrap Hunter T4/T5
  {
    id: "hunter_t4_smuggler",
    treeId: "hunter",
    name: "Smuggler Network",
    description: "-15% dealer prices, +50% dealer refresh rate.",
    cost: 5000,
    prerequisiteNodeId: "hunter_t3_market",
    effect: { type: "dealer_discount_pct", value: 0.15 },
    tier: 4,
    requiredFeature: "expanded_talents",
  },
  {
    id: "hunter_t4_deep_vein",
    treeId: "hunter",
    name: "Deep Vein",
    description: "+8% scavenge luck. Exotic part drops at high-tier locations.",
    cost: 5000,
    prerequisiteNodeId: "hunter_t3_jackpot",
    effect: { type: "scavenge_luck_bonus", value: 0.08 },
    tier: 4,
    requiredFeature: "expanded_talents",
  },
  {
    id: "hunter_t5_midas",
    treeId: "hunter",
    name: "Midas Touch",
    description: "+25% all scrap and sell values. Everything you touch turns to gold.",
    cost: 15000,
    prerequisiteNodeId: "hunter_t4_smuggler",
    effect: { type: "sell_value_bonus_pct", value: 0.25 },
    tier: 5,
    requiredFeature: "expanded_talents",
  },
];

export function getTalentNodeById(id: string): TalentNode | undefined {
  return TALENT_NODES.find((n) => n.id === id);
}

export function getTalentNodesForTree(treeId: string): TalentNode[] {
  return TALENT_NODES.filter((n) => n.treeId === treeId);
}

export function getTalentTreeById(id: string): TalentTree | undefined {
  return TALENT_TREES.find((t) => t.id === id);
}
