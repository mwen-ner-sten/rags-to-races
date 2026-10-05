import { describe, expect, it } from "vitest";
import { createGame, must } from "../index";
import type { Condition, GameState, PartInstance, Vehicle } from "../types";

const HOUR = 60 * 60_000;

function part(uid: string, partId: string, condition: Condition): PartInstance {
  return { uid, partId, condition, origin: "test" };
}

function vehicle(uid: string, vehicleId: string, parts: Vehicle["parts"]): Vehicle {
  return { uid, vehicleId, name: vehicleId, parts, tune: "balanced", history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, builtAtSeasonMs: 0 };
}

/** A riding mower with its frame pulled, a Scrap frame on the shelf, no junk, and the strip habit running. */
function benchedFrame(): GameState {
  const s = structuredClone(createGame("strip-habit"));
  s.run.vehicles = [vehicle("vm", "riding_mower", { engine: part("pe", "engine_lawn", 3), wheel: part("pw", "wheel_basic", 3) })];
  s.run.inventory = [part("pf", "frame_mower", 0), part("px", "exhaust_rusted", 0)];
  s.run.habitsKnown = ["strip"];
  return must(s, { type: "setHabit", slot: 0, template: "strip" });
}

describe("strip habit", () => {
  it("leaves a Scrap part that fits an owned vehicle's empty required slot", () => {
    const s = must(benchedFrame(), { type: "advance", ms: 2 * HOUR });
    const uids = s.run.inventory.map((p) => p.uid);
    expect(uids).toContain("pf");
    // The habit was running: the Scrap exhaust (an optional slot) went.
    expect(uids).not.toContain("px");
  });

  it("strips a spare Scrap part once the slot it fits is filled", () => {
    const s = benchedFrame();
    s.run.vehicles[0].parts.frame = part("pf2", "frame_scrap", 3);
    const after = must(s, { type: "advance", ms: 2 * HOUR });
    expect(after.run.inventory.map((p) => p.uid)).not.toContain("pf");
  });
});
