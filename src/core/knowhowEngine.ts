import { channel } from "./channels";
import { KNOWHOW, PLACE_REP, getKnowhow } from "./content/knowhow";
import { addJournal } from "./journal";
import { resolveFlags, teamUpgrade } from "./rules";
import type { GameState } from "./types";

export type KnowhowTier = "learning" | "familiar" | "second_nature";

export function knowhowTier(state: GameState, id: string): KnowhowTier {
  const seasons = state.meta.knowhow[id] ?? 0;
  const def = getKnowhow(id);
  const secondNatureAt = def.kind === "place" && teamUpgrade(state, "scouting_network") > 0 ? 1 : 3;
  if (seasons >= secondNatureAt) return "second_nature";
  if (seasons >= 1) return "familiar";
  return "learning";
}

/** Study time for a technique or blueprint this Season. */
export function studyMs(state: GameState, id: string): number {
  const def = getKnowhow(id);
  const tier = knowhowTier(state, id);
  if (tier === "learning") return def.studyMs;
  // Familiar: 25% of the time; Old Notebook brings it to 10%.
  const factor = Math.max(0.1, 0.25 - channel(state, "unlock_speed") * 0.25);
  return def.studyMs * factor;
}

/** Rep cost to open a place this Season (0 when it opens on its own). */
export function placeRepCost(state: GameState, id: string): number {
  const base = PLACE_REP[id] ?? 0;
  const tier = knowhowTier(state, id);
  if (tier === "familiar") return Math.ceil(base / 2);
  return base;
}

export function isLearned(state: GameState, id: string): boolean {
  return state.run.learned.includes(id);
}

/** Places (excluding the curb and the Dirt Track) opened this Season, for the One Yard hardship. */
export function haulPlacesOpened(state: GameState): number {
  return state.run.learned.filter((id) => id.startsWith("place:") && id !== "place:dirt").length;
}

export function canOpenPlace(state: GameState, id: string): string | null {
  const def = getKnowhow(id);
  if (def.kind !== "place") return "That isn't a place";
  if (isLearned(state, id)) return "Already open";
  if (!def.trigger(state)) return def.hint;
  const flags = resolveFlags(state);
  if (id !== "place:dirt" && flags.placeLimit !== null && haulPlacesOpened(state) >= flags.placeLimit) return "One Yard: you've already picked your place this Season";
  const cost = placeRepCost(state, id);
  if (state.run.rep < cost) return `Needs ${cost} Rep`;
  return null;
}

/** Applies the effects of learning/opening a know-how id. */
export function learn(state: GameState, id: string): void {
  if (isLearned(state, id)) return;
  state.run.learned.push(id);
  state.run.available = state.run.available.filter((a) => a !== id);
  if (id.startsWith("place:")) {
    const placeId = id.slice("place:".length);
    if (placeId === "dirt") {
      if (!state.run.venuesOpen.includes("dirt")) state.run.venuesOpen.push("dirt");
      state.run.ladder.dirt = state.run.ladder.dirt ?? ["sprint"];
    } else if (!state.run.placesOpen.includes(placeId)) {
      state.run.placesOpen.push(placeId);
    }
  }
  addJournal(state, `learned:${id}`, learnedLine(id));
}

function learnedLine(id: string): string {
  const def = getKnowhow(id);
  if (def.kind === "place") return `${def.name} is open to you.`;
  if (def.kind === "blueprint") return `You drew up the ${def.name}.`;
  return `You learned ${def.name}.`;
}

/**
 * Fires know-how triggers: makes techniques studyable, and auto-learns
 * anything at Second Nature (places open free once Rep reaches their cost).
 */
export function refreshKnowhow(state: GameState): void {
  const flags = resolveFlags(state);
  for (const def of KNOWHOW) {
    if (isLearned(state, def.id)) continue;
    if (!def.trigger(state)) continue;
    const tier = knowhowTier(state, def.id);
    if (def.kind === "place") {
      if (tier !== "second_nature") continue;
      if (def.id !== "place:dirt" && flags.placeLimit !== null && haulPlacesOpened(state) >= flags.placeLimit) continue;
      if (state.run.rep >= (PLACE_REP[def.id] ?? 0)) learn(state, def.id);
      continue;
    }
    if (tier === "second_nature") {
      learn(state, def.id);
      continue;
    }
    if (!state.run.available.includes(def.id)) state.run.available.push(def.id);
  }
}
