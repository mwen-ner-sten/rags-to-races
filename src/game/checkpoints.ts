import type { GameState } from "@/core/types";
import { DISCIPLINES } from "@/core/content/events";

export const CHECKPOINT_SLOTS = [1, 2, 3] as const;
export type CheckpointSlot = (typeof CHECKPOINT_SLOTS)[number];
export const CHECKPOINT_PREFIX = "rags-to-races:checkpoint:";
interface StoredCheckpoint {
  label: string;
  text: string;
  note: string;
}
export interface CheckpointEntry {
  slot: CheckpointSlot;
  raw: string | null;
  checkpoint: StoredCheckpoint | null;
}

export function readCheckpoint(storage: Storage, slot: CheckpointSlot): CheckpointEntry {
  const raw = storage.getItem(CHECKPOINT_PREFIX + slot);
  if (raw) {
    try {
      const value: StoredCheckpoint = JSON.parse(raw);
      if (typeof value?.label === "string" && typeof value.text === "string" && typeof value.note === "string") {
        return { slot, raw, checkpoint: value };
      }
    } catch {
      /* Keep damaged data until the player explicitly replaces it. */
    }
  }
  return { slot, raw, checkpoint: null };
}

export function createCheckpoint(label: string, game: GameState, text: string): StoredCheckpoint {
  const season = game.meta.seasonsPlayed + 1;
  return {
    label: label.trim().slice(0, 48) || "Season " + season + " garage",
    note:
      "Season " +
      season +
      " · " +
      (game.era?.teamName ?? "Home garage") +
      " · " +
      DISCIPLINES[game.era?.discipline ?? "dirt"].name,
    text,
  };
}

/** Confirm against the version the player reviewed so a second open tab cannot silently replace a changed slot. */
export function writeCheckpoint(
  storage: Storage,
  entry: CheckpointEntry,
  next: StoredCheckpoint | null,
): string | null {
  const key = CHECKPOINT_PREFIX + entry.slot;
  try {
    if (storage.getItem(key) !== entry.raw) return "This slot changed in another tab. Review its current garage.";
    if (next) storage.setItem(key, JSON.stringify(next));
    else storage.removeItem(key);
    return null;
  } catch {
    return "Browser storage could not save that change. Your previous garage is still in its slot.";
  }
}
