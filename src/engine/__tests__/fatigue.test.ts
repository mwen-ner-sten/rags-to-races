import { describe, it, expect } from "vitest";
import { calcFatigue } from "@/components/Admin/charts/balanceUtils";

describe("calcFatigue", () => {
  it("returns 0 for 0 races", () => {
    expect(calcFatigue(0, 0)).toBe(0);
  });

  it("returns 0 when races <= fatigueOffset", () => {
    expect(calcFatigue(10, 20)).toBe(0);
    expect(calcFatigue(10, 10)).toBe(0);
  });

  it("computes expected fatigue milestones", () => {
    // formula: floor(25 * log2(1 + effective/25))
    // 25 races: 25 * log2(1 + 25/25) = 25 * log2(2) = 25 * 1 = 25
    expect(calcFatigue(25, 0)).toBe(25);
    // 50 races: 25 * log2(1 + 50/25) = 25 * log2(3) ≈ 25 * 1.585 = 39.6 → 39
    expect(calcFatigue(50, 0)).toBe(39);
    // 75 races: 25 * log2(1 + 75/25) = 25 * log2(4) = 25 * 2 = 50
    expect(calcFatigue(75, 0)).toBe(50);
    // 100 races: 25 * log2(1 + 100/25) = 25 * log2(5) ≈ 25 * 2.322 = 58.05 → 58
    expect(calcFatigue(100, 0)).toBe(58);
  });

  it("caps at 99", () => {
    expect(calcFatigue(100000, 0)).toBe(99);
  });

  it("applies Iron Will offset correctly", () => {
    // With offset=25, 50 races → effective=25, same as 25 races with no offset
    expect(calcFatigue(50, 25)).toBe(calcFatigue(25, 0));
  });
});
