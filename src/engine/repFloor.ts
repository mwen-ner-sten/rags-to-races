import type { GameState } from "@/state/store";
import { getLegacyEffectValue } from "./prestige";

/**
 * The Rep balance decay can never pull below. It is the legacy floor banked at
 * each Scrap Reset plus any Legacy upgrade that raises it (none ship yet; the
 * `leg_rep_floor` effect id is reserved for one).
 */
export function getRepFloor(state: Pick<GameState, "legacyRepFloor" | "legacyUpgradeLevels">): number {
  return Math.max(0, (state.legacyRepFloor ?? 0) + getLegacyEffectValue(state.legacyUpgradeLevels ?? {}, "leg_rep_floor"));
}
