import { startSeason } from "./layers";
import { newGame } from "./state";
import type { GameState } from "./types";

export { apply, must, type Action, type ActionResult } from "./actions";
export { LAYERS, nextSeasonPerkSlots, nextSeasonTuneUpPoints, perkSlots, hardshipCap, crewCap, scrapAward, teamAward } from "./layers";
export type { LayerId, ScrapChoices, TeamChoices } from "./layers";
export type * from "./types";

/** A brand-new game at the curb. */
export function createGame(seed: string = Math.random().toString(36).slice(2)): GameState {
  const state = newGame(seed);
  startSeason(state);
  return state;
}
