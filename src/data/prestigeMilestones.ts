// ── Prestige Milestone Definitions ─────────────────────────────────────────
//
// Milestones are free rewards earned at specific prestigeCount thresholds.
// They are NOT stored in state — they are derived from the existing
// prestigeCount field.
//
// Design philosophy:
//   Early (1-5)   → QoL features that reduce clicks
//   Mid   (7-15)  → Softwall bonuses — large boosts to a specific activity
//   Late  (20-50) → Transformative game-changers

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface PrestigeMilestoneDefinition {
  id: string;
  name: string;
  description: string;
  prestigeRequired: number;
  reward:
    | { type: "qol"; qolId: string }
    | { type: "bonus"; bonusType: string; value: number }
    | { type: "softwall"; bonuses: { bonusType: string; value: number }[] };
  flavorText: string;
}

export interface PrestigeMilestoneBonuses {
  // QoL flags
  autoRace: boolean;
  autoActivateVehicle: boolean;
  autoSellRusted: boolean;
  freeDecomposeAll: boolean;
  autoEquipBest: boolean;

  // Numeric bonuses (additive)
  scavengeYieldMult: number;
  scavengeLuckBonus: number;
  raceScrapMult: number;
  raceRepMult: number;
  workshopCostReduction: number;
  startWithToolkit: boolean;
  tickSpeedReductionMs: number;
  deepRunLpMult: number;
  startWorkshopCount: number;
  startingScrapMult: number;
  startWithAutoScavenge: boolean;
  allMultiplier: number;
  lpMultiplier: number;
}

// ── Milestone Definitions ──────────────────────────────────────────────────

const PM_AUTO_RACE: PrestigeMilestoneDefinition = {
  id: "pm_auto_race",
  name: "Auto-Pilot",
  description: "Races begin automatically when a vehicle is ready.",
  prestigeRequired: 1,
  reward: { type: "qol", qolId: "auto_race" },
  flavorText: "The car races itself now. Sort of.",
};

const PM_AUTO_ACTIVATE: PrestigeMilestoneDefinition = {
  id: "pm_auto_activate",
  name: "Quick Hands",
  description: "Vehicles are activated automatically when acquired.",
  prestigeRequired: 1,
  reward: { type: "qol", qolId: "auto_activate_vehicle" },
  flavorText: "No need to press the button anymore.",
};

const PM_JUNK_FILTER: PrestigeMilestoneDefinition = {
  id: "pm_junk_filter",
  name: "Junk Filter",
  description: "Rusted items are sold automatically on pickup.",
  prestigeRequired: 2,
  reward: { type: "qol", qolId: "auto_sell_rusted" },
  flavorText: "If it's rusted, it's sold. No questions asked.",
};

const PM_BULK_SCRAP: PrestigeMilestoneDefinition = {
  id: "pm_bulk_scrap",
  name: "Bulk Scrapper",
  description: "Decomposing all parts is free.",
  prestigeRequired: 3,
  reward: { type: "qol", qolId: "free_decompose_all" },
  flavorText: "Break it all down. On the house.",
};

const PM_QUICK_BUILD: PrestigeMilestoneDefinition = {
  id: "pm_quick_build",
  name: "Quick Builder",
  description: "Automatically equip the best available parts.",
  prestigeRequired: 5,
  reward: { type: "qol", qolId: "auto_equip_best" },
  flavorText: "Your hands know the parts now.",
};

const PM_SCAV_WINDFALL: PrestigeMilestoneDefinition = {
  id: "pm_scav_windfall",
  name: "Scavenger's Windfall",
  description: "Scavenge yield +100% and luck +25%.",
  prestigeRequired: 7,
  reward: {
    type: "softwall",
    bonuses: [
      { bonusType: "scavenge_yield_mult", value: 1.0 },
      { bonusType: "scavenge_luck_bonus", value: 0.25 },
    ],
  },
  flavorText: "The junkyard gives up its secrets.",
};

const PM_RACER_MOMENTUM: PrestigeMilestoneDefinition = {
  id: "pm_racer_momentum",
  name: "Racer's Momentum",
  description: "Race scrap +50% and rep +30%.",
  prestigeRequired: 10,
  reward: {
    type: "softwall",
    bonuses: [
      { bonusType: "race_scrap_mult", value: 0.5 },
      { bonusType: "race_rep_mult", value: 0.3 },
    ],
  },
  flavorText: "Every finish line pays double.",
};

const PM_WORKSHOP_PRODIGY: PrestigeMilestoneDefinition = {
  id: "pm_workshop_prodigy",
  name: "Workshop Prodigy",
  description: "Workshop costs -40% and start each run with a toolkit.",
  prestigeRequired: 12,
  reward: {
    type: "softwall",
    bonuses: [
      { bonusType: "workshop_cost_reduction", value: 0.4 },
      { bonusType: "start_with_toolkit", value: 1 },
    ],
  },
  flavorText: "The workshop bends to your will.",
};

const PM_SPEED_DEMON: PrestigeMilestoneDefinition = {
  id: "pm_speed_demon",
  name: "Speed Demon",
  description: "Base tick speed reduced by 4000ms.",
  prestigeRequired: 15,
  reward: { type: "bonus", bonusType: "tick_speed_reduction_ms", value: 4000 },
  flavorText: "Time bows to the veteran.",
};

const PM_DEEP_RUN: PrestigeMilestoneDefinition = {
  id: "pm_deep_run",
  name: "Deep Run Master",
  description: "+100% LP when fatigue exceeds 50.",
  prestigeRequired: 20,
  reward: {
    type: "softwall",
    bonuses: [{ bonusType: "deep_run_lp_mult", value: 1.0 }],
  },
  flavorText: "The deeper you go, the richer you leave.",
};

const PM_FORTUNE: PrestigeMilestoneDefinition = {
  id: "pm_fortune",
  name: "Fortune's Favorite",
  description: "Scavenge luck +15%.",
  prestigeRequired: 25,
  reward: { type: "bonus", bonusType: "scavenge_luck_bonus", value: 0.15 },
  flavorText: "Luck isn't random anymore. It's earned.",
};

const PM_MASTER_MECH: PrestigeMilestoneDefinition = {
  id: "pm_master_mech",
  name: "Master Mechanic",
  description: "Start with 3 random workshop upgrades at Lv1.",
  prestigeRequired: 30,
  reward: { type: "bonus", bonusType: "start_workshop_count", value: 3 },
  flavorText: "You remember more than you forget.",
};

const PM_SCRAP_BARON: PrestigeMilestoneDefinition = {
  id: "pm_scrap_baron",
  name: "Scrap Baron",
  description:
    "x3 total starting scrap and auto-scavenge from tick 0.",
  prestigeRequired: 40,
  reward: {
    type: "softwall",
    bonuses: [
      { bonusType: "starting_scrap_mult", value: 2.0 },
      { bonusType: "start_with_auto_scavenge", value: 1 },
    ],
  },
  flavorText: "You don't start from nothing anymore.",
};

const PM_LEGEND: PrestigeMilestoneDefinition = {
  id: "pm_legend",
  name: "Living Legend",
  description: "+25% to all multipliers and +25% LP.",
  prestigeRequired: 50,
  reward: {
    type: "softwall",
    bonuses: [
      { bonusType: "all_multiplier", value: 0.25 },
      { bonusType: "lp_multiplier", value: 0.25 },
    ],
  },
  flavorText: "They don't check the rule book when you race.",
};

// ── Export ──────────────────────────────────────────────────────────────────

export const PRESTIGE_MILESTONE_DEFINITIONS: PrestigeMilestoneDefinition[] = [
  PM_AUTO_RACE,
  PM_AUTO_ACTIVATE,
  PM_JUNK_FILTER,
  PM_BULK_SCRAP,
  PM_QUICK_BUILD,
  PM_SCAV_WINDFALL,
  PM_RACER_MOMENTUM,
  PM_WORKSHOP_PRODIGY,
  PM_SPEED_DEMON,
  PM_DEEP_RUN,
  PM_FORTUNE,
  PM_MASTER_MECH,
  PM_SCRAP_BARON,
  PM_LEGEND,
];

export const PRESTIGE_MILESTONES_BY_ID = Object.fromEntries(
  PRESTIGE_MILESTONE_DEFINITIONS.map((m) => [m.id, m]),
) as Record<string, PrestigeMilestoneDefinition>;

// ── Helper Functions ───────────────────────────────────────────────────────

/** Get all milestones earned at given prestige count */
export function getActivePrestigeMilestones(
  prestigeCount: number,
): PrestigeMilestoneDefinition[] {
  return PRESTIGE_MILESTONE_DEFINITIONS.filter(
    (m) => prestigeCount >= m.prestigeRequired,
  );
}

/** Get milestones newly earned at this prestige count (not at previous) */
export function getNewlyUnlockedMilestones(
  prestigeCount: number,
): PrestigeMilestoneDefinition[] {
  return PRESTIGE_MILESTONE_DEFINITIONS.filter(
    (m) =>
      prestigeCount >= m.prestigeRequired &&
      prestigeCount - 1 < m.prestigeRequired,
  );
}

// ── QoL ID → bonus field mapping ──────────────────────────────────────────

const QOL_FLAG_MAP: Record<string, keyof PrestigeMilestoneBonuses> = {
  auto_race: "autoRace",
  auto_activate_vehicle: "autoActivateVehicle",
  auto_sell_rusted: "autoSellRusted",
  free_decompose_all: "freeDecomposeAll",
  auto_equip_best: "autoEquipBest",
};

const BONUS_TYPE_MAP: Record<string, keyof PrestigeMilestoneBonuses> = {
  scavenge_yield_mult: "scavengeYieldMult",
  scavenge_luck_bonus: "scavengeLuckBonus",
  race_scrap_mult: "raceScrapMult",
  race_rep_mult: "raceRepMult",
  workshop_cost_reduction: "workshopCostReduction",
  start_with_toolkit: "startWithToolkit",
  tick_speed_reduction_ms: "tickSpeedReductionMs",
  deep_run_lp_mult: "deepRunLpMult",
  start_workshop_count: "startWorkshopCount",
  starting_scrap_mult: "startingScrapMult",
  start_with_auto_scavenge: "startWithAutoScavenge",
  all_multiplier: "allMultiplier",
  lp_multiplier: "lpMultiplier",
};

const BOOLEAN_BONUS_KEYS = new Set<keyof PrestigeMilestoneBonuses>([
  "startWithToolkit",
  "startWithAutoScavenge",
]);

/** Aggregate all active milestone rewards into a single bonus struct */
export function getPrestigeMilestoneBonuses(
  prestigeCount: number,
): PrestigeMilestoneBonuses {
  const bonuses: PrestigeMilestoneBonuses = {
    autoRace: false,
    autoActivateVehicle: false,
    autoSellRusted: false,
    freeDecomposeAll: false,
    autoEquipBest: false,
    scavengeYieldMult: 0,
    scavengeLuckBonus: 0,
    raceScrapMult: 0,
    raceRepMult: 0,
    workshopCostReduction: 0,
    startWithToolkit: false,
    tickSpeedReductionMs: 0,
    deepRunLpMult: 0,
    startWorkshopCount: 0,
    startingScrapMult: 0,
    startWithAutoScavenge: false,
    allMultiplier: 0,
    lpMultiplier: 0,
  };

  const active = getActivePrestigeMilestones(prestigeCount);

  for (const milestone of active) {
    const { reward } = milestone;

    switch (reward.type) {
      case "qol": {
        const flag = QOL_FLAG_MAP[reward.qolId];
        if (flag) {
          (bonuses as unknown as Record<string, boolean | number>)[flag] = true;
        }
        break;
      }
      case "bonus": {
        const key = BONUS_TYPE_MAP[reward.bonusType];
        if (key) {
          if (BOOLEAN_BONUS_KEYS.has(key)) {
            (bonuses as unknown as Record<string, boolean | number>)[key] = true;
          } else {
            (bonuses as unknown as Record<string, boolean | number>)[key] =
              (bonuses[key] as number) + reward.value;
          }
        }
        break;
      }
      case "softwall": {
        for (const b of reward.bonuses) {
          const key = BONUS_TYPE_MAP[b.bonusType];
          if (key) {
            if (BOOLEAN_BONUS_KEYS.has(key)) {
              (bonuses as unknown as Record<string, boolean | number>)[key] = true;
            } else {
              (bonuses as unknown as Record<string, boolean | number>)[key] =
                (bonuses[key] as number) + b.value;
            }
          }
        }
        break;
      }
    }
  }

  return bonuses;
}
