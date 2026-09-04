import { describe, expect, it } from "vitest";
import { CIRCUIT_DEFINITIONS, EVENT_LADDER, getCircuitById } from "@/data/circuits";
import {
  addEventWin,
  getEventWinCount,
  getOpenEventIds,
  isEventOpen,
  nextEventToOpen,
  resolveEventCircuit,
} from "../eventLadder";

describe("venue ladder", () => {
  it("anchors venue difficulty on measured parity, keeps the prize ladder geometric, and charges 15% entry fees", () => {
    // Heat difficulty per venue: the circuit-fitted performance at which a
    // decent tier-minimum build sits at 35-55% (docs/balance/phase2-mixed-play-2026-09-04.md).
    expect(CIRCUIT_DEFINITIONS.map((circuit) => circuit.difficulty)).toEqual([8, 58, 140, 230, 380, 385, 385]);
    expect(CIRCUIT_DEFINITIONS.map((circuit) => circuit.rewardBase)).toEqual([10, 22, 50, 110, 250, 560, 1250]);
    for (const circuit of CIRCUIT_DEFINITIONS.slice(1)) {
      expect(circuit.entryFee).toBe(Math.round(circuit.rewardBase * 0.15));
    }
    // The tutorial's first race stays free.
    expect(getCircuitById("backyard_derby")!.entryFee).toBe(0);
  });

  it("hosts Sprint, Heat and Feature at every venue with the spec multipliers", () => {
    expect(EVENT_LADDER.map((event) => event.id)).toEqual(["sprint", "heat", "feature"]);
    for (const circuit of CIRCUIT_DEFINITIONS) {
      expect(circuit.events).toBe(EVENT_LADDER);
      const sprint = resolveEventCircuit(circuit, "sprint");
      const heat = resolveEventCircuit(circuit, "heat");
      const feature = resolveEventCircuit(circuit, "feature");
      expect(sprint.difficulty).toBe(Math.round(circuit.difficulty * 0.75));
      expect(sprint.rewardBase).toBe(Math.round(circuit.rewardBase * 0.5));
      expect(sprint.repReward).toBeCloseTo(circuit.repReward * 0.6, 6);
      expect(heat).toMatchObject({ difficulty: circuit.difficulty, rewardBase: circuit.rewardBase, repReward: circuit.repReward, entryFee: circuit.entryFee });
      expect(feature.difficulty).toBe(Math.round(circuit.difficulty * 1.4));
      expect(feature.rewardBase).toBe(Math.round(circuit.rewardBase * 1.8));
      expect(feature.repReward).toBeCloseTo(circuit.repReward * 1.6, 6);
      if (circuit.entryFee > 0) {
        expect(sprint.entryFee).toBe(Math.round(sprint.rewardBase * 0.15));
        expect(feature.entryFee).toBe(Math.round(feature.rewardBase * 0.15));
      } else {
        expect(feature.entryFee).toBe(0);
      }
      expect(feature).toMatchObject({ id: circuit.id, venueId: circuit.id, eventId: "feature", eventName: "Feature" });
    }
  });

  it("opens Heat after a Sprint win here and Feature after a Heat win here", () => {
    expect(getOpenEventIds(undefined)).toEqual(["sprint"]);
    expect(nextEventToOpen(undefined)).toBe("heat");
    expect(isEventOpen("heat", {})).toBe(false);
    let wins = addEventWin({}, "dirt_track", "sprint");
    expect(getEventWinCount(wins, "dirt_track", "sprint")).toBe(1);
    expect(getOpenEventIds(wins.dirt_track)).toEqual(["sprint", "heat"]);
    expect(nextEventToOpen(wins.dirt_track)).toBe("feature");
    expect(isEventOpen("heat", wins.regional_circuit)).toBe(false);
    wins = addEventWin(wins, "dirt_track", "heat");
    expect(getOpenEventIds(wins.dirt_track)).toEqual(["sprint", "heat", "feature"]);
    expect(nextEventToOpen(wins.dirt_track)).toBeNull();
    // Immutable: the original map is untouched.
    const before = { a: { sprint: 1 } };
    const after = addEventWin(before, "a", "sprint");
    expect(before.a.sprint).toBe(1);
    expect(after.a.sprint).toBe(2);
  });
});
