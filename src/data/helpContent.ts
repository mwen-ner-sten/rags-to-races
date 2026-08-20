import { CONDITIONS, CORE_SLOTS, CONDITION_MULTIPLIERS, PART_DEFINITIONS } from "@/data/parts";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS, BASE_WEAR_PER_RACE, RELIABILITY_WEAR_THRESHOLD, CONDITION_PENALTY_THRESHOLD } from "@/data/vehicles";
import { UPGRADE_DEFINITIONS, UPGRADE_CATEGORIES, type UpgradeCategory } from "@/data/upgrades";
import { MATERIAL_DEFINITIONS, CATEGORY_TO_MATERIALS } from "@/data/materials";
import { CHALLENGE_DEFINITIONS } from "@/data/challenges";
import { CRAFT_RECIPES } from "@/data/craftRecipes";
import { DEALER_UNLOCK_REP, DEALER_TIER2_REP, DEALER_TIER3_REP, DEALER_REFRESH_INTERVAL, DEALER_BOARD_SIZE } from "@/data/dealer";
import { LEGACY_UPGRADE_DEFINITIONS, LEGACY_CATEGORY_LABELS, type LegacyUpgradeCategory } from "@/data/legacyUpgrades";
import { AUTO_SCAVENGE_MANUAL_TARGET, OFFLINE_LOOSE_INVENTORY_LIMIT, OFFLINE_TICK_MS_MIN, STATION_EQUIPMENT_INVENTORY_LIMIT } from "@/config/gameplayLimits";
import { SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { MOMENTUM_TIERS } from "@/data/momentumBonuses";
import { GARAGE_STATIONS } from "@/data/garageStations";
import { SKILL_DEFINITIONS, MAX_SKILL_LEVEL, RATING_PER_LEVEL } from "@/data/racerSkills";
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
  "Use the Salvage Workshop to compare, decompose, repair, enhance, craft, source, and install parts.",
  "Equip and improve six shared garage stations for stronger engineering, preparation, and sourcing.",
  "When fatigue climbs and progress stalls, Prestige via the Upgrades tab to earn Legacy Points.",
  "Spend Legacy Points on permanent upgrades and Garage Philosophy paths that compound future runs.",
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
  { step: "Enter Race", description: "Hit Enter Race to compete. The first race uses the same displayed odds and simulation as every later race." },
  { step: "Race result", description: "Every result earns Rep. Wins and stronger finishes earn Scrap Bucks; a low finish can pay no prize money." },
  { step: "Repair", description: "Racing wears out your vehicle. Repair it in the Garage to keep condition up; the first guided repair is free." },
  { step: "Upgrade your run", description: "Open Workshop > Facilities and buy a run upgrade such as Keen Eye or Budget Repairs." },
  { step: "Explore the Workshop", description: "Review Inventory, Fabrication, Add-ons, Dealer, Stations, Philosophy, Skills, and Facilities." },
  { step: "Build an early runway", description: "Reach $500 lifetime Scrap Bucks and 100 Rep by racing, scavenging, and selling spare parts." },
  { step: "Expand the garage", description: `Keep ${SCRAP_RESET_REQUIREMENTS.vehiclesBuilt} built vehicles in your Garage at the same time.` },
  { step: "Reach the reset gate", description: `Earn $${SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks.toLocaleString()} lifetime Scrap Bucks and ${SCRAP_RESET_REQUIREMENTS.reputation.toLocaleString()} Rep. Watch fatigue — it builds as you race and cuts performance.` },
  { step: "Visit Upgrades", description: "Open the Upgrades tab when fatigue is high or progress stalls." },
  { step: "Prestige", description: "Hit Scrap Reset to prestige. You restart stronger with permanent bonuses." },
];

// ── Glossary ────────────────────────────────────────────────────────────────

export const HELP_GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Scrap Bucks", meaning: "Primary currency. Earned from races and selling parts. Spent on building, repairs, facilities, and station equipment." },
  { term: "Rep", meaning: "Progression currency from races. Unlocks locations, circuits, vehicles, the Dealer, and late-game systems." },
  { term: "Fatigue", meaning: "Follows a diminishing race-count curve (0–99). Costs -0.5% performance, +0.8% wear, and +1% repair cost per point. Resets on Scrap Reset." },
  { term: "Condition", meaning: `Part quality from ${CONDITIONS[0]} (worst) to ${CONDITIONS[CONDITIONS.length - 1]} (best). Higher = more power and sale value.` },
  { term: "Prestige (Scrap Reset)", meaning: "Voluntary reset that wipes run currency, parts, and vehicles but awards Legacy Points. Station equipment, discoveries, and legacy upgrades persist." },
  { term: "Legacy Points (LP)", meaning: "Earned on Scrap Reset based on run stats. Spent on permanent upgrades and Garage Philosophy nodes." },
  { term: "Momentum", meaning: `${MOMENTUM_TIERS.length} conditional bonuses that activate during a run (e.g., "${MOMENTUM_TIERS[0].name}" at ${MOMENTUM_TIERS[0].condition.value}+ races). Reset on prestige.` },
  { term: "Forge Tokens", meaning: "Rare drop from high-tier race wins (~2%). Used with materials in the Artifact Forge for top-tier parts." },
  { term: "Dealer Board", meaning: `Rotating part market unlocking at ${DEALER_UNLOCK_REP.toLocaleString()} Rep. ${DEALER_BOARD_SIZE} listings, refreshes every ${DEALER_REFRESH_INTERVAL} ticks.` },
  { term: "DNF (Did Not Finish)", meaning: "Vehicle broke down mid-race. Baseline chance is 30% minus reliability/200, then equipment, crew, skills, philosophy, and the race plan modify it." },
  { term: "Win Streak", meaning: "Consecutive race wins. Longer streaks improve station-equipment drop rarity by +0.5% per win (cap +10%)." },
  { term: "Vehicle Condition", meaning: `Starts at 100, degrades from racing. Below ${CONDITION_PENALTY_THRESHOLD}, stats drop linearly. Repair in the Garage.` },
  { term: "Materials", meaning: `${MATERIAL_DEFINITIONS.length} types gained by decomposing parts. Used for part enhancement and targeted fabrication.` },
  { term: "Station Equipment", meaning: "Randomized equipment for six shared garage stations. It has rarity, attribute affixes, enhancement levels, and optional set membership." },
  { term: "Reforge Shards", meaning: "Earned by salvaging unequipped station items. Spent to reroll secondary attributes while preserving the primary." },
  { term: "Auto-Scavenge", meaning: `Unlocks after ${AUTO_SCAVENGE_MANUAL_TARGET} manual scavenges or the first Scrap Reset, then stays unlocked. Runs automatically each tick.` },
  { term: "Auto-Race", meaning: "Unlocks after the first Scrap Reset. Fires on a timer (improved by the Pit Crew facility upgrade)." },
  { term: "Race Control", meaning: "After the first Scrap Reset, every 10 settled races stocks at most one optional call for a manual race. Auto and offline races never pause for or consume it." },
  { term: "Challenges", meaning: `${CHALLENGE_DEFINITIONS.length} one-time gameplay goals rewarding Scrap Bucks, materials, and Forge Tokens.` },
  { term: "Crafting", meaning: "Spend materials to produce random parts. Unlocked via Workshop upgrade. Higher recipes = better conditions." },
  { term: "Team Points (TP)", meaning: "Layer 2 currency earned from Team Reset. Spent on crew, fleet capacity, and team infrastructure." },
  { term: "Owner Points (OP)", meaning: "Layer 3 currency earned from Owner Reset. Spent on facilities, sourcing, and advanced engineering capability." },
  { term: "Track Prestige Tokens (PT)", meaning: "Layer 4 currency earned from Track Reset. Spent on venue, event, and endgame fleet perks." },
  { term: "Crew", meaning: "NPC helpers unlocked after the first Team Reset. Four roles (Mechanic, Scout, Driver, Trader) have distinct specializations. Crew persist through Scrap Resets and reset on Team Reset." },
  { term: "Racer Skills", meaning: `${SKILL_DEFINITIONS.length} XP-based skills (${SKILL_DEFINITIONS.map(s => s.name).join(", ")}). Max level ${MAX_SKILL_LEVEL}. Rating converts to effectiveness with diminishing returns at higher tiers.` },
  { term: "Offline Progress", meaning: `The game continues scavenging and racing while closed (capped at 8 hours). Catch-up uses at most one tick per ${OFFLINE_TICK_MS_MIN / 1_000} second of elapsed time. Up to ${OFFLINE_LOOSE_INVENTORY_LIMIT} loose parts and ${STATION_EQUIPMENT_INVENTORY_LIMIT} station items are kept; overflow is converted at normal sale or salvage value and itemized in the return summary.` },
  { term: "Achievement", meaning: "Lifetime milestone that grants permanent bonuses. Tracked across all resets. View in Upgrades > Trophies." },
  { term: "Prestige Milestone", meaning: "Free reward earned at prestige count thresholds. Some shape your run strategy. View in Upgrades > Prestige." },
  { term: "Garage Philosophy", meaning: "LP-funded specialization in Scrapper, Racer, and Engineer paths. Persists through Scrap Reset and resets at the Team layer." },
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
    answer: "You keep Legacy Points, legacy upgrades, Garage Philosophy, station equipment, discoveries, crew, and achievements. You reset run cash, Rep, inventory, vehicles, circuit progress, fatigue, and run goals.",
  },
  {
    question: "How do I unlock the Dealer?",
    answer: `Earn ${DEALER_UNLOCK_REP.toLocaleString()} Rep. The Dealer shows ${DEALER_BOARD_SIZE} rotating part listings. Stock improves at ${DEALER_TIER2_REP.toLocaleString()} Rep (better conditions and parts through T2) and ${DEALER_TIER3_REP.toLocaleString()} Rep (parts through T4).`,
  },
  {
    question: "How does fatigue work?",
    answer: "Fatigue follows floor(25 × log2(1 + effective races / 100)), capped at 99; it does not rise by one every race. Each point: -0.5% race performance, +0.8% vehicle wear, +1% repair cost. It resets to 0 on Scrap Reset, and Iron Will subtracts races before the curve is evaluated. Momentum bonuses reward pushing through fatigue — Deep Run (+50% LP at 60 fatigue) and Legendary Run (+100% LP at 80).",
  },
  {
    question: "Should I sell or decompose parts?",
    answer: "Sell if you need Scrap Bucks for builds or facilities. Decompose if you need materials for part enhancement or fabrication. High-condition parts yield more materials, so compare the opportunity cost first.",
  },
  {
    question: "What are Team, Owner, and Track resets?",
    answer: "These are responsibility layers beyond Scrap Reset. Team Reset exchanges lower-layer progress for Team Points and opens crew and fleet programs. Owner Reset exchanges Team progress for Owner Points and opens facilities and supply chains. Track Reset exchanges Owner progress for Prestige Tokens and opens venue configuration and hosted events. Each layer has an explicit retention contract and clears the layers below it.",
  },
  {
    question: "How does the crew system work?",
    answer: "Crew unlocks after your first Team Reset. You recruit NPC members in 4 roles: Mechanic (-build/repair costs), Scout (+scavenge luck/yield), Driver (+race performance/-DNF), and Trader (+sell value/-dealer prices). Each role has 2 specializations. Crew gain XP from their activities and from fleet programs. They persist through Scrap Resets and reset on Team Reset.",
  },
  {
    question: "How do racer skills work?",
    answer: "Skills (Driving, Mechanics, Scavenging, Endurance) earn XP from matching gameplay actions and level up automatically (max level 20). Each level adds rating points that convert to effectiveness with diminishing returns at higher content tiers. Review current levels and bonuses in Workshop > Skills.",
  },
  {
    question: "What's the difference between challenges and achievements?",
    answer: "Challenges are one-time gameplay goals that award immediate resources such as materials and Forge Tokens. Achievements are lifetime milestones whose titles or permanent bonuses persist through all resets.",
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
    answer: "Garage Philosophy resets on Team Reset, giving you a natural respec opportunity each era. You can also manually respec for a 50% LP refund.",
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
    id: "build_direction_circuit_fit",
    title: "Build direction and circuit fit",
    advice: [
      "Build direction compares the installed hardware at full vehicle condition with the same blueprint using average Good-condition required parts and no add-ons.",
      "Redline Special, Cornering Rig, and Finish-First labels describe a clear pace, handling, or reliability lead; the label itself grants no bonus.",
      "Circuit fit continuously compares those three real build indices with circuit power, handling, and reliability demands, adjusting performance by at most 5%.",
      "Fuel, tires, gearing, aero, suspension, aggression, and pits remain race-plan setup decisions. Reliability and setup still determine DNF risk and wear.",
    ],
  },
  {
    id: "race_control_calls",
    title: "When should I use Race Control?",
    advice: [
      "A call is earned after 10 settled races following the first Scrap Reset, and only one can be stored.",
      "Attack adds up to 4% pace but raises DNF risk and wear; Protect lowers DNF risk and wear but gives up pace.",
      "Review the contextual forecast before confirming. Follow standing order is the neutral choice, and Save call for later keeps the opportunity.",
      "Calls affect one manual race only. They never multiply rewards, entry fees, salvage, rival rewards, Forge Tokens, or auto/offline racing.",
    ],
  },
  {
    id: "prestige_timing",
    title: "When should I prestige?",
    advice: [
      "Push to at least 60 fatigue to unlock Deep Run (+50% Legacy Points).",
      "Pushing to 80 fatigue triggers Legendary Run (+100% LP) — worth it if you can still win races.",
      "Prestige when your win chance drops below ~30% on your target circuit.",
      "First few prestiges: prioritize Scrap Magnate and Street Cred for the fastest snowball.",
    ],
  },
  {
    id: "garage_philosophy",
    title: "Which Garage Philosophy path should I pick?",
    advice: [
      "Scrapper improves discovery, salvage yield, and selling.",
      "Racer improves race cadence, fatigue management, and winnings.",
      "Engineer improves builds, repair, fabrication, and materials.",
      "Choose around the current garage bottleneck; the paths explain tradeoffs without prescribing one optimum.",
    ],
  },
  {
    id: "legacy_priority",
    title: "Legacy upgrade priority",
    advice: [
      "Tier 1: Scrap Magnate (+20% race prize Scrap/level) and Street Cred (+15% race Rep/level) — best early ROI.",
      "Tier 2: Iron Will (delays fatigue curve by 5 races/level) — lets you push deeper runs.",
      "Tier 3: Seed Money (start with extra scrap) and Born Lucky (+2% luck/level).",
      "Late: Blueprint Memory keeps workshop upgrades, while Old Haunts skips early locations and circuits.",
    ],
  },
  {
    id: "dnf_reduction",
    title: "How to reduce DNF",
    advice: [
      "Baseline DNF chance is 30% minus (reliability ÷ 200). With a neutral plan, 60 reliability reaches 0%; aggressive plans can add risk.",
      "Use higher-condition parts — they add more reliability.",
      "Equip Diagnostics, Lift, or Slipstream station equipment with Instinct or Aero.",
      "Use the race forecast to see whether reliability or setup is driving the risk.",
    ],
  },
  {
    id: "station_enhance",
    title: "Station equipment priority",
    advice: [
      "Enhance equipment whose attributes address a real garage or preparation bottleneck.",
      "Set pieces may be worth keeping even when an individual affix is slightly weaker.",
      "Reforge a strong primary when the secondary attributes do not suit the station.",
      "Salvage unused spares for shards rather than hoarding every roll.",
    ],
  },
  {
    id: "workshop_order",
    title: "Workshop unlock order",
    advice: [
      "Start: Toolkit (unlock part swapping) → Bargain Builder (cheaper builds).",
      "Early: Budget Repairs → Keen Eye (scavenge luck) → Deep Pockets (extra parts).",
      "Mid: Consolation Sponsor (scrap from losses) → Reinforced Chassis (less wear).",
      "Late: station forging, targeted sourcing, and equipment enhancement facilities.",
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
    title: "Garage Philosophy",
    advice: [
      "Scrapper accelerates discovery and salvage. Racer emphasizes race cadence and winnings. Engineer strengthens building and fabrication. You can invest in all three, but T2 branches force a choice.",
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

// Challenges
function formatReward(r: { type: string; amount?: number; material?: string }): string {
  switch (r.type) {
    case "forgeToken": return `${r.amount} Forge Token${(r.amount ?? 0) > 1 ? "s" : ""}`;
    case "material": return `${r.amount} ${r.material}`;
    case "scrap": return `${r.amount} Scrap`;
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
  gear: GARAGE_STATIONS.length,
  gearSlots: GARAGE_STATIONS.length,
  materials: MATERIAL_DEFINITIONS.length,
  challenges: CHALLENGE_DEFINITIONS.length,
  craftRecipes: CRAFT_RECIPES.length,
  highestPartTier: Math.max(...PART_DEFINITIONS.map((p) => p.minTier)),
  talentTrees: PLAYSTYLE_PATHS.length,
  talentNodes: PLAYSTYLE_NODE_DEFINITIONS.length,
  legacyUpgrades: LEGACY_UPGRADE_DEFINITIONS.length,
  momentumTiers: MOMENTUM_TIERS.length,
};

// Racer Skills & Attributes
export { SKILL_DEFINITIONS, MAX_SKILL_LEVEL, RATING_PER_LEVEL };

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
  crewRoles: CREW_ROLES.length,
};
