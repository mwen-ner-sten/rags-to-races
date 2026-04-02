import { CONDITIONS, CORE_SLOTS, CONDITION_MULTIPLIERS, PART_DEFINITIONS } from "@/data/parts";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { GEAR_DEFINITIONS } from "@/data/gear";
import { MATERIAL_DEFINITIONS } from "@/data/materials";
import { CHALLENGE_DEFINITIONS } from "@/data/challenges";
import { DEALER_UNLOCK_REP } from "@/data/dealer";

// ── Derived stats (auto-synced from game data) ─────────────────────────────

const PARTS_BY_CATEGORY = CORE_SLOTS.map((slot) => ({
  category: slot,
  count: PART_DEFINITIONS.filter((part) => part.category === slot).length,
}));

const highestPartTier = Math.max(...PART_DEFINITIONS.map((part) => part.minTier));
const highestVehicleTier = Math.max(...VEHICLE_DEFINITIONS.map((vehicle) => vehicle.tier));

const upgradeCategoryCounts = UPGRADE_DEFINITIONS.reduce<Record<string, number>>((acc, upgrade) => {
  acc[upgrade.category] = (acc[upgrade.category] ?? 0) + 1;
  return acc;
}, {});

const gearSlotCounts = GEAR_DEFINITIONS.reduce<Record<string, number>>((acc, gear) => {
  acc[gear.slot] = (acc[gear.slot] ?? 0) + 1;
  return acc;
}, {});

// ── How to Play ─────────────────────────────────────────────────────────────

export const HELP_OVERVIEW_STEPS: string[] = [
  "Scavenge parts in the Junkyard — each location drops different tiers and rarities.",
  "Head to the Garage to build a vehicle. Fill the required slots (engine, wheel, etc.) and pay the build cost.",
  "Race your vehicle on circuits to earn Scrap Bucks and Rep. Higher-tier circuits pay more but are harder.",
  "Sell junk parts or decompose them into materials for crafting and gear enhancement.",
  "Upgrade your Workshop for permanent bonuses — faster auto-race, better luck, cheaper builds.",
  "Equip and enhance gear in the Locker. Loot gear drops from races and can be modded.",
  "When fatigue climbs and progress slows, Prestige in the Shop to reset your run for Legacy Points.",
  "Spend Legacy Points on permanent upgrades and talent nodes that compound every future run.",
];

// ── Glossary ────────────────────────────────────────────────────────────────

export const HELP_GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Scrap Bucks", meaning: "Primary currency. Earned from races and selling parts. Used for building, repairs, upgrades, and purchases." },
  { term: "Rep", meaning: "Progression currency earned from races. Unlocks locations, circuits, vehicles, and late-game systems like the Dealer." },
  { term: "Fatigue", meaning: "Builds every race (0–99). Penalizes scavenge luck, race performance, and costs by 0.5% per point. Resets on prestige." },
  { term: "Condition", meaning: "Part quality from Rusted (worst) to Artifact (best). Higher condition = more power, reliability, and sale value." },
  { term: "Prestige", meaning: "Voluntary reset that wipes your run but awards Legacy Points. Gear, legacy upgrades, and talent nodes persist." },
  { term: "Legacy Points (LP)", meaning: "Earned on prestige based on run stats. Spent on permanent upgrades and talent nodes between runs." },
  { term: "Momentum", meaning: "Conditional bonuses that activate during a run (e.g., +10% scrap after 30 races). Resets on prestige." },
  { term: "Forge Tokens", meaning: "Rare drop from high-tier races (~2% chance). Used with materials in the Artifact Forge to craft top-tier parts." },
  { term: "Dealer Board", meaning: `Rotating part market that unlocks at ${(DEALER_UNLOCK_REP / 1000).toFixed(0)}k Rep. Refreshes periodically with curated parts.` },
  { term: "Win Streak", meaning: "Consecutive race wins. Longer streaks improve loot gear drop quality." },
  { term: "DNF", meaning: "Did Not Finish — your vehicle broke down mid-race. Higher reliability reduces DNF chance." },
  { term: "Materials", meaning: "Gained by decomposing parts. Used for crafting recipes and gear enhancement." },
  { term: "Loot Gear", meaning: "Randomized gear dropped from races. Has rarity tiers, enhancement levels, and mod slots." },
];

// ── System Guides ───────────────────────────────────────────────────────────

export interface SystemGuide {
  id: string;
  title: string;
  icon: string;
  tips: string[];
}

export const HELP_SYSTEM_GUIDES: SystemGuide[] = [
  {
    id: "junkyard",
    title: "Junkyard",
    icon: "🗑️",
    tips: [
      "Each location has a tier that determines the quality of parts you can find.",
      "Higher-tier locations cost Rep to unlock but drop better parts.",
      "Fatigue reduces scavenge luck — prestige to reset it.",
      "After 100 manual scavenges, auto-scavenge kicks in automatically.",
      "The \"Keen Eye\" workshop upgrade boosts luck; \"Deep Pockets\" adds extra parts per scavenge.",
    ],
  },
  {
    id: "garage",
    title: "Garage",
    icon: "🔧",
    tips: [
      `Vehicles have ${CORE_SLOTS.length} core slots: ${CORE_SLOTS.join(", ")}.`,
      "Speed, handling, reliability, and weight are calculated from equipped parts.",
      "Vehicle condition starts at 100 and degrades from racing. Below 50, stats drop sharply.",
      "Repair costs scale with vehicle tier — keep cheap vehicles for early runs.",
      "You can swap parts freely once you unlock the Toolkit workshop upgrade.",
    ],
  },
  {
    id: "race",
    title: "Race Track",
    icon: "🏁",
    tips: [
      "Win chance = your performance vs. circuit difficulty, capped between 5% and 95%.",
      "DNF chance drops with higher reliability and certain gear/talent bonuses.",
      "Winning has a 15% chance to drop a salvage part from the circuit.",
      "Auto-race unlocks at 30 Rep and fires automatically on a timer.",
      "The \"Pit Crew\" upgrade makes auto-race fire faster.",
    ],
  },
  {
    id: "workshop",
    title: "Workshop",
    icon: "⚙️",
    tips: [
      `${UPGRADE_DEFINITIONS.length} upgrades across ${Object.keys(upgradeCategoryCounts).length} categories: scavenging, building, racing, maintenance, and gear lab.`,
      "Most upgrades have multiple levels with escalating costs.",
      "Crafting unlocks at ~15k Rep — spend materials to produce random parts.",
      "Materials come from decomposing parts (each part category yields specific material types).",
      "Workshop levels persist through prestige.",
    ],
  },
  {
    id: "locker",
    title: "Locker",
    icon: "🎒",
    tips: [
      `${GEAR_DEFINITIONS.length} gear items across ${Object.keys(gearSlotCounts).length} slots: head, body, hands, feet, tool, accessory.`,
      "Standard gear is bought with Scrap Bucks; loot gear drops from races.",
      "Loot gear has rarity tiers (common → legendary) and mod slots that unlock with enhancement.",
      "Enhancement costs materials and unlocks new mod slots at levels 3 and 7.",
      "All gear persists through prestige — invest early for compounding returns.",
    ],
  },
  {
    id: "prestige",
    title: "Prestige & Legacy",
    icon: "♻️",
    tips: [
      "Prestige resets: currency, inventory, vehicles, fatigue, race history, and momentum.",
      "Prestige keeps: gear, legacy upgrades, talent nodes, loot gear, and workshop levels.",
      "LP earned scales with lifetime scrap, total races, highest circuit tier, and fatigue.",
      "Legacy upgrades give +10% per level to scrap, rep, starting resources, and more.",
      "Talent nodes (3 trees: Race Driver, Wrench Jockey, Scrap Hunter) give permanent build identity.",
      "Momentum bonuses stack during a run — hitting 80 fatigue unlocks the best tier (+100% LP).",
    ],
  },
];

// ── Live Data Snapshot ──────────────────────────────────────────────────────

export const HELP_SYNC_FACTS: string[] = [
  `${LOCATION_DEFINITIONS.length} scavenging locations (max tier ${Math.max(...LOCATION_DEFINITIONS.map((l) => l.tier))}).`,
  `${CIRCUIT_DEFINITIONS.length} race circuits (max tier ${Math.max(...CIRCUIT_DEFINITIONS.map((c) => c.tier))}).`,
  `${VEHICLE_DEFINITIONS.length} vehicle blueprints (max tier ${highestVehicleTier}).`,
  `${PART_DEFINITIONS.length} part definitions across ${CORE_SLOTS.length} core slot categories.`,
  `${UPGRADE_DEFINITIONS.length} workshop upgrades across ${Object.keys(upgradeCategoryCounts).length} categories.`,
  `${GEAR_DEFINITIONS.length} gear items across ${Object.keys(gearSlotCounts).length} slots.`,
  `${MATERIAL_DEFINITIONS.length} salvage material types and ${CHALLENGE_DEFINITIONS.length} challenges.`,
];

// ── Reference Tables ────────────────────────────────────────────────────────

export const HELP_SYSTEM_DETAILS = {
  partsByCategory: PARTS_BY_CATEGORY,
  conditions: CONDITIONS.map((condition) => ({
    id: condition,
    multiplier: CONDITION_MULTIPLIERS[condition],
  })),
  locations: LOCATION_DEFINITIONS.map((location) => ({
    id: location.id,
    name: location.name,
    tier: location.tier,
    unlockCost: location.unlockCost,
    maxPartsPerScavenge: location.maxPartsPerScavenge,
  })),
  circuits: CIRCUIT_DEFINITIONS.map((circuit) => ({
    id: circuit.id,
    name: circuit.name,
    tier: circuit.tier,
    difficulty: circuit.difficulty,
    entryFee: circuit.entryFee,
    rewardBase: circuit.rewardBase,
    repReward: circuit.repReward,
  })),
  progression: {
    highestPartTier,
    dealerUnlockRep: DEALER_UNLOCK_REP,
  },
};
