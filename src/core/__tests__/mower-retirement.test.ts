import { describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { getVehicle } from "../content/vehicles";
import { apply, createGame, must } from "../index";
import { baseDuration, jobBlocker } from "../jobs";
import { MOWER_EXCHANGE, retirementPlan } from "../retirement";
import { retiredVehicle } from "../vehicleArchive";
import type { GameState, JobSpec, PartInstance } from "../types";

function finish(state: GameState, spec: JobSpec) {
  return must(must(state, { type: "enqueue", spec }), { type: "advance", ms: Math.ceil(baseDuration(state, spec)) });
}

function piece(uid: string, partId: string, condition: PartInstance["condition"] = 3) {
  return { uid, partId, condition, origin: "Curbside" };
}

function finishedMower(seed = "retirement-backyard") {
  let state = createGame(seed);
  state.run.inventory.push(piece("engine", "engine_lawn"), piece("wheel", "wheel_basic"), piece("spare", "engine_tiller", 4));
  state.meta.codex.places.curb = 8;
  state = must(state, { type: "sell", partUids: ["spare"] });
  state = finish(state, { kind: "assemble", vehicleId: "push_mower", name: "Blue Mower", partUids: { engine: "engine", wheel: "wheel" } });
  const uid = state.run.vehicles[0].uid;
  state = finish(state, { kind: "race", vehicleUid: uid, venueId: "backyard", event: "sprint", call: "nurse" });
  expect(state.run.vehicles[0].history.races - state.run.vehicles[0].history.dnfs).toBe(1);
  return { state, uid };
}

function assembleReplacement(state: GameState, engine: string, wheel: string) {
  return finish(state, { kind: "assemble", vehicleId: "push_mower", name: "Second Mower", partUids: { engine, wheel } });
}

describe("mower retirement", () => {
  it("dismantles a raced mower, archives original wear and makes a valid replacement from real finds", () => {
    const { state, uid } = finishedMower();
    const original = state.run.vehicles[0];
    const plan = retirementPlan(state, uid, { kind: "dismantle", keepUid: "engine" });
    expect(plan).toMatchObject({ materials: { rubber: 2 }, cash: 0, retained: original.parts.engine });
    let dismantled = must(state, { type: "retireVehicle", vehicleUid: uid, move: { kind: "dismantle", keepUid: "engine" } });
    expect(dismantled.run.vehicles).toEqual([]);
    expect(dismantled.run.inventory).toEqual([original.parts.engine]);
    expect(dismantled.run.materials.rubber).toBe(2);
    expect(dismantled.run.cash).toBe(state.run.cash);
    expect(dismantled.run.races).toEqual(state.run.races);
    expect(dismantled.run.ladder).toEqual(state.run.ladder);
    expect(retiredVehicle(dismantled, uid)).toMatchObject({ name: "Blue Mower", history: original.history, retirement: { kind: "dismantle", vehicleUid: uid } });
    expect(retiredVehicle(dismantled, uid)?.parts).toEqual(expect.arrayContaining([expect.objectContaining({ slot: "wheel", partId: "wheel_basic" })]));
    dismantled = decodeGameState(dismantled)!;
    expect(dismantled.run.races[0].vehicleUid).toBe(uid);
    expect(apply(dismantled, { type: "retireVehicle", vehicleUid: uid, move: { kind: "exchange" } }).error).toBeTruthy();

    const wheelSlot = getVehicle("push_mower").slots[1];
    let wheel: PartInstance | undefined;
    for (let trip = 0; trip < 8 && !wheel; trip += 1) {
      dismantled = finish(dismantled, { kind: "haul", placeId: "curb" });
      wheel = dismantled.run.inventory.find((part) => wheelSlot.accepts.includes(part.partId) && part.condition > 0);
    }
    expect(wheel).toBeDefined();
    const next = assembleReplacement(dismantled, "engine", wheel!.uid);
    expect(next.run.vehicles[0]).toMatchObject({ name: "Second Mower", parts: { engine: original.parts.engine } });
    expect(next.run.vehicles[0].uid).not.toBe(uid);
  });

  it("charges the fee once, delivers a different race-ready kit, and permits another retirement after a real finish", () => {
    const { state, uid } = finishedMower("retirement-exchange");
    expect(state.run.cash).toBeGreaterThanOrEqual(MOWER_EXCHANGE.cash);
    const exchanged = must(state, { type: "retireVehicle", vehicleUid: uid, move: { kind: "exchange" } });
    expect(exchanged.run.cash).toBe(state.run.cash - MOWER_EXCHANGE.cash);
    expect(exchanged.run.inventory.map(({ partId, condition, origin }) => ({ partId, condition, origin }))).toEqual(
      MOWER_EXCHANGE.parts.map((partId) => ({ partId, condition: MOWER_EXCHANGE.condition, origin: "Mower exchange" })),
    );
    expect(exchanged.run.inventory.some((part) => part.uid === "engine" || part.uid === "wheel")).toBe(false);
    const [engine, wheel] = decodeGameState(exchanged)!.run.inventory;
    let next = assembleReplacement(exchanged, engine.uid, wheel.uid);
    const fresh = next.run.vehicles[0];
    const race: JobSpec = { kind: "race", vehicleUid: fresh.uid, venueId: "backyard", event: "sprint", call: "nurse" };
    expect(jobBlocker(next, race, true)).toBeNull();
    expect(apply(next, { type: "retireVehicle", vehicleUid: fresh.uid, move: { kind: "dismantle", keepUid: engine.uid } }).error).toMatch(/Finish a race/);
    next = finish(next, race);
    next = must(next, { type: "retireVehicle", vehicleUid: fresh.uid, move: { kind: "dismantle", keepUid: engine.uid } });
    expect(next.meta.hallOfFame.map((entry) => entry.retirement?.vehicleUid)).toEqual([uid, fresh.uid]);
    expect(decodeGameState(next)?.run.inventory).toEqual(next.run.inventory);
  });

  it("guards fees, space, fit and sign-ups, and clears stale auto-race assignments", () => {
    const { state, uid } = finishedMower("retirement-guards");
    const exchange = { type: "retireVehicle", vehicleUid: uid, move: { kind: "exchange" } } as const;
    const lowCash = structuredClone(state);
    lowCash.run.cash = 0;
    expect(apply(lowCash, exchange).error).toMatch(/Needs 12 Scrap Bucks/);
    const full = structuredClone(state);
    full.run.inventory = Array.from({ length: 11 }, (_, i) => piece(`garage-${i}`, "engine_lawn"));
    expect(apply(full, exchange).error).toMatch(/Free 2 garage spaces/);
    const missing = must(state, { type: "uninstall", vehicleUid: uid, slot: "wheel" });
    expect(apply(missing, exchange).error).toMatch(/Fit every required part/);
    const signed = must(state, { type: "enqueue", spec: { kind: "race", vehicleUid: uid, venueId: "backyard", event: "sprint", call: "nurse" } });
    expect(apply(signed, exchange).error).toMatch(/race sign-ups/);

    state.run.habitsKnown.push("race");
    state.run.habitSlots = [`race:${uid}:backyard:sprint:nurse`];
    const next = must(state, exchange);
    expect(next.run.habitSlots).toEqual([null]);
    expect(next.run.queue).toEqual([]);
    expect(next.run.jobs).toEqual([]);
    expect(decodeGameState(next)).toBeTruthy();
    expect(decodeGameState({ ...next, run: { ...next.run, vehicles: state.run.vehicles } })).toBeNull();
  });
});
