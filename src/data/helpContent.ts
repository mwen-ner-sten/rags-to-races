import { CONDITIONS, CORE_SLOTS, CONDITION_MULTIPLIERS, PART_DEFINITIONS } from "@/data/parts";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { GEAR_DEFINITIONS } from "@/data/gear";
import { MATERIAL_DEFINITIONS } from "@/data/materials";
import { CHALLENGE_DEFINITIONS } from "@/data/challenges";
import { DEALER_UNLOCK_REP } from "@/data/dealer";

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

export const HELP_OVERVIEW_STEPS: string[] = [
  "Scavenge parts in the Junkyard to fill your inventory.",
  "Use Garage to build a vehicle by filling required slots with compatible parts.",
  "Race to earn Scrap Bucks + Rep, then unlock harder circuits and stronger locations.",
  "Invest in Workshop upgrades, gear, and crafting systems to improve long-term runs.",
  "Prestige when progress slows to reset your run for permanent bonus scaling.",
];

export const HELP_GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Scrap Bucks", meaning: "Main money currency. Used for building, repairs, race fees, and many purchases." },
  { term: "Rep", meaning: "Progression currency. Unlocks locations, circuits, and high-tier progression systems." },
  { term: "Prestige", meaning: "Run reset that grants long-term power scaling and keeps key meta-progression systems." },
  { term: "Fatigue", meaning: "Run-aging mechanic (0-99) that increases during racing and makes progression less efficient." },
  { term: "Condition", meaning: "Part quality tier. Better condition scales power/reliability and usually sale value." },
  { term: "Forge Tokens", meaning: "Rare currency used by Artifact Forge for Mythic → Artifact upgrades." },
  { term: "Dealer Board", meaning: "Rotating market that unlocks at high Rep and offers direct part purchases." },
];

export const HELP_SYNC_FACTS: string[] = [
  `${LOCATION_DEFINITIONS.length} scavenging locations (max tier ${Math.max(...LOCATION_DEFINITIONS.map((l) => l.tier))}).`,
  `${CIRCUIT_DEFINITIONS.length} race circuits (max tier ${Math.max(...CIRCUIT_DEFINITIONS.map((c) => c.tier))}).`,
  `${VEHICLE_DEFINITIONS.length} vehicle blueprints (max tier ${highestVehicleTier}).`,
  `${PART_DEFINITIONS.length} part definitions across ${CORE_SLOTS.length} core slot categories (+ misc).`,
  `${UPGRADE_DEFINITIONS.length} workshop upgrades across ${Object.keys(upgradeCategoryCounts).length} categories.`,
  `${GEAR_DEFINITIONS.length} gear items across ${Object.keys(gearSlotCounts).length} slots.`,
  `${MATERIAL_DEFINITIONS.length} salvage material types and ${CHALLENGE_DEFINITIONS.length} challenge definitions.`,
];

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
