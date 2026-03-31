export type GearSlot = "head" | "body" | "hands" | "feet" | "tool" | "accessory";

export const GEAR_SLOTS: GearSlot[] = ["head", "body", "hands", "feet", "tool", "accessory"];

export const GEAR_SLOT_LABELS: Record<GearSlot, { label: string; icon: string }> = {
  head: { label: "Head", icon: "🪖" },
  body: { label: "Body", icon: "👕" },
  hands: { label: "Hands", icon: "🧤" },
  feet: { label: "Feet", icon: "👟" },
  tool: { label: "Tool", icon: "🔧" },
  accessory: { label: "Accessory", icon: "🎒" },
};

export interface GearEffect {
  type: string;
  value: number;
}

export interface GearDefinition {
  id: string;
  name: string;
  slot: GearSlot;
  tier: number;
  cost: number;
  description: string;
  flavorText: string;
  effects: GearEffect[];
  unlockRequirement?: {
    repPoints?: number;
  };
}

export const GEAR_DEFINITIONS: GearDefinition[] = [
  // ── Head ──────────────────────────────────────────────────────────────────
  {
    id: "head_bare",
    name: "Bare Head",
    slot: "head",
    tier: 0,
    cost: 0,
    description: "Nothing but sun and regret.",
    flavorText: "At least the wind feels nice.",
    effects: [],
  },
  {
    id: "head_bandana",
    name: "Ratty Bandana",
    slot: "head",
    tier: 1,
    cost: 20,
    description: "Keeps the sweat out of your eyes. Mostly.",
    flavorText: "Found it in a ditch. Washed it. Twice.",
    effects: [{ type: "scavenge_luck_bonus", value: 0.02 }],
  },
  {
    id: "head_goggles",
    name: "Safety Goggles",
    slot: "head",
    tier: 2,
    cost: 80,
    description: "See better, dodge less debris.",
    flavorText: "One lens is cracked but hey, depth perception is overrated.",
    effects: [
      { type: "scavenge_luck_bonus", value: 0.05 },
      { type: "race_dnf_reduction", value: 0.03 },
    ],
    unlockRequirement: { repPoints: 3000 },
  },
  {
    id: "head_mechanic_helmet",
    name: "Mechanic's Helmet",
    slot: "head",
    tier: 3,
    cost: 400,
    description: "Proper head protection for proper wrenching.",
    flavorText: "Has a few dents. Character, they call it.",
    effects: [
      { type: "race_wear_reduction_pct", value: 0.05 },
      { type: "scavenge_luck_bonus", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 12000 },
  },
  {
    id: "head_racing_helmet",
    name: "Pro Racing Helmet",
    slot: "head",
    tier: 4,
    cost: 2500,
    description: "Full-face carbon fiber. You look like a real racer now.",
    flavorText: "The visor alone costs more than your first car.",
    effects: [
      { type: "race_wear_reduction_pct", value: 0.10 },
      { type: "race_dnf_reduction", value: 0.08 },
    ],
    unlockRequirement: { repPoints: 80000 },
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  {
    id: "body_rags",
    name: "Tattered Shirt",
    slot: "body",
    tier: 0,
    cost: 0,
    description: "More holes than fabric.",
    flavorText: "It was white once. Probably.",
    effects: [],
  },
  {
    id: "body_coveralls",
    name: "Thrift Store Coveralls",
    slot: "body",
    tier: 1,
    cost: 30,
    description: "Stained but functional. Pockets are a game-changer.",
    flavorText: "Previous owner's name tag says 'Earl'. You're Earl now.",
    effects: [{ type: "repair_cost_reduction_pct", value: 0.05 }],
  },
  {
    id: "body_overalls",
    name: "Work Overalls",
    slot: "body",
    tier: 2,
    cost: 100,
    description: "Proper workwear. Built for grease and grime.",
    flavorText: "The knees are reinforced. Your back is not.",
    effects: [
      { type: "build_cost_reduction_pct", value: 0.05 },
      { type: "repair_cost_reduction_pct", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 3000 },
  },
  {
    id: "body_jumpsuit",
    name: "Mechanic's Jumpsuit",
    slot: "body",
    tier: 3,
    cost: 500,
    description: "Professional grade. Even has your name embroidered.",
    flavorText: "Well, somebody's name. Close enough.",
    effects: [
      { type: "build_cost_reduction_pct", value: 0.08 },
      { type: "repair_cost_reduction_pct", value: 0.08 },
    ],
    unlockRequirement: { repPoints: 12000 },
  },
  {
    id: "body_race_suit",
    name: "Racing Suit",
    slot: "body",
    tier: 4,
    cost: 3000,
    description: "Fire-retardant Nomex. You've arrived.",
    flavorText: "The sponsors want their logo on the back. You don't have sponsors yet.",
    effects: [
      { type: "race_performance_pct", value: 0.08 },
      { type: "race_wear_reduction_pct", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 80000 },
  },

  // ── Hands ─────────────────────────────────────────────────────────────────
  {
    id: "hands_bare",
    name: "Bare Hands",
    slot: "hands",
    tier: 0,
    cost: 0,
    description: "Splinters, cuts, and tetanus. Living the dream.",
    flavorText: "Your calluses have calluses.",
    effects: [{ type: "scavenge_luck_bonus", value: -0.15 }],
  },
  {
    id: "hands_garden",
    name: "Garden Gloves",
    slot: "hands",
    tier: 1,
    cost: 10,
    description: "Thin cloth gloves. Better than nothing.",
    flavorText: "Floral print. Very intimidating.",
    effects: [],
  },
  {
    id: "hands_work",
    name: "Work Gloves",
    slot: "hands",
    tier: 2,
    cost: 60,
    description: "Leather palms, good grip. Finds come easier.",
    flavorText: "Now you can grab rusty metal without bleeding. Progress.",
    effects: [
      { type: "scavenge_luck_bonus", value: 0.05 },
      { type: "scavenge_yield_pct", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 3000 },
  },
  {
    id: "hands_mechanic",
    name: "Mechanic's Gloves",
    slot: "hands",
    tier: 3,
    cost: 350,
    description: "Precision grip for precision work.",
    flavorText: "Oil-resistant. Tear-resistant. Dignity-resistant.",
    effects: [
      { type: "build_cost_reduction_pct", value: 0.05 },
      { type: "refurb_cost_reduction_pct", value: 0.08 },
    ],
    unlockRequirement: { repPoints: 12000 },
  },
  {
    id: "hands_racing",
    name: "Racing Gloves",
    slot: "hands",
    tier: 4,
    cost: 2000,
    description: "Grip the wheel like you mean it.",
    flavorText: "Suede palms. You can feel every vibration. Every bolt loosening.",
    effects: [
      { type: "race_performance_pct", value: 0.05 },
      { type: "race_handling_pct", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 80000 },
  },

  // ── Feet ──────────────────────────────────────────────────────────────────
  {
    id: "feet_bare",
    name: "Bare Feet",
    slot: "feet",
    tier: 0,
    cost: 0,
    description: "Every step is an adventure. A painful one.",
    flavorText: "You stepped on a nail yesterday. Twice.",
    effects: [{ type: "scavenge_luck_bonus", value: -0.10 }],
  },
  {
    id: "feet_sneakers",
    name: "Worn Sneakers",
    slot: "feet",
    tier: 1,
    cost: 10,
    description: "The sole is peeling off but they work.",
    flavorText: "Found these behind a dumpster. Score.",
    effects: [],
  },
  {
    id: "feet_boots",
    name: "Steel-Toe Boots",
    slot: "feet",
    tier: 2,
    cost: 80,
    description: "Heavy but protective. Kick through rubble with confidence.",
    flavorText: "Drop an engine block on your foot. Go ahead. Try it.",
    effects: [
      { type: "scavenge_yield_pct", value: 0.05 },
      { type: "scavenge_luck_bonus", value: 0.03 },
    ],
    unlockRequirement: { repPoints: 3000 },
  },
  {
    id: "feet_mechanic_boots",
    name: "Mechanic's Boots",
    slot: "feet",
    tier: 3,
    cost: 400,
    description: "Oil-proof, shock-absorbing. Walk all day in these.",
    flavorText: "Your feet stopped hurting. You forgot that was possible.",
    effects: [
      { type: "scavenge_yield_pct", value: 0.10 },
      { type: "scavenge_luck_bonus", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 12000 },
  },
  {
    id: "feet_racing_boots",
    name: "Racing Boots",
    slot: "feet",
    tier: 4,
    cost: 2500,
    description: "Lightweight, fire-resistant. Feel every pedal input.",
    flavorText: "Thin soles for maximum pedal feel. Terrible for scavenging though.",
    effects: [
      { type: "race_handling_pct", value: 0.05 },
      { type: "race_performance_pct", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 80000 },
  },

  // ── Tool ──────────────────────────────────────────────────────────────────
  {
    id: "tool_stick",
    name: "Poking Stick",
    slot: "tool",
    tier: 0,
    cost: 0,
    description: "A stick. For poking things. Revolutionary.",
    flavorText: "It's a good stick though.",
    effects: [],
  },
  {
    id: "tool_screwdriver",
    name: "Rusty Screwdriver",
    slot: "tool",
    tier: 1,
    cost: 15,
    description: "Flathead only. Strips every screw it touches.",
    flavorText: "Is it a tool or a weapon? Depends on the day.",
    effects: [{ type: "repair_cost_reduction_pct", value: 0.03 }],
  },
  {
    id: "tool_wrench",
    name: "Basic Wrench Set",
    slot: "tool",
    tier: 2,
    cost: 100,
    description: "Six wrenches in a vinyl roll. Missing the 10mm obviously.",
    flavorText: "The 10mm was gone before you bought it. Always.",
    effects: [
      { type: "build_cost_reduction_pct", value: 0.08 },
      { type: "repair_cost_reduction_pct", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 3000 },
  },
  {
    id: "tool_pro_toolbox",
    name: "Pro Toolbox",
    slot: "tool",
    tier: 3,
    cost: 500,
    description: "Rolling cabinet, full set. You're a real mechanic now.",
    flavorText: "It's red. All the best toolboxes are red.",
    effects: [
      { type: "build_cost_reduction_pct", value: 0.12 },
      { type: "repair_cost_reduction_pct", value: 0.10 },
    ],
    unlockRequirement: { repPoints: 12000 },
  },
  {
    id: "tool_power_tools",
    name: "Powered Workshop Tools",
    slot: "tool",
    tier: 4,
    cost: 3500,
    description: "Impact wrenches, air tools, diagnostic scanner. The works.",
    flavorText: "Your garage sounds like a Formula 1 pit stop.",
    effects: [
      { type: "build_cost_reduction_pct", value: 0.15 },
      { type: "repair_cost_reduction_pct", value: 0.15 },
    ],
    unlockRequirement: { repPoints: 80000 },
  },

  // ── Accessory ─────────────────────────────────────────────────────────────
  {
    id: "acc_empty",
    name: "Empty Pockets",
    slot: "accessory",
    tier: 0,
    cost: 0,
    description: "Nothing but lint and broken dreams.",
    flavorText: "Turn them inside out. See? Nothing.",
    effects: [],
  },
  {
    id: "acc_plastic_bag",
    name: "Plastic Bag",
    slot: "accessory",
    tier: 1,
    cost: 12,
    description: "Carry more scrap. It rips sometimes.",
    flavorText: "Paper or plastic? Plastic. Always plastic.",
    effects: [{ type: "sell_value_bonus_pct", value: 0.05 }],
  },
  {
    id: "acc_satchel",
    name: "Canvas Satchel",
    slot: "accessory",
    tier: 2,
    cost: 90,
    description: "Sturdy bag with pockets. Finds more, sells better.",
    flavorText: "It's not a purse. It's a satchel. Indiana Jones has one.",
    effects: [
      { type: "scavenge_yield_pct", value: 0.05 },
      { type: "sell_value_bonus_pct", value: 0.08 },
    ],
    unlockRequirement: { repPoints: 3000 },
  },
  {
    id: "acc_belt",
    name: "Mechanic's Belt",
    slot: "accessory",
    tier: 3,
    cost: 450,
    description: "Tool loops, pouches, and a bottle opener. Essentials.",
    flavorText: "Batman has a utility belt. You have this. Same energy.",
    effects: [
      { type: "sell_value_bonus_pct", value: 0.10 },
      { type: "repair_cost_reduction_pct", value: 0.05 },
    ],
    unlockRequirement: { repPoints: 12000 },
  },
  {
    id: "acc_sponsor_bag",
    name: "Sponsor's Kit Bag",
    slot: "accessory",
    tier: 4,
    cost: 3000,
    description: "Branded gear from your first real sponsor.",
    flavorText: "It says 'ACME Racing' on it. You've made it. Kind of.",
    effects: [
      { type: "sell_value_bonus_pct", value: 0.15 },
      { type: "race_scrap_bonus_pct", value: 0.10 },
    ],
    unlockRequirement: { repPoints: 80000 },
  },
];

export function getGearById(id: string): GearDefinition | undefined {
  return GEAR_DEFINITIONS.find((g) => g.id === id);
}

export function getGearForSlot(slot: GearSlot): GearDefinition[] {
  return GEAR_DEFINITIONS.filter((g) => g.slot === slot);
}

/** Default T0 gear equipped on fresh start */
export const DEFAULT_EQUIPPED_GEAR: Record<GearSlot, string> = {
  head: "head_bare",
  body: "body_rags",
  hands: "hands_bare",
  feet: "feet_bare",
  tool: "tool_stick",
  accessory: "acc_empty",
};

export const DEFAULT_OWNED_GEAR: string[] = [
  "head_bare", "body_rags", "hands_bare", "feet_bare", "tool_stick", "acc_empty",
];
