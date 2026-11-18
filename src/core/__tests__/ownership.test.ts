import { describe, expect, it } from "vitest";
import { decodeGameState } from "@/game/save";
import { apply, must } from "../actions";
import { createGame } from "../index";
import { CHARTERS, currentTourEntry, ownerCharterBlocker, ownerGate, tourRoundToken, tourScore, type OwnerTour } from "../ownership";
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
    const stop = CHARTERS[tour.charter].calendar[tour.rounds.length];
    car.parts.wheel!.partId = stop.venueId === "dirt" ? "wheel_dirt" : "wheel_sport";
  }
  const entered = must(game, { type: "owner", move: { type: "enter", vehicleUid: carUid, call: "nurse" } });
  return must(entered, { type: "advance", ms: 25 * HOUR, away: true });
}

describe("Owner championships", () => {
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
    for (const _ of CHARTERS.club.calendar) game = raceRound(game, "kart");
    expect(game.owner!.charterTitles.club).toBe(1);
    expect(apply(game, startCup).error).toMatch(/Independent Tour or Two-Car Works Trophy/);
    game = must(game, { type: "owner", move: { type: "start", charter: "club" } });
    for (const _ of CHARTERS.club.calendar) game = raceRound(game, "kart");
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
    for (const _ of CHARTERS.county_to_state.calendar.slice(2)) stockOnly = raceRound(stockOnly, "stock");
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
