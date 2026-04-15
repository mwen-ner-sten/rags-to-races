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
import { SKILL_DEFINITIONS, MAX_SKILL_LEVEL, RATING_PER_LEVEL } from "@/data/racerSkills";
import { ATTRIBUTE_DEFINITIONS } from "@/data/racerAttributes";
import { CREW_ROLES, CREW_ROLE_LABELS, CREW_ROLE_DESCRIPTIONS, CREW_SPECIALIZATIONS } from "@/data/crew";
import { TEAM_UPGRADE_DEFINITIONS, TEAM_CATEGORIES, TEAM_CATEGORY_LABELS } from "@/data/teamUpgrades";
import { OWNER_UPGRADE_DEFINITIONS, OWNER_CATEGORIES, OWNER_CATEGORY_LABELS } from "@/data/ownerUpgrades";
import { TRACK_PERK_DEFINITIONS, TRACK_PERK_CATEGORIES, TRACK_PERK_CATEGORY_LABELS } from "@/data/trackPerks";
import { PRESTIGE_MILESTONE_DEFINITIONS } from "@/data/prestigeMilestones";
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_CATEGORIES } from "@/data/achievements";
import { PLAYSTYLE_PATHS, PLAYSTYLE_NODE_DEFINITIONS } from "@/data/playstyleUpgrades";
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
  { step: "Build Rep & earn scrap", description: "Earn $50,000 lifetime scrap and 5,000 Rep across 3 vehicles. Watch fatigue — it builds every race and cuts performance." },
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
  { term: "Team Points (TP)", meaning: "Layer 2 prestige currency earned from Team Reset. Spent on team upgrades that accelerate Scrap Reset runs." },
  { term: "Owner Points (OP)", meaning: "Layer 3 prestige currency earned from Owner Reset. Spent on powerful franchise-wide upgrades." },
  { term: "Track Prestige Tokens (PT)", meaning: "Layer 4 prestige currency earned from Track Owner Reset. Spent on meta-game perks like custom circuits and passive income." },
  { term: "Crew", meaning: "NPC helpers unlocked after first Team Reset. 4 roles (Mechanic, Scout, Driver, Trader) with specializations. Persist through Scrap Resets but reset on Team Reset (unless you have the Crew Retention upgrade)." },
  { term: "Racer Skills", meaning: `${SKILL_DEFINITIONS.length} XP-based skills (${SKILL_DEFINITIONS.map(s => s.name).join(", ")}). Max level ${MAX_SKILL_LEVEL}. Rating converts to effectiveness with diminishing returns at higher tiers.` },
  { term: "Racer Attributes", meaning: `${ATTRIBUTE_DEFINITIONS.length} allocatable stat points (${ATTRIBUTE_DEFINITIONS.map(a => a.name).join(", ")}). Boost skill ratings or provide flat bonuses.` },
  { term: "Offline Progress", meaning: "The game continues scavenging and racing while closed (capped at 8 hours). A summary modal shows your offline earnings when you return." },
  { term: "Achievement", meaning: "Lifetime milestone that grants permanent bonuses. Tracked across all resets. View in Upgrades > Trophies." },
  { term: "Prestige Milestone", meaning: "Free reward earned at prestige count thresholds. Some shape your run strategy. View in Upgrades > Prestige." },
  { term: "Playstyle Node", meaning: "LP-bought specialization in Scrapper/Speedster/Engineer trees. Resets on Team Reset. View in Upgrades > Playstyle." },
  { term: "Softwall", meaning: "A large bonus to a specific activity at certain prestige counts that naturally encourages that playstyle." },
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
  {
    question: "What are Team, Owner, and Track resets?",
    answer: "These are higher prestige layers beyond Scrap Reset. Team Reset (Layer 2) costs accumulated LP and grants Team Points for crew and infrastructure upgrades. Owner Reset (Layer 3) costs Team Points and grants Owner Points for franchise-wide power. Track Owner (Layer 4) costs Owner Points and grants Track Prestige Tokens for meta-game perks. Each layer resets the layers below it.",
  },
  {
    question: "How does the crew system work?",
    answer: "Crew unlocks after your first Team Reset. You recruit NPC members in 4 roles: Mechanic (-build/repair costs), Scout (+scavenge luck/yield), Driver (+race performance/-DNF), and Trader (+sell value/-dealer prices). Each role has 2 specializations to choose from. Crew gain XP from their associated activities and level up for stronger bonuses. They persist through Scrap Resets but reset on Team Reset (unless you have the Crew Retention upgrade).",
  },
  {
    question: "How do racer skills and attributes work?",
    answer: "Skills (Driving, Mechanics, Scavenging, Endurance) earn XP from gameplay actions and level up automatically (max level 20). Each level adds rating points that convert to effectiveness with diminishing returns at higher content tiers. Attributes (Reflexes, Endurance, Charisma, Instinct, Engineering, Fortune) are point-allocated — you get points each level to distribute. Some boost skill ratings, others give flat bonuses like +rep or +luck.",
  },
  {
    question: "What's the difference between challenges and achievements?",
    answer: "Challenges are per-run tasks with material rewards that reset progress each run. Achievements are lifetime milestones with permanent bonuses that persist through all resets.",
  },
  {
    question: "Do achievements reset on prestige?",
    answer: "Never. Achievements and their bonuses persist through all resets including Team, Owner, and Track.",
  },
  {
    question: "What are softwall milestones?",
    answer: "Large bonuses to specific activities at certain prestige counts. They naturally guide your playstyle for a few runs without restricting you.",
  },
  {
    question: "Why did my playstyle nodes reset?",
    answer: "Playstyle upgrades reset on Team Reset, giving you a natural respec opportunity each era. You can also manually respec for a 50% LP refund.",
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
  {
    id: "crew_composition",
    title: "Crew composition guide",
    advice: [
      "First crew slot: Scout (Treasure Hunter) — scavenge luck compounds across your entire run.",
      "Second slot: Driver (Speed Demon) — direct race performance is always valuable.",
      "Third slot: Mechanic (Salvage Expert) — repair costs add up fast at high fatigue.",
      "Fourth slot: Trader (Fence) — sell value boost matters most once you have a steady part flow.",
    ],
  },
  {
    id: "attribute_allocation",
    title: "Attribute allocation strategy",
    advice: [
      "Early game: Reflexes (Driving rating) for better race performance on low-tier circuits.",
      "Mid game: Split between Reflexes and Instinct (Scavenging rating) for better finds.",
      "Late game: Engineering (Mechanics rating) to reduce build/repair costs at scale.",
      "Fortune is a luxury pick — the luck and forge token bonuses are small but compound over long runs.",
      "Charisma's +rep per race and -unlock cost are most impactful in the first few prestiges.",
    ],
  },
  {
    id: "milestone_planning",
    title: "Milestone Planning",
    advice: [
      "Check upcoming prestige milestones before resetting. Softwall bonuses at prestige 7 (scavenging), 10 (racing), and 12 (workshop) dramatically shape your runs — plan accordingly.",
    ],
  },
  {
    id: "achievement_hunting",
    title: "Achievement Hunting",
    advice: [
      "Target bonus-granting achievements first: Century Racer (+15% race scrap) and Scrap Tycoon (+20% scrap) provide the biggest early boosts. Hidden achievements exist — keep pushing boundaries.",
    ],
  },
  {
    id: "playstyle_paths",
    title: "Playstyle Paths",
    advice: [
      "Scrapper path accelerates early runs via scavenging. Speedster shines in mid-game racing. Engineer dominates late-game with workshop and build bonuses. You can invest in all three, but T2 branches force a choice.",
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

// Racer Skills & Attributes
export { SKILL_DEFINITIONS, MAX_SKILL_LEVEL, RATING_PER_LEVEL, ATTRIBUTE_DEFINITIONS };

// Crew
export { CREW_ROLES, CREW_ROLE_LABELS, CREW_ROLE_DESCRIPTIONS, CREW_SPECIALIZATIONS };

// Team upgrades grouped by category
export const HELP_TEAM_UPGRADES_BY_CATEGORY = TEAM_CATEGORIES.map((cat) => ({
  category: cat,
  label: TEAM_CATEGORY_LABELS[cat],
  upgrades: TEAM_UPGRADE_DEFINITIONS.filter((u) => u.category === cat).map((u) => ({
    id: u.id, name: u.name, description: u.description,
    maxLevel: u.maxLevel, baseCost: u.baseCost,
  })),
}));

// Owner upgrades grouped by category
export const HELP_OWNER_UPGRADES_BY_CATEGORY = OWNER_CATEGORIES.map((cat) => ({
  category: cat,
  label: OWNER_CATEGORY_LABELS[cat],
  upgrades: OWNER_UPGRADE_DEFINITIONS.filter((u) => u.category === cat).map((u) => ({
    id: u.id, name: u.name, description: u.description,
    maxLevel: u.maxLevel, baseCost: u.baseCost,
  })),
}));

// Track perks grouped by category
export const HELP_TRACK_PERKS_BY_CATEGORY = TRACK_PERK_CATEGORIES.map((cat) => ({
  category: cat,
  label: TRACK_PERK_CATEGORY_LABELS[cat],
  perks: TRACK_PERK_DEFINITIONS.filter((p) => p.category === cat).map((p) => ({
    id: p.id, name: p.name, description: p.description,
    maxLevel: p.maxLevel, baseCost: p.baseCost,
  })),
}));

// Prestige Milestones
export const HELP_PRESTIGE_MILESTONES = PRESTIGE_MILESTONE_DEFINITIONS.map((m) => ({
  prestigeRequired: m.prestigeRequired,
  name: m.name,
  description: m.description,
  flavorText: m.flavorText,
  rewardType: m.reward.type,
}));

// Achievements by category
export const HELP_ACHIEVEMENTS_BY_CATEGORY = ACHIEVEMENT_CATEGORIES.map((cat) => ({
  category: cat.label,
  achievements: ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === cat.id).map((a) => ({
    name: a.name,
    description: a.description,
    target: a.target,
    reward: a.reward.type === "bonus" ? a.reward.description : a.reward.type === "title" ? `Title: ${a.reward.title}` : "Trophy",
    hidden: a.hidden ?? false,
  })),
}));

// Playstyle Paths
export const HELP_PLAYSTYLE_PATHS = PLAYSTYLE_PATHS.map((path) => ({
  name: path.name,
  description: path.description,
  nodes: PLAYSTYLE_NODE_DEFINITIONS.filter((n) => n.path === path.id).map((n) => ({
    tier: n.tier,
    name: n.name,
    description: n.description,
    lpCost: n.lpCost,
  })),
}));

// Updated data snapshot
export const HELP_DATA_SNAPSHOT_EXTENDED = {
  ...HELP_DATA_SNAPSHOT,
  teamUpgrades: TEAM_UPGRADE_DEFINITIONS.length,
  ownerUpgrades: OWNER_UPGRADE_DEFINITIONS.length,
  trackPerks: TRACK_PERK_DEFINITIONS.length,
  skills: SKILL_DEFINITIONS.length,
  attributes: ATTRIBUTE_DEFINITIONS.length,
  crewRoles: CREW_ROLES.length,
};
