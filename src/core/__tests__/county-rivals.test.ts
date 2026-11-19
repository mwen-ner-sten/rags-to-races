import { describe, expect, it } from "vitest";
import { clubCandidate } from "../../../tests/fixtures/club";
import { racer, teamRacer } from "../../../tests/fixtures/rewrite";
import { decodeGameState } from "@/game/save";
import { apply, must } from "../actions";
import { COUNTY_RIVALS, countyBuildReady, countyMatchBlocker, localRival, type CountyRivalId } from "../countyRivals";
import { partOriginLabel } from "../provenance";
import { opponents } from "../race";
import type { ScrapChoices } from "../layers";
import type { GameState, PartProvenance } from "../types";

const HOUR = 3_600_000;
const choices: ScrapChoices = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };

function localPart(game: GameState, id: CountyRivalId): PartProvenance {
  return { county: COUNTY_RIVALS[id].county, placeId: "curb", season: game.meta.seasonsPlayed + 1 };
}

function local(game: GameState, id: CountyRivalId): GameState {
  game.config.homeCounty = COUNTY_RIVALS[id].county;
  game.meta.knowhow["tech:scouting"] = 1;
  game.meta.codex.places = { curb: 1, junkyard: 1, yards: 1 };
  game.run.vehicles[0].parts.engine!.partId = "engine_lawn";
  game.run.vehicles[0].parts.engine!.origin = "Curbside";
  game.run.vehicles[0].parts.engine!.provenance = localPart(game, id);
  game.run.vehicles[0].parts.wheel!.partId = "wheel_knobby";
  return game;
}

function enter(game: GameState): GameState {
  return must(game, { type: "countyMatch", move: { type: "enter", vehicleUid: game.run.vehicles[0].uid, call: "push" } });
}

describe("County rivals and club visitors", () => {
  it("requires a legal local build and keeps normal sprints outside the encounter", () => {
    let game = local(racer("inez-eligibility"), "inez");
    const car = game.run.vehicles[0];
    expect(localRival(game)).toBe("inez");
    expect(countyBuildReady(game, car, "inez")).toBe(true);
    car.parts.engine!.provenance = { county: "quarry", placeId: "curb", season: game.meta.seasonsPlayed + 1 };
    expect(countyMatchBlocker(game, car.uid, "push")).toMatch(/hauled in this county/);
    car.parts.engine!.provenance = { ...localPart(game, "inez"), season: game.meta.seasonsPlayed };
    expect(countyMatchBlocker(game, car.uid, "push")).toMatch(/during this Season/);
    car.parts.engine!.provenance = localPart(game, "inez");
    game = must(game, { type: "enqueue", spec: { kind: "race", venueId: "backyard", event: "sprint", vehicleUid: car.uid, call: "push" } });
    game = must(game, { type: "advance", ms: HOUR });
    expect(game.countyRivals).toBeUndefined();
    const booked = enter(game);
    expect(booked.countyRivals).toBeUndefined();
    expect(booked.run.jobs[0].race?.beats[0].text).toContain("Inez Marsh");
    expect(decodeGameState(JSON.parse(JSON.stringify(booked)))).not.toBeNull();
    expect(apply(booked, { type: "enqueue", spec: booked.run.jobs[0].spec }).error).toMatch(/County matchup/i);
  });

  it("lets a weak local car lose, then earn Wade’s offer after replacing physical components", () => {
    let game = local(racer("quarry-comeback"), "wade");
    const weak = game.run.vehicles[0];
    weak.parts.engine!.partId = "engine_small";
    weak.parts.engine!.condition = 1;
    weak.parts.wheel!.partId = "wheel_busted";
    weak.parts.wheel!.condition = 1;
    game = must(enter(game), { type: "advance", ms: HOUR });
    expect(game.countyRivals?.wade?.attempts).toBe(1);
    expect(game.countyRivals?.wade?.earned).toBeUndefined();
    game.run.inventory.push({ uid: "replacement-engine", partId: "engine_lawn", condition: 4, origin: "Curbside", provenance: localPart(game, "wade") },
      { uid: "replacement-wheel", partId: "wheel_knobby", condition: 4, origin: "Spare garage stock" });
    game = must(game, { type: "install", vehicleUid: weak.uid, slot: "engine", partUid: "replacement-engine" });
    game = must(game, { type: "install", vehicleUid: weak.uid, slot: "wheel", partUid: "replacement-wheel" });
    for (let attempt = 0; attempt < 3 && !game.countyRivals?.wade?.earned; attempt += 1) game = must(enter(game), { type: "advance", ms: HOUR });
    expect(game.countyRivals?.wade?.earned).toMatchObject({ beaten: true, dnf: false, rivalOut: false });
    expect(game.countyRivals!.wade!.attempts).toBeGreaterThan(1);
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
  });

  it.each(["dirt", "drag", "rally"] as const)("adds only the authored visiting opponent to the actual %s race", (discipline) => {
    let game = local(teamRacer("visitor-format"), "inez");
    game.era!.discipline = discipline;
    expect(opponents(game, "backyard", "sprint", "push", "inez").filter(({ rival }) => rival)).toHaveLength(1);
    expect(opponents(game, "backyard", "sprint", "push", "wade").find(({ rival }) => rival)?.score)
      .toBeGreaterThan(opponents(game, "backyard", "sprint", "push", "inez").find(({ rival }) => rival)!.score);
    expect(opponents(game, "backyard", "sprint").every(({ rival }) => !rival)).toBe(true);
    game = must(enter(game), { type: "advance", ms: HOUR, away: true });
    expect(game.run.races.at(-1)?.countyMeeting?.rival).toBe("inez");
    expect(game.run.races.at(-1)?.beats.some(({ text }) => text.includes("Inez Marsh"))).toBe(true);
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
  });

  it("lets a later club borrow Inez’s physical part after moving, preserves its provenance and rejects double loans", () => {
    let game = local(clubCandidate("visitor-loan"), "inez");
    for (let attempt = 0; attempt < 3 && !game.countyRivals?.inez?.earned; attempt += 1) game = must(enter(game), { type: "advance", ms: HOUR });
    expect(game.countyRivals?.inez?.earned).toBeDefined();
    const proofSeason = game.countyRivals!.inez!.earned!.season;
    game.club = { active: null, history: [], hasCertifiedClub: true, trackLicenses: ["tight_infield"] };
    const plan: ScrapChoices = { ...choices, club: "yard_co_op", clubVisitor: "inez", homeCounty: "quarry" };
    expect(apply(game, { type: "reset", layer: "scrap", choices: { ...plan, clubLoan: "tight_infield" } }).error).toMatch(/one workshop loan/);
    game = must(game, { type: "reset", layer: "scrap", choices: plan });
    expect(localRival(game)).toBe("wade");
    const loan = game.run.inventory.find(({ origin }) => origin === "Inez Marsh Club Loan")!;
    expect(loan).toMatchObject({ partId: "wheel_river", condition: 3, provenance: { county: "river", placeId: "floodplain", season: proofSeason } });
    expect(partOriginLabel(loan)).toContain("River County");
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
    game.run.inventory.push({ ...loan, uid: "duplicate-loan" });
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).toBeNull();
  });
});
