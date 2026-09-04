import { describe, expect, it } from "vitest";
import { migratePersistedState, parseZustandPayload, PERSISTENCE_VERSION } from "../persistence";

describe("migratePersistedState", () => {
  it("strips fields written by removed systems from old saves", () => {
    const legacySave = {
      scrapBucks: 120,
      repPoints: 4,
      equippedGear: { head: "head_bare", body: "body_rags" },
      ownedGearIds: ["head_bare", "body_rags"],
      unlockedTalentNodes: ["rd_smooth_lines"],
      racerAttributes: { reflexes: 2, endurance: 0 },
      lootGearInventory: [],
    };

    const migrated = migratePersistedState(legacySave, PERSISTENCE_VERSION) as Record<string, unknown>;

    expect(migrated.scrapBucks).toBe(120);
    expect(migrated.repPoints).toBe(4);
    expect(migrated.lootGearInventory).toEqual([]);
    expect(migrated).not.toHaveProperty("equippedGear");
    expect(migrated).not.toHaveProperty("ownedGearIds");
    expect(migrated).not.toHaveProperty("unlockedTalentNodes");
    expect(migrated).not.toHaveProperty("racerAttributes");
  });

  it("does not mutate the parsed input", () => {
    const legacySave = { scrapBucks: 1, unlockedTalentNodes: ["x"] };
    migratePersistedState(legacySave, PERSISTENCE_VERSION);
    expect(legacySave.unlockedTalentNodes).toEqual(["x"]);
  });

  it("rejects payloads that fail schema validation", () => {
    expect(() => migratePersistedState({ scrapBucks: -5 }, PERSISTENCE_VERSION)).toThrow(/Invalid persisted game state/);
  });
});

describe("parseZustandPayload", () => {
  it("strips removed fields from a serialised zustand payload", () => {
    const raw = JSON.stringify({
      state: { scrapBucks: 7, equippedGear: { head: "head_bare" }, racerAttributes: {} },
      version: PERSISTENCE_VERSION,
    });

    const { state, version } = parseZustandPayload(raw);

    expect(version).toBe(PERSISTENCE_VERSION);
    expect(state.scrapBucks).toBe(7);
    expect(state).not.toHaveProperty("equippedGear");
    expect(state).not.toHaveProperty("racerAttributes");
  });
});
