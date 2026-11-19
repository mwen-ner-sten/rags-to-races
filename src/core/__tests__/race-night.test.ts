import { describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { apply, createGame, must } from "../index";
import { nextRaceNightSpec } from "../raceNight";
import type { GameState, Vehicle } from "../types";

const MINUTE = 60_000;
const booking = { type: "raceNight", move: { type: "plan", vehicleUid: "mower-night", venueId: "backyard", call: "nurse" } } as const;

function garage(seed: string): GameState {
  const state = createGame(seed);
  const mower: Vehicle = {
    uid: "mower-night", vehicleId: "push_mower", name: "Evening Mower", tune: "balanced",
    parts: {
      engine: { uid: "engine-night", partId: "engine_lawn", condition: 4, origin: "Curbside" },
      wheel: { uid: "wheel-night", partId: "wheel_knobby", condition: 4, origin: "Curbside" },
    },
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, builtAtSeasonMs: 0,
  };
  state.run.vehicles.push(mower);
  state.run.inventory.push({ uid: "bench-wheel", partId: "wheel_basic", condition: 1, origin: "Curbside" });
  state.run.cash = 50;
  return state;
}

describe("Race Night", () => {
  it("reserves hands but not the bench, survives reload, and progresses an ordinary ladder while away", () => {
    const seed = garage("race-night-podiums");
    seed.run.lastEntered["backyard:sprint"] = 0;
    let planned = must(seed, booking);
    planned = must(planned, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    planned = must(planned, { type: "enqueue", spec: { kind: "clean", partUid: "bench-wheel" } });
    expect(planned.run.habitsKnown).toEqual([]);
    expect(planned.run.queue).toEqual([{ kind: "haul", placeId: "curb" }]);
    expect(planned.run.jobs.map((job) => job.spec.kind)).toEqual(["clean"]);
    const extraRace = apply(planned, { type: "enqueue", spec: { kind: "race", vehicleUid: "mower-night", venueId: "backyard", event: "sprint", call: "nurse" } });
    expect(extraRace.error).toContain("reserved for Race Night");
    planned = decodeGameState(planned)!;
    expect(nextRaceNightSpec(planned)).toMatchObject({ event: "sprint", vehicleUid: "mower-night" });
    expect(planned.run.raceNight?.startsLeft).toBe(3);

    const first = must(planned, { type: "advance", ms: planned.run.jobs[0].remaining, away: true });
    expect(first.run.inventory[0].condition).toBe(2);
    expect(first.run.stats.hauls).toBe(0);
    const finish = must(first, { type: "advance", ms: 80 * MINUTE, away: true });
    expect(finish.run.races.map((result) => result.event)).toEqual(["sprint", "heat", "feature"]);
    expect(finish.run.featureWins.backyard).toBeDefined();
    expect(finish.run.raceNight).toBeUndefined();
    expect(finish.run.stats.hauls).toBe(1);
    expect(decodeGameState(finish)).toBeTruthy();

    const standard = must(seed, { type: "advance", ms: 81 * MINUTE, away: true });
    expect(standard.run.races).toEqual([]);
  });

  it("limits prize nights to three ordinary paid starts and preserves completed work", () => {
    let state = garage("race-night-bounds");
    state.run.featureWins.backyard = 0;
    state.run.ladder.backyard = ["sprint", "heat", "feature"];
    state = must(state, booking);
    state = must(state, { type: "advance", ms: 48 * 60 * MINUTE, away: true });
    expect(state.run.races).toHaveLength(3);
    expect(state.run.races.every((race) => race.event === "feature")).toBe(true);
    expect(state.run.cash).toBe(50 - 3 * 5 + state.run.races.reduce((total, race) => total + race.prize, 0));
    expect(state.run.featureWins.backyard).toBe(0);
    expect(state.run.raceNight).toBeUndefined();
  });

  it("releases the hands reservation when the selected milestone is already reached", () => {
    let state = garage("race-night-milestone-complete");
    state.run.available.push("tech:rebuilding");
    state = must(state, { type: "enqueue", spec: { kind: "study", knowhowId: "tech:rebuilding" } });
    state = must(state, booking);
    expect(state.run.raceNight?.startsLeft).toBe(3);
    state.run.featureWins.backyard = 0;
    state = must(state, { type: "advance", ms: 1, away: true });
    expect(state.run.raceNight).toBeUndefined();
    expect(state.run.jobs[0].spec.kind).toBe("study");
    expect(decodeGameState(state)).toBeTruthy();
  });

  it("allows cancellation without stopping a running race and rejects stale save references", () => {
    const state = garage("race-night-cancel");
    let planned = must(state, booking);
    expect(apply(planned, booking).error).toMatch(/Cancel the current Race Night/);
    expect(decodeGameState({ ...planned, run: { ...planned.run, raceNight: { ...planned.run.raceNight, vehicleUid: "missing" } } })).toBeNull();
    planned = must(planned, { type: "raceNight", move: { type: "cancel" } });
    expect(planned.run.jobs[0].spec.kind).toBe("race");
    planned = must(planned, { type: "advance", ms: 24 * 60 * MINUTE, away: true });
    expect(planned.run.races).toHaveLength(1);
    expect(planned.run.raceNight).toBeUndefined();
    expect(decodeGameState(state)).toBeTruthy();
  });
});
