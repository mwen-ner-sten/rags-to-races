export type PlaystylePath = "scrapper" | "speedster" | "engineer";

export interface PlaystyleNodeDefinition {
  id: string;
  path: PlaystylePath;
  name: string;
  description: string;
  tier: number; // 1-4
  lpCost: number;
  prerequisiteNodeId?: string;
  mutuallyExclusiveWith?: string; // can't have both
  /**
   * If set, the player must have at least one unlocked node at this tier
   * in the same path before they can unlock this node.
   * Used for T4 capstones that accept either T3 branch.
   */
  prerequisiteTier?: number;
  effect: { type: string; value: number };
}

// ── Path metadata ────────────────────────────────────────────────────────────

export const PLAYSTYLE_PATHS: {
  id: PlaystylePath;
  name: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "scrapper",
    name: "Scrapper",
    description:
      "Master of junk. Better scavenging, more parts, higher sell values.",
    icon: "magnifying glass",
  },
  {
    id: "speedster",
    name: "Speedster",
    description:
      "Born to race. Faster runs, less fatigue, bigger winnings.",
    icon: "racing flag",
  },
  {
    id: "engineer",
    name: "Engineer",
    description:
      "Workshop genius. Better builds, cheaper upgrades, superior materials.",
    icon: "wrench",
  },
];

// ── Scrapper Path (scavenge focus) ──────────────────────────────────────────

const PS_SCRAP_T1: PlaystyleNodeDefinition = {
  id: "ps_scrap_t1",
  path: "scrapper",
  name: "Keen Nose",
  description: "+10% scavenge luck.",
  tier: 1,
  lpCost: 8,
  effect: { type: "scavenge_luck_bonus", value: 0.1 },
};

const PS_SCRAP_T2A: PlaystyleNodeDefinition = {
  id: "ps_scrap_t2a",
  path: "scrapper",
  name: "Treasure Hunter",
  description: "+50% chance of higher-tier parts.",
  tier: 2,
  lpCost: 15,
  prerequisiteNodeId: "ps_scrap_t1",
  mutuallyExclusiveWith: "ps_scrap_t2b",
  effect: { type: "scavenge_quality_bonus", value: 0.5 },
};

const PS_SCRAP_T2B: PlaystyleNodeDefinition = {
  id: "ps_scrap_t2b",
  path: "scrapper",
  name: "Bulk Hauler",
  description: "+40% scavenge yield (extra parts).",
  tier: 2,
  lpCost: 15,
  prerequisiteNodeId: "ps_scrap_t1",
  mutuallyExclusiveWith: "ps_scrap_t2a",
  effect: { type: "scavenge_yield_mult", value: 0.4 },
};

const PS_SCRAP_T3A: PlaystyleNodeDefinition = {
  id: "ps_scrap_t3a",
  path: "scrapper",
  name: "Eagle Eye",
  description: "+20% luck, parts sell for 30% more.",
  tier: 3,
  lpCost: 30,
  prerequisiteNodeId: "ps_scrap_t2a",
  effect: { type: "scavenge_luck_and_sell", value: 0.2 },
};

const PS_SCRAP_T3B: PlaystyleNodeDefinition = {
  id: "ps_scrap_t3b",
  path: "scrapper",
  name: "Strip Mine",
  description: "+60% yield, +25% material from decompose.",
  tier: 3,
  lpCost: 30,
  prerequisiteNodeId: "ps_scrap_t2b",
  effect: { type: "scavenge_yield_and_material", value: 0.6 },
};

const PS_SCRAP_T4: PlaystyleNodeDefinition = {
  id: "ps_scrap_t4",
  path: "scrapper",
  name: "Junkyard King",
  description: "All scavenge bonuses doubled, auto-decompose junk.",
  tier: 4,
  lpCost: 60,
  prerequisiteTier: 3,
  effect: { type: "scavenge_capstone", value: 2 },
};

// ── Speedster Path (racing focus) ───────────────────────────────────────────

const PS_SPEED_T1: PlaystyleNodeDefinition = {
  id: "ps_speed_t1",
  path: "speedster",
  name: "Rev Head",
  description: "+10% race performance.",
  tier: 1,
  lpCost: 8,
  effect: { type: "race_performance_bonus", value: 0.1 },
};

const PS_SPEED_T2A: PlaystyleNodeDefinition = {
  id: "ps_speed_t2a",
  path: "speedster",
  name: "Adrenaline Rush",
  description: "+25% race scrap + rep on wins.",
  tier: 2,
  lpCost: 15,
  prerequisiteNodeId: "ps_speed_t1",
  mutuallyExclusiveWith: "ps_speed_t2b",
  effect: { type: "race_reward_bonus", value: 0.25 },
};

const PS_SPEED_T2B: PlaystyleNodeDefinition = {
  id: "ps_speed_t2b",
  path: "speedster",
  name: "Iron Constitution",
  description: "-30% fatigue gain per race.",
  tier: 2,
  lpCost: 15,
  prerequisiteNodeId: "ps_speed_t1",
  mutuallyExclusiveWith: "ps_speed_t2a",
  effect: { type: "fatigue_reduction", value: 0.3 },
};

const PS_SPEED_T3A: PlaystyleNodeDefinition = {
  id: "ps_speed_t3a",
  path: "speedster",
  name: "Victory Lap",
  description:
    "Win streaks grant +5% scrap per consecutive win (caps at +50%).",
  tier: 3,
  lpCost: 30,
  prerequisiteNodeId: "ps_speed_t2a",
  effect: { type: "win_streak_bonus", value: 0.05 },
};

const PS_SPEED_T3B: PlaystyleNodeDefinition = {
  id: "ps_speed_t3b",
  path: "speedster",
  name: "Marathon Runner",
  description: "-50% fatigue gain, momentum thresholds -25%.",
  tier: 3,
  lpCost: 30,
  prerequisiteNodeId: "ps_speed_t2b",
  effect: { type: "fatigue_and_momentum", value: 0.5 },
};

const PS_SPEED_T4: PlaystyleNodeDefinition = {
  id: "ps_speed_t4",
  path: "speedster",
  name: "Speed Demon",
  description: "+25% all race rewards, DNF chance halved.",
  tier: 4,
  lpCost: 60,
  prerequisiteTier: 3,
  effect: { type: "race_capstone", value: 0.25 },
};

// ── Engineer Path (building/workshop focus) ─────────────────────────────────

const PS_ENG_T1: PlaystyleNodeDefinition = {
  id: "ps_eng_t1",
  path: "engineer",
  name: "Efficient Builder",
  description: "-15% build and repair costs.",
  tier: 1,
  lpCost: 8,
  effect: { type: "build_cost_reduction", value: 0.15 },
};

const PS_ENG_T2A: PlaystyleNodeDefinition = {
  id: "ps_eng_t2a",
  path: "engineer",
  name: "Workshop Master",
  description: "-35% workshop upgrade costs.",
  tier: 2,
  lpCost: 15,
  prerequisiteNodeId: "ps_eng_t1",
  mutuallyExclusiveWith: "ps_eng_t2b",
  effect: { type: "workshop_cost_reduction", value: 0.35 },
};

const PS_ENG_T2B: PlaystyleNodeDefinition = {
  id: "ps_eng_t2b",
  path: "engineer",
  name: "Material Science",
  description: "+40% decompose yield, -30% enhancement costs.",
  tier: 2,
  lpCost: 15,
  prerequisiteNodeId: "ps_eng_t1",
  mutuallyExclusiveWith: "ps_eng_t2a",
  effect: { type: "decompose_and_enhance", value: 0.4 },
};

const PS_ENG_T3A: PlaystyleNodeDefinition = {
  id: "ps_eng_t3a",
  path: "engineer",
  name: "Research Grant",
  description: "Workshop upgrades give +50% effect.",
  tier: 3,
  lpCost: 30,
  prerequisiteNodeId: "ps_eng_t2a",
  effect: { type: "workshop_effect_bonus", value: 0.5 },
};

const PS_ENG_T3B: PlaystyleNodeDefinition = {
  id: "ps_eng_t3b",
  path: "engineer",
  name: "Master Craftsman",
  description: "Enhancement always succeeds, craft recipes cost -40%.",
  tier: 3,
  lpCost: 30,
  prerequisiteNodeId: "ps_eng_t2b",
  effect: { type: "craft_mastery", value: 0.4 },
};

const PS_ENG_T4: PlaystyleNodeDefinition = {
  id: "ps_eng_t4",
  path: "engineer",
  name: "Innovator",
  description:
    "Start each run with 5 random workshop upgrades, build costs -50%.",
  tier: 4,
  lpCost: 60,
  prerequisiteTier: 3,
  effect: { type: "engineer_capstone", value: 5 },
};

// ── Exports ─────────────────────────────────────────────────────────────────

export const PLAYSTYLE_NODE_DEFINITIONS: PlaystyleNodeDefinition[] = [
  // Scrapper
  PS_SCRAP_T1,
  PS_SCRAP_T2A,
  PS_SCRAP_T2B,
  PS_SCRAP_T3A,
  PS_SCRAP_T3B,
  PS_SCRAP_T4,
  // Speedster
  PS_SPEED_T1,
  PS_SPEED_T2A,
  PS_SPEED_T2B,
  PS_SPEED_T3A,
  PS_SPEED_T3B,
  PS_SPEED_T4,
  // Engineer
  PS_ENG_T1,
  PS_ENG_T2A,
  PS_ENG_T2B,
  PS_ENG_T3A,
  PS_ENG_T3B,
  PS_ENG_T4,
];

export const PLAYSTYLE_NODES_BY_ID: Record<string, PlaystyleNodeDefinition> =
  Object.fromEntries(
    PLAYSTYLE_NODE_DEFINITIONS.map((n) => [n.id, n]),
  ) as Record<string, PlaystyleNodeDefinition>;

// ── Helper functions ────────────────────────────────────────────────────────

/** Check if a node can be unlocked given the set of already-unlocked node IDs. */
export function canUnlockPlaystyleNode(
  nodeId: string,
  unlockedNodeIds: string[],
): boolean {
  const node = PLAYSTYLE_NODES_BY_ID[nodeId];
  if (!node) return false;

  // Already unlocked
  if (unlockedNodeIds.includes(nodeId)) return false;

  // Check direct prerequisite
  if (
    node.prerequisiteNodeId &&
    !unlockedNodeIds.includes(node.prerequisiteNodeId)
  ) {
    return false;
  }

  // Check mutual exclusion
  if (
    node.mutuallyExclusiveWith &&
    unlockedNodeIds.includes(node.mutuallyExclusiveWith)
  ) {
    return false;
  }

  // Check prerequisiteTier (T4 capstones require any node at that tier in the same path)
  if (node.prerequisiteTier != null) {
    const hasRequiredTier = unlockedNodeIds.some((id) => {
      const other = PLAYSTYLE_NODES_BY_ID[id];
      return other && other.path === node.path && other.tier === node.prerequisiteTier;
    });
    if (!hasRequiredTier) return false;
  }

  return true;
}

/** Get total LP invested in a path (for partial refund calculation -- 50% refund). */
export function getPlaystylePathRespecCost(
  path: PlaystylePath,
  unlockedNodeIds: string[],
): number {
  return unlockedNodeIds.reduce((total, id) => {
    const node = PLAYSTYLE_NODES_BY_ID[id];
    if (node && node.path === path) {
      return total + node.lpCost;
    }
    return total;
  }, 0);
}

// ── Aggregated bonus computation ────────────────────────────────────────────

export interface PlaystyleBonuses {
  scavengeLuckBonus: number;
  scavengeYieldMult: number;
  scavengeQualityBonus: number;
  sellValueMult: number;
  materialYieldMult: number;
  autoDecomposeJunk: boolean;
  racePerformanceBonus: number;
  raceScrapMult: number;
  raceRepMult: number;
  fatigueReduction: number;
  momentumThresholdReduction: number;
  winStreakScrapBonus: number; // per consecutive win
  winStreakScrapCap: number;
  dnfReduction: number;
  buildCostReduction: number;
  repairCostReduction: number;
  workshopCostReduction: number;
  workshopEffectBonus: number;
  decomposeYieldMult: number;
  enhancementCostReduction: number;
  craftCostReduction: number;
  startWorkshopCount: number;
  allScavengeDoubled: boolean; // Junkyard King capstone
}

function defaultBonuses(): PlaystyleBonuses {
  return {
    scavengeLuckBonus: 0,
    scavengeYieldMult: 0,
    scavengeQualityBonus: 0,
    sellValueMult: 0,
    materialYieldMult: 0,
    autoDecomposeJunk: false,
    racePerformanceBonus: 0,
    raceScrapMult: 0,
    raceRepMult: 0,
    fatigueReduction: 0,
    momentumThresholdReduction: 0,
    winStreakScrapBonus: 0,
    winStreakScrapCap: 0,
    dnfReduction: 0,
    buildCostReduction: 0,
    repairCostReduction: 0,
    workshopCostReduction: 0,
    workshopEffectBonus: 0,
    decomposeYieldMult: 0,
    enhancementCostReduction: 0,
    craftCostReduction: 0,
    startWorkshopCount: 0,
    allScavengeDoubled: false,
  };
}

/** Compute aggregated bonuses from a set of unlocked playstyle node IDs. */
export function getPlaystyleBonuses(
  unlockedNodeIds: string[],
): PlaystyleBonuses {
  const b = defaultBonuses();

  for (const id of unlockedNodeIds) {
    const node = PLAYSTYLE_NODES_BY_ID[id];
    if (!node) continue;

    switch (node.id) {
      // ── Scrapper ────────────────────────────────────────────────────────
      case "ps_scrap_t1":
        b.scavengeLuckBonus += 0.1;
        break;
      case "ps_scrap_t2a":
        b.scavengeQualityBonus += 0.5;
        break;
      case "ps_scrap_t2b":
        b.scavengeYieldMult += 0.4;
        break;
      case "ps_scrap_t3a":
        b.scavengeLuckBonus += 0.2;
        b.sellValueMult += 0.3;
        break;
      case "ps_scrap_t3b":
        b.scavengeYieldMult += 0.6;
        b.materialYieldMult += 0.25;
        break;
      case "ps_scrap_t4":
        b.allScavengeDoubled = true;
        b.autoDecomposeJunk = true;
        break;

      // ── Speedster ───────────────────────────────────────────────────────
      case "ps_speed_t1":
        b.racePerformanceBonus += 0.1;
        break;
      case "ps_speed_t2a":
        b.raceScrapMult += 0.25;
        b.raceRepMult += 0.25;
        break;
      case "ps_speed_t2b":
        b.fatigueReduction += 0.3;
        break;
      case "ps_speed_t3a":
        b.winStreakScrapBonus = 0.05;
        b.winStreakScrapCap = 0.5;
        break;
      case "ps_speed_t3b":
        b.fatigueReduction += 0.5;
        b.momentumThresholdReduction += 0.25;
        break;
      case "ps_speed_t4":
        b.raceScrapMult += 0.25;
        b.raceRepMult += 0.25;
        b.dnfReduction += 0.5;
        break;

      // ── Engineer ────────────────────────────────────────────────────────
      case "ps_eng_t1":
        b.buildCostReduction += 0.15;
        b.repairCostReduction += 0.15;
        break;
      case "ps_eng_t2a":
        b.workshopCostReduction += 0.35;
        break;
      case "ps_eng_t2b":
        b.decomposeYieldMult += 0.4;
        b.enhancementCostReduction += 0.3;
        break;
      case "ps_eng_t3a":
        b.workshopEffectBonus += 0.5;
        break;
      case "ps_eng_t3b":
        b.enhancementCostReduction = 1; // always succeeds => 100% reduction in failure
        b.craftCostReduction += 0.4;
        break;
      case "ps_eng_t4":
        b.startWorkshopCount = 5;
        b.buildCostReduction += 0.5;
        break;
    }
  }

  return b;
}
