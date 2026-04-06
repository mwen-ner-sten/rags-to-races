import { CONDITIONS, CORE_SLOTS, CONDITION_MULTIPLIERS, PART_DEFINITIONS } from "@/data/parts";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS, BASE_WEAR_PER_RACE, RELIABILITY_WEAR_THRESHOLD, CONDITION_PENALTY_THRESHOLD } from "@/data/vehicles";
import { UPGRADE_DEFINITIONS, UPGRADE_CATEGORIES, type UpgradeCategory } from "@/data/upgrades";
import { GEAR_DEFINITIONS } from "@/data/gear";
import { MATERIAL_DEFINITIONS, CATEGORY_TO_MATERIALS } from "@/data/materials";
import { CHALLENGE_DEFINITIONS } from "@/data/challenges";
import { CRAFT_RECIPES } from "@/data/craftRecipes";
import { DEALER_UNLOCK_REP, DEALER_TIER2_REP, DEALER_TIER3_REP, DEALER_REFRESH_INTERVAL, DEALER_BOARD_SIZE } from "@/data/dealer";
import { LEGACY_UPGRADE_DEFINITIONS, LEGACY_CATEGORY_LABELS, type LegacyUpgradeCategory } from "@/data/legacyUpgrades";
import { MOMENTUM_TIERS } from "@/data/momentumBonuses";
import { TALENT_TREES, TALENT_NODES } from "@/data/talentNodes";
import type { CoreSlot } from "@/data/parts";

// ── How to Play ─────────────────────────────────────────────────────────────

export const HELP_OVERVIEW_STEPS: string[] = [
  "Scavenge parts in the Junkyard — each location drops different tiers and rarities.",
  "Head to the Garage to assemble a vehicle. Fill the required slots and pay the build cost.",
  "Race your vehicle on circuits to earn Scrap Bucks and Rep. Higher circuits pay more but are harder.",
  "Sell junk parts for Scrap Bucks, or decompose them into materials for crafting and gear enhancement.",
  "Open the Upgrades tab to buy Workshop upgrades — faster auto-race, better luck, cheaper builds.",
  "Equip and enhance gear in the Gear tab. Loot gear drops from races and scavenging.",
  "When fatigue climbs and progress stalls, Prestige via the Upgrades tab to earn Legacy Points.",
  "Spend Legacy Points on permanent upgrades and talent nodes that compound every future run.",
];

// ── Tutorial Walkthrough ───────────────────────────────────────────────────

export const HELP_TUTORIAL_WALKTHROUGH: { step: string; description: string }[] = [
  { step: "Scavenge", description: "Click Scavenge in the Junkyard to search the curb for parts." },
  { step: "Gather materials", description: "Collect an engine, a wheel, and $10 by scavenging. Sell extras for cash." },
  { step: "Visit the Garage", description: "Head to the Garage tab to start building your first vehicle." },
  { step: "Pick a blueprint", description: "Select the Push Mower blueprint — it's the cheapest starter ride." },
  { step: "Equip parts", description: "Fill each slot with a part — you need at least an engine and a wheel." },
  { step: "Build your vehicle", description: "Hit Build to assemble your ride. This costs Scrap Bucks." },
  { step: "Activate", description: "Set your new vehicle as the active racer so you can enter races." },
  { step: "Head to Race", description: "Switch to the Race tab to enter your first race." },
  { step: "Check odds", description: "Review your win chance and DNF risk. DNF means your ride breaks down mid-race." },
  { step: "Enter Race", description: "Hit Enter Race to compete on the circuit." },
  { step: "Race result", description: "Win or lose, you earn Scrap Bucks and Rep. Keep racing to improve." },
  { step: "Repair", description: "Racing wears out your vehicle. Repair it in the Garage to keep condition up." },
  { step: "Build Rep & earn scrap", description: "Earn $500 lifetime scrap and 25 Rep. Watch fatigue — it builds every race and cuts performance." },
  { step: "Visit Upgrades", description: "Open the Upgrades tab when fatigue is high or progress stalls." },
  { step: "Prestige", description: "Hit Scrap Reset to prestige. You restart stronger with permanent bonuses." },
];

// ── Glossary ────────────────────────────────────────────────────────────────

export const HELP_GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Scrap Bucks", meaning: "Primary currency. Earned from races and selling parts. Spent on building, repairs, upgrades, and gear." },
  { term: "Rep", meaning: "Progression currency from races. Unlocks locations, circuits, vehicles, the Dealer, and late-game systems." },
  { term: "Fatigue", meaning: "Builds each race (0–99). Costs -0.5% performance, +0.8% wear, +0.3% repair cost per point. Resets on prestige." },
  { term: "Condition", meaning: `Part quality from ${CONDITIONS[0]} (worst) to ${CONDITIONS[CONDITIONS.length - 1]} (best). Higher = more power and sale value.` },
  { term: "Prestige (Scrap Reset)", meaning: "Voluntary reset that wipes currency, parts, and vehicles but awards Legacy Points. Gear and legacy upgrades persist." },
  { term: "Legacy Points (LP)", meaning: "Earned on prestige based on run stats. Spent on permanent upgrades and talent tree nodes." },
  { term: "Momentum", meaning: `${MOMENTUM_TIERS.length} conditional bonuses that activate during a run (e.g., "${MOMENTUM_TIERS[0].name}" at ${MOMENTUM_TIERS[0].condition.value}+ races). Reset on prestige.` },
  { term: "Forge Tokens", meaning: "Rare drop from high-tier race wins (~2%). Used with materials in the Artifact Forge for top-tier parts." },
  { term: "Dealer Board", meaning: `Rotating part market unlocking at ${(DEALER_UNLOCK_REP / 1000).toFixed(0)}k Rep. ${DEALER_BOARD_SIZE} listings, refreshes every ${DEALER_REFRESH_INTERVAL} ticks.` },
  { term: "DNF (Did Not Finish)", meaning: "Vehicle broke down mid-race. Chance = 30% minus reliability/200. Higher reliability = safer." },
  { term: "Win Streak", meaning: "Consecutive race wins. Longer streaks improve loot gear drop rarity by +0.5% per win (cap +10%)." },
  { term: "Vehicle Condition", meaning: `Starts at 100, degrades from racing. Below ${CONDITION_PENALTY_THRESHOLD}, stats drop linearly. Repair in the Garage.` },
  { term: "Materials", meaning: `${MATERIAL_DEFINITIONS.length} types gained by decomposing parts. Used for crafting and gear enhancement.` },
  { term: "Loot Gear", meaning: "Randomized gear from races/scavenging. Has rarity tiers, enhancement levels (0–13), and mod slots." },
  { term: "Enhancement", meaning: "Spend materials to level up loot gear (+12% effect per level). Mod slots unlock at levels 3 and 7." },
  { term: "Auto-Scavenge", meaning: "Unlocks after 100 manual scavenge clicks. Runs automatically each tick." },
  { term: "Auto-Race", meaning: "Unlocks at 30 Rep. Fires on a timer (improved by Pit Crew workshop upgrade)." },
  { term: "Talent Nodes", meaning: `${TALENT_TREES.length} skill trees (${TALENT_TREES.map(t => t.name).join(", ")}). Permanent nodes costing 200–1,800 LP with mutually exclusive branches.` },
  { term: "Challenges", meaning: `${CHALLENGE_DEFINITIONS.length} milestone goals rewarding materials, Forge Tokens, and Dealer refreshes.` },
  { term: "Crafting", meaning: "Spend materials to produce random parts. Unlocked via Workshop upgrade. Higher recipes = better conditions." },
];

// ── FAQ ─────────────────────────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

export const HELP_FAQ: FAQItem[] = [
  {
    question: "Why am I losing races?",
    answer: "Check three things: (1) Your vehicle's performance vs. the circuit difficulty — the Race tab shows your win chance. (2) Your fatigue level — each point costs 0.5% performance. (3) Your vehicle's condition — below " + CONDITION_PENALTY_THRESHOLD + ", stats drop sharply. Repair in the Garage.",
  },
  {
    question: "What do I keep when I prestige?",
    answer: "You keep: Legacy Points, legacy upgrades, talent nodes, all gear (static + loot), and your prestige count. You lose: Scrap Bucks, Rep, inventory, vehicles, workshop levels, materials, race history, momentum, and fatigue resets to 0.",
  },
  {
    question: "How do I unlock the Dealer?",
    answer: `Earn ${(DEALER_UNLOCK_REP / 1000).toFixed(0)}k Rep. The Dealer shows ${DEALER_BOARD_SIZE} rotating part listings. Stock improves at ${(DEALER_TIER2_REP / 1000).toFixed(0)}k Rep (better conditions) and ${(DEALER_TIER3_REP / 1000).toFixed(0)}k Rep (highest-tier parts).`,
  },
  {
    question: "How does fatigue work?",
    answer: "Fatigue increases by 1 per race (0–99). Each point: -0.5% race performance, +0.8% vehicle wear, +0.3% repair cost. It resets to 0 on prestige. Momentum bonuses reward pushing through fatigue — Deep Run (+50% LP at 60 fatigue) and Legendary Run (+100% LP at 80).",
  },
  {
    question: "Should I sell or decompose parts?",
    answer: "Sell if you need Scrap Bucks for builds/upgrades. Decompose if you need materials for gear enhancement or crafting. Tip: decompose high-condition parts for better material yield, sell low-condition junk.",
  },
];

// ── Strategy Advice ─────────────────────────────────────────────────────────

export interface StrategyCard {
  id: string;
  title: string;
  advice: string[];
}

export const HELP_STRATEGY: StrategyCard[] = [
  {
    id: "prestige_timing",
    title: "When should I prestige?",
    advice: [
      "Push to at least 60 fatigue to unlock Deep Run (+50% Legacy Points).",
      "Pushing to 80 fatigue triggers Legendary Run (+100% LP, +20% all bonuses) — worth it if you can still win races.",
      "Prestige when your win chance drops below ~30% on your target circuit.",
      "First few prestiges: prioritize Scrap Magnate and Street Cred for the fastest snowball.",
    ],
  },
  {
    id: "talent_tree",
    title: "Which talent tree should I pick?",
    advice: [
      "Race Driver → best for longer runs. Fatigue Proof (T3) reduces fatigue gain by 20%, letting you push deeper.",
      "Wrench Jockey → best for crafting. Forge Sense (T3) adds +1% Forge Token drop rate for the Artifact pipeline.",
      "Scrap Hunter → best for economy. Trade Routes (T3) gives +5% sell value on everything.",
      "You can eventually unlock all trees — pick the one that matches your current bottleneck first.",
    ],
  },
  {
    id: "legacy_priority",
    title: "Legacy upgrade priority",
    advice: [
      "Tier 1: Scrap Magnate (+20% scrap/level) and Street Cred (+15% rep/level) — best early ROI.",
      "Tier 2: Iron Will (delays fatigue curve by 5 races/level) — lets you push deeper runs.",
      "Tier 3: Seed Money (start with extra scrap) and Born Lucky (+2% luck/level).",
      "Late: Muscle Memory (start with auto-scavenge clicks) and Blueprint Memory (keep workshop upgrades).",
    ],
  },
  {
    id: "dnf_reduction",
    title: "How to reduce DNF",
    advice: [
      "DNF chance = 30% minus (reliability ÷ 200). At 60+ reliability, DNF chance hits 0%.",
      "Use higher-condition parts — they add more reliability.",
      "Equip gear with race_dnf_reduction (Head slot has the best pool for this).",
      "Smooth Lines talent node gives a flat -3% DNF reduction.",
    ],
  },
  {
    id: "gear_enhance",
    title: "Gear enhancement priority",
    advice: [
      "Enhance Epic and Legendary loot first — same +12%/level scaling but stronger base effects.",
      "Target enhancement level 7 to unlock the 2nd mod slot.",
      "Enhancement Mastery workshop upgrade raises the max level by +3 per level (up to 13 total).",
      "Salvage (sell) duplicate common/uncommon loot to fund enhancements on rares+.",
    ],
  },
  {
    id: "workshop_order",
    title: "Workshop unlock order",
    advice: [
      "Start: Toolkit (unlock part swapping) → Bargain Builder (cheaper builds).",
      "Early: Budget Repairs → Keen Eye (scavenge luck) → Deep Pockets (extra parts).",
      "Mid: Consolation Sponsor (scrap from losses) → Reinforced Chassis (less wear).",
      "Late: Gear Scavenger → Trophy Hunter → Enhancement Mastery → Rarity Sense.",
    ],
  },
  {
    id: "sell_vs_decompose",
    title: "Sell vs. decompose decision guide",
    advice: [
      "Need Scrap Bucks for a build or upgrade? Sell.",
      "Need materials for enhancement or crafting? Decompose.",
      "High-condition parts yield significantly more materials — decompose those, sell rusted junk.",
      "The Efficient Salvager legacy upgrade adds +10% decompose yield per level — invest early if you craft a lot.",
    ],
  },
];

// ── Dynamic Data Exports ────────────────────────────────────────────────────

// Parts & Conditions
export const HELP_PARTS_BY_CATEGORY = CORE_SLOTS.map((slot) => ({
  category: slot,
  count: PART_DEFINITIONS.filter((part) => part.category === slot).length,
}));

export const HELP_CONDITIONS = CONDITIONS.map((condition) => ({
  id: condition,
  multiplier: CONDITION_MULTIPLIERS[condition],
}));

// Locations
export const HELP_LOCATIONS = LOCATION_DEFINITIONS.map((loc) => ({
  id: loc.id, name: loc.name, tier: loc.tier,
  unlockCost: loc.unlockCost,
  maxPartsPerScavenge: loc.maxPartsPerScavenge,
}));

// Circuits
export const HELP_CIRCUITS = CIRCUIT_DEFINITIONS.map((c) => ({
  id: c.id, name: c.name, tier: c.tier,
  difficulty: c.difficulty, entryFee: c.entryFee,
  rewardBase: c.rewardBase, repReward: c.repReward,
}));

// Vehicles
export const HELP_VEHICLES = VEHICLE_DEFINITIONS.map((v) => ({
  id: v.id, name: v.name, tier: v.tier,
  buildCost: v.buildCost,
  slotCount: Object.keys(v.slots).length,
}));

// Upgrades grouped by category
export const HELP_UPGRADES_BY_CATEGORY = UPGRADE_CATEGORIES.map((cat) => ({
  category: cat.id as UpgradeCategory,
  label: cat.label,
  upgrades: UPGRADE_DEFINITIONS.filter((u) => u.category === cat.id).map((u) => ({
    id: u.id, name: u.name, description: u.description,
    maxLevel: u.maxLevel, baseCost: u.baseCost,
  })),
}));

// Legacy upgrades
export { LEGACY_UPGRADE_DEFINITIONS, LEGACY_CATEGORY_LABELS };
export type { LegacyUpgradeCategory };

// Momentum tiers
export { MOMENTUM_TIERS };

// Talent tree
export { TALENT_TREES, TALENT_NODES };

// Challenges
function formatReward(r: { type: string; amount?: number; material?: string }): string {
  switch (r.type) {
    case "forgeToken": return `${r.amount} Forge Token${(r.amount ?? 0) > 1 ? "s" : ""}`;
    case "material": return `${r.amount} ${r.material}`;
    case "scrap": return `${r.amount} Scrap`;
    case "dealerRefresh": return "Dealer Refresh";
    default: return r.type;
  }
}

export const HELP_CHALLENGES = CHALLENGE_DEFINITIONS.map((c) => ({
  id: c.id, name: c.name, description: c.description,
  target: c.target,
  rewardSummary: c.rewards.map((r) => formatReward(r as { type: string; amount?: number; material?: string })).join(", "),
}));

// Materials
export const HELP_MATERIALS = MATERIAL_DEFINITIONS.map((m) => ({
  id: m.id, name: m.name,
}));

export const HELP_MATERIAL_SOURCES: { category: CoreSlot; materials: string[] }[] =
  CORE_SLOTS.map((slot) => ({
    category: slot,
    materials: (CATEGORY_TO_MATERIALS[slot] ?? []).map(String),
  }));

// Craft recipes
export const HELP_CRAFT_RECIPES = CRAFT_RECIPES.map((r, i) => ({
  id: `recipe_${i}`, label: r.label, category: r.category,
  resultCondition: r.resultCondition,
  cost: r.cost,
}));

// Dealer constants
export const HELP_DEALER = {
  unlockRep: DEALER_UNLOCK_REP,
  tier2Rep: DEALER_TIER2_REP,
  tier3Rep: DEALER_TIER3_REP,
  refreshInterval: DEALER_REFRESH_INTERVAL,
  boardSize: DEALER_BOARD_SIZE,
};

// Racing constants
export const HELP_RACING = {
  baseWearPerRace: BASE_WEAR_PER_RACE,
  reliabilityWearThreshold: RELIABILITY_WEAR_THRESHOLD,
  conditionPenaltyThreshold: CONDITION_PENALTY_THRESHOLD,
};

// Gear stats
const gearSlotCounts = GEAR_DEFINITIONS.reduce<Record<string, number>>((acc, gear) => {
  acc[gear.slot] = (acc[gear.slot] ?? 0) + 1;
  return acc;
}, {});

export const HELP_GEAR_STATS = {
  totalGear: GEAR_DEFINITIONS.length,
  slotCount: Object.keys(gearSlotCounts).length,
  slots: gearSlotCounts,
};

// Data snapshot counts
export const HELP_DATA_SNAPSHOT = {
  locations: LOCATION_DEFINITIONS.length,
  maxLocationTier: Math.max(...LOCATION_DEFINITIONS.map((l) => l.tier)),
  circuits: CIRCUIT_DEFINITIONS.length,
  maxCircuitTier: Math.max(...CIRCUIT_DEFINITIONS.map((c) => c.tier)),
  vehicles: VEHICLE_DEFINITIONS.length,
  maxVehicleTier: Math.max(...VEHICLE_DEFINITIONS.map((v) => v.tier)),
  parts: PART_DEFINITIONS.length,
  coreSlots: CORE_SLOTS.length,
  upgrades: UPGRADE_DEFINITIONS.length,
  upgradeCategories: UPGRADE_CATEGORIES.length,
  gear: GEAR_DEFINITIONS.length,
  gearSlots: Object.keys(gearSlotCounts).length,
  materials: MATERIAL_DEFINITIONS.length,
  challenges: CHALLENGE_DEFINITIONS.length,
  craftRecipes: CRAFT_RECIPES.length,
  highestPartTier: Math.max(...PART_DEFINITIONS.map((p) => p.minTier)),
  talentTrees: TALENT_TREES.length,
  talentNodes: TALENT_NODES.length,
  legacyUpgrades: LEGACY_UPGRADE_DEFINITIONS.length,
  momentumTiers: MOMENTUM_TIERS.length,
};
