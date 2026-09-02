import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "../store";
import { getUnlockGuide } from "@/components/effects/Toast";
import { WORKSHOP_REVEAL_PREFIX } from "@/data/workshopTabs";

afterEach(() => useGameStore.setState(createInitialState()));

describe("workshop section announcements", () => {
  it("queues an announcement once and ignores a pending duplicate", () => {
    useGameStore.getState().announceUnlock(`${WORKSHOP_REVEAL_PREFIX}Dealer`);
    useGameStore.getState().announceUnlock(`${WORKSHOP_REVEAL_PREFIX}Dealer`);
    useGameStore.getState().announceUnlock(`${WORKSHOP_REVEAL_PREFIX}Fabrication`);
    expect(useGameStore.getState().unlockEvents).toEqual([
      `${WORKSHOP_REVEAL_PREFIX}Dealer`,
      `${WORKSHOP_REVEAL_PREFIX}Fabrication`,
    ]);
  });

  it("explains a revealed section with what, where, and why", () => {
    const guide = getUnlockGuide(`${WORKSHOP_REVEAL_PREFIX}Fabrication`);
    expect(guide?.id).toBe("workshop-fabrication");
    expect(guide?.where).toContain("Workshop > Fabrication");
    expect(guide?.what.length).toBeGreaterThan(10);
    expect(getUnlockGuide(`${WORKSHOP_REVEAL_PREFIX}Nonsense`)).toBeNull();
  });
});
