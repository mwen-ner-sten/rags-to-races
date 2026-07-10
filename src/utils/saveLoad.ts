import { z } from "zod";
import { createInitialState, useGameStore } from "@/state/store";
import type { GameState } from "@/state/store";
import {
  PERSISTENCE_VERSION,
  clearRecoveryBackup,
  getPersistedGameState,
  migratePersistedState,
  parseZustandPayload,
  readRecoveryBackup,
  writeRecoveryBackup,
  type PersistedGameState,
  type RecoveryBackup,
} from "@/state/persistence";

export const SAVE_VERSION = PERSISTENCE_VERSION;
export const SAVE_FORMAT = "rags-to-races-save" as const;
const SLOT_PREFIX = "rags-to-races-slot-";
const TIMESTAMP_KEY = "rags-to-races-last-saved";

const envelopeSchema = z.object({
  format: z.literal(SAVE_FORMAT),
  version: z.number().int().nonnegative(),
  build: z.string(),
  exportedAt: z.number().finite().nonnegative(),
  label: z.string(),
  state: z.unknown(),
});

const legacyEnvelopeSchema = z.object({
  version: z.union([z.string(), z.number()]),
  exportedAt: z.number().finite().nonnegative(),
  label: z.string().optional(),
  state: z.unknown(),
});

export interface SaveSlotMeta {
  slot: number;
  label: string;
  timestamp: number | null;
  scrapBucks: number;
  repPoints: number;
  prestigeCount: number;
  vehicleCount: number;
}

export interface SaveEnvelope<V = PersistedGameState> {
  format: typeof SAVE_FORMAT;
  version: number;
  build: string;
  exportedAt: number;
  label: string;
  state: V;
}

export interface DecodedSave {
  envelope: SaveEnvelope<Partial<PersistedGameState>>;
  sourceVersion: number;
}

function buildVersion(): string {
  return process.env.NEXT_PUBLIC_BUILD_VERSION ?? "development";
}

export function createSaveEnvelope(
  label = "Exported Save",
  state: GameState | ReturnType<typeof createInitialState> = useGameStore.getState(),
): SaveEnvelope {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    build: buildVersion(),
    exportedAt: Date.now(),
    label,
    state: getPersistedGameState(state as GameState),
  };
}

function legacyVersion(value: string | number): number {
  if (typeof value === "number") return value;
  const major = Number.parseInt(value.split(".")[0], 10);
  return Number.isFinite(major) ? major : 0;
}

/** Decode current exports, legacy exports, and raw Zustand persistence payloads. */
export function decodeSavePayload(raw: string): DecodedSave {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("Save file is not valid JSON.");
  }

  const current = envelopeSchema.safeParse(json);
  if (current.success) {
    if (current.data.version > SAVE_VERSION) {
      throw new Error(
        `This save uses schema ${current.data.version}, but this build supports up to ${SAVE_VERSION}.`,
      );
    }
    const state = migratePersistedState(current.data.state, current.data.version);
    return { envelope: { ...current.data, state }, sourceVersion: current.data.version };
  }

  const legacy = legacyEnvelopeSchema.safeParse(json);
  if (legacy.success) {
    const version = legacyVersion(legacy.data.version);
    const state = migratePersistedState(legacy.data.state, version);
    return {
      envelope: {
        format: SAVE_FORMAT,
        version: SAVE_VERSION,
        build: "legacy-export",
        exportedAt: legacy.data.exportedAt,
        label: legacy.data.label ?? "Legacy Save",
        state,
      },
      sourceVersion: version,
    };
  }

  try {
    const payload = parseZustandPayload(raw);
    return {
      envelope: {
        format: SAVE_FORMAT,
        version: SAVE_VERSION,
        build: "browser-persistence",
        exportedAt: Date.now(),
        label: "Browser Save",
        state: payload.state,
      },
      sourceVersion: payload.version,
    };
  } catch {
    throw new Error("The file is not a recognized Rags to Races save.");
  }
}

function applyDecodedSave(decoded: DecodedSave): void {
  const initial = createInitialState();
  useGameStore.setState({ ...initial, ...decoded.envelope.state });
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
}

function backupCurrentGame(source: RecoveryBackup["source"]): void {
  writeRecoveryBackup(JSON.stringify(createSaveEnvelope("Recovery Backup")), source);
}

/** Save current state to a numbered slot (0-2). */
export function saveToSlot(slot: number, label?: string): void {
  const data = createSaveEnvelope(label ?? `Slot ${slot + 1}`);
  localStorage.setItem(`${SLOT_PREFIX}${slot}`, JSON.stringify(data));
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
}

/** Load a numbered slot. Invalid data is rejected without changing game state. */
export function loadFromSlot(slot: number): boolean {
  const raw = localStorage.getItem(`${SLOT_PREFIX}${slot}`);
  if (!raw) return false;
  try {
    const decoded = decodeSavePayload(raw);
    backupCurrentGame("slot-load");
    applyDecodedSave(decoded);
    return true;
  } catch {
    return false;
  }
}

export function deleteSlot(slot: number): void {
  localStorage.removeItem(`${SLOT_PREFIX}${slot}`);
}

function emptySlot(slot: number, corrupt = false): SaveSlotMeta {
  return {
    slot,
    label: `Slot ${slot + 1}${corrupt ? " (corrupt)" : ""}`,
    timestamp: null,
    scrapBucks: 0,
    repPoints: 0,
    prestigeCount: 0,
    vehicleCount: 0,
  };
}

export function getSlotMeta(): SaveSlotMeta[] {
  return [0, 1, 2].map((slot) => {
    const raw = localStorage.getItem(`${SLOT_PREFIX}${slot}`);
    if (!raw) return emptySlot(slot);
    try {
      const { envelope } = decodeSavePayload(raw);
      return {
        slot,
        label: envelope.label,
        timestamp: envelope.exportedAt,
        scrapBucks: envelope.state.scrapBucks ?? 0,
        repPoints: envelope.state.repPoints ?? 0,
        prestigeCount: envelope.state.prestigeCount ?? 0,
        vehicleCount: envelope.state.garage?.length ?? 0,
      };
    } catch {
      return emptySlot(slot, true);
    }
  });
}

export function exportSaveFile(label?: string): void {
  const data = createSaveEnvelope(label);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rags-to-races-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Import validates and migrates completely before replacing the current state. */
export async function importSaveFile(file: File): Promise<string | null> {
  try {
    const decoded = decodeSavePayload(await file.text());
    backupCurrentGame("file-import");
    applyDecodedSave(decoded);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Failed to import save file.";
  }
}

export interface RecoveryBackupMeta {
  createdAt: number;
  source: RecoveryBackup["source"];
}

export function getRecoveryBackupMeta(): RecoveryBackupMeta | null {
  const backup = readRecoveryBackup();
  return backup ? { createdAt: backup.createdAt, source: backup.source } : null;
}

export function restoreRecoveryBackup(): string | null {
  const backup = readRecoveryBackup();
  if (!backup) return "No recovery backup is available.";
  try {
    applyDecodedSave(decodeSavePayload(backup.payload));
    clearRecoveryBackup();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "The recovery backup could not be restored.";
  }
}

export function exportRecoveryBackup(): string | null {
  const backup = readRecoveryBackup();
  if (!backup) return "No recovery backup is available.";
  const blob = new Blob([backup.payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rags-to-races-recovery-${new Date(backup.createdAt).toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return null;
}

export function discardRecoveryBackup(): void {
  clearRecoveryBackup();
}

export function getLastSavedTimestamp(): number | null {
  const raw = localStorage.getItem(TIMESTAMP_KEY);
  return raw ? Number.parseInt(raw, 10) : null;
}

export function touchLastSaved(): void {
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
}
