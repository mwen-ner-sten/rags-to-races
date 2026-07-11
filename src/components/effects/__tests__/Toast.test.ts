import { describe, expect, it } from "vitest";
import { getUnlockGuide } from "../Toast";

describe("getUnlockGuide", () => {
  it.each([
    ["Dirt Track Unlocked! A figure-eight on a gravel lot.", "circuits"],
    ["Go-Kart Blueprint Unlocked! Surprisingly quick.", "blueprints"],
    ["Station Equipment: Decent Loadout!", "station-equipment"],
    ["Challenge Complete: On a Roll!", "challenges"],
    ["5 WINS! Unstoppable!", "win-streaks"],
    ["Achievement: First Win!", "achievements"],
    ["New Location: Junkyard!", "locations"],
    ["Auto-Scavenge Enabled!", "automation"],
    ["+2 Legacy Points earned!", "legacy-points"],
    ["Milestone: Quick Start — Begin with more cash", "prestige-milestones"],
  ])("provides an explanation for %s", (message, expectedId) => {
    expect(getUnlockGuide(message)?.id).toBe(expectedId);
  });

  it("keeps ordinary progress updates lightweight", () => {
    expect(getUnlockGuide("Rep gained: +2")).toBeNull();
  });
});
