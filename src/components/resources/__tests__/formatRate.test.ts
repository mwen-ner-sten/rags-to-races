import { describe, expect, it } from "vitest";
import { capPercent, formatAmount, formatRate, rateSign } from "../formatRate";

describe("rateSign", () => {
  it("treats tiny and non-finite values as zero", () => {
    expect(rateSign(0)).toBe("zero");
    expect(rateSign(0.004)).toBe("zero");
    expect(rateSign(-0.004)).toBe("zero");
    expect(rateSign(Number.NaN)).toBe("zero");
  });

  it("classifies positive and negative", () => {
    expect(rateSign(1.2)).toBe("pos");
    expect(rateSign(-0.5)).toBe("neg");
  });
});

describe("formatRate", () => {
  it("renders the Kittens-style per-second chip", () => {
    expect(formatRate(0)).toBe("0/s");
    expect(formatRate(1.2)).toBe("+1.2/s");
    expect(formatRate(-0.5)).toBe("-0.5/s");
    expect(formatRate(0.05)).toBe("+0.05/s");
    expect(formatRate(250)).toBe("+250/s");
    expect(formatRate(12_500)).toBe("+12.5K/s");
    expect(formatRate(-3_400_000)).toBe("-3.4M/s");
  });
});

describe("formatAmount", () => {
  it("uses thousands separators below 10K and compact units above", () => {
    expect(formatAmount(0)).toBe("0");
    expect(formatAmount(9_999.9)).toBe("9,999");
    expect(formatAmount(12_345)).toBe("12.3K");
    expect(formatAmount(2_500_000)).toBe("2.5M");
    expect(formatAmount(-42)).toBe("-42");
    expect(formatAmount(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

describe("capPercent", () => {
  it("returns null without a usable cap and clamps to 0..100", () => {
    expect(capPercent(5)).toBeNull();
    expect(capPercent(5, 0)).toBeNull();
    expect(capPercent(5, 10)).toBe(50);
    expect(capPercent(20, 10)).toBe(100);
    expect(capPercent(-1, 10)).toBe(0);
  });
});
