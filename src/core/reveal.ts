import { getPart } from "./content/parts";
import type { GameState } from "./types";

/**
 * What the UI shows. Each key reveals once its predicate holds in a Season
 * (Era 1 never shows crew, disciplines or other Team systems).
 */
export const REVEALS: readonly { key: string; label: string; when: (s: GameState) => boolean }[] = [
  { key: "haul", label: "Trips", when: () => true },
  { key: "garage", label: "Garage", when: (s) => s.run.inventory.length > 0 || s.run.vehicles.length > 0 },
  { key: "bench", label: "Bench", when: (s) => s.run.inventory.some((p) => p.condition <= 1 && getPart(p.partId).category !== "junk") || s.run.inventory.some((p) => getPart(p.partId).category === "junk") },
  { key: "build", label: "Build", when: (s) => s.run.vehicles.length > 0 || (s.run.inventory.some((p) => getPart(p.partId).category === "engine") && s.run.inventory.some((p) => getPart(p.partId).category === "wheel")) },
  { key: "race", label: "Race", when: (s) => s.run.vehicles.length > 0 },
  { key: "codex", label: "Codex", when: (s) => s.run.races.length > 0 || s.meta.seasonsPlayed > 0 },
  { key: "queue", label: "Queue", when: (s) => s.run.stats.hauls >= 3 || s.meta.seasonsPlayed > 0 },
  { key: "places", label: "Places", when: (s) => s.run.rep >= 3 || s.run.placesOpen.length > 1 },
  { key: "knowhow", label: "Know-how", when: (s) => s.run.available.length > 0 || s.run.learned.length > 0 },
  { key: "habits", label: "Habits", when: (s) => Object.values(s.run.reps).some((n) => n >= 5) || s.run.habitsKnown.length > 0 },
  { key: "tools", label: "Tools", when: (s) => s.run.cash >= 25 || Object.keys(s.run.tools).length > 0 },
  { key: "materials", label: "Materials", when: (s) => Object.values(s.run.materials).some((n) => n > 0) },
  { key: "legacy", label: "Legacy", when: (s) => s.run.venuesOpen.includes("county_fair") || s.scrap.resets > 0 || s.era !== null },
  { key: "team", label: "Team", when: (s) => s.era !== null || s.meta.stateWonEver || s.run.venuesOpen.includes("regional") },
  { key: "crew", label: "Crew", when: (s) => s.era !== null },
];

export function refreshReveals(state: GameState): void {
  for (const reveal of REVEALS) {
    if (state.run.revealed.includes(reveal.key)) continue;
    if (reveal.when(state)) state.run.revealed.push(reveal.key);
  }
}

export function isRevealed(state: GameState, key: string): boolean {
  return state.run.revealed.includes(key);
}
