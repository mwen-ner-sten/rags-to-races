import { describe, expect, it } from "vitest";
import { apply, createGame, must } from "../index";
import { DRIVEWAY_SPACE, partSellValue, stowFinds } from "../garage";
import { upgradeSave } from "../state";
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

  it("run on a schedule: signing up between runs waits for the next one", () => {
    let { s } = withVehicle("sched");
    const sprint = { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "nurse" } as const;
    s = must(s, { type: "enqueue", spec: sprint });
    s = must(s, { type: "advance", ms: 61_000 });
    expect(s.run.races).toHaveLength(1);
    s = must(s, { type: "enqueue", spec: sprint });
    expect(apply(s, { type: "enqueue", spec: sprint }).error).toMatch(/already signed up/);
    s = must(s, { type: "advance", ms: 30_000 });
    expect(s.run.queue).toHaveLength(1);
    expect(s.run.jobs.some((j) => j.spec.kind === "race")).toBe(false);
    s = must(s, { type: "advance", ms: 3 * 60_000 });
    expect(s.run.queue).toHaveLength(0);
    expect(s.run.races).toHaveLength(2);
  });

  it("a race is rolled at the green flag and paid out exactly as rolled", () => {
    let { s } = withVehicle("rolled");
    s = must(s, { type: "enqueue", spec: { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "sprint", call: "push" } });
    const job = s.run.jobs.find((j) => j.spec.kind === "race");
    expect(job?.race?.beats.length).toBeGreaterThanOrEqual(3);
    const roll = job!.race!;
    s = must(s, { type: "advance", ms: 2 * 60_000 });
    const result = s.run.races[s.run.races.length - 1];
    expect(result.position).toBe(roll.position);
    expect(result.dnf).toBe(roll.dnf);
    expect(result.beats).toEqual(roll.beats);
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

  it("a full garage never loses parts: finds wait on the driveway", () => {
    const s = createGame("overflow");
    for (let i = 0; i < 12; i++) s.run.inventory.push({ uid: `g${i}`, partId: "junk_misc", condition: 1, origin: "t" });
    const next = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    const done = must(next, { type: "advance", ms: 20 * 60_000 });
    expect(done.run.inventory.map((p) => p.uid)).toEqual(s.run.inventory.map((p) => p.uid));
    expect(done.run.driveway.length).toBeGreaterThan(0);
    expect(done.run.notices).toEqual([]);
  });
});

function fullGarage(seed: string): GameState {
  const s = createGame(seed);
  for (let i = 0; i < 12; i++) s.run.inventory.push({ uid: `g${i}`, partId: "engine_v4", condition: 3, origin: "t" });
  return s;
}

const find = (uid: string, partId: string): PartInstance => ({ uid, partId, condition: 1, origin: "t" });

describe("driveway", () => {
  it("by default strips junk, then sells the cheapest, and says what went", () => {
    const s = fullGarage("dw1");
    const finds = [find("a", "junk_seat"), ...Array.from({ length: 5 }, (_, i) => find(`e${i}`, "engine_lawn")), find("w", "wheel_busted"), find("v", "engine_v6")];
    const metal = s.run.materials.metal;
    stowFinds(s, finds);
    expect(s.run.inventory).toHaveLength(12);
    expect(s.run.driveway).toHaveLength(DRIVEWAY_SPACE);
    expect(s.run.driveway.some((p) => p.uid === "a" || p.uid === "w")).toBe(false);
    expect(s.run.driveway.some((p) => p.uid === "v")).toBe(true);
    expect(s.run.materials.metal).toBe(metal + 1);
    expect(s.run.notices[0]).toMatch(/stripped Old Seat .*sold Busted Wheel/);
    expect(s.run.stats.drivewayOverflows).toBe(1);
  });

  it("Sorting lets you leave the newest finds at the curb instead", () => {
    let s = fullGarage("dw2");
    expect(apply(s, { type: "setDrivewayRule", rule: "leave" }).error).toMatch(/Sorting/);
    s.run.learned.push("tech:sorting");
    s = must(s, { type: "setDrivewayRule", rule: "leave" });
    const cash = s.run.cash;
    stowFinds(s, Array.from({ length: 8 }, (_, i) => find(`d${i}`, "engine_lawn")));
    expect(s.run.driveway.map((p) => p.uid)).toEqual(["d0", "d1", "d2", "d3", "d4", "d5"]);
    expect(s.run.cash).toBe(cash);
    expect(s.run.notices[0]).toMatch(/left .* at the curb/);
  });

  it("waiting parts move into the garage as soon as space frees up", () => {
    let s = fullGarage("dw3");
    stowFinds(s, [find("k", "engine_lawn")]);
    expect(s.run.driveway.map((p) => p.uid)).toEqual(["k"]);
    s = must(s, { type: "sell", partUids: ["g0"] });
    expect(s.run.inventory.some((p) => p.uid === "k")).toBe(true);
    expect(s.run.driveway).toHaveLength(0);
  });

  it("the best finds go into the garage first; junk is what waits", () => {
    const s = fullGarage("dw6");
    s.run.inventory.splice(0, 1);
    stowFinds(s, [find("j", "junk_misc"), find("e", "engine_lawn")]);
    expect(s.run.inventory.some((p) => p.uid === "e")).toBe(true);
    expect(s.run.driveway.map((p) => p.uid)).toEqual(["j"]);
  });

  it("swapping in sends the cheapest garage part out to the driveway", () => {
    let s = fullGarage("dw7");
    s.run.inventory[3] = { uid: "cheap", partId: "junk_misc", condition: 0, origin: "t" };
    stowFinds(s, [find("k", "engine_lawn")]);
    s = must(s, { type: "swapIn", partUid: "k" });
    expect(s.run.inventory.some((p) => p.uid === "k")).toBe(true);
    expect(s.run.driveway.map((p) => p.uid)).toEqual(["cheap"]);
    expect(s.run.inventory).toHaveLength(12);
  });

  it("parts on the driveway can be stripped or sold, but not cleaned", () => {
    let s = fullGarage("dw4");
    stowFinds(s, [find("x", "engine_lawn"), find("y", "engine_lawn")]);
    expect(apply(s, { type: "enqueue", spec: { kind: "clean", partUid: "x" } }).error).toBeTruthy();
    s = must(s, { type: "enqueue", spec: { kind: "strip", partUid: "x" } });
    s = must(s, { type: "advance", ms: 10 * 60_000 });
    s = must(s, { type: "sell", partUids: ["y"] });
    expect(s.run.driveway).toHaveLength(0);
  });

  it("older saves without a driveway load cleanly", () => {
    const old = createGame("dw5") as Partial<GameState> & GameState;
    delete (old.run as Partial<GameState["run"]>).driveway;
    expect(upgradeSave(old).run.driveway).toEqual([]);
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
