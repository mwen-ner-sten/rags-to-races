import type { GameState, MetaState, RunConfig, RunState, ScrapLayerState, TeamLayerState } from "./types";

export function initialMeta(): MetaState {
  return {
    codex: { parts: {}, places: {} },
    knowhow: {},
    habitMemory: {},
    lastTopHabit: null,
    records: {},
    hallOfFame: [],
    rivals: {},
    perks: {},
    perksUnlocked: [],
    daresCompleted: [],
    disciplineMastery: {},
    hardshipMastery: {},
    stateWonEver: false,
    journalSeen: [],
    journal: [],
    seasonsPlayed: 0,
    totalTeamResets: 0,
    milestonesEver: [],
  };
}

export function initialScrap(): ScrapLayerState {
  return { lp: 0, lifetimeLp: 0, resets: 0, tuneUpPoints: 0, milestonesThisEra: [], daresThisEra: 0 };
}

export function initialTeam(): TeamLayerState {
  return { tp: 0, lifetimeTp: 0, resets: 0, upgrades: {} };
}

export function initialRun(): RunState {
  return {
    seasonMs: 0,
    cash: 0,
    rep: 0,
    materials: { metal: 0, rubber: 0, wiring: 0 },
    inventory: [],
    vehicles: [],
    placesOpen: ["curb"],
    venuesOpen: ["backyard"],
    ladder: { backyard: ["sprint"] },
    tools: {},
    learned: [],
    available: [],
    reps: {},
    habitsKnown: [],
    habitSlots: [null],
    jobs: [],
    queue: [],
    idleLanes: [],
    practice: {},
    lastEntered: {},
    featureWins: {},
    races: [],
    stats: { partsSold: 0, hauls: 0, racesLost: {}, firstStartDone: false },
    revealed: ["haul"],
    candidates: [],
    shellsBought: 0,
    saleSat: {},
    notices: [],
    pushOnlyRaces: true,
  };
}

export function initialConfig(): RunConfig {
  return { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };
}

export function newGame(seed: string): GameState {
  return {
    version: 1,
    seed,
    rng: 0,
    uid: 0,
    meta: initialMeta(),
    scrap: initialScrap(),
    team: initialTeam(),
    era: null,
    run: initialRun(),
    config: initialConfig(),
  };
}
