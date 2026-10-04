import type { GameState } from "./types";

/** Adds a story line the first time ever that `key` happens. */
export function addJournal(state: GameState, key: string, text: string): void {
  if (state.meta.journalSeen.includes(key)) return;
  state.meta.journalSeen.push(key);
  state.meta.journal.push({ id: key, season: state.meta.seasonsPlayed + 1, seasonMs: state.run.seasonMs, text });
  if (state.meta.journal.length > 400) state.meta.journal.splice(0, state.meta.journal.length - 400);
}

/** Adds a line every time (Season log, e.g. Feature wins). */
export function logSeason(state: GameState, key: string, text: string): void {
  state.meta.journal.push({ id: `${key}:${state.meta.seasonsPlayed + 1}:${state.run.seasonMs}`, season: state.meta.seasonsPlayed + 1, seasonMs: state.run.seasonMs, text });
  if (state.meta.journal.length > 400) state.meta.journal.splice(0, state.meta.journal.length - 400);
}

export const STORY = {
  first_find: "Trash night. Under a bag of grass clippings: a seized little engine. You drag it home in the wagon.",
  first_clean: "Carb cleaner, an old toothbrush, and an hour you'll never get back. Worth it.",
  first_start: "It coughs. It catches. The whole street hears it. Dale looks up from his Snapper.",
  first_race: "First race in the books. The Hendersons' birdbath survived. Barely.",
  first_win: "First win. Mrs. Henderson hands you a popsicle as a trophy.",
  first_habit: "You could do this in your sleep. Some nights you do.",
  fair_invite: "A flyer on the feed store board: COUNTY FAIR, OPEN CLASS. Somebody wrote your name on it.",
  fair_win: "Big Ron shakes your hand and doesn't let go for a long time. A man in a shop jacket hands you a card: LOU'S RACE SHOP.",
  state_win: "Lou finds you in the pits. 'I've got a back bay and nobody in it. Interested?'",
  new_season: "New Season. The garage is empty, but your hands remember.",
  founding: "You paint the team name on the back bay door. It drips a little. Nobody minds.",
} as const;
