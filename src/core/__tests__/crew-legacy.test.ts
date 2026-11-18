import { describe, expect, it } from "vitest";
import { decodeGameState } from "@/game/save";
import { APPRENTICE_JOBS, HANDOVER_COST, crewHandoverOffers, type CrewHandoverChoice } from "../crewLegacy";
import { apply, createGame, must, type TeamChoices } from "../index";
import { teamAward } from "../layers";
import type { GameState } from "../types";

const MINUTE = 60_000;
const choices = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };
const teamChoices: TeamChoices = { ...choices, discipline: "dirt", teamName: "Back Bay", colors: ["#181818", "#ffffff"] };
const workshop = { type: "apprenticeship", mentorId: "rosa", routine: "clean" } as const;
const track = { type: "track_notes", mentorId: "deshawn", venueId: "dirt" } as const;

function cleanPart(game: GameState, uid: string): GameState {
  game.run.inventory.push({ uid, partId: "engine_lawn", condition: 1, origin: "test yard" });
  game = must(game, { type: "enqueue", spec: { kind: "clean", partUid: uid } });
  return must(game, { type: "advance", ms: 3 * MINUTE, away: true });
}

function openDirt(game: GameState): GameState {
  game.run.cash = 1000;
  game.run.rep = 60;
  game.run.vehicles.push({
    uid: "mower", vehicleId: "riding_mower", name: "Test Mower", builtAtSeasonMs: 0, tune: "balanced",
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    parts: Object.fromEntries(Object.entries({ engine: "engine_v4", wheel: "wheel_knobby", frame: "frame_mower" })
      .map(([slot, partId]) => [slot, { uid: `mower-${slot}`, partId, condition: 4, origin: "test yard" }])),
  });
  return must(game, { type: "openPlace", knowhowId: "place:dirt" });
}

function veterans(): GameState {
  const initial = createGame("paired-crew-legacy");
  initial.meta.stateWonEver = true;
  let game = must(initial, { type: "reset", layer: "team", choices: { ...teamChoices, organization: "collective" } });
  game = must(game, { type: "hire", crewId: "rosa" });
  game = must(game, { type: "hire", crewId: "deshawn" });
  game.era!.crew[0].jobsDone = 20 - APPRENTICE_JOBS;
  game.era!.crew[1].jobsDone = 17;
  game = must(game, { type: "assignCrew", crewId: "deshawn", assignment: { type: "driver" } });
  expect(crewHandoverOffers(game, "dirt")).toEqual([]);
  for (let job = 0; job < APPRENTICE_JOBS; job++) game = cleanPart(game, `old-team-${job}`);
  game = openDirt(game);
  for (let race = 0; race < 3; race++) {
    for (const part of Object.values(game.run.vehicles[0].parts)) part!.condition = 4;
    game = must(game, { type: "enqueue", spec: { kind: "race", vehicleUid: "mower", venueId: "dirt", event: "sprint", call: "nurse" } });
    game = must(game, { type: "advance", ms: 12 * MINUTE, away: true });
  }
  game.run.featureWins.county_fair = 0;
  return game;
}

function restart(game: GameState, handover?: CrewHandoverChoice): GameState {
  return must(game, { type: "reset", layer: "team", choices: { ...teamChoices, organization: "independent", handover } });
}

describe("Crew handovers", () => {
  it("offers both handovers from completed jobs and credited starts, on the same old team", () => {
    const game = decodeGameState(veterans())!;
    expect(crewHandoverOffers(game, "dirt")).toEqual([workshop, track]);
    expect(crewHandoverOffers(game, "drag")).toEqual([workshop]);
    expect(game.era?.crew[0].service?.workshop?.clean).toBe(APPRENTICE_JOBS);
    expect(game.era?.crew[1].service?.venues?.dirt?.dirt).toBe(3);
    expect(game.era?.crew[0].service?.venues).toBeUndefined();
    game.team.upgrades.old_hands = 1;
    expect(apply(game, { type: "reset", layer: "team", choices: { ...teamChoices, handover: workshop, keepCrewId: "rosa" } }).error).toMatch(/handover or stays/);
    game.team.tp = 0;
    expect(apply(game, { type: "reset", layer: "team", choices: { ...teamChoices, handover: workshop } }).error).toMatch(/8 Team Points/);
  });

  it("charges for a workshop apprenticeship and graduates after actual successor jobs", () => {
    const old = veterans();
    const balance = old.team.tp + teamAward(old);
    let game = restart(old, workshop);
    expect(game.team.tp).toBe(balance - HANDOVER_COST);
    expect(game.era?.crew).toEqual([]);
    expect(game.run.habitsKnown).not.toContain("clean");
    game = cleanPart(game, "player");
    expect(game.era?.handover).toMatchObject({ completed: 0 });
    game = must(game, { type: "hire", crewId: "benny" });
    game = cleanPart(game, "apprentice-0");
    expect(game.era?.handover).toMatchObject({ completed: 1, apprenticeId: "benny" });
    game = decodeGameState(game)!;
    game = must(game, { type: "dismiss", crewId: "benny" });
    expect(game.era?.handover).toMatchObject({ completed: 0 });
    game = must(game, { type: "hire", crewId: "pearl" });
    for (let job = 0; job < APPRENTICE_JOBS; job++) game = cleanPart(game, `new-apprentice-${job}`);
    expect(game.era?.handover).toMatchObject({ completed: 6, apprenticeId: "pearl" });
    expect(game.run.habitsKnown).toContain("clean");
    game = must(game, { type: "dismiss", crewId: "pearl" });
    game = decodeGameState(game)!;
    game.run.featureWins.county_fair = 0;
    game = must(game, { type: "reset", layer: "scrap", choices });
    expect(game.run.habitsKnown).toContain("clean");
    expect(game.era?.crew).toEqual([]);
  });

  it("uses the track handover only after the venue reopens and never awards a Feature", () => {
    const old = veterans();
    expect(apply(old, { type: "reset", layer: "team", choices: { ...teamChoices, discipline: "drag", handover: track } }).error).toMatch(/for this discipline/);
    const reference = restart(old, track);
    const regular = restart(old);
    expect(reference.team.tp).toBe(regular.team.tp - HANDOVER_COST);
    expect(reference.run.venuesOpen).not.toContain("dirt");
    expect(reference.era?.crew).toEqual([]);
    const noNotes = openDirt(regular);
    const withNotes = openDirt(decodeGameState(reference)!);
    expect(noNotes.run.ladder.dirt).toEqual(["sprint"]);
    expect(withNotes.run.ladder.dirt).toEqual(["sprint", "heat"]);
    expect(withNotes.run.featureWins.dirt).toBeUndefined();
    const heat = { type: "enqueue", spec: { kind: "race", vehicleUid: "mower", venueId: "dirt", event: "heat", call: "nurse" } } as const;
    expect(apply(noNotes, heat).error).not.toBeNull();
    expect(apply(withNotes, heat).error).toBeNull();
  });
});
