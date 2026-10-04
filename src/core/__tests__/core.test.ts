import { describe, expect, it } from "vitest";
import { CHANNELS, SOURCES, channel } from "../channels";
import { createGame, must } from "../index";
import { knowhowTier } from "../knowhowEngine";
import type { GameState, PartInstance } from "../types";

function haul(state: GameState, placeId = "curb", times = 1): GameState {
  let s = state;
  for (let i = 0; i < times; i++) {
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId } });
    s = must(s, { type: "advance", ms: 10 * 60_000 });
  }
  return s;
}

function give(state: GameState, partId: string, condition: PartInstance["condition"] = 3): GameState {
  const s = structuredClone(state);
  s.uid += 1;
  s.run.inventory.push({ uid: `t${s.uid}`, partId, condition, origin: "test" });
  return s;
}

describe("channel cohesion rule", () => {
  it("no channel has more than 3 sources", () => {
    for (const c of CHANNELS) expect(c.sources.length, c.id).toBeLessThanOrEqual(3);
  });

  it("no source touches more than 2 channels, and every source is wired both ways", () => {
    for (const source of SOURCES) {
      expect(source.channels.length, source.id).toBeLessThanOrEqual(2);
      for (const id of source.channels) expect(CHANNELS.find((c) => c.id === id)?.sources, `${source.id}→${id}`).toContain(source.id);
    }
    for (const c of CHANNELS) for (const id of c.sources) expect(SOURCES.find((s) => s.id === id), `${c.id}←${id}`).toBeDefined();
  });
});

describe("opening", () => {
  it("starts with one button at the curb and finds parts", () => {
    let s = createGame("t1");
    expect(s.run.revealed).toEqual(["haul"]);
    expect(s.run.placesOpen).toEqual(["curb"]);
    s = haul(s, "curb", 3);
    expect(s.run.inventory.length).toBeGreaterThan(0);
    expect(s.meta.codex.places.curb).toBe(3);
    expect(s.meta.journal.some((j) => j.id === "first_find")).toBe(true);
    expect(s.run.revealed).toContain("garage");
  });

  it("builds a push mower and races it", () => {
    let s = give(give(createGame("t2"), "engine_small", 3), "wheel_busted", 3);
    const engine = s.run.inventory.find((p) => p.partId === "engine_small")!;
    const wheel = s.run.inventory.find((p) => p.partId === "wheel_busted")!;
    s = must(s, { type: "enqueue", spec: { kind: "assemble", vehicleId: "push_mower", partUids: { engine: engine.uid, wheel: wheel.uid }, name: "" } });
    s = must(s, { type: "advance", ms: 2 * 60_000 });
    expect(s.run.vehicles).toHaveLength(1);
    expect(s.meta.journal.some((j) => j.id === "first_start")).toBe(true);
    s = must(s, { type: "enqueue", spec: { kind: "race", vehicleUid: s.run.vehicles[0].uid, venueId: "backyard", event: "sprint", call: "nurse" } });
    s = must(s, { type: "advance", ms: 2 * 60_000 });
    expect(s.run.races).toHaveLength(1);
    expect(s.run.races[0].beats.length).toBeGreaterThan(1);
  });

  it("refuses a job that's blocked and explains why", () => {
    const s = createGame("t3");
    const result = must.bind(null);
    expect(() => result(s, { type: "enqueue", spec: { kind: "haul", placeId: "junkyard" } })).toThrow(/isn't open/);
  });

  it("queues at most three jobs", () => {
    let s = createGame("t4");
    for (let i = 0; i < 4; i++) s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    expect(s.run.jobs).toHaveLength(1);
    expect(s.run.queue).toHaveLength(3);
    expect(() => must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } })).toThrow(/queue holds 3/);
  });
});

describe("habits", () => {
  it("turns 25 curb trips into a Habit that runs in a slot", () => {
    let s = haul(createGame("h1"), "curb", 25);
    expect(s.run.habitsKnown).toContain("haul:curb");
    s = must(s, { type: "setHabit", slot: 0, template: "haul:curb" });
    const before = s.meta.codex.places.curb;
    s = must(s, { type: "advance", ms: 60 * 60_000 });
    expect(s.meta.codex.places.curb - before).toBeGreaterThan(50);
  });

  it("Hand Tools Only (a data-only modifier) turns Habits off", () => {
    let s = createGame("h2");
    s.era = { discipline: "dirt", teamName: "T", colors: ["#000", "#fff"], crew: [], milestones: [], hardshipsCompleted: 0, legends: [], seasonIndex: 0 };
    s.config.hardships = ["hand_tools"];
    s = haul(s, "curb", 30);
    expect(s.run.habitsKnown).toHaveLength(0);
    expect(s.run.habitSlots).toHaveLength(0);
  });
});

describe("know-how tiers", () => {
  it("goes Learning → Familiar → Second Nature across Seasons", () => {
    const s = createGame("k1");
    expect(knowhowTier(s, "tech:welding")).toBe("learning");
    s.meta.knowhow["tech:welding"] = 1;
    expect(knowhowTier(s, "tech:welding")).toBe("familiar");
    s.meta.knowhow["tech:welding"] = 3;
    expect(knowhowTier(s, "tech:welding")).toBe("second_nature");
  });

  it("learns Second Nature know-how automatically when its trigger fires", () => {
    let s = createGame("k2");
    s.meta.knowhow["tech:welding"] = 3;
    s.run.cash = 500;
    s = must(s, { type: "buyTool", toolId: "welder" });
    expect(s.run.learned).toContain("tech:welding");
  });

  it("Familiar study takes a quarter of the time", () => {
    let s = createGame("k3");
    s.meta.knowhow["tech:welding"] = 1;
    s.run.cash = 500;
    s = must(s, { type: "buyTool", toolId: "welder" });
    s = must(s, { type: "enqueue", spec: { kind: "study", knowhowId: "tech:welding" } });
    expect(s.run.jobs[0].duration).toBe(60 * 60_000);
  });
});

describe("resets", () => {
  function fairWinner(seed: string): GameState {
    const s = createGame(seed);
    s.run.featureWins = { backyard: 1000, dirt: 2000, county_fair: 3000 };
    return s;
  }

  it("gates the Scrap Reset on the County Fair Feature", () => {
    const s = createGame("r1");
    expect(() => must(s, { type: "reset", layer: "scrap", choices: { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] } })).toThrow(/County Fair/);
  });

  it("awards LP from milestones, keeps meta, clears the Season", () => {
    let s = fairWinner("r2");
    s.run.cash = 999;
    s.run.learned.push("tech:patching");
    s.meta.codex.places.curb = 40;
    s = must(s, { type: "reset", layer: "scrap", choices: { perks: [], tuneUp: { haul: 5, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] } });
    expect(s.scrap.lp).toBe(2 + 5 + 12);
    expect(s.run.cash).toBe(0);
    expect(s.meta.codex.places.curb).toBe(40);
    expect(s.meta.knowhow["tech:patching"]).toBe(1);
    expect(s.config.tuneUp.haul).toBe(5);
    expect(channel(s, "haul_speed", { placeId: "yards" })).toBeCloseTo(1.5);
    expect(s.meta.seasonsPlayed).toBe(1);
  });

  it("rejects equipping more perks than slots or perks you don't own", () => {
    const s = fairWinner("r3");
    s.meta.perks = { tow_hitch: 1, night_owl: 1, kid_brother: 1 };
    const base = { tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };
    expect(() => must(s, { type: "reset", layer: "scrap", choices: { ...base, perks: ["tow_hitch", "night_owl", "kid_brother"] } })).toThrow(/perk slot/);
    expect(() => must(s, { type: "reset", layer: "scrap", choices: { ...base, perks: ["barn_find"] } })).toThrow(/don't own/);
  });

  it("Barn Find starts the Season with a rusted Riding Mower", () => {
    let s = fairWinner("r4");
    s.meta.perks = { barn_find: 1 };
    s = must(s, { type: "reset", layer: "scrap", choices: { perks: ["barn_find"], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] } });
    expect(s.run.vehicles[0].vehicleId).toBe("riding_mower");
    expect(s.run.learned).toContain("blueprint:riding_mower");
  });

  it("founds a team after a State win and clears the Scrap layer", () => {
    let s = fairWinner("r5");
    s.run.featureWins.regional = 4000;
    s.run.featureWins.state = 5000;
    s.meta.stateWonEver = true;
    s.scrap.lp = 50;
    s.scrap.lifetimeLp = 200;
    s.meta.perks = { tow_hitch: 2 };
    s = must(s, { type: "reset", layer: "team", choices: { perks: ["tow_hitch"], tuneUp: { haul: 0, wrench: 5, build: 0, race: 0 }, dare: null, hardships: [], discipline: "drag", teamName: "Curb Kings", colors: ["#c00", "#fff"] } });
    expect(s.era?.discipline).toBe("drag");
    expect(s.scrap.lp).toBe(0);
    expect(s.team.tp).toBeGreaterThan(10);
    expect(s.meta.perks.tow_hitch).toBe(2);
    expect(s.run.candidates.length).toBe(3);
    expect(s.run.habitSlots).toHaveLength(0);
  });
});
