import { describe, expect, it } from "vitest";
import { FEATURE_AVAILABILITY, isFeatureAvailable } from "../features";

describe("feature availability", () => {
  it("ships completed responsibility layers while keeping developer surfaces hidden", () => {
    expect(isFeatureAvailable("crew_system", "released")).toBe(true);
    expect(isFeatureAvailable("track_customization", "released")).toBe(true);
    expect(isFeatureAvailable("new_workshop_cats", "uat")).toBe(false);
  });

  it("makes released features available in every channel", () => {
    expect(FEATURE_AVAILABILITY.save_recovery.availability).toBe("released");
    expect(isFeatureAvailable("save_recovery", "experimental")).toBe(true);
    expect(isFeatureAvailable("save_recovery", "released")).toBe(true);
  });

  it("exposes dev-only features to the experimental channel but not beyond", () => {
    expect(isFeatureAvailable("admin_tools", "experimental")).toBe(true);
    expect(isFeatureAvailable("admin_tools", "dev")).toBe(true);
    expect(isFeatureAvailable("admin_tools", "uat")).toBe(false);
  });
});
