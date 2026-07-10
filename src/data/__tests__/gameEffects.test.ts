import { describe, expect, it } from "vitest";
import { GAME_EFFECT_REGISTRY, getGameEffectValue } from "../gameEffects";
import { LEGACY_UPGRADE_DEFINITIONS } from "../legacyUpgrades";
import { TEAM_UPGRADE_DEFINITIONS } from "../teamUpgrades";
import { OWNER_UPGRADE_DEFINITIONS } from "../ownerUpgrades";
import { TRACK_PERK_DEFINITIONS } from "../trackPerks";

const definitions = [...LEGACY_UPGRADE_DEFINITIONS, ...TEAM_UPGRADE_DEFINITIONS, ...OWNER_UPGRADE_DEFINITIONS, ...TRACK_PERK_DEFINITIONS];

describe("typed effect registry", () => {
  it("registers every effect with an explicit runtime consumer", () => {
    for (const definition of definitions) expect(GAME_EFFECT_REGISTRY[definition.effect.type].consumer).toBeTruthy();
  });

  it("applies every positive effect value and stacks by level", () => {
    for (const type of new Set(definitions.map((definition) => definition.effect.type))) {
      const matching = definitions.filter((definition) => definition.effect.type === type);
      const levels = Object.fromEntries(matching.map((definition) => [definition.id, 2]));
      expect(getGameEffectValue(matching, levels, type)).toBeGreaterThan(0);
    }
  });
});
