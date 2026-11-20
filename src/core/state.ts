import type { GameState, MetaState, RunConfig, RunState, ScrapLayerState, TeamLayerState } from "./types";
import { refreshPerkUnlocks } from "./perks";
import { assignedRacingCrewIds } from "./crew";
import { initialStats } from "./stats";
import { evaluateAchievements } from "./achievements";

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
    challengeRecords: {},
    disciplineMastery: {},
    hardshipMastery: {},
    stateWonEver: false,
    journalSeen: [],
    journal: [],
    seasonsPlayed: 0,
    totalTeamResets: 0,
    milestonesEver: [],
    tipsSeen: [],
    stats: initialStats(),
    achievements: {},
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
    driveway: [],
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
    challenge: {},
    races: [],
    stats: { partsSold: 0, hauls: 0, racesLost: {}, firstStartDone: false },
    revealed: ["haul"],
    candidates: [],
    shellsBought: 0,
    saleSat: {},
    notices: [],
    feed: [],
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

/** Fills in fields added after a save was written, so older saves keep loading. */
export function upgradeSave(game: GameState): GameState {
  const next = structuredClone(game);
  if (next.era && (next.run.featureWins.state !== undefined || next.era.milestones.includes("state"))) {
    next.meta.teamStateWon = true;
  }
  next.run.driveway ??= [];
  next.run.feed ??= [];
  next.run.challenge ??= {};
  next.meta.challengeRecords ??= {};
  // Players from before tips existed already know the systems they've seen.
  next.meta.tipsSeen ??= [...next.run.revealed];
  for (const job of next.run.jobs) {
    if (!job.race) continue;
    job.race.crewIds ??= [...new Set([...assignedRacingCrewIds(next), ...(job.lane.startsWith("crew:") ? [job.lane.slice(5)] : [])])];
    const spec = job.spec;
    const vehicle = spec.kind === "race" ? next.run.vehicles.find((v) => v.uid === spec.vehicleUid) : undefined;
    const part = job.race.weakestSlot ? vehicle?.parts[job.race.weakestSlot] : undefined;
    if (!job.race.weakestPart && part) job.race.weakestPart = { ...part };
  }
  refreshPerkUnlocks(next);
  if (!next.meta.stats) {
    // Counters that already exist elsewhere carry over; the rest start from zero.
    next.meta.stats = {
      ...initialStats(),
      firstPlayedAt: Date.now(),
      trips: Object.values(next.meta.codex.places).reduce((a, b) => a + b, 0),
      partsFound: Object.values(next.meta.codex.parts).reduce((a, b) => a + b, 0),
      scrapResets: next.scrap.resets,
    };
  }
  if (!next.meta.achievements) {
    // Quietly credit what an older save has already earned: no toasts, no feed spam.
    next.meta.achievements = {};
    evaluateAchievements(next, { silent: true });
  }
  return next;
}
