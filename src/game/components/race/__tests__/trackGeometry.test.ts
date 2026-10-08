import { describe, expect, it } from "vitest";
import {
  OVAL,
  STRIP,
  carDistance,
  carPose,
  lanePlan,
  opponentRank,
  ovalLength,
  trackLength,
} from "../trackGeometry";
import { startLightState } from "../TrackOverlays";

describe("oval pose", () => {
  it("starts on the top straight heading right", () => {
    const pose = carPose("oval", 0, 0);
    expect(pose.x).toBeCloseTo(OVAL.cx - OVAL.straight / 2);
    expect(pose.y).toBeCloseTo(OVAL.cy - OVAL.radius);
    expect(pose.heading).toBe(0);
  });

  it("is continuous along the whole lap and across laps (no heading flips)", () => {
    const perimeter = ovalLength();
    let prev = carPose("oval", -40, 0);
    for (let s = -39; s < perimeter * 2 + 40; s += 1) {
      const next = carPose("oval", s, 0);
      expect(Math.hypot(next.x - prev.x, next.y - prev.y)).toBeLessThan(1.6);
      expect(next.heading - prev.heading).toBeGreaterThanOrEqual(-0.001);
      expect(next.heading - prev.heading).toBeLessThan(2.5);
      prev = next;
    }
  });

  it("keeps the infield offset on the inside of the loop", () => {
    const outside = carPose("oval", ovalLength() * 0.5, 10);
    const inside = carPose("oval", ovalLength() * 0.5, -10);
    expect(outside.y).toBeGreaterThan(inside.y); // halfway round is the bottom straight
  });
});

describe("distances", () => {
  it("puts the leader exactly on the line at progress 1", () => {
    expect(carDistance("oval", 1, 1, 3)).toBeCloseTo(3 * ovalLength());
    expect(carDistance("strip", 1, 1, 1)).toBeCloseTo(trackLength("strip"));
  });

  it("seats every car behind the line before the start", () => {
    for (const shape of ["oval", "strip"] as const) {
      for (let rank = 1; rank <= 10; rank++) {
        expect(carDistance(shape, rank, 0, 1)).toBeLessThan(0);
      }
    }
  });

  it("orders cars by rank and interpolates fractional ranks", () => {
    for (const shape of ["oval", "strip"] as const) {
      const a = carDistance(shape, 2, 0.5, 3);
      const b = carDistance(shape, 3, 0.5, 3);
      const mid = carDistance(shape, 2.5, 0.5, 3);
      expect(a).toBeGreaterThan(b);
      expect(mid).toBeCloseTo((a + b) / 2);
    }
  });

  it("opponents step aside smoothly as the player passes", () => {
    expect(opponentRank(0, 1)).toBe(2);
    expect(opponentRank(0, 2)).toBe(1);
    expect(opponentRank(1, 2)).toBe(3);
    const steps = [2, 2.25, 2.5, 2.75, 3].map((r) => opponentRank(1, r));
    for (let i = 1; i < steps.length; i++) expect(steps[i - 1] - steps[i]).toBeLessThanOrEqual(0.26);
  });
});

describe("lanes", () => {
  it("fits every car on the strip and keeps lanes distinct", () => {
    for (let field = 2; field <= 10; field++) {
      const plan = lanePlan("strip", field);
      const all = [plan.player, ...plan.opponents];
      expect(new Set(all.map((v) => v.toFixed(3))).size).toBe(field);
      const half = Math.max(...all.map(Math.abs));
      expect(STRIP.cy + half).toBeLessThan(STRIP.cy + 60);
      expect(plan.pulloff).toBeGreaterThan(half);
    }
  });
});

describe("start lights", () => {
  it("builds red, goes green, then disappears", () => {
    expect(startLightState(0)).toEqual({ red: 0, green: false });
    expect(startLightState(0.02)?.green).toBe(false);
    expect(startLightState(0.035)?.green).toBe(true);
    expect(startLightState(0.04)).toBeNull();
  });
});
