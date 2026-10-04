import { HARDSHIP_BY_ID } from "./content/modifiers";
import type { DisciplineId, GameState } from "./types";

/** Rule changes for the current Season, read by the engine instead of literals. */
export interface RuleFlags {
  discipline: DisciplineId;
  habitsDisabled: boolean;
  crewDisabled: boolean;
  perksDisabled: boolean;
  /** Places (other than the curb) the player may open; null = unlimited. */
  placeLimit: number | null;
  conditionShift: number;
  seasonDeadlineMs: number | null;
  teamEra: boolean;
}

export function resolveFlags(state: GameState): RuleFlags {
  const hardships = new Set(state.config.hardships.filter((id) => HARDSHIP_BY_ID[id]));
  return {
    discipline: state.era?.discipline ?? "dirt",
    habitsDisabled: hardships.has("hand_tools"),
    crewDisabled: hardships.has("solo"),
    perksDisabled: hardships.has("rookie_plates"),
    placeLimit: hardships.has("one_yard") ? 1 : null,
    conditionShift: hardships.has("rust_everything") ? -1 : 0,
    seasonDeadlineMs: hardships.has("short_season") ? 48 * 3_600_000 : null,
    teamEra: state.era !== null,
  };
}

/** Rank of an equipped perk this Season (0 when not equipped or perks are disabled). */
export function perkRank(state: GameState, perkId: string): number {
  if (state.config.hardships.includes("rookie_plates")) return 0;
  if (!state.config.perks.includes(perkId)) return 0;
  return state.meta.perks[perkId] ?? 0;
}

export function hasPerk(state: GameState, perkId: string): boolean {
  return perkRank(state, perkId) > 0;
}

export function teamUpgrade(state: GameState, id: string): number {
  return state.team.upgrades[id] ?? 0;
}
