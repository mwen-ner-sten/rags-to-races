import { describe, expect, it } from "vitest";
import { apply, createGame, must } from "../index";
import type { GameState, Vehicle } from "../types";

const ERA = { discipline: "dirt" as const, teamName: "T", colors: ["#000", "#fff"] as [string, string], crew: [], milestones: [], hardshipsCompleted: 0, legends: [], seasonIndex: 0 };

function racer(seed: string): GameState {
  const s = createGame(seed);
  const v: Vehicle = {
    uid: "v1",
    vehicleId: "push_mower",
    name: "T",
    parts: { engine: { uid: "a", partId: "engine_lawn", condition: 4, origin: "t" }, wheel: { uid: "b", partId: "wheel_basic", condition: 4, origin: "t" } },
    tune: "balanced",
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    builtAtSeasonMs: 0,
  };
  s.run.vehicles.push(v);
  s.run.habitsKnown.push("race");
  s.run.cash = 1000;
  return s;
}

describe("review fixes", () => {
  it("offline catch-up runs a Race Day Habit as often as live play", () => {
    const template = "race:v1:backyard:sprint:nurse";
    let live = must(racer("gate"), { type: "setHabit", slot: 0, template });
    let away = must(racer("gate"), { type: "setHabit", slot: 0, template });
    for (let i = 0; i < 120; i++) live = must(live, { type: "advance", ms: 30_000 });
    away = must(away, { type: "advance", ms: 60 * 60_000, away: true });
    expect(away.run.races.length).toBeGreaterThan(5);
    expect(Math.abs(away.run.races.length - live.run.races.length)).toBeLessThanOrEqual(1);
  });

  it("cancelling a job refunds what it cost and frees the event", () => {
    let s = racer("refund");
    s = must(s, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } });
    const job = s.run.jobs[0];
    s = must(s, { type: "cancelJob", jobId: job.id });
    expect(s.run.cash).toBe(1000);
    expect(apply(s, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } }).error).toBeNull();
  });

  it("rejects negative or fractional tune-up points", () => {
    const s = createGame("tune");
    s.run.featureWins = { county_fair: 1 };
    const bad = apply(s, { type: "reset", layer: "scrap", choices: { perks: [], tuneUp: { haul: -100, wrench: 5, build: 0, race: 0 }, dare: null, hardships: [] } });
    expect(bad.error).toMatch(/whole numbers/);
  });

  it("crew windows and stale habit assignments are reset each Season", () => {
    let s = createGame("crewreset");
    s.era = { ...structuredClone(ERA), crew: [{ id: "gus", assignment: { type: "habit", template: "repair" }, morale: 10, workedInWindowMs: 20 * 3_600_000, windowStartMs: 100 * 3_600_000, jobsDone: 3 }] };
    s.run.featureWins = { county_fair: 1 };
    s = must(s, { type: "reset", layer: "scrap", choices: { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] } });
    const gus = s.era!.crew[0];
    expect(gus).toMatchObject({ windowStartMs: 0, workedInWindowMs: 0, morale: 100, assignment: { type: "queue" }, jobsDone: 3 });
  });

  it("a bench specialist on the queue takes bench jobs", () => {
    let s = createGame("bench-crew");
    s.era = { ...structuredClone(ERA), crew: [{ id: "gus", assignment: { type: "queue" }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 0 }] };
    s.run.inventory.push({ uid: "x", partId: "engine_small", condition: 1, origin: "t" });
    s = must(s, { type: "enqueue", spec: { kind: "clean", partUid: "x" } });
    expect(s.run.jobs[0].lane).toBe("crew:gus");
  });

  it("the driver's call needs a driver", () => {
    const s = racer("call2");
    expect(apply(s, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "push", call2: "launch_hard" } }).error).toMatch(/driver/);
  });

  it("a bare Race Day template can't be given to crew", () => {
    let s = racer("crewrace");
    s.era = { ...structuredClone(ERA), crew: [{ id: "tina", assignment: { type: "queue" }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 0 }] };
    expect(apply(s, { type: "assignCrew", crewId: "tina", assignment: { type: "habit", template: "race" } }).error).toMatch(/race setup/);
    s = must(s, { type: "assignCrew", crewId: "tina", assignment: { type: "habit", template: "race:v1:backyard:sprint:nurse" } });
    expect(s.run.jobs.some((j) => j.lane === "crew:tina")).toBe(true);
  });

  it("a job that starts straight away is accepted even with a full queue", () => {
    let s = createGame("fullq");
    s.run.placesOpen.push("yards");
    for (let i = 0; i < 4; i++) s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    s.run.inventory.push({ uid: "x", partId: "engine_small", condition: 1, origin: "t" });
    s = must(s, { type: "enqueue", spec: { kind: "clean", partUid: "x" } });
    expect(s.run.jobs.some((j) => j.spec.kind === "clean")).toBe(true);
  });
});
