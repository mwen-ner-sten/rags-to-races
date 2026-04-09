import { describe, it, expect } from "vitest";
import { CIRCUIT_DEFINITIONS } from "../circuits";
import { VEHICLE_DEFINITIONS } from "../vehicles";
import { LEGACY_UPGRADE_DEFINITIONS } from "../legacyUpgrades";
import { MOMENTUM_TIERS } from "../momentumBonuses";
import { UPGRADE_DEFINITIONS } from "../upgrades";
import { PRESTIGE_MILESTONE_DEFINITIONS } from "@/data/prestigeMilestones";
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_CATEGORIES } from "@/data/achievements";
import {
  PLAYSTYLE_NODE_DEFINITIONS,
  PLAYSTYLE_NODES_BY_ID,
  PLAYSTYLE_PATHS,
} from "@/data/playstyleUpgrades";

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

describe("PRESTIGE_MILESTONE_DEFINITIONS integrity", () => {
  it("has no duplicate IDs", () => {
    const ids = PRESTIGE_MILESTONE_DEFINITIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has prestigeRequired >= 1 for all milestones", () => {
    for (const m of PRESTIGE_MILESTONE_DEFINITIONS) {
      expect(m.prestigeRequired, `${m.id} prestigeRequired`).toBeGreaterThanOrEqual(1);
    }
  });

  it("is sorted by prestigeRequired ascending", () => {
    for (let i = 1; i < PRESTIGE_MILESTONE_DEFINITIONS.length; i++) {
      expect(
        PRESTIGE_MILESTONE_DEFINITIONS[i].prestigeRequired,
      ).toBeGreaterThanOrEqual(
        PRESTIGE_MILESTONE_DEFINITIONS[i - 1].prestigeRequired,
      );
    }
  });

  it("has non-empty name, description, flavorText for all milestones", () => {
    for (const m of PRESTIGE_MILESTONE_DEFINITIONS) {
      expect(m.name, `${m.id} name`).toBeTruthy();
      expect(m.description, `${m.id} description`).toBeTruthy();
      expect(m.flavorText, `${m.id} flavorText`).toBeTruthy();
    }
  });
});

describe("ACHIEVEMENT_DEFINITIONS integrity", () => {
  it("has no duplicate IDs", () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all achievements reference a valid category", () => {
    const validCategories = new Set(ACHIEVEMENT_CATEGORIES.map((c) => c.id));
    for (const a of ACHIEVEMENT_DEFINITIONS) {
      expect(validCategories.has(a.category), `${a.id} has invalid category "${a.category}"`).toBe(true);
    }
  });

  it("all achievements have target > 0", () => {
    for (const a of ACHIEVEMENT_DEFINITIONS) {
      expect(a.target, `${a.id} target`).toBeGreaterThan(0);
    }
  });

  it("has non-empty name, description, flavorText for all achievements", () => {
    for (const a of ACHIEVEMENT_DEFINITIONS) {
      expect(a.name, `${a.id} name`).toBeTruthy();
      expect(a.description, `${a.id} description`).toBeTruthy();
      expect(a.flavorText, `${a.id} flavorText`).toBeTruthy();
    }
  });

  it("all bonus reward achievements have non-empty bonusId", () => {
    const bonusAchievements = ACHIEVEMENT_DEFINITIONS.filter(
      (a) => a.reward.type === "bonus",
    );
    expect(bonusAchievements.length).toBeGreaterThan(0);
    for (const a of bonusAchievements) {
      if (a.reward.type === "bonus") {
        expect(a.reward.bonusId, `${a.id} bonusId`).toBeTruthy();
      }
    }
  });
});

describe("PLAYSTYLE_NODE_DEFINITIONS integrity", () => {
  it("has no duplicate IDs", () => {
    const ids = PLAYSTYLE_NODE_DEFINITIONS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all nodes reference a valid path", () => {
    const validPaths = new Set(PLAYSTYLE_PATHS.map((p) => p.id));
    for (const n of PLAYSTYLE_NODE_DEFINITIONS) {
      expect(validPaths.has(n.path), `${n.id} has invalid path "${n.path}"`).toBe(true);
    }
  });

  it("all prerequisiteNodeId references exist", () => {
    for (const n of PLAYSTYLE_NODE_DEFINITIONS) {
      if (n.prerequisiteNodeId) {
        expect(
          PLAYSTYLE_NODES_BY_ID[n.prerequisiteNodeId],
          `${n.id} prerequisite "${n.prerequisiteNodeId}" not found`,
        ).toBeDefined();
      }
    }
  });

  it("all mutuallyExclusiveWith references exist", () => {
    for (const n of PLAYSTYLE_NODE_DEFINITIONS) {
      if (n.mutuallyExclusiveWith) {
        expect(
          PLAYSTYLE_NODES_BY_ID[n.mutuallyExclusiveWith],
          `${n.id} mutuallyExclusiveWith "${n.mutuallyExclusiveWith}" not found`,
        ).toBeDefined();
      }
    }
  });

  it("all nodes have lpCost > 0", () => {
    for (const n of PLAYSTYLE_NODE_DEFINITIONS) {
      expect(n.lpCost, `${n.id} lpCost`).toBeGreaterThan(0);
    }
  });

  it("each path has exactly 6 nodes (T1, T2a, T2b, T3a, T3b, T4)", () => {
    for (const path of PLAYSTYLE_PATHS) {
      const pathNodes = PLAYSTYLE_NODE_DEFINITIONS.filter(
        (n) => n.path === path.id,
      );
      expect(pathNodes.length, `path "${path.id}" node count`).toBe(6);
    }
  });
});
