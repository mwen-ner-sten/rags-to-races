import { PLACE_REP } from "./content/knowhow";
import { getPart } from "./content/parts";
import { getVehicle } from "./content/vehicles";
import type { GameState } from "./types";

export type GuideTab = "trips" | "garage" | "race" | "notebook";

/** One step of the first-Season guide: what to do next, how, and where. */
export interface GuideStep {
  id: string;
  title: string;
  how: (state: GameState) => string;
  tab: GuideTab;
  done: (state: GameState) => boolean;
}

const hasVehicle = (s: GameState) => s.run.vehicles.length > 0;
const owns = (s: GameState, vehicleId: string) => s.run.vehicles.some((v) => v.vehicleId === vehicleId);
const holds = (s: GameState, category: string) => [...s.run.inventory, ...s.run.driveway].some((p) => getPart(p.partId).category === category);

function buildCost(vehicleId: string): string {
  const def = getVehicle(vehicleId);
  const mats = Object.entries(def.materials).map(([m, n]) => `${n} ${m}`);
  return [def.cash ? `${def.cash} Scrap Bucks` : "", ...mats].filter(Boolean).join(" and ");
}

export const GUIDE: readonly GuideStep[] = [
  {
    id: "trip",
    title: "Take your first trip",
    how: () => "Press Go on Curbside. Trips take a little while and bring home whatever you can carry. Everything here keeps going while you do other things, or step away.",
    tab: "trips",
    done: (s) => s.run.stats.hauls > 0,
  },
  {
    id: "clean",
    title: "Clean up that engine",
    how: () => "In the Garage, press Clean on the Small Engine. A Rusted part only gives 60% of its stats. Cleaning runs on the bench by itself, so take another trip while it works.",
    tab: "garage",
    done: (s) => s.meta.journalSeen.includes("first_clean") || hasVehicle(s),
  },
  {
    id: "wheel",
    title: "Find a wheel",
    how: () => "A Push Mower needs an engine and a wheel. Take another trip to the curb.",
    tab: "trips",
    done: (s) => holds(s, "wheel") || hasVehicle(s),
  },
  {
    id: "build",
    title: "Build a Push Mower",
    how: () => "In the Garage, scroll down to Build. The best parts you own are picked for you: press Assemble.",
    tab: "garage",
    done: hasVehicle,
  },
  {
    id: "race",
    title: "Enter your first race",
    how: () => "On the Race tab, enter the Sprint at the Backyard Derby. Events run on a schedule; Next shows when the next one starts.",
    tab: "race",
    done: (s) => s.run.races.length > 0,
  },
  {
    id: "ladder",
    title: "Climb the Backyard ladder",
    how: () => "Finish in the top 3 of the Sprint to open the Heat, then the Heat to open the Feature. Races wear parts down, so clean them between races.",
    tab: "race",
    done: (s) => (s.run.ladder.backyard ?? []).includes("feature"),
  },
  {
    id: "feature",
    title: "Win the Backyard Feature",
    how: () => "Winning it gets you the idea for a Riding Mower. If your Odds are low, better parts or better condition raise them.",
    tab: "race",
    done: (s) => s.run.featureWins.backyard !== undefined,
  },
  {
    id: "plans",
    title: "Study the Riding Mower plans",
    how: () => "Open the Notebook, go to Know-how and press Study. It keeps your hands busy for a while, so queue a trip to start after it.",
    tab: "notebook",
    done: (s) => s.run.learned.includes("blueprint:riding_mower"),
  },
  {
    id: "riding",
    title: "Build the Riding Mower",
    how: () => `It needs an engine, a wheel and a frame, plus ${buildCost("riding_mower")}. Strip a spare part for metal. Mower decks turn up in the Neighbourhood Yards.`,
    tab: "garage",
    done: (s) => owns(s, "riding_mower"),
  },
  {
    id: "dirt",
    title: "Open the Dirt Track",
    how: () => `On the Race tab, sign up for the Dirt Track for ${PLACE_REP["place:dirt"]} Rep. Rep comes from racing.`,
    tab: "race",
    done: (s) => s.run.venuesOpen.includes("dirt"),
  },
  {
    id: "fair",
    title: "Win at the Dirt Track",
    how: () => "Climb the Dirt Track ladder and win its Feature. That gets you invited to the County Fair, and from there you're on your own.",
    tab: "race",
    done: (s) => s.run.venuesOpen.includes("county_fair"),
  },
];

/** The guide is for a first-ever Season; it steps aside once a Season has been played or the player hides it. */
export function guideActive(state: GameState): boolean {
  return state.meta.seasonsPlayed === 0 && state.era === null && !state.meta.guideOff;
}

/** The first step not yet done, with its position (null when the guide is finished or off). */
export function guideStep(state: GameState): { step: GuideStep; index: number } | null {
  if (!guideActive(state)) return null;
  const index = GUIDE.findIndex((step) => !step.done(state));
  return index === -1 ? null : { step: GUIDE[index], index };
}
