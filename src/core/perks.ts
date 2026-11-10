import { DARES, PERKS, type PerkDef } from "./content/modifiers";
import type { GameState } from "./types";

/** Eligibility comes from permanent achievements as well as this Season's wins. */
export function perkUnlocked(state: GameState, perk: PerkDef): boolean {
  if (perk.unlock.type === "lp" || (state.meta.perks[perk.id] ?? 0) > 0 || state.meta.perksUnlocked.includes(perk.id)) return true;
  if (perk.unlock.type === "dare") return state.meta.daresCompleted.includes(perk.unlock.dareId);
  const venue = perk.unlock.venueId;
  return state.run.featureWins[venue] !== undefined || state.meta.records[venue] !== undefined
    || state.meta.milestonesEver.includes(venue) || state.scrap.milestonesThisEra.includes(venue)
    || (state.era?.milestones.includes(venue) ?? false) || (venue === "state" && state.meta.stateWonEver);
}

/** Repair missed unlocks from older saves and bank newly earned ones forever. */
export function refreshPerkUnlocks(state: GameState): void {
  for (const perk of PERKS) {
    if (perk.unlock.type !== "lp" && perkUnlocked(state, perk) && !state.meta.perksUnlocked.includes(perk.id)) state.meta.perksUnlocked.push(perk.id);
  }
}

/** Dares are once-ever achievements, so their completion reward survives Team Resets. */
export function allDaresCompleted(state: GameState): boolean {
  return DARES.length > 0 && DARES.every((dare) => state.meta.daresCompleted.includes(dare.id));
}
