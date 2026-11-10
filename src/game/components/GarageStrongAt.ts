import { useMemo } from "react";
import { venueName } from "@/core/content/events";
import { PARTS, type PartDef } from "@/core/content/parts";
import { partScoreAt } from "@/core/race";
import type { DisciplineId, GameState } from "@/core/types";

/** A neutral slot name for scoring a part on its own. */
const slotFor = (part: PartDef): string => (part.category === "wheel" ? "wheel" : part.category);

/** How much better than its rivals a part must be at a venue before we mention it. */
const MIN_EDGE = 1.03;

/**
 * For each part the player has seen, the open venue where it is worth most compared with the
 * other seen parts of the same category and tier. Parts with no rival, junk, and parts that are
 * not clearly better anywhere get no entry.
 */
export function strongAtMap(seenIds: readonly string[], venueIds: readonly string[], discipline: DisciplineId): Record<string, string> {
  const out: Record<string, string> = {};
  if (venueIds.length < 2) return out;
  const seen = PARTS.filter((p) => seenIds.includes(p.id) && p.category !== "junk" && p.category !== "body");
  const groups = new Map<string, PartDef[]>();
  for (const part of seen) {
    const key = `${part.category}:${part.tier}`;
    groups.set(key, [...(groups.get(key) ?? []), part]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const worth = (part: PartDef, venueId: string) => partScoreAt({ partId: part.id, condition: 3 }, discipline, venueId, slotFor(part));
    for (const part of group) {
      let bestVenue = "";
      let bestEdge = 0;
      for (const venueId of venueIds) {
        const average = group.reduce((sum, p) => sum + worth(p, venueId), 0) / group.length;
        const edge = average > 0 ? worth(part, venueId) / average : 0;
        if (edge > bestEdge) {
          bestEdge = edge;
          bestVenue = venueId;
        }
      }
      if (bestEdge >= MIN_EDGE) out[part.id] = `Strong at the ${venueName(bestVenue, discipline)}`;
    }
  }
  return out;
}

/** Memoised on the seen parts, the open venues and the discipline, not on the game object that the store replaces every tick. */
export function useStrongAt(game: GameState | null): Record<string, string> {
  const seenKey = game ? PARTS.filter((p) => (game.meta.codex.parts[p.id] ?? 0) > 0).map((p) => p.id).join(",") : "";
  const venueKey = game ? game.run.venuesOpen.join(",") : "";
  const discipline: DisciplineId = game?.era?.discipline ?? "dirt";
  return useMemo(() => strongAtMap(seenKey ? seenKey.split(",") : [], venueKey ? venueKey.split(",") : [], discipline), [seenKey, venueKey, discipline]);
}
