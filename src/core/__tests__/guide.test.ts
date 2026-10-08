import { describe, expect, it } from "vitest";
import { TIPS } from "../content/tips";
import { GUIDE, guideStep } from "../guide";
import { apply, createGame, must } from "../index";
import { upgradeSave } from "../state";
import type { GameState } from "../types";

describe("first-Season guide", () => {
  it("starts at the first trip and moves on once it's done", () => {
    let s = createGame("guide1");
    expect(guideStep(s)?.step.id).toBe("trip");
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    s = must(s, { type: "advance", ms: 10 * 60_000 });
    expect(guideStep(s)?.step.id).toBe("clean");
  });

  it("every step explains itself and points at a tab", () => {
    const s = createGame("guide2");
    for (const step of GUIDE) {
      expect(step.how(s).length, step.id).toBeGreaterThan(20);
      expect(["trips", "garage", "race", "notebook"]).toContain(step.tab);
    }
    expect(new Set(GUIDE.map((g) => g.id)).size).toBe(GUIDE.length);
  });

  it("steps aside when hidden, after the first Season, or in the Team era", () => {
    const s = createGame("guide3");
    expect(guideStep(must(s, { type: "setGuide", on: false }))).toBeNull();
    const later: GameState = structuredClone(s);
    later.meta.seasonsPlayed = 1;
    expect(guideStep(later)).toBeNull();
  });
});

describe("tips", () => {
  it("are dismissed once and can be shown again", () => {
    let s = createGame("tips1");
    expect(apply(s, { type: "dismissTip", tipId: "nope" }).error).toBeTruthy();
    s = must(s, { type: "dismissTip", tipId: "garage" });
    s = must(s, { type: "dismissTip", tipId: "garage" });
    expect(s.meta.tipsSeen).toEqual(["garage"]);
    s = must(s, { type: "showTipsAgain" });
    expect(s.meta.tipsSeen).toEqual([]);
  });

  it("have unique ids and short copy", () => {
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
    for (const tip of TIPS) for (const line of tip.lines) expect(line.length, tip.id).toBeLessThan(260);
  });

  it("don't flood players whose saves predate them", () => {
    const old = createGame("tips2");
    old.run.revealed.push("garage", "race");
    delete (old.meta as Partial<GameState["meta"]>).tipsSeen;
    expect(upgradeSave(old).meta.tipsSeen).toEqual(expect.arrayContaining(["garage", "race"]));
  });
});
