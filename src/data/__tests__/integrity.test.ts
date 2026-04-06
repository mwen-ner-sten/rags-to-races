import { describe, it, expect } from "vitest";
import { CIRCUIT_DEFINITIONS } from "../circuits";
import { VEHICLE_DEFINITIONS } from "../vehicles";
import { LEGACY_UPGRADE_DEFINITIONS } from "../legacyUpgrades";
import { MOMENTUM_TIERS } from "../momentumBonuses";
import { UPGRADE_DEFINITIONS } from "../upgrades";

describe("CIRCUIT_DEFINITIONS integrity", () => {
  it("has no duplicate IDs", () => {
    const ids = CIRCUIT_DEFINITIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has non-decreasing tiers", () => {
    for (let i = 1; i < CIRCUIT_DEFINITIONS.length; i++) {
      expect(CIRCUIT_DEFINITIONS[i].tier).toBeGreaterThanOrEqual(
        CIRCUIT_DEFINITIONS[i - 1].tier,
      );
    }
  });

  it("has non-decreasing difficulty", () => {
    for (let i = 1; i < CIRCUIT_DEFINITIONS.length; i++) {
      expect(CIRCUIT_DEFINITIONS[i].difficulty).toBeGreaterThanOrEqual(
        CIRCUIT_DEFINITIONS[i - 1].difficulty,
      );
    }
  });

  it("has non-decreasing rewards", () => {
    for (let i = 1; i < CIRCUIT_DEFINITIONS.length; i++) {
      expect(CIRCUIT_DEFINITIONS[i].rewardBase).toBeGreaterThanOrEqual(
        CIRCUIT_DEFINITIONS[i - 1].rewardBase,
      );
    }
  });
});

describe("VEHICLE_DEFINITIONS integrity", () => {
  it("has no duplicate IDs", () => {
    const ids = VEHICLE_DEFINITIONS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has non-decreasing tiers", () => {
    for (let i = 1; i < VEHICLE_DEFINITIONS.length; i++) {
      expect(VEHICLE_DEFINITIONS[i].tier).toBeGreaterThanOrEqual(
        VEHICLE_DEFINITIONS[i - 1].tier,
      );
    }
  });
});

describe("LEGACY_UPGRADE_DEFINITIONS integrity", () => {
  it("has no duplicate IDs", () => {
    const ids = LEGACY_UPGRADE_DEFINITIONS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has costScaling > 1 for all upgrades", () => {
    for (const def of LEGACY_UPGRADE_DEFINITIONS) {
      expect(def.costScaling, `${def.id} costScaling`).toBeGreaterThan(1);
    }
  });

  it("has maxLevel > 0 for all upgrades", () => {
    for (const def of LEGACY_UPGRADE_DEFINITIONS) {
      expect(def.maxLevel, `${def.id} maxLevel`).toBeGreaterThan(0);
    }
  });
});

describe("MOMENTUM_TIERS integrity", () => {
  it("has unique IDs", () => {
    const ids = MOMENTUM_TIERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique conditions", () => {
    const conditions = MOMENTUM_TIERS.map(
      (t) => `${t.condition.type}:${t.condition.value}`,
    );
    expect(new Set(conditions).size).toBe(conditions.length);
  });
});

describe("UPGRADE_DEFINITIONS integrity", () => {
  it("has no duplicate IDs", () => {
    const ids = UPGRADE_DEFINITIONS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has costScaling >= 1 for all upgrades", () => {
    for (const def of UPGRADE_DEFINITIONS) {
      expect(def.costScaling, `${def.id} costScaling`).toBeGreaterThanOrEqual(1);
    }
  });
});
