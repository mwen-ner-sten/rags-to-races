import { describe, expect, it } from "vitest";
import { decodeGameState } from "@/game/save";
import { apply, must } from "../actions";
import { blueprintPlan, partSwapGain } from "../buildPlanning";
import { getVehicle } from "../content/vehicles";
import { vehicleStats } from "../garage";
import { carryFor } from "../haul";
import { jobBlocker, nextEventInMs } from "../jobs";
import { motorDuration, motorOrigin } from "../motorPool";
import { rawScore } from "../race";
import { nextUid } from "../rng";
import { createGame } from "../index";
import { initialConfig } from "../state";
import type { GameState, JobSpec, PartInstance } from "../types";

const runabout = getVehicle("service_runabout");
const blueprint = runabout.blueprint!;
const reload = (game: GameState) => decodeGameState(JSON.parse(JSON.stringify(game)));

function loose(game: GameState, partId: string, condition: PartInstance["condition"] = 2, origin = "Curbside") {
  const part = { uid: nextUid(game, "p"), partId, condition, origin };
  game.run.inventory.push(part);
  return part;
}

function readyToBuild(known = true) {
  const game = createGame("service-runabout-trials");
  if (known) game.run.learned.push(blueprint);
  game.run.cash = 120;
  game.run.rep = 40;
  game.run.materials = { metal: 20, rubber: 10, wiring: 5 };
  const strong = loose(game, "wheel_basic", 4);
  const spare = loose(game, "wheel_knobby");
  const plan = {
    engine: loose(game, "engine_tiller", 2, motorOrigin("pump")).uid,
    frame: loose(game, "frame_kart", 2, motorOrigin("ramp")).uid,
    fuel: loose(game, "fuel_gas_can", 3).uid,
    wheel: strong.uid,
    rear_wheel: spare.uid,
  };
  return { game, strong, spare, plan };
}

function assembleSpec(partUids: Record<string, string>, vehicleId = runabout.id) {
  return { kind: "assemble", vehicleId, partUids, name: "" } as const;
}

function complete(game: GameState, spec: JobSpec) {
  const started = must(game, { type: "enqueue", spec });
  const active = started.run.jobs.find((job) => job.spec.kind === spec.kind)!;
  return must(started, { type: "advance", ms: Math.ceil(active.remaining) + 1 });
}

function grantPermit(game: GameState) {
  const receipt = { client: "marina", partId: "wheel_basic", partUid: nextUid(game, "p"), condition: 2, origin: "Curbside" } as const;
  game.meta.seasonsPlayed = 1;
  game.meta.serviceReferences = {
    equipment: { tool: "parts_washer", season: 1, invoice: receipt },
    referral: { season: 2, invoice: { ...receipt, client: "orchard", partId: "engine_lawn", condition: 3, partUid: nextUid(game, "p") } },
  };
  game.motorPool = { lastLodgedSeason: 1, ledger: { season: 1, booked: [] }, custody: null, job: null, claim: null };
}

describe("Service Runabout", () => {
  it("holds the plans behind real jobs and allows the normal study and assembly path", () => {
    const { game, plan } = readyToBuild(false);
    expect(apply(game, { type: "enqueue", spec: assembleSpec(plan) }).error).toMatch(/drawn up/);
    const study = { kind: "study", knowhowId: blueprint } as const;
    expect(apply(game, { type: "enqueue", spec: study }).error).toMatch(/both County Motor Pool deliveries/);
    grantPermit(game);
    game.run.learned.push("blueprint:riding_mower");
    const mowerParts = {
      engine: loose(game, "engine_lawn").uid,
      wheel: loose(game, "wheel_basic").uid,
      frame: loose(game, "frame_mower").uid,
    };
    const rampTender = loose(game, "wheel_busted");
    const pumpTender = loose(game, "engine_small");
    let ready = complete(game, assembleSpec(mowerParts, "riding_mower"));
    ready = must(ready, { type: "motorPool", move: { type: "lodge", vehicleUid: ready.run.vehicles[0].uid } });
    ready = must(ready, { type: "motorPool", move: { type: "book", route: "ramp", tenderUid: rampTender.uid } });
    plan.frame = ready.motorPool!.job!.part.uid;
    ready = must(ready, { type: "advance", ms: ready.motorPool!.job!.duration });
    ready = must(ready, { type: "motorPool", move: { type: "claim" } });
    expect(apply(ready, { type: "enqueue", spec: study }).error).toMatch(/both County Motor Pool deliveries/);
    ready = must(ready, { type: "motorPool", move: { type: "book", route: "pump", tenderUid: pumpTender.uid } });
    plan.engine = ready.motorPool!.job!.part.uid;
    ready = must(ready, { type: "advance", ms: ready.motorPool!.job!.duration, away: true });
    ready = must(ready, { type: "motorPool", move: { type: "claim" } });
    const reset = must(ready, { type: "reset", layer: "team",
      choices: { ...initialConfig(), teamName: "County Shop", colors: ["#777", "#eee"], discipline: "dirt", organization: "collective" } });
    expect(reset.run.available).toContain(blueprint);
    expect(reset.run.inventory).toHaveLength(0);
    const learned = complete(reload(ready)!, study);
    const built = complete(learned, assembleSpec(plan));
    expect(built.run.races).toEqual([]);
    expect(built.run.learned).toContain(blueprint);
    expect(built.run.vehicles[0].parts.frame?.uid).toBe(plan.frame);
    expect(built.run.vehicles[0].parts.engine?.uid).toBe(plan.engine);
    expect(reload(built)?.run.vehicles[0]).toEqual(built.run.vehicles[0]);
  });

  it("honors a manual rear choice before assigning the front and reports when two physical wheels are unavailable", () => {
    const { game, strong, spare } = readyToBuild();
    const manual = blueprintPlan(game, runabout, { rear_wheel: strong.uid });
    expect(manual.chosen).toMatchObject({ wheel: spare.uid, rear_wheel: strong.uid });
    expect(manual.slots.find(({ slot }) => slot.slot === "wheel")?.options.map(({ uid }) => uid)).toEqual([spare.uid]);
    expect(manual.ready).toBe(manual.required);
    game.run.inventory = game.run.inventory.filter(({ uid }) => uid !== spare.uid);
    const single = blueprintPlan(game, runabout, {});
    expect(single.chosen.wheel).toBe(strong.uid);
    expect(single.chosen.rear_wheel).toBeUndefined();
    expect(single.ready).toBe(single.required - 1);
    expect(jobBlocker(game, assembleSpec(single.chosen))).toMatch(/Rear wheel/);
  });

  it("rejects assembly duplication at enqueue and during import, and rejects duplication after refitting", () => {
    const { game, plan } = readyToBuild();
    const repeated = assembleSpec({ ...plan, rear_wheel: plan.wheel });
    expect(apply(game, { type: "enqueue", spec: repeated }).error).toMatch(/different physical part/);
    const active = must(game, { type: "enqueue", spec: assembleSpec(plan) });
    expect(reload(active)).not.toBeNull();
    expect(reload({ ...active, run: { ...active.run, queue: [assembleSpec(plan)] } })).toBeNull();
    expect(reload({ ...game, run: { ...game.run, queue: [repeated] } })).toBeNull();
    active.run.jobs[0].spec = repeated;
    expect(reload(active)).toBeNull();

    let built = complete(game, assembleSpec(plan));
    const car = built.run.vehicles[0];
    const replacing = loose(built, "wheel_kart", 4);
    expect(apply(built, { type: "install", vehicleUid: car.uid, slot: "rear_wheel", partUid: plan.wheel }).error).toMatch(/No such part/);
    built = must(built, { type: "install", vehicleUid: car.uid, slot: "rear_wheel", partUid: replacing.uid });
    expect(built.run.vehicles[0].parts.rear_wheel?.uid).toBe(replacing.uid);
    expect(built.run.inventory.find(({ uid }) => uid === plan.rear_wheel)).toBeDefined();
    expect(reload(built)).not.toBeNull();
    built.run.vehicles[0].parts.wheel = built.run.vehicles[0].parts.rear_wheel;
    expect(reload(built)).toBeNull();
  });

  it("tows at the junkyard and improves carry over the mower while racing slower than an equally equipped kart", () => {
    const { game, plan } = readyToBuild();
    let built = complete(game, assembleSpec(plan));
    const car = built.run.vehicles[0];
    expect(carryFor(built)).toBe(12);
    built = must(built, { type: "openPlace", knowhowId: "place:junkyard" });
    const before = built.run.inventory.length;
    built = complete(built, { kind: "haul", placeId: "junkyard" });
    expect(built.run.inventory.length - before).toBeGreaterThan(getVehicle("riding_mower").carry);
    const kart = { ...car, vehicleId: "go_kart", parts: { ...car.parts, rear_wheel: undefined } };
    for (const discipline of ["dirt", "drag", "rally"] as const) {
      expect(rawScore(car, discipline)).toBeLessThan(rawScore(kart, discipline));
    }
    const wornRear = car.parts.rear_wheel!;
    const freshRear = { ...wornRear, condition: 4 as const };
    const gain = partSwapGain(car, "rear_wheel", freshRear, "drag");
    expect(gain).toBeGreaterThan(0);
    expect(vehicleStats({ ...car, parts: { ...car.parts, rear_wheel: freshRear } }).traction).toBeGreaterThan(vehicleStats(car).traction);
  });

  it("can race through the normal queue and incurs real rear-axle wear at the depot", () => {
    const { game, plan } = readyToBuild();
    let built = complete(game, assembleSpec(plan));
    const car = built.run.vehicles[0];
    const race = { kind: "race", vehicleUid: car.uid, venueId: "backyard", event: "sprint", call: "nurse" } as const;
    const queued = must(built, { type: "enqueue", spec: race });
    const advanced = must(queued, { type: "advance", ms: nextEventInMs(queued, race.venueId, race.event) + 180_000 });
    expect(advanced.run.races.at(-1)?.vehicleUid).toBe(car.uid);

    grantPermit(built);
    built = must(built, { type: "openPlace", knowhowId: "place:junkyard" });
    const tender = loose(built, "wheel_busted", 2);
    const lodged = must(built, { type: "motorPool", move: { type: "lodge", vehicleUid: car.uid } });
    expect(carryFor(lodged)).toBe(2);
    expect(jobBlocker(lodged, { kind: "haul", placeId: "junkyard" })).toMatch(/to tow/);
    const booked = must(lodged, { type: "motorPool", move: { type: "book", route: "ramp", tenderUid: tender.uid } });
    const loaded = reload(booked);
    expect(loaded).not.toBeNull();
    const settled = must(loaded!, { type: "advance", ms: motorDuration(car, "ramp"), away: true });
    expect(settled.motorPool?.custody?.rig.parts.wheel).toEqual(car.parts.wheel);
    expect(settled.motorPool?.custody?.rig.parts.rear_wheel).toMatchObject({ uid: plan.rear_wheel, condition: 1 });
    expect(reload(settled)).not.toBeNull();
  });
});
