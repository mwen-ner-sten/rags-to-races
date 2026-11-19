import { afterEach, describe, expect, it } from "vitest";
import { pendingDepotAndRepair, pendingHeritage, pendingWorksFinal } from "../../../tests/fixtures/workshopAway";
import { racer } from "../../../tests/fixtures/rewrite";
import { decodeGameState } from "../../game/save";
import { apply, must } from "../index";
import { possiblePins, selectedPin } from "../careerPin";
import { EXPERIMENTAL_OFF, experimentalCareers, setExperimentalCareers } from "../features";
import { LAYERS } from "../layers";
import { motorPoolVisible } from "../motorPool";
import { shopFoundingReady, shopMoveReady } from "../serviceShop";

afterEach(() => setExperimentalCareers(false));

describe("experimental careers flag", () => {
  it("is off by default and never part of the save", () => {
    expect(experimentalCareers()).toBe(false);
    expect(JSON.stringify(racer("flag-save"))).not.toMatch(/experimental/i);
  });

  it("refuses every experimental action while off", () => {
    const state = racer("flag-actions");
    const moves = [
      { type: "service", move: { type: "release" } },
      { type: "heritage", move: { type: "cancel" } },
      { type: "works", move: { type: "release" } },
      { type: "motorPool", move: { type: "claim" } },
    ] as unknown as Parameters<typeof apply>[1][];
    for (const action of moves) expect(apply(state, action).error).toBe(EXPERIMENTAL_OFF);
  });

  it("hides the shop route and motor pool gates", () => {
    setExperimentalCareers(true);
    const state = pendingDepotAndRepair();
    expect(motorPoolVisible(state)).toBe(true);
    setExperimentalCareers(false);
    expect(motorPoolVisible(state)).toBe(false);
    expect(shopMoveReady(state)).toBe(false);
    expect(shopFoundingReady(state)).toBe(false);
    expect(LAYERS.shop.gate(state).ok).toBe(false);
  });

  it("keeps the normal Team Reset gate and the organisation choice independent of the service route", () => {
    const state = racer("flag-team");
    state.meta.stateWonEver = true;
    expect(LAYERS.team.gate(state).ok).toBe(true);
    const chosen = apply(state, {
      type: "reset", layer: "team",
      choices: { ...state.config, discipline: "dirt", organization: "collective", teamName: "Plain Collective", colors: ["#271", "#eee"], tuneUp: state.config.tuneUp } as never,
    });
    expect(chosen.error).toBeNull();
  });

  it("only offers the experimental career pins when on, and ignores a saved one while off", () => {
    setExperimentalCareers(true);
    const state = pendingWorksFinal();
    expect(possiblePins(state)).toContain("manufacturer");
    state.meta.careerPin = "manufacturer";
    expect(selectedPin(state)).toBe("manufacturer");
    setExperimentalCareers(false);
    expect(possiblePins(state)).not.toContain("manufacturer");
    expect(possiblePins(state)).not.toContain("paid-work");
    expect(possiblePins(state)).not.toContain("heritage");
    expect(selectedPin(state)).toBeUndefined();
  });

  it("loads and resets saves that already hold experimental progress while hidden", () => {
    setExperimentalCareers(true);
    const states = [pendingDepotAndRepair(), pendingWorksFinal(), pendingHeritage("special")];
    setExperimentalCareers(false);
    for (const state of states) {
      expect(decodeGameState(JSON.parse(JSON.stringify(state)))).not.toBeNull();
      state.run.featureWins.county_fair = state.run.seasonMs;
      expect(() => must(state, { type: "reset", layer: "scrap", choices: state.config })).not.toThrow();
    }
  });
});
