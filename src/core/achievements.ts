import { ACHIEVEMENTS } from "./content/achievements";
import { pushFeed } from "./feed";
import type { GameState } from "./types";

/**
 * Unlocks every achievement whose condition now holds. Cheap enough to run after every change:
 * it only looks at the ones still locked. Returns the ids unlocked this call.
 * `silent` credits without a feed line (used when an old save is first upgraded).
 */
export function evaluateAchievements(state: GameState, options: { silent?: boolean } = {}): string[] {
  const unlocked = state.meta.achievements;
  if (!unlocked) return [];
  const now = Date.now();
  const fresh: string[] = [];
  // Completionist depends on the others, so loop until nothing new unlocks.
  for (let pass = 0; pass < 2; pass++) {
    let any = false;
    for (const def of ACHIEVEMENTS) {
      if (unlocked[def.id] !== undefined || !def.check(state)) continue;
      unlocked[def.id] = now;
      fresh.push(def.id);
      any = true;
      if (!options.silent) pushFeed(state, "achievement", `Achievement unlocked: ${def.name}. ${def.description}`);
    }
    if (!any) break;
  }
  return fresh;
}
