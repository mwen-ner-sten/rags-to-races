import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { racer } from "../../../tests/fixtures/rewrite";
import { clubCandidate } from "../../../tests/fixtures/club";
import { decodeGameState } from "@/game/save";
import { apply, must } from "../actions";
import { getPart } from "../content/parts";
import { getVehicle } from "../content/vehicles";
import { vehicleStats } from "../garage";
import { WORKS_FAMILIES, worksEnterBlocker, worksReport, type WorksFamily } from "../manufacturer";
import type { ScrapChoices } from "../layers";
import type { GameState } from "../types";
import { setExperimentalCareers } from "../features";

// These systems are experimental and off by default; switch them on for this file only.
beforeEach(() => setExperimentalCareers(true));
afterEach(() => setExperimentalCareers(false));

const HOUR = 3_600_000;
const choices: ScrapChoices = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, hardships: [], dare: null };

function article(family: WorksFamily): GameState {
  const game = racer(`maker-${family}`, "go_kart");
  const car = game.run.vehicles[0];
  car.name = family === "redwheel" ? "Copper Comet" : "Quarry Mule";
  const setup = family === "redwheel"
    ? { engine: "engine_twin", wheel: "wheel_sport", drivetrain: "drive_chain", exhaust: "exhaust_glasspack" }
    : { engine: "engine_v4", wheel: "wheel_dirt", frame: "frame_kart", fuel: "fuel_tank_large" };
  for (const [slot, partId] of Object.entries(setup)) car.parts[slot]!.partId = partId;
  game.run.venuesOpen.push("dirt", "county_fair");
  game.run.ladder.dirt = ["sprint", "heat", "feature"];
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  return game;
}

function invite(family: WorksFamily): GameState {
  let game = article(family);
  const uid = game.run.vehicles[0].uid;
  expect(game.manufacturer).toBeUndefined();
  expect(apply(game, { type: "works", move: { type: "sign", family, vehicleUid: uid } }).error).toMatch(/invitation/i);
  const roadCar = racer(`scout-${family}`, "beater_car").run.vehicles[0];
  roadCar.uid = "invitation-car";
  roadCar.parts.engine!.partId = family === "redwheel" ? "engine_turbo4" : "engine_v6";
  roadCar.parts.frame!.partId = family === "redwheel" ? "frame_tube" : "frame_steel";
  roadCar.parts.wheel!.partId = family === "redwheel" ? "wheel_sport" : "wheel_at";
  for (const part of Object.values(roadCar.parts)) if (part) part.uid = `invite-${part.uid}`;
  game.run.vehicles.push(roadCar);
  game = must(game, { type: "enqueue", spec: { kind: "race", venueId: "county_fair", event: "feature", vehicleUid: roadCar.uid, call: "nurse" } });
  expect(game.manufacturer).toBeUndefined();
  game = must(game, { type: "advance", ms: HOUR, away: true });
  expect(game.manufacturer?.invites).toContain(family);
  return game;
}

describe("Manufacturer careers", () => {
  it.each(["redwheel", "longhaul"] as const)("%s can earn, sign, homologate, reload and retire the offer without an Owner or Circuit certificate", (family) => {
    let game = invite(family);
    expect(game.era).toBeNull();
    expect(game.promoter).toBeUndefined();
    expect(game.owner).toBeUndefined();
    const seat = game.run.vehicles[0];
    const fee = WORKS_FAMILIES[family].fee;
    const start = game.run.cash;
    game = must(game, { type: "works", move: { type: "sign", family, vehicleUid: seat.uid } });
    expect(game.run.cash).toBe(start - fee);
    expect(game.manufacturer?.active).toMatchObject({ article: seat.name, engineUid: seat.parts.engine!.uid, attempts: [] });
    for (let i = 0; i < 2; i += 1) {
      game = must(game, { type: "works", move: { type: "enter" } });
      const job = game.run.jobs.find(({ spec }) => spec.kind === "race")!;
      expect(game.manufacturer?.active?.attempts).toHaveLength(i);
      expect(job.race).toBeDefined();
      expect(apply(game, { type: "works", move: { type: "archive" } }).error).toMatch(/wait for the flag/);
      game = decodeGameState(JSON.parse(JSON.stringify(game)))!;
      expect(game).not.toBeNull();
      const purseBefore = game.run.cash;
      game = must(game, { type: "advance", ms: HOUR, away: true });
      const settled = game.run.races.at(-1)!;
      expect(game.manufacturer?.active?.attempts[i]).toMatchObject({ raceId: settled.id, step: i, passed: true, spent: job.paid!.cash });
      expect(game.run.cash).toBe(purseBefore + settled.prize + (i === 1 ? WORKS_FAMILIES[family].grant : 0));
    }
    expect(worksReport(game.manufacturer!.active!)).toMatchObject({ homologated: true, step: 2 });
    expect(game.manufacturer?.drawings).toEqual([family]);
    game = must(game, { type: "works", move: { type: "archive" } });
    expect(game.manufacturer?.history[0]).toMatchObject({ family, article: seat.name, status: "homologated" });
    expect(apply(game, { type: "works", move: { type: "sign", family, vehicleUid: seat.uid } }).error).toMatch(/already earned/);
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
  });

  it("finishes a previously signed repeat deal and reloads a non-default pace", () => {
    let game = invite("redwheel");
    const vehicleUid = game.run.vehicles[0].uid;
    game = must(game, { type: "works", move: { type: "sign", family: "redwheel", vehicleUid } });
    // Older versions allowed signing again after earning the drawing.
    game.manufacturer!.drawings.push("redwheel");
    game = decodeGameState(JSON.parse(JSON.stringify(game)))!;
    game = must(game, { type: "works", move: { type: "enter", call: "nurse" } });
    game = decodeGameState(JSON.parse(JSON.stringify(game)))!;
    game = must(game, { type: "advance", ms: HOUR, away: true });
    expect(game.run.races.at(-1)?.call).toBe("nurse");
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).toBeTruthy();
    game = must(game, { type: "works", move: { type: "enter" } });
    game = must(game, { type: "advance", ms: HOUR, away: true });
    expect(worksReport(game.manufacturer!.active!).homologated).toBe(true);
    expect(game.manufacturer!.drawings).toEqual(["redwheel"]);
  });

  it("treats standard races as practice, requires the signed physical engine, and rejects fabricated or exhausted proofs", () => {
    let game = invite("redwheel");
    const uid = game.run.vehicles[0].uid;
    const core = game.run.vehicles[0].parts.engine!;
    game = must(game, { type: "works", move: { type: "sign", family: "redwheel", vehicleUid: uid } });
    game = must(game, { type: "enqueue", spec: { kind: "race", vehicleUid: uid, event: "sprint", venueId: "dirt", call: "nurse" } });
    game = must(game, { type: "advance", ms: HOUR });
    expect(game.manufacturer?.active?.attempts).toEqual([]);
    game.run.inventory.push({ ...core, uid: "lookalike" });
    game = must(game, { type: "install", vehicleUid: uid, slot: "engine", partUid: "lookalike" });
    expect(worksEnterBlocker(game)).toMatch(/signed engine/);
    game = must(game, { type: "install", vehicleUid: uid, slot: "engine", partUid: core.uid });
    game = must(game, { type: "works", move: { type: "enter" } });
    const official = game.run.jobs.find(({ spec }) => spec.kind === "race")!;
    const authoritative = JSON.parse(JSON.stringify(game));
    authoritative.run.jobs.find(({ id }: typeof official) => id === official.id).spec.worksRound = "forged-token";
    expect(decodeGameState(authoritative)).toBeNull();
    expect(apply(game, { type: "enqueue", spec: official.spec }).error).toMatch(/Suppliers/);
    game = must(game, { type: "advance", ms: HOUR });
    game.manufacturer!.active!.attempts = Array.from({ length: 3 }, (_, i) => ({ raceId: `failed-${i}`, step: 0, position: 6, dnf: false, wear: 0, spent: 10, passed: false }));
    expect(worksReport(game.manufacturer!.active!).failed).toBe(true);
    expect(worksEnterBlocker(game)).toMatch(/finished/);
  });

  it.each(["redwheel", "longhaul"] as const)("the %s drawing converts one physical part at the listed cost, condition and fit", (family) => {
    let game = clubCandidate("drawing-opening");
    game.manufacturer = { active: null, invites: [family], drawings: [family], history: [] };
    game.club = { active: null, history: [], hasCertifiedClub: true, trackLicenses: ["tight_infield"] };
    game.meta.challengeRecords.parts_with_a_past = { completions: 1, bestSeasonMs: 100, bestVehicleName: "Proof" };
    game.run.inventory.push({ uid: "separate-donor", partId: "engine_small", origin: "Curbside", condition: 4 });
    game = must(game, { type: "reset", layer: "scrap", choices: { ...choices, club: "yard_co_op", clubLoan: "tight_infield", worksPlan: family, retainedPartUid: "separate-donor" } });
    const origin = "Neighbourhood Yards";
    const drawing = WORKS_FAMILIES[family].drawing;
    const provenance = { county: "home", placeId: "yards", season: game.meta.seasonsPlayed + 1 } as const;
    game.run.inventory.push({ uid: "drawing-stock", partId: drawing.input, origin, condition: 2, provenance });
    game.run.cash = 25;
    game.run.materials[drawing.material] = drawing.units;
    const initialCount = game.run.inventory.length;
    expect(apply(game, { type: "works", move: { type: "recast", partUid: "separate-donor" } }).error).toMatch(/workshop part/);
    game = must(game, { type: "works", move: { type: "recast", partUid: "drawing-stock" } });
    expect(game.run.inventory).toHaveLength(initialCount);
    expect(game.run.inventory.find(({ uid }) => uid === "drawing-stock")).toMatchObject({ partId: drawing.output, condition: 2, origin: `${WORKS_FAMILIES[family].name} drawing`, provenance });
    expect(game.run.cash).toBe(25 - drawing.cash);
    expect(game.run.materials[drawing.material]).toBe(0);
    expect(game.run.inventory.some(({ uid, inherited }) => uid === "separate-donor" && inherited)).toBe(true);
    expect(game.run.inventory.filter(({ origin: source }) => source.endsWith("Workshop Loan"))).toHaveLength(1);
    expect(apply(game, { type: "works", move: { type: "recast", partUid: "drawing-stock" } }).error).toMatch(/has been used/);
    expect(getVehicle("push_mower").slots.some(({ accepts }) => accepts.includes(drawing.output))).toBe(true);
    expect(getVehicle("go_kart").slots.some(({ accepts }) => accepts.includes(drawing.output))).toBe(true);
    expect(getPart(drawing.output).reliability).toBeGreaterThan(getPart(drawing.input).reliability);
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
    const engine = game.run.inventory.find(({ partId }) => partId === "engine_lawn")!;
    const wheel = game.run.inventory.find(({ partId }) => partId === "wheel_basic")!;
    const built = must(game, { type: "enqueue", spec: { kind: "assemble", vehicleId: "push_mower", partUids: {
      engine: family === "redwheel" ? "drawing-stock" : engine.uid,
      wheel: family === "longhaul" ? "drawing-stock" : wheel.uid,
    }, name: "Drawing Demonstrator" } });
    const demo = must(built, { type: "advance", ms: HOUR }).run.vehicles[0];
    const comparison = structuredClone(demo);
    const slot = family === "redwheel" ? "engine" : "wheel";
    expect(demo.parts[slot]?.uid).toBe("drawing-stock");
    comparison.parts[slot]!.partId = drawing.input;
    expect(vehicleStats(demo).reliability).toBeGreaterThan(vehicleStats(comparison).reliability);
  });
});
