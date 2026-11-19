import type { GameState, LifetimeStats } from "./types";

/** Lifetime counters live in `meta`, so they survive every reset. */
export function initialStats(): LifetimeStats {
  return {
    firstPlayedAt: null,
    trips: 0, partsFound: 0, partsSold: 0, partsStripped: 0, partsCleaned: 0, partsRepaired: 0, partsRestored: 0,
    benchJobs: 0, vehiclesBuilt: 0, vehiclesBuiltBy: {},
    cashEarned: 0, cashSpent: 0, prizeMoney: 0,
    racesEntered: 0, raceWins: 0, podiums: 0, dnfs: 0, featureWins: 0, featureWinsBy: {},
    winStreak: 0, bestWinStreak: 0, dnfStreak: 0, bestDnfStreak: 0, winsOnScrapPart: 0,
    recordsBroken: 0, scrapResets: 0,
  };
}

/** Adds Scrap Bucks to the purse and the lifetime income counter. */
export function earn(state: GameState, amount: number): void {
  if (!(amount > 0)) return;
  state.run.cash += amount;
  state.meta.stats.cashEarned += amount;
}

/** Takes Scrap Bucks from the purse and counts them as spent. */
export function spend(state: GameState, amount: number): void {
  if (!(amount > 0)) return;
  state.run.cash -= amount;
  state.meta.stats.cashSpent += amount;
}

/** Gives back Scrap Bucks that were paid for something that never happened (a cancelled job). */
export function refund(state: GameState, amount: number): void {
  if (!(amount > 0)) return;
  state.run.cash += amount;
  state.meta.stats.cashSpent = Math.max(0, state.meta.stats.cashSpent - amount);
}

export interface RaceOutcome {
  won: boolean;
  dnf: boolean;
  position: number;
  prize: number;
  feature: boolean;
  venueId: string;
  /** A part on the car was in Scrap condition when the flag dropped. */
  scrapOnCar: boolean;
}

/** Counts one finished race: entries, wins, podiums, DNFs, streaks and Feature wins. */
export function recordRace(state: GameState, race: RaceOutcome): void {
  const s = state.meta.stats;
  s.racesEntered += 1;
  s.prizeMoney += race.prize;
  if (race.dnf) {
    s.dnfs += 1;
    s.dnfStreak += 1;
    s.bestDnfStreak = Math.max(s.bestDnfStreak, s.dnfStreak);
  } else {
    s.dnfStreak = 0;
    if (race.position <= 3) s.podiums += 1;
  }
  if (race.won) {
    s.raceWins += 1;
    s.winStreak += 1;
    s.bestWinStreak = Math.max(s.bestWinStreak, s.winStreak);
    if (race.scrapOnCar) s.winsOnScrapPart += 1;
    if (race.feature) {
      s.featureWins += 1;
      s.featureWinsBy[race.venueId] = (s.featureWinsBy[race.venueId] ?? 0) + 1;
    }
  } else {
    s.winStreak = 0;
  }
}
