import type { MaterialType } from "./materials";

export type ChallengeRewardType =
  | { type: "forgeToken"; amount: number }
  | { type: "material"; material: MaterialType; amount: number }
  | { type: "scrap"; amount: number }
  | { type: "dealerRefresh" };

export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  /** The stat key tracked in activeChallengeProgress */
  trackingKey: string;
  /** Target value to complete the challenge */
  target: number;
  rewards: ChallengeRewardType[];
  /** Flavor text shown on completion */
  completionText: string;
  /** Whether this challenge can be repeated (false = one-time) */
  repeatable: boolean;
}

export const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  // ── First steps ──────────────────────────────────────────────────────────────
  {
    id: "first_decompose",
    name: "Back to Basics",
    description: "Decompose your first part.",
    trackingKey: "totalDecomposed",
    target: 1,
    rewards: [{ type: "material", material: "metalScrap", amount: 5 }],
    completionText: "So that's where the smell comes from.",
    repeatable: false,
  },
  {
    id: "decompose_50",
    name: "Scrap Archaeologist",
    description: "Decompose 50 parts total.",
    trackingKey: "totalDecomposed",
    target: 50,
    rewards: [
      { type: "material", material: "heatCore", amount: 20 },
      { type: "material", material: "metalScrap", amount: 15 },
    ],
    completionText: "You've turned a landfill into a supply chain.",
    repeatable: false,
  },
  {
    id: "decompose_200",
    name: "Industrial Recycler",
    description: "Decompose 200 parts total.",
    trackingKey: "totalDecomposed",
    target: 200,
    rewards: [
      { type: "forgeToken", amount: 1 },
      { type: "material", material: "carbonDust", amount: 10 },
    ],
    completionText: "Nothing wasted. Everything repurposed.",
    repeatable: false,
  },

  // ── Win streaks ──────────────────────────────────────────────────────────────
  {
    id: "streak_5",
    name: "On a Roll",
    description: "Win 5 races in a row.",
    trackingKey: "winStreak",
    target: 5,
    rewards: [{ type: "forgeToken", amount: 1 }],
    completionText: "They're not even checking the engine block anymore.",
    repeatable: false,
  },
  {
    id: "streak_10",
    name: "Unstoppable",
    description: "Win 10 races in a row.",
    trackingKey: "winStreak",
    target: 10,
    rewards: [
      { type: "forgeToken", amount: 2 },
      { type: "material", material: "circuitFragment", amount: 15 },
    ],
    completionText: "They built a trophy for you. It's also made of scrap.",
    repeatable: false,
  },

  // ── Enhancement milestones ───────────────────────────────────────────────────
  {
    id: "first_enhance",
    name: "Tuned Up",
    description: "Enhance any part to Pristine or better.",
    trackingKey: "totalEnhanced",
    target: 1,
    rewards: [{ type: "material", material: "heatCore", amount: 10 }],
    completionText: "It's not just rust and prayers anymore.",
    repeatable: false,
  },
  {
    id: "first_legendary",
    name: "Beyond the Blueprint",
    description: "Enhance any part to Legendary.",
    trackingKey: "highestConditionReached",
    target: 6, // legendary = index 6
    rewards: [
      { type: "forgeToken", amount: 1 },
      { type: "dealerRefresh" },
    ],
    completionText: "A trash-heap part with a legendary soul. Beautiful.",
    repeatable: false,
  },
  {
    id: "first_mythic",
    name: "Transcendent",
    description: "Enhance any part to Mythic.",
    trackingKey: "highestConditionReached",
    target: 7, // mythic = index 7
    rewards: [
      { type: "forgeToken", amount: 3 },
      { type: "material", material: "carbonDust", amount: 25 },
    ],
    completionText: "This part should not exist. And yet.",
    repeatable: false,
  },

  // ── Fatigue endurance ────────────────────────────────────────────────────────
  {
    id: "fatigue_50",
    name: "Running on Fumes",
    description: "Reach 50 fatigue without prestiging.",
    trackingKey: "fatigue",
    target: 50,
    rewards: [
      { type: "material", material: "circuitFragment", amount: 5 },
      { type: "forgeToken", amount: 2 },
    ],
    completionText: "You're exhausted. The car is worse. You're still racing.",
    repeatable: false,
  },
  {
    id: "fatigue_80",
    name: "Absolute Wreck",
    description: "Reach 80 fatigue without prestiging.",
    trackingKey: "fatigue",
    target: 80,
    rewards: [
      { type: "forgeToken", amount: 3 },
      { type: "scrap", amount: 2000 },
    ],
    completionText: "Everything hurts. The parts are barely holding. You still showed up.",
    repeatable: false,
  },

  // ── Race totals ───────────────────────────────────────────────────────────────
  {
    id: "races_25",
    name: "Track Rat",
    description: "Complete 25 races this run.",
    trackingKey: "lifetimeRaces",
    target: 25,
    rewards: [{ type: "material", material: "rubberCompound", amount: 10 }],
    completionText: "The circuit knows your name. Not for good reasons.",
    repeatable: false,
  },
  {
    id: "races_100",
    name: "Veteran",
    description: "Complete 100 races this run.",
    trackingKey: "lifetimeRaces",
    target: 100,
    rewards: [
      { type: "forgeToken", amount: 1 },
      { type: "material", material: "greaseSludge", amount: 20 },
    ],
    completionText: "100 races in a car made of garbage. Respect.",
    repeatable: false,
  },

  // ── Prestige-persistent ───────────────────────────────────────────────────────
  {
    id: "prestige_first",
    name: "Born Again",
    description: "Prestige for the first time.",
    trackingKey: "prestigeCount",
    target: 1,
    rewards: [{ type: "forgeToken", amount: 1 }],
    completionText: "Back to nothing. But smarter this time.",
    repeatable: false,
  },
  {
    id: "prestige_3",
    name: "Cycle Master",
    description: "Prestige 3 times.",
    trackingKey: "prestigeCount",
    target: 3,
    rewards: [
      { type: "forgeToken", amount: 3 },
      { type: "material", material: "carbonDust", amount: 20 },
    ],
    completionText: "Three lives in. The garage still smells like motor oil.",
    repeatable: false,
  },

  // ── Trade-up ──────────────────────────────────────────────────────────────────
  {
    id: "first_tradeup",
    name: "Parts Alchemist",
    description: "Perform your first trade-up.",
    trackingKey: "totalTradeUps",
    target: 1,
    rewards: [{ type: "material", material: "metalScrap", amount: 10 }],
    completionText: "Three mediocre things make one decent thing.",
    repeatable: false,
  },

  // ── Circuit salvage ───────────────────────────────────────────────────────────
  {
    id: "salvage_10",
    name: "Scrapyard Racer",
    description: "Salvage 10 parts from race wreckage.",
    trackingKey: "totalRaceSalvage",
    target: 10,
    rewards: [
      { type: "material", material: "rubberCompound", amount: 8 },
      { type: "material", material: "metalScrap", amount: 8 },
    ],
    completionText: "You race to win AND to loot. Efficient.",
    repeatable: false,
  },
];

export function getChallengeById(id: string): ChallengeDefinition | undefined {
  return CHALLENGE_DEFINITIONS.find((c) => c.id === id);
}

/** Progress keys that are cumulative (max value, not increment) */
export const SNAPSHOT_TRACKING_KEYS = new Set(["winStreak", "fatigue", "fatigue", "highestConditionReached", "prestigeCount"]);
