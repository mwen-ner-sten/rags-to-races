import { afterEach, describe, expect, it } from "vitest";
import { getPersistedGameState, mergePersistedGameState } from "../persistence";
import { RESET_PRESERVE_FIELDS } from "@/data/resetContracts";
import { createInitialState, useGameStore, type GameState } from "../store";
import { createGameplayFixture } from "@/testing/gameplayFixtures";

afterEach(() => useGameStore.setState(createInitialState()));

describe("contextual coaching state", () => {
  it("distinguishes completed tutorials from skips while migrating completed legacy saves", () => {
    expect(createInitialState().tutorialCompleted).toBe(false);

    useGameStore.setState({ ...createInitialState(), tutorialStep: 13 });
    useGameStore.getState().advanceTutorial();
    expect(useGameStore.getState()).toMatchObject({ tutorialStep: -1, tutorialCompleted: true });

    useGameStore.setState({ ...createInitialState(), tutorialStep: 13 });
    useGameStore.getState().skipTutorial();
    expect(useGameStore.getState()).toMatchObject({ tutorialStep: -1, tutorialCompleted: false });

    const legacyRace = createGameplayFixture("first_scrap_reset_ready").payload.state.raceHistory[0];
    const skippedLegacy = mergePersistedGameState({
      tutorialStep: -1,
      raceHistory: [legacyRace],
    }, createInitialState() as GameState);
    expect(skippedLegacy.tutorialCompleted).toBe(false);

    const legacyHydrated = mergePersistedGameState({
      tutorialStep: -1,
      raceHistory: [legacyRace],
      activityLog: [{
        id: 1,
        timestamp: 1,
        category: "build",
        message: "Repaired Push Mower for $0",
      }],
    }, createInitialState() as GameState);
    expect(legacyHydrated.tutorialCompleted).toBe(true);
  });

  it("dismisses one coach idempotently without changing gameplay progress", () => {
    useGameStore.setState({
      ...createInitialState(),
      tutorialStep: -1,
      scrapBucks: 123,
      repPoints: 45,
    });

    useGameStore.getState().dismissContextualCoach("toolkit");
    useGameStore.getState().dismissContextualCoach("toolkit");

    expect(useGameStore.getState().dismissedContextualCoachIds).toEqual(["toolkit"]);
    expect(useGameStore.getState()).toMatchObject({
      tutorialStep: -1,
      scrapBucks: 123,
      repPoints: 45,
    });
  });

  it("persists dismissals while legacy saves default to no dismissals", () => {
    const initial = createInitialState() as GameState;
    const legacyHydrated = mergePersistedGameState({
      tutorialStep: -1,
      scrapBucks: 50,
    }, initial);
    expect(legacyHydrated.dismissedContextualCoachIds).toEqual([]);

    const persisted = getPersistedGameState({
      ...initial,
      dismissedContextualCoachIds: ["automation"],
    });
    expect(persisted.dismissedContextualCoachIds).toEqual(["automation"]);
  });

  it.each([
    ["scrap", "first_scrap_reset_ready", "prestige"],
    ["team", "team_reset_ready", "teamReset"],
    ["owner", "owner_reset_ready", "ownerReset"],
    ["track", "track_reset_ready", "trackReset"],
  ] as const)("keeps optional coach dismissal history through the %s reset", (layer, fixture, action) => {
    useGameStore.setState({
      ...createInitialState(),
      ...createGameplayFixture(fixture).payload.state,
      dismissedContextualCoachIds: ["toolkit", "automation"],
    });

    if (action === "teamReset") useGameStore.getState().teamReset("junkyard_works");
    else useGameStore.getState()[action]();

    expect(RESET_PRESERVE_FIELDS[layer].has("dismissedContextualCoachIds")).toBe(true);
    expect(useGameStore.getState().dismissedContextualCoachIds).toEqual(["toolkit", "automation"]);
  });
});
