import { describe, expect, it } from "vitest";
import type { ResourceRate } from "@/engine/rates";
import { resourceRelevance, selectRelevantRates, visibleRates } from "../selectRelevant";

function rate(id: string, visible = true): ResourceRate {
  return { id, label: id, amount: 0, perSecond: 0, visible, color: "#fff" };
}

describe("resourceRelevance", () => {
  it("ranks tab-specific currencies above always-on ones above unknown ids", () => {
    expect(resourceRelevance("lp", "upgrades")).toBe(2);
    expect(resourceRelevance("scrap_bucks", "upgrades")).toBe(1);
    expect(resourceRelevance("lp", "junkyard")).toBe(0);
    expect(resourceRelevance("parts", "junkyard")).toBe(0);
  });
});

describe("visibleRates", () => {
  it("drops hidden resources", () => {
    expect(visibleRates([rate("a"), rate("b", false)]).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("selectRelevantRates", () => {
  const rates = [rate("scrap_bucks"), rate("rep"), rate("lp"), rate("tp"), rate("forge_tokens"), rate("parts")];

  it("puts tab-relevant currencies first and keeps definition order for ties", () => {
    expect(selectRelevantRates(rates, "upgrades").map((r) => r.id)).toEqual(["lp", "tp", "forge_tokens"]);
    expect(selectRelevantRates(rates, "gear").map((r) => r.id)).toEqual(["forge_tokens", "scrap_bucks", "rep"]);
  });

  it("fills the remaining slots with lower-relevance resources in order", () => {
    expect(selectRelevantRates(rates, "junkyard").map((r) => r.id)).toEqual(["scrap_bucks", "rep", "lp"]);
  });

  it("never shows hidden resources and honours the limit", () => {
    const withHidden = [rate("scrap_bucks"), rate("rep", false), rate("lp")];
    expect(selectRelevantRates(withHidden, "upgrades", 2).map((r) => r.id)).toEqual(["lp", "scrap_bucks"]);
  });
});
