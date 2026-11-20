import { describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { evaluateAchievements } from "../achievements";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, ACHIEVEMENT_GROUPS } from "../content/achievements";
import { RIVAL_BY_ID, VENUE_BY_ID } from "../content/events";
import { VEHICLE_BY_ID } from "../content/vehicles";
import { createGame, must } from "../index";
import { recordRace } from "../stats";
import type { GameState, PartInstance } from "../types";
import type { ScrapChoices } from "../layers";

const MIN = 60_000;
const clean: ScrapChoices = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };

function haul(state: GameState, times = 1): GameState {
  let s = state;
  for (let i = 0; i < times; i++) {
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    s = must(s, { type: "advance", ms: 10 * MIN });
  }
  return s;
}

function give(state: GameState, partId: string, condition: PartInstance["condition"] = 3): GameState {
  const s = structuredClone(state);
  s.uid += 1;
  s.run.inventory.push({ uid: `t${s.uid}`, partId, condition, origin: "test" });
  return s;
}

function pushMowerBuilt(seed: string): GameState {
  let s = give(give(createGame(seed), "engine_small"), "wheel_busted");
  const engine = s.run.inventory.find((p) => p.partId === "engine_small")!;
  const wheel = s.run.inventory.find((p) => p.partId === "wheel_busted")!;
  s = must(s, { type: "enqueue", spec: { kind: "assemble", vehicleId: "push_mower", partUids: { engine: engine.uid, wheel: wheel.uid }, name: "" } });
  return must(s, { type: "advance", ms: 2 * MIN });
}

const toasts = (s: GameState) => s.run.feed.filter((item) => item.kind === "achievement");

describe("lifetime stats", () => {
  it("starts at zero with a first-played timestamp", () => {
    const s = createGame("stats-new");
    expect(s.meta.stats.trips).toBe(0);
    expect(s.meta.stats.firstPlayedAt).toBeGreaterThan(0);
    expect(Object.keys(s.meta.achievements)).toEqual([]);
  });

  it("counts trips and parts found where the trip completes, including offline catch-up", () => {
    let s = createGame("stats-haul");
    s = haul(s, 2);
    const live = s.meta.stats;
    expect(live.trips).toBe(2);
    expect(live.partsFound).toBe(Object.values(s.meta.codex.parts).reduce((a, b) => a + b, 0));
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    s = must(s, { type: "advance", ms: 8 * 60 * MIN, away: true });
    expect(s.meta.stats.trips).toBe(s.run.stats.hauls);
    expect(s.meta.stats.trips).toBe(4);
  });

  it("counts bench jobs, strips, builds and sales", () => {
    let s = give(pushMowerBuilt("stats-garage"), "engine_lawn", 0);
    expect(s.meta.stats.vehiclesBuilt).toBe(1);
    expect(s.meta.stats.vehiclesBuiltBy.push_mower).toBe(1);
    const part = s.run.inventory[s.run.inventory.length - 1];
    s = must(s, { type: "enqueue", spec: { kind: "strip", partUid: part.uid } });
    s = must(s, { type: "advance", ms: 10 * MIN });
    expect(s.meta.stats.partsStripped).toBe(1);
    expect(s.meta.stats.benchJobs).toBe(1);
    s = give(s, "engine_lawn", 2);
    const sold = s.run.inventory[s.run.inventory.length - 1];
    const cash = s.run.cash;
    s = must(s, { type: "sell", partUids: [sold.uid] });
    expect(s.meta.stats.partsSold).toBe(1);
    expect(s.run.cash).toBeGreaterThan(cash);
    expect(s.meta.stats.cashEarned).toBe(s.run.cash - cash);
  });

  it("counts races, and tracks Scrap Bucks spent and earned around an entry", () => {
    let s = pushMowerBuilt("stats-race");
    s.run.cash = 100;
    s = must(s, { type: "enqueue", spec: { kind: "race", vehicleUid: s.run.vehicles[0].uid, venueId: "backyard", event: "sprint", call: "nurse" } });
    s = must(s, { type: "advance", ms: 2 * MIN });
    const stats = s.meta.stats;
    const race = s.run.races[0];
    expect(stats.racesEntered).toBe(1);
    expect(stats.raceWins).toBe(race.position === 1 && !race.dnf ? 1 : 0);
    expect(stats.dnfs).toBe(race.dnf ? 1 : 0);
    expect(stats.podiums).toBe(!race.dnf && race.position <= 3 ? 1 : 0);
    expect(stats.prizeMoney).toBe(race.prize);
    expect(stats.cashEarned).toBe(race.prize);
  });

  it("refunds a cancelled job's cost out of Scrap Bucks spent", () => {
    let s = createGame("stats-refund");
    s.run.cash = 50;
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    const spentAfterStart = s.meta.stats.cashSpent;
    const job = s.run.jobs[0];
    s = must(s, { type: "cancelJob", jobId: job.id });
    expect(s.meta.stats.cashSpent).toBeLessThanOrEqual(spentAfterStart);
    expect(s.run.cash).toBe(50);
  });

  it("tracks streaks and Feature wins per venue", () => {
    const s = createGame("stats-streaks");
    const base = { position: 4, prize: 0, venueId: "backyard", scrapOnCar: false, feature: false };
    for (let i = 0; i < 3; i++) recordRace(s, { ...base, won: false, dnf: true });
    expect(s.meta.stats.bestDnfStreak).toBe(3);
    recordRace(s, { ...base, won: true, dnf: false, position: 1, feature: true });
    expect(s.meta.stats.dnfStreak).toBe(0);
    expect(s.meta.stats.winStreak).toBe(1);
    expect(s.meta.stats.featureWinsBy.backyard).toBe(1);
    expect(s.meta.stats.featureWins).toBe(1);
  });
});

describe("achievements", () => {
  it("has real ids and a sensible spread", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(35);
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(50);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(ACHIEVEMENT_GROUPS, a.id).toContain(a.group);
    for (const id of ["dale", "marisol", "big_ron", "kessler"]) expect(RIVAL_BY_ID[id]).toBeDefined();
    for (const id of ["backyard", "dirt", "county_fair", "regional", "state"]) expect(VENUE_BY_ID[id]).toBeDefined();
    for (const id of ["riding_mower", "go_kart", "beater_car", "street_stock"]) expect(VEHICLE_BY_ID[id]).toBeDefined();
    expect(ACHIEVEMENT_BY_ID.scrap_heap_hero.hidden).toBe(true);
  });

  it("starts with nothing unlocked", () => {
    const s = createGame("ach-fresh");
    expect(evaluateAchievements(s)).toEqual([]);
  });

  it("unlocks once, with one toast-worthy feed line, and never again", () => {
    let s = haul(createGame("ach-once"));
    const at = s.meta.achievements.first_find;
    expect(at).toBeGreaterThan(0);
    expect(toasts(s).filter((item) => item.text.includes("First Find"))).toHaveLength(1);
    s = haul(s);
    expect(s.meta.achievements.first_find).toBe(at);
    expect(toasts(s).filter((item) => item.text.includes("First Find"))).toHaveLength(1);
  });

  it("unlocks on real actions: building a vehicle and a first race", () => {
    let s = pushMowerBuilt("ach-build");
    expect(s.meta.achievements.first_build).toBeDefined();
    s = must(s, { type: "enqueue", spec: { kind: "race", vehicleUid: s.run.vehicles[0].uid, venueId: "backyard", event: "sprint", call: "nurse" } });
    s = must(s, { type: "advance", ms: 2 * MIN });
    expect(s.meta.achievements.first_race).toBeDefined();
  });

  it("keeps hidden ones locked until earned", () => {
    const s = createGame("ach-hidden");
    for (let i = 0; i < 2; i++) recordRace(s, { won: false, dnf: true, position: 4, prize: 0, venueId: "backyard", scrapOnCar: false, feature: false });
    evaluateAchievements(s);
    expect(s.meta.achievements.dnf_three).toBeUndefined();
    recordRace(s, { won: false, dnf: true, position: 4, prize: 0, venueId: "backyard", scrapOnCar: false, feature: false });
    expect(evaluateAchievements(s)).toContain("dnf_three");
    recordRace(s, { won: true, dnf: false, position: 1, prize: 0, venueId: "backyard", scrapOnCar: true, feature: false });
    expect(evaluateAchievements(s)).toContain("scrap_heap_hero");
  });

  it("persists achievements and stats across a Scrap Reset and a Team Reset", () => {
    let s = haul(createGame("ach-resets"), 2);
    s.run.seasonMs = 100_000;
    s.run.featureWins.county_fair = 93_000;
    const trips = s.meta.stats.trips;
    const earnedAt = s.meta.achievements.first_find;
    s = must(s, { type: "reset", layer: "scrap", choices: clean });
    expect(s.meta.stats.trips).toBe(trips);
    expect(s.meta.stats.scrapResets).toBe(1);
    expect(s.meta.achievements.first_find).toBe(earnedAt);
    expect(s.meta.achievements.first_scrap_reset).toBeDefined();
    s.run.seasonMs = 120_000;
    s.run.featureWins.county_fair = 85_000;
    s.meta.stateWonEver = true;
    s = must(s, { type: "reset", layer: "team", choices: { ...clean, discipline: "drag", teamName: "North Garage", colors: ["#222222", "#ccbbaa"] } });
    expect(s.meta.stats.trips).toBe(trips);
    expect(s.meta.stats.scrapResets).toBe(1);
    expect(s.meta.achievements.first_find).toBe(earnedAt);
    expect(s.meta.achievements.founded_team).toBeDefined();
    expect(decodeGameState(JSON.parse(JSON.stringify(s)))?.meta.achievements.founded_team).toBe(s.meta.achievements.founded_team);
  });
});

describe("old saves", () => {
  it("backfill stats from existing data and silently credit what was already earned", () => {
    let s = haul(createGame("old-save"), 3);
    s.meta.journalSeen.push("first_win");
    s.meta.daresCompleted = [];
    const raw = JSON.parse(JSON.stringify(s));
    delete raw.meta.stats;
    delete raw.meta.achievements;
    raw.run.feed = [];
    const upgraded = decodeGameState(raw);
    expect(upgraded).not.toBeNull();
    s = upgraded!;
    expect(s.meta.stats.trips).toBe(3);
    expect(s.meta.stats.partsFound).toBeGreaterThanOrEqual(3);
    expect(s.meta.stats.raceWins).toBe(0);
    expect(s.meta.achievements.first_find).toBeDefined();
    expect(s.meta.achievements.first_win).toBeDefined();
    expect(toasts(s)).toHaveLength(0);
  });

  it("does not rerun the silent pass for a save that already has achievements", () => {
    const s = haul(createGame("old-save-2"));
    const raw = JSON.parse(JSON.stringify(s));
    delete raw.meta.achievements.first_find;
    const decoded = decodeGameState(raw)!;
    expect(decoded.meta.achievements.first_find).toBeUndefined();
  });
});
