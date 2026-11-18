import { describe, expect, it } from "vitest";
import { decodeGameState } from "@/game/save";
import { apply, must } from "../actions";
import { createGame } from "../index";
import { CHARTERS, currentTourEntry, needsNewScoringCar, ownerCharterBlocker, ownerEntryBlocker, ownerGate, ownerRecords, queuedTourProblem, sponsorProgress, titleForecast, tourCalendar, tourCash, tourGarage, tourRoundStandings, tourRoundToken, tourScore, type OwnerTour } from "../ownership";
import { resolveRace } from "../race";
import type { GameState, Vehicle } from "../types";

const HOUR = 3_600_000;
const STOCK = {
  body: "beater_shell", frame: "frame_cage", engine: "engine_v8", wheel: "wheel_slick", fuel: "fuel_cell",
  drivetrain: "drive_race", electronics: "elec_ignition", exhaust: "exhaust_headers",
};
const BEATER = {
  body: "beater_shell", frame: "frame_tube", engine: "engine_v6", wheel: "wheel_sport", fuel: "fuel_tank_large",
  drivetrain: "drive_manual", electronics: "elec_ecu", exhaust: "exhaust_straight",
};
const KART = {
  engine: "engine_v4", frame: "frame_kart", wheel: "wheel_dirt", fuel: "fuel_tank_large",
  drivetrain: "drive_chain", exhaust: "exhaust_glasspack",
};

function vehicle(uid: string, vehicleId: string, parts: Record<string, string>): Vehicle {
  return {
    uid, vehicleId, name: uid, tune: "balanced", builtAtSeasonMs: 0,
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    parts: Object.fromEntries(Object.entries(parts).map(([slot, partId]) => [
      slot, { uid: `${uid}:${slot}`, partId, condition: 4, origin: "test garage" },
    ])),
  };
}

function team(): GameState {
  const game = createGame("title-run");
  game.era = { discipline: "dirt", teamName: "Back Bay Racing", colors: ["#121212", "#eaeaea"], crew: [], milestones: [], hardshipsCompleted: 0, legends: [], seasonIndex: 1 };
  game.run.cash = 20_000;
  game.run.vehicles.push(vehicle("beater", "beater_car", BEATER), vehicle("stock", "street_stock", STOCK));
  for (const venue of ["dirt", "county_fair", "regional", "state"]) {
    game.run.venuesOpen.push(venue);
    game.run.ladder[venue] = ["sprint", "heat", "feature"];
    game.run.practice[venue] = 15;
  }
  return game;
}

function found(charter: "privateer" | "club" | "works" = "privateer"): GameState {
  const game = team();
  game.run.featureWins.state = 0;
  return must(game, { type: "owner", move: { type: "found", charter } });
}

function raceRound(game: GameState, carUid: string): GameState {
  const car = game.run.vehicles.find((candidate) => candidate.uid === carUid)!;
  for (const part of Object.values(car.parts)) part!.condition = 4;
  if (carUid === "kart") {
    const tour = game.owner!.tour;
    const stop = tourCalendar(tour)[tour.rounds.length];
    car.parts.wheel!.partId = stop.venueId === "dirt" ? "wheel_dirt" : "wheel_sport";
  }
  const entered = must(game, { type: "owner", move: { type: "enter", vehicleUid: carUid, call: "nurse" } });
  return must(entered, { type: "advance", ms: 25 * HOUR, away: true });
}

function finishTour(game: GameState, carUid: string): GameState {
  const tour = game.owner!.tour;
  for (let round = tour.rounds.length; round < CHARTERS[tour.charter].calendar.length; round++) {
    game = raceRound(game, carUid);
  }
  return game;
}

describe("Owner championships", () => {
  it("recommends a Works reserve for the last scoring slot after reloading", () => {
    let game = found("works");
    for (let round = 0; round < 4; round++) game = raceRound(game, "stock");
    game = decodeGameState(game)!;
    expect(needsNewScoringCar(game.owner!.tour)).toBe(true);
    expect(tourGarage(game, game.owner!.tour, "nurse").map((car) => car.uid)).toEqual(["beater", "stock"]);
    game = raceRound(game, "beater");
    expect(game.owner!.tour.status).toBe("champion");
    const invalid = structuredClone(game);
    invalid.owner!.tour.rounds[4]!.raceId = invalid.owner!.tour.rounds[0]!.raceId;
    expect(decodeGameState(invalid)).toBeNull();
  });
  it("retains the actual round setup for comparison after the garage resets", () => {
    let game = found();
    game.run.vehicles[0].tune = "power";
    game = finishTour(raceRound(game, "beater"), "stock");
    const setup = { engine: "engine_v6", tires: "wheel_sport", tune: "power", call: "nurse" };
    expect(game.owner!.tour.rounds[0]?.setup).toEqual(setup);
    game = must(game, {
      type: "reset", layer: "scrap", choices: { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] },
    });
    expect(game.run.vehicles).toEqual([]);
    game = must(game, { type: "owner", move: { type: "start", charter: "privateer" } });
    expect(decodeGameState(game)?.owner?.history[0].rounds[0]?.setup).toEqual(setup);
  });
  it("earns a five-Feature itinerary by winning the same charter across a Team Reset", () => {
    const endurance = { type: "owner", move: { type: "start", charter: "privateer", itinerary: "endurance" } } as const;
    let game = found();
    game = finishTour(raceRound(game, "beater"), "stock");
    expect(apply(game, endurance).error).toMatch(/two disciplines/);
    game = must(game, {
      type: "reset", layer: "team",
      choices: { teamName: "Back Bay Drag", colors: ["#000", "#fff"], discipline: "drag", perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] },
    });
    expect(game.era?.discipline).toBe("drag");
    game.run = team().run;
    game = must(game, { type: "owner", move: { type: "start", charter: "privateer" } });
    game = finishTour(raceRound(game, "beater"), "stock");
    expect(ownerRecords(game.owner!).drag.privateer?.titles).toBe(1);
    game = must(decodeGameState(game)!, endurance);
    expect(tourCalendar(game.owner!.tour).every((round) => round.event === "feature")).toBe(true);
    game = raceRound(game, "beater");
    game = raceRound(game, "stock");
    expect(game.run.races.at(-1)).toMatchObject({ venueId: "regional", event: "feature" });
  });
  it("earns a reverse itinerary and settles its new opening race after a reload", () => {
    const reverse = { type: "owner", move: { type: "start", charter: "privateer", itinerary: "reverse" } } as const;
    let game = found();
    const retired = must(game, { type: "owner", move: { type: "retire" } });
    expect(apply(retired, reverse).error).toMatch(/current discipline/);
    game = finishTour(raceRound(game, "beater"), "stock");
    game = must(game, reverse);
    expect(tourCalendar(game.owner!.tour)[0]).toEqual({ venueId: "state", event: "feature" });
    game = must(game, { type: "owner", move: { type: "enter", vehicleUid: "stock", call: "nurse" } });
    const loaded = decodeGameState(game);
    expect(loaded?.owner?.tour.itinerary).toBe("reverse");
    game = must(loaded!, { type: "advance", ms: 25 * HOUR, away: true });
    expect(game.run.races.at(-1)?.venueId).toBe("state");
    expect(game.owner!.tour.rounds[0]?.raceId).toBe(game.run.races.at(-1)?.id);
  });
  it("reconciles recorded tour cash against actual cash moved by a sponsored title", () => {
    let game = found();
    game = finishTour(raceRound(game, "beater"), "stock");
    const before = game.run.cash;
    game = must(game, { type: "owner", move: { type: "start", charter: "privateer", sponsor: "reliable" } });
    game = finishTour(raceRound(game, "beater"), "stock");
    expect(tourCash(game.owner!.tour)).toMatchObject({ entries: 790, stake: 150, sponsor: 600, title: 1600, net: game.run.cash - before });
    const legacy = structuredClone(game);
    delete legacy.owner!.tour.rounds[0]!.finance;
    expect(tourCash(decodeGameState(legacy)!.owner!.tour)).toBeNull();
  });
  it("settles sponsor contracts from real race results and accounts for a skipped round", () => {
    let game = found();
    game = finishTour(raceRound(game, "beater"), "stock");
    const sign = (sponsor?: OwnerTour["sponsor"]) => must(game, { type: "owner", move: { type: "start", charter: "privateer", sponsor } });
    const run = (tour: GameState) => finishTour(raceRound(tour, "beater"), "stock");
    const independent = run(sign());
    const consistent = run(sign("reliable"));
    expect(sponsorProgress(consistent.owner!.tour)).toEqual({ completed: 5, target: 5, payout: 600 });
    expect(consistent.run.cash - independent.run.cash).toBe(450);
    const winner = run(sign("front_row"));
    expect(sponsorProgress(winner.owner!.tour)?.payout).toBe(1550);
    expect(winner.run.cash - independent.run.cash).toBe(1100);
    const failed = finishTour(must(sign("reliable"), { type: "owner", move: { type: "skip" } }), "stock");
    expect(failed.owner!.tour.status).toBe("champion");
    expect(sponsorProgress(failed.owner!.tour)).toEqual({ completed: 4, target: 5, payout: 0 });
  });
  it("signs affordable sponsor terms only after an earned championship", () => {
    const start = { type: "owner", move: { type: "start", charter: "privateer", sponsor: "front_row" } } as const;
    let game = found();
    game = must(game, { type: "owner", move: { type: "retire" } });
    expect(apply(game, start).error).toMatch(/Win a championship/);
    game = must(game, { type: "owner", move: { type: "start", charter: "privateer" } });
    game = finishTour(raceRound(game, "beater"), "stock");
    game.run.cash = 449;
    expect(apply(game, start).error).toMatch(/450 Scrap Bucks/);
    game.run.cash = 450;
    game = must(game, start);
    expect(game.run.cash).toBe(0);
    expect(decodeGameState(game)?.owner?.tour.sponsor).toBe("front_row");
  });
  it("banks a discipline-specific personal best and rebuilds it from a legacy tour", () => {
    let game = found();
    game = raceRound(game, "beater");
    game = finishTour(game, "stock");
    const score = tourScore(game.owner!.tour).points;
    expect(ownerRecords(game.owner!).dirt.privateer).toEqual({ points: score, titles: 1 });
    expect(ownerRecords(game.owner!).drag.privateer).toBeUndefined();
    delete game.owner!.records;
    const legacy = decodeGameState(game)!;
    expect(ownerRecords(legacy.owner!).dirt.privateer).toEqual({ points: score, titles: 1 });
    game = must(legacy, { type: "owner", move: { type: "start", charter: "privateer" } });
    for (let round = 0; round < 5; round++) game = must(game, { type: "owner", move: { type: "skip" } });
    expect(decodeGameState(game)?.owner?.records?.dirt.privateer).toEqual({ points: score, titles: 1 });
  });
  it("marks the dropped round while crediting its car toward the fleet rule", () => {
    const tour: OwnerTour = {
      id: "works", charter: "works", discipline: "dirt", status: "champion",
      rounds: [4, 1, 1, 1, 1].map((position, round) => ({
        raceId: String(round), vehicleUid: round ? "stock" : "beater", carName: String(round), position, dnf: false,
      })),
    };
    expect(tourRoundStandings(tour)).toEqual([
      { points: 5, counts: false },
      ...Array.from({ length: 4 }, () => ({ points: 12, counts: true })),
    ]);
    expect(tourScore(tour)).toEqual({ points: 48, cars: 2, champion: true });
  });
  it("forecasts title feasibility and the effect of skipping", () => {
    let game = found();
    game = must(game, { type: "owner", move: { type: "skip" } });
    game = must(game, { type: "owner", move: { type: "skip" } });
    expect(titleForecast(game.owner!.tour)).toEqual({ maximum: 36, maximumAfterSkip: 24, status: "possible" });
    game = must(game, { type: "owner", move: { type: "skip" } });
    expect(titleForecast(game.owner!.tour)).toEqual({ maximum: 24, maximumAfterSkip: 12, status: "out" });
  });
  it("explains a competing ordinary entry and newly unaffordable queued entry", () => {
    const game = found();
    game.run.lastEntered["county_fair:feature"] = 0;
    const ordinary = must(game, { type: "enqueue", spec: { kind: "race", venueId: "county_fair", event: "feature", vehicleUid: "beater", call: "nurse" } });
    expect(ownerEntryBlocker(ordinary, ordinary.owner!.tour, "beater", "nurse")).toMatch(/ordinary entry/);
    const filed = must(game, { type: "owner", move: { type: "enter", vehicleUid: "beater", call: "nurse" } });
    expect(queuedTourProblem(filed, filed.owner!.tour)).toBeNull();
    filed.run.cash = 0;
    expect(queuedTourProblem(filed, filed.owner!.tour)).toMatch(/80 Scrap Bucks/);
  });
  it("suggests a ready venue-fit car over garage insertion order", () => {
    let game = found();
    expect(tourGarage(game, game.owner!.tour, "nurse").map((car) => car.uid)).toEqual(["beater"]);
    game = must(game, { type: "owner", move: { type: "skip" } });
    expect(tourGarage(game, game.owner!.tour, "nurse").map((car) => car.uid)).toEqual(["stock", "beater"]);
    delete game.run.vehicles.find((car) => car.uid === "stock")!.parts.engine;
    expect(tourGarage(game, game.owner!.tour, "nurse").map((car) => car.uid)).toEqual(["beater", "stock"]);
  });
  it("requires a Team-era State win and preserves the cars on founding", () => {
    const game = team();
    game.meta.stateWonEver = true;
    expect(ownerGate(game).ok).toBe(false);
    expect(apply(game, { type: "owner", move: { type: "found", charter: "privateer" } }).error).toMatch(/with a founded team/);
    const result = resolveRace(game, { kind: "race", venueId: "state", event: "feature", vehicleUid: "stock", call: "nurse" });
    expect(result?.position).toBe(1);
    expect(game.meta.teamStateWon).toBe(true);
    const promoted = must(game, { type: "owner", move: { type: "found", charter: "privateer" } });
    expect(promoted.run.vehicles).toEqual(game.run.vehicles);
    expect(promoted.era).toEqual(game.era);
    expect(promoted.team).toEqual(game.team);
  });

  it("pays a title once from actual race jobs, across cooldowns and a save reload", () => {
    let game = found();
    for (const [index, stop] of CHARTERS.privateer.calendar.entries()) {
      const carUid = stop.venueId === "county_fair" ? "beater" : "stock";
      const car = game.run.vehicles.find((candidate) => candidate.uid === carUid)!;
      for (const part of Object.values(car.parts)) part!.condition = 4;
      if (index === 0) game.run.lastEntered["county_fair:feature"] = 0;
      game = must(game, { type: "owner", move: { type: "enter", vehicleUid: carUid, call: "nurse" } });
      expect(currentTourEntry(game)).toBe(index === 0 ? "queued" : "racing");
      expect(apply(game, { type: "owner", move: { type: "enter", vehicleUid: carUid, call: "push" } }).error).toMatch(/already/);
      expect(game.owner!.tour.rounds).toHaveLength(index);
      const restored = decodeGameState(JSON.parse(JSON.stringify(game)));
      expect(restored).not.toBeNull();
      game = must(restored!, { type: "advance", ms: 15 * HOUR, away: true });
      expect(game.owner!.tour.rounds).toHaveLength(index + 1);
      expect(game.owner!.tour.rounds[index]?.raceId).toBe(game.run.races.at(-1)?.id);
    }
    expect(game.owner!.tour.status).toBe("champion");
    expect(game.owner!.titles).toBe(1);
    expect(game.team.tp).toBe(CHARTERS.privateer.teamPoints);
    game = must(game, { type: "advance", ms: HOUR });
    expect(game.team.tp).toBe(CHARTERS.privateer.teamPoints);
    game = must(game, { type: "owner", move: { type: "start", charter: "club" } });
    expect(game.owner!.history[0].status).toBe("champion");
    expect(game.owner!.titles).toBe(1);
  });

  it("keeps ordinary results and invalid imports out of the rounds", () => {
    let game = found();
    const ordinary = { kind: "race", venueId: "county_fair", event: "feature", vehicleUid: "beater", call: "nurse" } as const;
    const tagged = { ...ordinary, tourRound: tourRoundToken(game.owner!.tour) };
    expect(apply(game, { type: "enqueue", spec: tagged }).error).toMatch(/Owner calendar/);
    game = must(game, { type: "enqueue", spec: ordinary });
    game = must(game, { type: "advance", ms: HOUR });
    expect(game.run.races).toHaveLength(1);
    expect(game.owner!.tour.rounds).toHaveLength(0);
    game.run.queue.push({ ...tagged, tourRound: "stale:0" });
    expect(decodeGameState(game)).toBeNull();
  });

  it("honors kart restrictions, withdrawal, and resets without dropping records", () => {
    let game = found("club");
    expect(apply(game, { type: "owner", move: { type: "enter", vehicleUid: "beater", call: "nurse" } }).error).toMatch(/Go-Karts/);
    game = found();
    game.run.featureWins.county_fair = 0;
    game.run.lastEntered["county_fair:feature"] = 0;
    game = must(game, { type: "owner", move: { type: "enter", vehicleUid: "beater", call: "nurse" } });
    game = must(game, { type: "owner", move: { type: "withdraw" } });
    expect(currentTourEntry(game)).toBeNull();
    game = must(game, { type: "owner", move: { type: "skip" } });
    expect(game.owner!.tour.rounds).toEqual([null]);
    game = must(game, {
      type: "reset", layer: "scrap",
      choices: { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] },
    });
    expect(game.owner?.tour.status).toBe("retired");
    expect(game.owner?.tour.rounds).toEqual([null]);
    expect(decodeGameState(game)).not.toBeNull();
  });

  it("uses the best four finishes and requires two scoring cars in the Works Trophy", () => {
    const wins = [1, 2, 3, 4].map((round) => ({ raceId: `race-${round}`, vehicleUid: "lead", carName: "Lead", position: 1, dnf: false }));
    const tour: OwnerTour = { id: "test", charter: "works", discipline: "dirt", status: "active", rounds: [...wins, null] };
    expect(tourScore(tour)).toEqual({ points: 48, cars: 1, champion: false });
    tour.rounds[4] = { raceId: "race-5", vehicleUid: "second", carName: "Second", position: 6, dnf: false };
    expect(tourScore(tour)).toEqual({ points: 48, cars: 2, champion: true });
  });

  it("opens the County-to-State Cup after two different titles and still needs a scoring kart", () => {
    let game = found("club");
    game.run.vehicles.push(vehicle("kart", "go_kart", KART));
    const startCup = { type: "owner", move: { type: "start", charter: "county_to_state" } } as const;
    game = finishTour(game, "kart");
    expect(game.owner!.charterTitles.club).toBe(1);
    expect(apply(game, startCup).error).toMatch(/Independent Tour or Two-Car Works Trophy/);
    game = must(game, { type: "owner", move: { type: "start", charter: "club" } });
    game = finishTour(game, "kart");
    expect(game.owner!.titles).toBe(2);
    expect(apply(game, startCup).error).toMatch(/Independent Tour or Two-Car Works Trophy/);
    game = must(game, { type: "owner", move: { type: "start", charter: "privateer" } });
    for (const stop of CHARTERS.privateer.calendar) game = raceRound(game, stop.venueId === "county_fair" ? "beater" : "stock");
    expect(game.owner!.charterTitles.privateer).toBe(1);
    expect(game.meta.journalSeen).toContain("county_to_state_invite");

    // An older three-key championship save keeps its two qualifying titles.
    Reflect.deleteProperty(game.owner!.charterTitles, "county_to_state");
    const restored = decodeGameState(game);
    expect(restored?.owner?.charterTitles).toEqual({ privateer: 1, club: 2, works: 0, county_to_state: 0 });
    expect(ownerCharterBlocker(restored!, "county_to_state")).toBeNull();
    game = must(restored!, startCup);
    expect(apply(game, { type: "owner", move: { type: "enter", vehicleUid: "stock", call: "nurse" } }).error).toMatch(/requires a Go-Kart/);
    let stockOnly = must(game, { type: "owner", move: { type: "skip" } });
    stockOnly = must(stockOnly, { type: "owner", move: { type: "skip" } });
    stockOnly = finishTour(stockOnly, "stock");
    expect(tourScore(stockOnly.owner!.tour)).toEqual({ points: 36, cars: 1, champion: false });
    expect(stockOnly.owner!.tour.status).toBe("finished");
    expect(stockOnly.owner!.charterTitles.county_to_state).toBe(0);

    for (const stop of CHARTERS.county_to_state.calendar) {
      const wrong = stop.vehicleId === "go_kart" ? "stock" : "kart";
      expect(apply(game, { type: "owner", move: { type: "enter", vehicleUid: wrong, call: "nurse" } }).error).toMatch(/requires a/);
      game = raceRound(game, stop.vehicleId === "go_kart" ? "kart" : "stock");
      const reloaded = decodeGameState(game);
      expect(reloaded).not.toBeNull();
      game = reloaded!;
    }
    expect(game.owner!.tour.status).toBe("champion");
    expect(game.owner!.charterTitles.county_to_state).toBe(1);
    expect(game.owner!.tour.rounds.map((result) => result?.vehicleUid)).toEqual(["kart", "kart", "stock", "stock", "stock"]);
  });
});
