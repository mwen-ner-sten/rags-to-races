import { describe, expect, it } from "vitest";
import { createInitialState } from "@/state/store";
import type { GameState } from "@/state/store";
import { getPersistedGameState } from "@/state/persistence";
import {
  SAVE_FORMAT,
  SAVE_VERSION,
  createSaveEnvelope,
  decodeSavePayload,
} from "../saveLoad";

describe("save envelope", () => {
  it("accounts for every store field, excluding only deliberate race-animation transients", () => {
    const state = createInitialState();
    const persistedKeys = new Set(Object.keys(getPersistedGameState(state as GameState)));
    const transientKeys = new Set([
      "isScavenging",
      "isRacing",
      "lastRaceOutcome",
      "raceEvents",
      "raceStartTime",
      "precomputedOutcome",
      "unlockEvents",
    ]);

    expect(Object.keys(state).filter((key) => !persistedKeys.has(key))).toEqual(
      expect.arrayContaining([...transientKeys]),
    );
    expect(Object.keys(state).filter((key) => !persistedKeys.has(key))).toHaveLength(transientKeys.size);
  });

  it("round-trips the complete canonical persisted state", () => {
    const state = createInitialState();
    const envelope = createSaveEnvelope("Round trip", {
      ...state,
      scrapBucks: 1234,
      legacyPoints: 9,
      teamPoints: 4,
      unlockedFeatures: ["team"],
    });

    const decoded = decodeSavePayload(JSON.stringify(envelope));

    expect(decoded.envelope.state).toEqual(envelope.state);
    expect(decoded.envelope.state).toEqual(
      getPersistedGameState({
        ...state,
        scrapBucks: 1234,
        legacyPoints: 9,
        teamPoints: 4,
        unlockedFeatures: ["team"],
      } as GameState),
    );
  });

  it("migrates a legacy manual export without inventing missing run state", () => {
    const decoded = decodeSavePayload(
      JSON.stringify({
        version: "1.0",
        exportedAt: 100,
        label: "Old export",
        state: {
          scrapBucks: 50,
          repPoints: 8,
          inventory: [],
          garage: [],
        },
      }),
    );

    expect(decoded.sourceVersion).toBe(1);
    expect(decoded.envelope.format).toBe(SAVE_FORMAT);
    expect(decoded.envelope.version).toBe(SAVE_VERSION);
    expect(decoded.envelope.state.scrapBucks).toBe(50);
    expect(decoded.envelope.state.teamPoints).toBeUndefined();
  });

  it("migrates the original version-zero browser save", () => {
    const decoded = decodeSavePayload(
      JSON.stringify({ state: { prestigeCount: 3, scrapBucks: 10 }, version: 0 }),
    );

    expect(decoded.envelope.state.legacyPoints).toBe(9);
    expect(decoded.envelope.state.lifetimeLegacyPoints).toBe(9);
    expect(decoded.envelope.state.currentEra).toBe(1);
  });

  it("rejects corrupt state before it can be loaded", () => {
    expect(() =>
      decodeSavePayload(
        JSON.stringify({
          format: SAVE_FORMAT,
          version: SAVE_VERSION,
          build: "test",
          exportedAt: Date.now(),
          label: "Corrupt",
          state: { scrapBucks: -1 },
        }),
      ),
    ).toThrow("Invalid persisted game state");
  });

  it("refuses saves from a newer schema", () => {
    expect(() =>
      decodeSavePayload(
        JSON.stringify({
          format: SAVE_FORMAT,
          version: SAVE_VERSION + 1,
          build: "future",
          exportedAt: Date.now(),
          label: "Future",
          state: {},
        }),
      ),
    ).toThrow(`supports up to ${SAVE_VERSION}`);
  });
});
