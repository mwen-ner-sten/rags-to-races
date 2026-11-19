import { describe, expect, it } from "vitest";
import type { RaceBeat } from "@/core/types";
import { finishText, lostInRound } from "../resultText";
import { bracketStatus, bracketView, PASS_SHARE } from "../timeline";

const D = 30_000; // three rounds of 10 s
const RM = D / 3;

/** Win rounds 1 and 2, then lose the final. */
const lost: RaceBeat[] = [
  { at: 0, text: "r1", position: 1, kind: "round" },
  { at: RM * 0.8, text: "w1", position: 1, kind: "pass" },
  { at: RM, text: "r2", position: 2, kind: "round" },
  { at: RM + RM * 0.8, text: "w2", position: 1, kind: "pass" },
  { at: 2 * RM, text: "r3", position: 1, kind: "round" },
  { at: 2 * RM + RM * 0.8, text: "out", position: 2, kind: "finish" },
];

const outInTwo: RaceBeat[] = [
  { at: 0, text: "r1", position: 1, kind: "round" },
  { at: RM * 0.8, text: "w1", position: 1, kind: "pass" },
  { at: RM, text: "r2", position: 1, kind: "round" },
  { at: RM + RM * 0.8, text: "out", position: 2, kind: "finish" },
];

const dnf: RaceBeat[] = [
  { at: 0, text: "r1", position: 1, kind: "round" },
  { at: RM * 0.5, text: "bang", position: 2, kind: "dnf" },
];

describe("bracketView", () => {
  it("starts round 1 at the line and runs the pass over the first 80% of the round", () => {
    expect(bracketView(lost, 0, D, 3)).toMatchObject({ round: 1, progress: 0, ended: null });
    expect(bracketView(lost, RM * 0.4, D, 3).progress).toBeCloseTo(0.5);
    expect(bracketView(lost, RM * PASS_SHARE, D, 3).progress).toBeCloseTo(1);
  });

  it("holds at the finish for the rest of the round, then starts the next pass from the line", () => {
    expect(bracketView(lost, RM * 0.9, D, 3)).toMatchObject({ round: 1, progress: 1 });
    expect(bracketView(lost, RM, D, 3)).toMatchObject({ round: 2, progress: 0 });
    expect(bracketView(lost, RM * 1.4, D, 3)).toMatchObject({ round: 2 });
    expect(bracketView(lost, RM * 1.4, D, 3).progress).toBeCloseTo(0.5);
  });

  it("starts behind after a bad launch and catches up to the round's result", () => {
    expect(bracketView(lost, RM, D, 3).rank).toBe(2);
    expect(bracketView(lost, RM + RM * 0.8, D, 3).rank).toBe(1);
    const mid = bracketView(lost, RM + RM * 0.4, D, 3).rank;
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(2);
  });

  it("parks after the last beat and never starts another pass", () => {
    const end = bracketView(outInTwo, D, D, 3);
    expect(end).toMatchObject({ round: 2, progress: 1, rank: 2, ended: "out" });
    expect(bracketView(outInTwo, RM * 2.5, D, 3)).toMatchObject({ round: 2, progress: 1, ended: "out" });
  });

  it("reports a win in the final", () => {
    const won: RaceBeat[] = [
      { at: 0, text: "r1", position: 1, kind: "round" },
      { at: RM * 0.8, text: "ok", position: 1, kind: "finish" },
    ];
    expect(bracketView(won, D, D, 1)).toMatchObject({ round: 1, progress: 1, rank: 1, ended: "won" });
  });

  it("stops the car partway down the strip on a DNF and leaves it there", () => {
    const v = bracketView(dnf, D, D, 3);
    expect(v.ended).toBe("dnf");
    expect(v.round).toBe(1);
    expect(v.dnfAt).toBeCloseTo(0.5 / PASS_SHARE);
    expect(bracketView(dnf, 1000, D, 3).dnfAt).toBeCloseTo(0.5 / PASS_SHARE);
  });
});

describe("bracketStatus", () => {
  it("reads ahead or behind during a round, then the outcome", () => {
    expect(bracketStatus(bracketView(lost, RM * 1.1, D, 3))).toBe("Round 2 of 3 · behind");
    expect(bracketStatus(bracketView(lost, RM * 0.3, D, 3))).toBe("Round 1 of 3 · ahead");
    expect(bracketStatus(bracketView(outInTwo, D, D, 3))).toBe("Out in round 2");
    expect(bracketStatus(bracketView(dnf, D, D, 3))).toBe("DNF");
    expect(bracketStatus(bracketView([{ at: 0, text: "", position: 1, kind: "round" }], 100, 1000, 1))).toBe("Your pass · ahead");
  });
});

describe("finishText", () => {
  it("keeps oval results as a place", () => {
    expect(finishText({ position: 3, fieldSize: 6, dnf: false })).toBe("3rd of 6");
    expect(finishText({ position: 1, fieldSize: 6, dnf: true })).toBe("DNF");
  });

  it("describes a bracket by the round you went out in", () => {
    expect(finishText({ position: 1, fieldSize: 8, dnf: false, rounds: 3 })).toBe("Won the event");
    expect(finishText({ position: 2, fieldSize: 8, dnf: false, rounds: 3 })).toBe("Lost in the final");
    expect(finishText({ position: 3, fieldSize: 8, dnf: false, rounds: 3 })).toBe("Lost in round 2 of 3");
    expect(finishText({ position: 5, fieldSize: 8, dnf: false, rounds: 3 })).toBe("Lost in round 1 of 3");
    expect(finishText({ position: 2, fieldSize: 4, dnf: false, rounds: 2 })).toBe("Lost in the final");
    expect(finishText({ position: 5, fieldSize: 8, dnf: true, rounds: 3 })).toBe("DNF");
    expect(lostInRound(3, 3)).toBe(2);
  });
});
