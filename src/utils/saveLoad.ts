import { useGameStore } from "@/state/store";

export const SAVE_VERSION = "1.0";
const SLOT_PREFIX = "rags-to-races-slot-";
const TIMESTAMP_KEY = "rags-to-races-last-saved";

export interface SaveSlotMeta {
  slot: number;
  label: string;
  timestamp: number | null;
  scrapBucks: number;
  repPoints: number;
  prestigeCount: number;
  vehicleCount: number;
}

export interface SaveFile {
  version: string;
  exportedAt: number;
  label: string;
  state: ReturnType<typeof getSerializableState>;
}

/** Grab the saveable slice of state */
function getSerializableState() {
  const s = useGameStore.getState();
  return {
    scrapBucks: s.scrapBucks,
    repPoints: s.repPoints,
    lifetimeScrapBucks: s.lifetimeScrapBucks,
    prestigeCount: s.prestigeCount,
    prestigeBonus: s.prestigeBonus,
    inventory: s.inventory,
    garage: s.garage,
    activeVehicleId: s.activeVehicleId,
    selectedLocationId: s.selectedLocationId,
    selectedCircuitId: s.selectedCircuitId,
    autoScavengeUnlocked: s.autoScavengeUnlocked,
    autoRaceUnlocked: s.autoRaceUnlocked,
    unlockedLocationIds: s.unlockedLocationIds,
    unlockedCircuitIds: s.unlockedCircuitIds,
    unlockedVehicleIds: s.unlockedVehicleIds,
    _vehicleIdCounter: s._vehicleIdCounter,
    raceHistory: s.raceHistory,
    pendingBuildVehicleId: s.pendingBuildVehicleId,
  };
}

/** Save current state to a numbered slot (0–2) */
export function saveToSlot(slot: number, label?: string): void {
  const data: SaveFile = {
    version: SAVE_VERSION,
    exportedAt: Date.now(),
    label: label ?? `Slot ${slot + 1}`,
    state: getSerializableState(),
  };
  localStorage.setItem(`${SLOT_PREFIX}${slot}`, JSON.stringify(data));
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
}

/** Load state from a numbered slot. Returns false if slot is empty. */
export function loadFromSlot(slot: number): boolean {
  const raw = localStorage.getItem(`${SLOT_PREFIX}${slot}`);
  if (!raw) return false;
  try {
    const data: SaveFile = JSON.parse(raw);
    useGameStore.setState(data.state);
    return true;
  } catch {
    return false;
  }
}

/** Delete a save slot */
export function deleteSlot(slot: number): void {
  localStorage.removeItem(`${SLOT_PREFIX}${slot}`);
}

/** Read metadata for all 3 slots without loading them */
export function getSlotMeta(): SaveSlotMeta[] {
  return [0, 1, 2].map((slot) => {
    const raw = localStorage.getItem(`${SLOT_PREFIX}${slot}`);
    if (!raw) {
      return { slot, label: `Slot ${slot + 1}`, timestamp: null, scrapBucks: 0, repPoints: 0, prestigeCount: 0, vehicleCount: 0 };
    }
    try {
      const data: SaveFile = JSON.parse(raw);
      return {
        slot,
        label: data.label,
        timestamp: data.exportedAt,
        scrapBucks: data.state.scrapBucks,
        repPoints: data.state.repPoints,
        prestigeCount: data.state.prestigeCount,
        vehicleCount: data.state.garage.length,
      };
    } catch {
      return { slot, label: `Slot ${slot + 1} (corrupt)`, timestamp: null, scrapBucks: 0, repPoints: 0, prestigeCount: 0, vehicleCount: 0 };
    }
  });
}

/** Export current save as a downloadable JSON file */
export function exportSaveFile(label?: string): void {
  const data: SaveFile = {
    version: SAVE_VERSION,
    exportedAt: Date.now(),
    label: label ?? "Exported Save",
    state: getSerializableState(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rags-to-races-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import a save file from a File object. Returns error string or null on success. */
export async function importSaveFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: SaveFile = JSON.parse(e.target?.result as string);
        if (!data.state || !data.version) {
          resolve("Invalid save file format.");
          return;
        }
        useGameStore.setState(data.state);
        localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
        resolve(null);
      } catch {
        resolve("Failed to parse save file.");
      }
    };
    reader.onerror = () => resolve("Failed to read file.");
    reader.readAsText(file);
  });
}

/** Get the last auto-save timestamp */
export function getLastSavedTimestamp(): number | null {
  const raw = localStorage.getItem(TIMESTAMP_KEY);
  return raw ? parseInt(raw) : null;
}

/** Touch the last-saved timestamp (call after any manual save) */
export function touchLastSaved(): void {
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
}
