import { describe, expect, it } from "vitest";
import { FEATURE_AVAILABILITY, isFeatureAvailable } from "../features";

describe("feature availability", () => {
  it("keeps incomplete systems out of UAT and released builds", () => {
    expect(isFeatureAvailable("crew_system", "dev")).toBe(true);
    expect(isFeatureAvailable("crew_system", "uat")).toBe(false);
    expect(isFeatureAvailable("track_customization", "released")).toBe(false);
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
