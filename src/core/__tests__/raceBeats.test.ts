import { describe, expect, it } from "vitest";
import { LAPS, buildBeats } from "../raceBeats";
import { createGame } from "../index";
import type { EventKind } from "../types";

describe("race beats", () => {
  it("tell a coherent race for any outcome", () => {
    const s = createGame("beats");
    const events: EventKind[] = ["sprint", "heat", "feature"];
    for (let i = 0; i < 400; i++) {
      const event = events[i % 3];
      const fieldSize = 6;
      const dnf = i % 7 === 0;
      const position = dnf ? fieldSize : 1 + (i % fieldSize);
      const startPos = 2 + (i % (fieldSize - 1));
      const laps = i % 11 === 0 ? 1 : LAPS[event];
      const durationMs = 60_000 * (1 + (i % 8));
      const beats = buildBeats(s, { startPos, position, fieldSize, dnf, weakSlot: i % 2 ? "engine" : null, durationMs, laps, rivalId: event === "feature" ? "dale" : undefined, rivalBeaten: !dnf && position <= 2 });
      const tag = `race ${i}`;
      expect(beats[0].kind, tag).toBe("start");
      expect(beats.length, tag).toBeGreaterThanOrEqual(2);
      expect(beats.length, tag).toBeLessThanOrEqual(15);
      for (let b = 1; b < beats.length; b++) expect(beats[b].at, tag).toBeGreaterThanOrEqual(beats[b - 1].at);
      for (const beat of beats) {
        expect(beat.position, tag).toBeGreaterThanOrEqual(1);
        expect(beat.position, tag).toBeLessThanOrEqual(fieldSize);
        expect(beat.at, tag).toBeLessThanOrEqual(durationMs);
      }
      const last = beats[beats.length - 1];
      expect(last.kind, tag).toBe(dnf ? "dnf" : "finish");
      expect(last.position, tag).toBe(position);
    }
  });
});
