import { describe, expect, it } from "vitest";
import { STEPS, getAllowedTabs } from "../TutorialOverlay";

describe("guided onboarding scope", () => {
  it("ends after the first race and repair loop", () => {
    expect(STEPS).toHaveLength(14);
    expect(STEPS.at(-1)?.target).toBe("repair-btn");
    expect(getAllowedTabs(STEPS.length)).toBeNull();
  });
});