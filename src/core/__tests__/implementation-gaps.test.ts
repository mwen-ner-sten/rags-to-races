import { describe, expect, it } from "vitest";
import { racer, swapMeetGame, teamRacer } from "../../../tests/fixtures/rewrite";
import { apply, must } from "../actions";
import { DARES, PERKS } from "../content/modifiers";
import { crewLevel } from "../content/team";
import { stowFinds } from "../garage";
import { nextTeamPerkSlots, perkSlots, planPurchases, teamAward } from "../layers";
import { allDaresCompleted } from "../perks";
import { rollRace, settleRace } from "../race";
import { upgradeSave } from "../state";
import type { GameState, JobSpec } from "../types";

const minute = 60_000;
const sprint: Extract<JobSpec, { kind: "race" }> = { kind: "race", vehicleUid: "fixture-vehicle", venueId: "backyard", event: "sprint", call: "nurse" };
const choices = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };

function win(game: GameState, venueId: string): void {
  const spec = { ...sprint, kind: "race" as const, venueId, event: "feature" as const };
  const roll = rollRace(game, spec)!;
  settleRace(game, spec, { ...roll, position: 1, dnf: false, rivalBeaten: true });
}

describe("earned perks", () => {
  it.each(PERKS.filter((perk) => perk.unlock.type === "milestone"))("makes $name purchasable after its Feature win", (perk) => {
    if (perk.unlock.type !== "milestone") throw new Error("Expected a milestone perk");
    let game = racer("milestone", "beater_car");
    game.scrap.lp = 100;
    expect(apply(game, { type: "buyPerk", perkId: perk.id }).error).toMatch(/Feature/);
    win(game, perk.unlock.venueId);
    expect(game.meta.perksUnlocked).toContain(perk.id);
    expect(planPurchases(game, [perk.id], game.scrap.lp)).not.toBeTypeOf("string");
    game = must(game, { type: "buyPerk", perkId: perk.id });
    expect(game.meta.perks[perk.id]).toBe(1);
  });

  it("repairs missed unlocks from old permanent records without inventing wins", () => {
    const game = racer();
    game.meta.records.regional = 100;
    game.meta.stateWonEver = true;
    const upgraded = upgradeSave(game);
    expect(upgraded.meta.perksUnlocked).toEqual(expect.arrayContaining(["second_bench", "scavengers_map"]));
    expect(upgraded.run.featureWins).toEqual({});
    expect(game.meta.perksUnlocked).toEqual([]);
  });

  it("starts a Season with the Long Haul open when Scavenger's Map is equipped", () => {
    let game = racer("map", "beater_car");
    game.scrap.lp = 100;
    win(game, "county_fair");
    win(game, "state");
    game = must(game, { type: "reset", layer: "scrap", choices: { ...choices, buy: ["scavengers_map"], perks: ["scavengers_map"] } });
    expect(game.run.placesOpen).toContain("long_haul");
    expect(game.run.rep).toBe(0);
    expect(game.run.vehicles).toHaveLength(0);
  });

  it("awards a permanent slot for all available Dares and accepts it at a Team Reset", () => {
    let game = racer();
    game.meta.daresCompleted = DARES.map((dare) => dare.id);
    game.scrap.milestonesThisEra = ["regional", "state"];
    game.meta.stateWonEver = true;
    game.meta.perks = { barn_find: 1, tow_hitch: 1, kid_brother: 1 };
    expect(allDaresCompleted(game)).toBe(true);
    expect(perkSlots(game)).toBe(5);
    expect(nextTeamPerkSlots(game)).toBe(3);
    game = must(game, { type: "reset", layer: "team", choices: { ...choices, perks: Object.keys(game.meta.perks), discipline: "dirt", teamName: "Daredevils", colors: ["#c8372d", "#f2f2ee"] } });
    expect(game.config.perks).toHaveLength(3);
    expect(perkSlots(game)).toBe(3);
    expect(allDaresCompleted(game)).toBe(true);
  });

  it("does not award the all-Dare slot for a duplicated completion or an old counter alone", () => {
    const game = racer();
    game.meta.daresCompleted = Array.from({ length: DARES.length }, () => DARES[0].id);
    game.scrap.daresThisEra = 5;
    expect(allDaresCompleted(game)).toBe(false);
    expect(perkSlots(game)).toBe(2);
  });

  it("counts overflow sales against the Packrat objective, and manual sales exactly once", () => {
    const game = racer("packrat", "beater_car");
    game.config.dare = "packrat";
    game.run.inventory = Array.from({ length: 12 }, (_, i) => ({ uid: `full-${i}`, partId: "wheel_busted", condition: 2, origin: "test" }));
    game.run.driveway = Array.from({ length: 6 }, (_, i) => ({ uid: `drive-${i}`, partId: "engine_small", condition: 2, origin: "test" }));
    stowFinds(game, [{ uid: "overflow", partId: "engine_lawn", condition: 2, origin: "test" }]);
    expect(game.run.stats.partsSold).toBe(1);
    win(game, "county_fair");
    expect(game.meta.daresCompleted).not.toContain("packrat");
    const sold = must(game, { type: "sell", partUids: [game.run.inventory[0].uid] });
    expect(sold.run.stats.partsSold).toBe(2);
  });
});

describe("race crew", () => {
  it("credits drivers and spotters, records work, and develops Legends through the real job path", () => {
    let game = teamRacer();
    for (const member of game.era!.crew) member.jobsDone = 399;
    const before = teamAward(game);
    game = must(game, { type: "enqueue", spec: sprint });
    expect(game.run.jobs[0].race?.crewIds).toEqual(["deshawn", "pearl"]);
    game = must(game, { type: "advance", ms: minute });
    for (const member of game.era!.crew) {
      expect(member.jobsDone).toBe(400);
      expect(crewLevel(member.jobsDone)).toBe(5);
      expect(member.workedInWindowMs).toBe(minute);
      expect(member.morale).toBeCloseTo(100 - 1 / 60);
    }
    expect(teamAward(game)).toBe(before + 20);
    game = must(game, { type: "advance", ms: 60 * minute });
    expect(game.era!.crew.every((member) => member.morale === 100)).toBe(true);
  });

  it("settles overtime and race experience equally for short live ticks and one offline advance", () => {
    let game = teamRacer("crew-parity");
    for (const member of game.era!.crew) member.workedInWindowMs = 8 * 60 * minute - 30_000;
    game = must(game, { type: "enqueue", spec: sprint });
    const away = must(game, { type: "advance", ms: minute, away: true });
    let live = game;
    for (let i = 0; i < 120; i++) live = must(live, { type: "advance", ms: 500 });
    for (let i = 0; i < away.era!.crew.length; i++) {
      expect(away.era!.crew[i].jobsDone).toBe(20);
      expect(away.era!.crew[i].morale).toBeCloseTo(live.era!.crew[i].morale, 8);
      expect(away.era!.crew[i].morale).toBeCloseTo(100 - 210 / 3600, 8);
    }
  });

  it("keeps racing crew committed until the flag and permits reassignment afterward", () => {
    let game = must(teamRacer(), { type: "enqueue", spec: sprint });
    expect(apply(game, { type: "dismiss", crewId: "deshawn" }).error).toMatch(/track/);
    expect(apply(game, { type: "assignCrew", crewId: "pearl", assignment: { type: "rest" } }).error).toMatch(/track/);
    game = must(game, { type: "advance", ms: minute });
    expect(apply(game, { type: "assignCrew", crewId: "pearl", assignment: { type: "rest" } }).error).toBeNull();
  });

  it("migrates an older running race without losing crew credit", () => {
    let game = must(teamRacer(), { type: "enqueue", spec: sprint });
    delete game.run.jobs[0].race!.crewIds;
    game = upgradeSave(game);
    game = must(game, { type: "advance", ms: minute });
    expect(game.era!.crew.map((member) => member.jobsDone)).toEqual([20, 20]);
  });

  it("lets a Race Habit stop after the current race without refunding or rerolling it", () => {
    let game = racer();
    game.run.habitsKnown = ["race"];
    game = must(game, { type: "setHabit", slot: 0, template: "race:fixture-vehicle:backyard:sprint:nurse" });
    const running = structuredClone(game.run.jobs[0]);
    const cash = game.run.cash;
    game = must(game, { type: "setHabit", slot: 0, template: null });
    expect(game.run.jobs[0]).toEqual(running);
    expect(game.run.cash).toBe(cash);
    game = must(game, { type: "advance", ms: 2 * minute });
    expect(game.run.races).toHaveLength(1);
    expect(game.run.jobs).toHaveLength(0);
  });

  it("keeps Earl's no-experience quirk while completing real bench work", () => {
    let game = teamRacer();
    game.era!.crew = [{ id: "earl", assignment: { type: "queue" }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 0 }];
    game.run.inventory.push({ uid: "dirty-engine", partId: "engine_small", condition: 1, origin: "test" });
    game = must(game, { type: "enqueue", spec: { kind: "clean", partUid: "dirty-engine" } });
    game = must(game, { type: "advance", ms: 2 * minute });
    expect(game.run.inventory[0].condition).toBe(2);
    expect(game.era!.crew[0].jobsDone).toBe(0);
  });

  it("keeps the debrief part at race entry after a later part swap", () => {
    let game = racer("snapshot");
    const engine = { ...game.run.vehicles[0].parts.engine! };
    game = must(game, { type: "enqueue", spec: sprint });
    game = must(game, { type: "advance", ms: minute });
    game.run.inventory.push({ uid: "replacement", partId: "engine_lawn", condition: 3, origin: "test" });
    game = must(game, { type: "install", vehicleUid: "fixture-vehicle", slot: "engine", partUid: "replacement" });
    expect(game.run.races[0].weakestPart).toEqual(engine);
    expect(game.run.races[0].weakestPart?.partId).not.toBe(game.run.vehicles[0].parts.engine?.partId);
  });
});

describe("Swap Meet trades", () => {
  it("consumes three offered parts once and returns the selected seen part in Worn condition", () => {
    const game = swapMeetGame();
    const traded = must(game, { type: "swapMeet", partUids: game.run.inventory.map((part) => part.uid), partId: "engine_lawn" });
    expect(traded.run.inventory).toHaveLength(1);
    expect(traded.run.inventory[0]).toMatchObject({ partId: "engine_lawn", condition: 2, origin: "Swap meet" });
    expect(traded.run.cash).toBe(game.run.cash);
    expect(traded.run.materials).toEqual(game.run.materials);
  });

  it("rejects reserved parts, duplicate offers, unseen returns, and returns above the offered tier", () => {
    let game = swapMeetGame();
    const offer = game.run.inventory.map((part) => part.uid);
    expect(apply(game, { type: "swapMeet", partUids: [offer[0], offer[0], offer[2]], partId: "engine_lawn" }).error).toMatch(/different/);
    expect(apply(game, { type: "swapMeet", partUids: offer, partId: "engine_v4" }).error).toMatch(/seen/);
    game.meta.codex.parts.engine_v4 = 1;
    expect(apply(game, { type: "swapMeet", partUids: offer, partId: "engine_v4" }).error).toMatch(/tier/);
    game = must(game, { type: "enqueue", spec: { kind: "clean", partUid: offer[0] } });
    expect(apply(game, { type: "swapMeet", partUids: offer, partId: "engine_lawn" }).error).toMatch(/free/);
    expect(game.run.inventory).toHaveLength(3);
  });
});
