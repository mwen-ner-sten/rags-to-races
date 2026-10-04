import { describe, expect, it } from "vitest";
import { apply, createGame, must } from "../index";
import { partSellValue } from "../garage";
import { teamAward } from "../layers";
import { resolveRace, winChance } from "../race";
import type { GameState, PartInstance, Vehicle } from "../types";

function withVehicle(seed: string, vehicleId = "push_mower", parts: Record<string, string> = { engine: "engine_small", wheel: "wheel_busted" }, condition: PartInstance["condition"] = 3): { s: GameState; v: Vehicle } {
  const s = createGame(seed);
  const vparts: Vehicle["parts"] = {};
  for (const [slot, partId] of Object.entries(parts)) vparts[slot] = { uid: `p-${slot}`, partId, condition, origin: "test" };
  const v: Vehicle = { uid: "v1", vehicleId, name: "Test", parts: vparts, tune: "balanced", history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, builtAtSeasonMs: 0 };
  s.run.vehicles.push(v);
  return { s, v };
}

const TEAM_ERA = { discipline: "dirt" as const, teamName: "T", colors: ["#000", "#fff"] as [string, string], crew: [], milestones: [], hardshipsCompleted: 0, legends: [], seasonIndex: 0 };

describe("races", () => {
  it("are deterministic for the same seed and state", () => {
    const a = withVehicle("race-det").s;
    const b = withVehicle("race-det").s;
    const spec = { kind: "race" as const, vehicleUid: "v1", venueId: "backyard", event: "sprint" as const, call: "push" as const };
    const ra = resolveRace(a, spec);
    const rb = resolveRace(b, spec);
    expect(ra?.position).toBe(rb?.position);
    expect(ra?.dnf).toBe(rb?.dnf);
  });

  it("run on a schedule: the same event can't be entered again until it comes round", () => {
    let { s } = withVehicle("sched");
    s = must(s, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } });
    s = must(s, { type: "advance", ms: 61_000 });
    const again = apply(s, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } });
    expect(again.error).toMatch(/Next sprint in/);
    s = must(s, { type: "advance", ms: 2 * 60_000 });
    expect(apply(s, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } }).error).toBeNull();
  });

  it("a better car has better odds, and Push beats Nurse on pace", () => {
    const weak = withVehicle("odds", "push_mower", { engine: "engine_small", wheel: "wheel_busted" }, 1);
    const strong = withVehicle("odds", "push_mower", { engine: "engine_lawn", wheel: "wheel_basic" }, 4);
    expect(winChance(strong.s, strong.v, "backyard", "feature", "nurse")).toBeGreaterThan(winChance(weak.s, weak.v, "backyard", "feature", "nurse"));
  });

  it("refuses a car with a part out on the bench", () => {
    let { s } = withVehicle("pulled");
    s = must(s, { type: "uninstall", vehicleUid: "v1", slot: "engine" });
    expect(apply(s, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } }).error).toMatch(/out on the bench/);
  });

  it("a Feature win opens the next venue and records a rival result", () => {
    const { s, v } = withVehicle("feat", "riding_mower", { engine: "engine_v4", wheel: "wheel_kart", frame: "frame_kart" }, 4);
    s.run.venuesOpen.push("dirt");
    s.run.ladder.dirt = ["sprint", "heat", "feature"];
    s.run.practice.dirt = 10;
    let won = false;
    for (let i = 0; i < 30 && !won; i++) {
      const r = resolveRace(s, { kind: "race", vehicleUid: v.uid, venueId: "dirt", event: "feature", call: "nurse" });
      won = !!r && r.position === 1 && !r.dnf;
    }
    expect(won).toBe(true);
    expect(s.run.venuesOpen).toContain("county_fair");
    expect(s.meta.rivals.marisol.wins).toBeGreaterThan(0);
  });
});

describe("economy", () => {
  it("the dealer pays less for a pile of the same part, and recovers over time", () => {
    let s = createGame("sat");
    for (let i = 0; i < 6; i++) s.run.inventory.push({ uid: `e${i}`, partId: "engine_v4", condition: 3, origin: "test" });
    const first = partSellValue(s, s.run.inventory[0]);
    s = must(s, { type: "sell", partUids: ["e0", "e1", "e2", "e3", "e4"] });
    const after = partSellValue(s, s.run.inventory[0]);
    expect(after).toBeLessThan(first);
    s = must(s, { type: "advance", ms: 10 * 3_600_000 });
    expect(partSellValue(s, s.run.inventory[0])).toBe(first);
  });

  it("the Parts Counter only sells parts you've seen, near your tier", () => {
    let s = createGame("counter");
    s.run.revealed.push("tools");
    s.run.cash = 10_000;
    expect(apply(s, { type: "buyPart", partId: "engine_lawn" }).error).toMatch(/never seen/);
    s.meta.codex.parts.engine_lawn = 1;
    s.meta.codex.parts.engine_v6 = 1;
    s = must(s, { type: "buyPart", partId: "engine_lawn" });
    expect(s.run.inventory.at(-1)).toMatchObject({ partId: "engine_lawn", condition: 3 });
    expect(apply(s, { type: "buyPart", partId: "engine_v6" }).error).toMatch(/Too far ahead/);
  });

  it("selling a part on the bench is refused", () => {
    let s = createGame("busy");
    s.run.inventory.push({ uid: "x", partId: "engine_small", condition: 1, origin: "t" });
    s = must(s, { type: "enqueue", spec: { kind: "clean", partUid: "x" } });
    expect(apply(s, { type: "sell", partUids: ["x"] }).error).toMatch(/worked on/);
  });

  it("garage overflow sells the cheapest parts", () => {
    const s = createGame("overflow");
    for (let i = 0; i < 14; i++) s.run.inventory.push({ uid: `j${i}`, partId: i < 2 ? "engine_v4" : "junk_misc", condition: 1, origin: "t" });
    const next = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    const done = must(next, { type: "advance", ms: 20_000 });
    expect(done.run.inventory.length).toBeLessThanOrEqual(12);
    expect(done.run.inventory.filter((p) => p.partId === "engine_v4")).toHaveLength(2);
  });
});

describe("time", () => {
  it("one long advance equals many short ones", () => {
    const setup = (seed: string) => {
      let s = createGame(seed);
      s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
      s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
      s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
      return s;
    };
    let a = setup("eq");
    a = must(a, { type: "advance", ms: 120_000 });
    let b = setup("eq");
    for (let i = 0; i < 240; i++) b = must(b, { type: "advance", ms: 500 });
    expect(b.run.inventory.map((p) => p.partId)).toEqual(a.run.inventory.map((p) => p.partId));
    expect(b.run.seasonMs).toBeCloseTo(a.run.seasonMs, 0);
  });

  it("no job runs longer than 8 hours", () => {
    let s = createGame("cap");
    s.run.inventory.push({ uid: "shell", partId: "beater_shell", condition: 2, origin: "t" });
    s.run.learned.push("tech:bodywork");
    s.run.materials.metal = 50;
    s = must(s, { type: "enqueue", spec: { kind: "repair", partUid: "shell" } });
    expect(s.run.jobs[0].duration).toBeLessThanOrEqual(8 * 3_600_000);
  });
});

describe("team era", () => {
  it("hires crew from this Season's candidates, up to capacity", () => {
    let s = createGame("crew");
    s.era = structuredClone(TEAM_ERA);
    s.run.candidates = ["gus", "tina", "deshawn"];
    s = must(s, { type: "hire", crewId: "gus" });
    s = must(s, { type: "hire", crewId: "tina" });
    expect(apply(s, { type: "hire", crewId: "deshawn" }).error).toMatch(/No room/);
    expect(apply(s, { type: "assignCrew", crewId: "gus", assignment: { type: "driver" } }).error).toMatch(/isn't a driver/);
  });

  it("crew work in parallel and tire when overworked", () => {
    let s = createGame("morale");
    s.era = { ...structuredClone(TEAM_ERA), crew: [{ id: "tina", assignment: { type: "queue" }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 0 }] };
    s.run.placesOpen.push("yards");
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "yards" } });
    expect(s.run.jobs.map((j) => j.lane).sort()).toEqual(["crew:tina", "hands"]);
  });

  it("Team Points come from the team's milestones, hardships and legends", () => {
    const s = createGame("tp");
    s.era = { ...structuredClone(TEAM_ERA), milestones: ["county_fair", "regional"], hardshipsCompleted: 2 };
    expect(teamAward(s)).toBe(5 + 15 + 10);
  });

  it("completing the County Fair under a hardship banks its mastery", () => {
    const { s, v } = withVehicle("hard", "beater_car", { body: "beater_shell", engine: "engine_v6", wheel: "wheel_sport", frame: "frame_steel", fuel: "fuel_tank_large", drivetrain: "drive_manual" }, 4);
    s.era = structuredClone(TEAM_ERA);
    s.config.hardships = ["rust_everything"];
    s.run.venuesOpen.push("county_fair");
    s.run.ladder.county_fair = ["sprint", "heat", "feature"];
    s.run.practice.county_fair = 10;
    for (let i = 0; i < 40 && s.run.featureWins.county_fair === undefined; i++) {
      resolveRace(s, { kind: "race", vehicleUid: v.uid, venueId: "county_fair", event: "feature", call: "nurse" });
      for (const part of Object.values(v.parts)) if (part) part.condition = 4;
    }
    expect(s.run.featureWins.county_fair).toBeDefined();
    expect(s.meta.hardshipMastery.rust_everything).toBe(1);
    expect(s.era?.hardshipsCompleted).toBe(1);
  });

  it("a dare completes and unlocks its perk", () => {
    const { s, v } = withVehicle("dare", "riding_mower", { engine: "engine_v4", wheel: "wheel_kart", frame: "frame_kart" }, 4);
    s.config.dare = "mower_madness";
    s.run.venuesOpen.push("dirt");
    s.run.ladder.dirt = ["sprint", "heat", "feature"];
    s.run.practice.dirt = 10;
    for (let i = 0; i < 40 && s.run.featureWins.dirt === undefined; i++) {
      resolveRace(s, { kind: "race", vehicleUid: v.uid, venueId: "dirt", event: "feature", call: "nurse" });
      for (const part of Object.values(v.parts)) if (part) part.condition = 4;
    }
    expect(s.meta.daresCompleted).toContain("mower_madness");
    expect(s.meta.perksUnlocked).toContain("underdog");
  });

  it("Drag changes the rules: shorter races and engines that let go", () => {
    const dirt = withVehicle("drag", "push_mower", undefined, 3).s;
    const drag = withVehicle("drag", "push_mower", undefined, 3).s;
    drag.era = { ...structuredClone(TEAM_ERA), discipline: "drag" };
    const a = must(dirt, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } });
    const b = must(drag, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } });
    expect(b.run.jobs[0].duration).toBeLessThan(a.run.jobs[0].duration);
  });
});
