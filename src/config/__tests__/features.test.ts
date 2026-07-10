import { describe, expect, it } from "vitest";
import { FEATURE_AVAILABILITY, isFeatureAvailable } from "../features";

describe("feature availability", () => {
  it("ships completed responsibility layers while keeping legacy experiments hidden", () => {
    expect(isFeatureAvailable("crew_system", "released")).toBe(true);
    expect(isFeatureAvailable("track_customization", "released")).toBe(true);
    expect(isFeatureAvailable("racer_attributes", "uat")).toBe(false);
  });

  it("makes released features available in every channel", () => {
    expect(FEATURE_AVAILABILITY.save_recovery.availability).toBe("released");
    expect(isFeatureAvailable("save_recovery", "experimental")).toBe(true);
    expect(isFeatureAvailable("save_recovery", "released")).toBe(true);
  });

  it("requires explicit opt-in for experimental surfaces", () => {
    expect(isFeatureAvailable("design_mock", "experimental")).toBe(true);
    expect(isFeatureAvailable("design_mock", "dev")).toBe(false);
  });
});
