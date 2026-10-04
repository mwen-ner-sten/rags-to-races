import { describe, expect, it } from "vitest";
import { describeRepDecay, describeRepPurchase, formatSpendableRep } from "@/engine/repPurchase";

describe("describeRepPurchase", () => {
  it("labels an affordable unlock and leaves no disabled reason", () => {
    const view = describeRepPurchase(13, 20);
    expect(view.label).toBe("Unlock · 13 Rep");
    expect(view.affordable).toBe(true);
    expect(view.shortfall).toBe(0);
    expect(view.disabledReason).toBeUndefined();
  });

  it("reports the whole-Rep shortfall when unaffordable", () => {
    const view = describeRepPurchase(50, 42.4);
    expect(view.affordable).toBe(false);
    expect(view.shortfall).toBe(8);
    expect(view.disabledReason).toBe("Need 8 more Rep");
  });

  it("treats free and malformed prices as a plain Unlock", () => {
    expect(describeRepPurchase(0, 0).label).toBe("Unlock");
    expect(describeRepPurchase(Number.NaN, 0).affordable).toBe(true);
    expect(describeRepPurchase(-5, 0).cost).toBe(0);
  });

  it("formats large prices compactly", () => {
    expect(describeRepPurchase(25_000, 0).label).toBe("Unlock · 25.0K Rep");
  });
});

describe("formatSpendableRep", () => {
  it("shows the current balance and never goes negative", () => {
    expect(formatSpendableRep(42.7)).toBe("Spendable Rep: 42");
    expect(formatSpendableRep(-3)).toBe("Spendable Rep: 0");
  });
});

describe("describeRepDecay", () => {
  it("explains the retained starting entitlement without suggesting decay", () => {
    expect(describeRepDecay(250)).toEqual({ toward: "Starting Rep entitlement: 250", halfLife: "Earned Rep stays yours while you are away" });
    expect(describeRepDecay(-1).toward).toBe("Starting Rep entitlement: 0");
  });
});
