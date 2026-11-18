import { describe, expect, it } from "vitest";
import { decodeGameState } from "@/game/save";
import { CREW_BY_ID, type TeamOrganization } from "../content/team";
import { racingCrewIds, teamOrganization } from "../crew";
import { apply, createGame, must, type TeamChoices } from "../index";
import type { GameState, JobSpec } from "../types";
import { racer } from "../../../tests/fixtures/rewrite";

const tuneUp = { haul: 0, wrench: 0, build: 0, race: 0 };
const scrapChoices = { perks: [], tuneUp, dare: null, hardships: [] };

function teamChoices(organization?: TeamOrganization): TeamChoices {
  return { ...scrapChoices, organization, discipline: "dirt", teamName: "Back Bay Racing", colors: ["#181818", "#eeeeee"] };
}

function builder(): GameState {
  const state = createGame("same-start-organizations");
  state.meta.stateWonEver = true;
  return state;
}

function found(state: GameState, organization: TeamOrganization): GameState {
  return must(state, { type: "reset", layer: "team", choices: teamChoices(organization) });
}

function prepareSecondSeason(state: GameState): GameState {
  state.run.featureWins.county_fair = 0;
  state = must(state, { type: "reset", layer: "scrap", choices: scrapChoices });
  for (const crewId of ["rosa", "benny"]) state = must(state, { type: "hire", crewId });
  state.run.inventory = ["one", "two", "three"].map((uid) => ({ uid, partId: "engine_lawn", condition: 1, origin: "test yard" }));
  return state;
}

function enqueue(state: GameState, spec: JobSpec): GameState {
  return must(state, { type: "enqueue", spec });
}

describe("Team organization", () => {
  it("pauses automatic crew jobs in Hand Tools Only while retaining manual race support", () => {
    let state = found(builder(), "independent");
    state = must(state, { type: "hire", crewId: "deshawn" });
    state = must(state, { type: "assignCrew", crewId: "deshawn", assignment: { type: "driver" } });
    state.run.featureWins.county_fair = 0;
    state = must(state, { type: "reset", layer: "scrap", choices: { ...scrapChoices, hardships: ["hand_tools"] } });
    state = must(state, { type: "hire", crewId: "rosa" });
    state = enqueue(enqueue(state, { kind: "haul", placeId: "curb" }), { kind: "haul", placeId: "curb" });
    expect(state.run.jobs.map((job) => job.lane)).toEqual(["hands"]);
    expect(state.run.queue).toHaveLength(1);
    state.run.vehicles = racer("manual-crew-support").run.vehicles;
    state = enqueue(state, { kind: "race", venueId: "backyard", event: "sprint", vehicleUid: "fixture-vehicle", call: "nurse" });
    state = must(state, { type: "advance", ms: 60 * 60_000, away: true });
    expect(state.run.races).toHaveLength(1);
    expect(state.era?.crew.find((member) => member.id === "rosa")?.jobsDone).toBe(0);
    expect(state.era?.crew.find((member) => member.id === "deshawn")?.service?.venues?.dirt?.backyard).toBe(1);
  });
  it("makes a mechanic available at the first Collective founding with a normal crew cap", () => {
    const start = builder();
    const independent = found(start, "independent");
    const collective = found(start, "collective");
    expect(independent.run.candidates.map((id) => CREW_BY_ID[id].role)).not.toContain("wrench");
    expect(collective.run.candidates.map((id) => CREW_BY_ID[id].role)).toContain("wrench");
    expect(collective.run.candidates).toHaveLength(independent.run.candidates.length);
    expect(collective.era?.crew).toEqual([]);
    expect(teamOrganization(decodeGameState(collective)!)).toBe("collective");
  });

  it("trades parallel trips for parallel repairs from the same season start", () => {
    const start = builder();
    const independent = prepareSecondSeason(found(start, "independent"));
    const collective = prepareSecondSeason(found(start, "collective"));
    const repairs = (team: GameState) => ["one", "two", "three"].reduce(
      (state, partUid) => enqueue(state, { kind: "clean", partUid }), team,
    );
    const jobs = (state: GameState, kind: JobSpec["kind"]) => state.run.jobs.filter((job) => job.spec.kind === kind);
    const selective = repairs(collective);
    const normal = repairs(independent);
    expect(jobs(normal, "clean").map((job) => job.lane)).toEqual(["bench:0"]);
    expect(jobs(selective, "clean").map((job) => job.lane)).toEqual(["crew:rosa", "bench:0"]);
    expect(selective.run.queue).toHaveLength(1);

    const trips = (team: GameState) => enqueue(enqueue(team, { kind: "haul", placeId: "curb" }), { kind: "haul", placeId: "curb" });
    const baselineTrips = trips(independent);
    const collectiveTrips = trips(collective);
    expect(jobs(baselineTrips, "haul").map((job) => job.lane)).toEqual(["hands", "crew:rosa"]);
    expect(jobs(collectiveTrips, "haul").map((job) => job.lane)).toEqual(["hands"]);
    expect(collectiveTrips.run.queue).toHaveLength(1);

    const raceWhileHauling = (team: GameState) => {
      const racing = enqueue(team, { kind: "haul", placeId: "curb" });
      racing.run.vehicles.push({
        uid: "mower", vehicleId: "push_mower", name: "Test Mower", builtAtSeasonMs: 0, tune: "balanced",
        history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
        parts: {
          engine: { uid: "mower-engine", partId: "engine_lawn", condition: 4, origin: "test yard" },
          wheel: { uid: "mower-wheel", partId: "wheel_basic", condition: 4, origin: "test yard" },
        },
      });
      return enqueue(racing, { kind: "race", venueId: "backyard", event: "sprint", call: "nurse", vehicleUid: "mower" });
    };
    const independentRace = raceWhileHauling(independent);
    const collectiveRace = raceWhileHauling(collective);
    expect(jobs(independentRace, "race").map((job) => job.lane)).toEqual(["crew:rosa"]);
    expect(jobs(collectiveRace, "race")).toEqual([]);
    expect(collectiveRace.run.queue[0]).toMatchObject({ kind: "race", vehicleUid: "mower" });

    const milliseconds = jobs(normal, "clean")[0].duration + 100;
    const away = (team: GameState) => must(team, { type: "advance", ms: milliseconds, away: true });
    const cleaned = (team: GameState) => team.run.inventory.filter((part) => part.condition > 1).length;
    expect(cleaned(away(selective))).toBe(2);
    expect(cleaned(away(normal))).toBe(1);
  });

  it("blocks crew travel habits and still permits a dedicated race driver", () => {
    let state = found(builder(), "collective");
    state = must(state, { type: "hire", crewId: "deshawn" });
    state.run.habitsKnown.push("haul:curb", "race", "clean");
    for (const template of ["haul:curb", "race:vehicle:backyard:sprint:nurse"]) {
      expect(apply(state, { type: "assignCrew", crewId: "deshawn", assignment: { type: "habit", template } }).error).toMatch(/Workshop Collective/);
    }
    state = must(state, { type: "assignCrew", crewId: "deshawn", assignment: { type: "habit", template: "clean" } });
    state = must(state, { type: "assignCrew", crewId: "deshawn", assignment: { type: "driver" } });
    expect(racingCrewIds(state)).toEqual(["deshawn"]);
  });

  it("retains the organization across Scrap Reset and changes it on a Team Reset", () => {
    let state = found(builder(), "collective");
    state.run.featureWins.county_fair = 0;
    state = must(state, { type: "reset", layer: "scrap", choices: scrapChoices });
    expect(teamOrganization(state)).toBe("collective");
    expect(state.run.candidates.some((id) => CREW_BY_ID[id].role === "wrench")).toBe(true);
    state.run.featureWins.county_fair = 0;
    const omitted = must(state, { type: "reset", layer: "team", choices: teamChoices() });
    expect(teamOrganization(omitted)).toBe("collective");
    state = must(state, { type: "reset", layer: "team", choices: teamChoices("independent") });
    expect(teamOrganization(state)).toBe("independent");
    expect(state.era?.discipline).toBe("dirt");
    delete state.era!.organization;
    expect(teamOrganization(decodeGameState(state)!)).toBe("independent");
  });
});
