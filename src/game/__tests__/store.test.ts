import { describe, expect, it } from "vitest";
import { createGame } from "@/core";
import { isGameState } from "../store";

describe("save validation", () => {
  it("accepts a real game, including after a JSON round trip", () => {
    expect(isGameState(createGame("ok"))).toBe(true);
    expect(isGameState(JSON.parse(JSON.stringify(createGame("ok"))))).toBe(true);
  });

  it("rejects saves that would crash the UI", () => {
    const broken = JSON.parse(JSON.stringify(createGame("bad")));
    broken.run = {};
    expect(isGameState(broken)).toBe(false);
    expect(isGameState({ version: 2 })).toBe(false);
    expect(isGameState(null)).toBe(false);
  });
});
