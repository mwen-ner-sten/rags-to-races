import { pushFeed } from "./feed";
import type { GameState } from "./types";

/** Adds a story line the first time ever that `key` happens. Returns true when it was new. */
export function addJournal(state: GameState, key: string, text: string, announce = true): boolean {
  if (state.meta.journalSeen.includes(key)) return false;
  state.meta.journalSeen.push(key);
  state.meta.journal.push({ id: key, season: state.meta.seasonsPlayed + 1, seasonMs: state.run.seasonMs, text });
  if (state.meta.journal.length > 400) state.meta.journal.splice(0, state.meta.journal.length - 400);
  if (announce) pushFeed(state, "story", text);
  return true;
}

/** Adds a line every time (Season log, e.g. Feature wins). */
export function logSeason(state: GameState, key: string, text: string): void {
  state.meta.journal.push({ id: `${key}:${state.meta.seasonsPlayed + 1}:${state.run.seasonMs}`, season: state.meta.seasonsPlayed + 1, seasonMs: state.run.seasonMs, text });
  if (state.meta.journal.length > 400) state.meta.journal.splice(0, state.meta.journal.length - 400);
  pushFeed(state, "story", text);
}

export const STORY = {
  first_find: "Trash night. Under a bag of grass clippings: a seized little engine. You drag it home in the wagon.",
  first_clean: "Carb cleaner, an old toothbrush, and an hour you'll never get back. Worth it.",
  first_start: "It coughs. It catches. The whole street hears it. Dale looks up from his Snapper.",
  first_race: "First race in the books. The Hendersons' birdbath survived. Barely.",
  first_win: "First win. Mrs. Henderson hands you a popsicle as a trophy.",
  first_dnf: "It quits on the back stretch and you push it home. Nobody says anything. That's worse.",
  first_habit: "You could do this in your sleep. Some nights you do.",
  first_overflow: "Mom looks at the driveway, then at you, then at the driveway. Some of it has to go.",
  first_restore: "You finish the last pass with steel wool and it looks better than new. You didn't know you could do that.",
  first_long_job: "You set it going, wash your hands and go to bed. It'll be done when it's done.",
  fair_invite: "A flyer on the feed store board: COUNTY FAIR, OPEN CLASS. Somebody wrote your name on it.",
  fair_win: "Big Ron shakes your hand and doesn't let go for a long time. A man in a shop jacket hands you a card: LOU'S RACE SHOP.",
  regional_win: "Three counties' worth of trailers in the lot, and yours is the one they're looking at.",
  state_win: "Lou finds you in the pits. 'I've got a back bay and nobody in it. Interested?'",
  new_season: "New Season. The garage is empty, but your hands remember.",
  founding: "You paint the team name on the back bay door. It drips a little. Nobody minds.",
  built_riding_mower: "You sit down on it. You sit down! Dad says it's still a lawn mower. It is not still a lawn mower.",
  built_go_kart: "The welds are ugly and the seat is a boat cushion. It turns like it's on rails.",
  built_beater_car: "Four doors, a title in the glovebox and a smell you'll never get out. It's a car. You built a car.",
  built_street_stock: "Doors welded shut, number on the roof. You climb in through the window like you've always done it.",
  lost_dale: "Dale beats you by a mower length and does a lap of his own driveway to celebrate.",
  beat_dale: "You beat Dale. He says his throttle stuck. His throttle did not stick.",
  lost_marisol: "Marisol laps you, waves, and is eating a snow cone by the time you finish.",
  beat_marisol: "You beat Marisol on her own track. She walks over, looks at your machine for a long time, and nods once.",
  lost_big_ron: "Big Ron wins another one. He tells you that you remind him of himself, which is somehow the worst part.",
  beat_big_ron: "Five trophies on Big Ron's shelf and not one of them is this one.",
  lost_kessler: "One Kessler blocks while the other one talks. You're not sure which was which.",
  beat_kessler: "Both Kesslers in your mirror, arguing with each other over the radio. Best sound all Season.",
  first_caution: "Yellow flag. The whole field bunches up and everybody's plan changes at once.",
  first_blown_engine: "A bang, a cloud, and the engine is suddenly in more pieces than it came in.",
} as const;

export type StoryKey = keyof typeof STORY;

/** Tells a story beat by key, if one is written for it. */
export function tell(state: GameState, key: string): void {
  const text = (STORY as Record<string, string>)[key];
  if (text) addJournal(state, key, text);
}
