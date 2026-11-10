"use client";

import { create } from "zustand";
import { apply, createGame, type Action } from "@/core";
import { decodeSave } from "./save";
export { isGameState } from "./save";
import type { GameState, RaceResult } from "@/core/types";

const SAVE_KEY = "rags-to-races:v2";
const BACKUP_KEY = "rags-to-races:v2:backup";
const RECOVERY_KEY = "rags-to-races:v2:unreadable";
const OFFLINE_CAP_MS = 48 * 3_600_000;
/** Gaps longer than this count as being away (above the ~60 s timer throttling of hidden tabs). */
const AWAY_THRESHOLD_MS = 5 * 60_000;

export interface AwaySummary {
  ms: number;
  capped: boolean;
  trips: number;
  partsFound: number;
  races: number;
  wins: number;
  cash: number;
  rep: number;
  learned: string[];
  /** Parts waiting on the driveway when you got back. */
  driveway: number;
}

interface Store {
  game: GameState | null;
  error: string | null;
  replay: RaceResult | null;
  /** A race you entered by hand that just finished; announced off the Race tab, cleared once seen. */
  finished: RaceResult | null;
  away: AwaySummary | null;
  lastTick: number;
  /** Protect an unreadable original when browser storage could not keep a backup. */
  saveBlocked: boolean;
  dispatch: (action: Action) => boolean;
  load: () => void;
  tick: () => void;
  save: () => void;
  reset: () => boolean;
  importSave: (text: string) => string | null;
  exportSave: () => string;
  exportBackup: () => string;
  clearError: () => void;
  closeReplay: () => void;
  clearFinished: () => void;
  showReplay: (race: RaceResult) => void;
  closeAway: () => void;
}

interface SaveFile {
  savedAt: number;
  game: GameState;
}

function backupRaw(raw: string | null): boolean {
  if (!raw) return true;
  try {
    // A corrupt primary must never replace the last readable backup.
    window.localStorage.setItem(decodeSave(raw) ? BACKUP_KEY : RECOVERY_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

function summarize(before: GameState, after: GameState, ms: number, capped: boolean): AwaySummary {
  const beforeIds = new Set(before.run.races.map((r) => r.id));
  const newRaces = after.run.races.filter((r) => !beforeIds.has(r.id));
  const sameSeason = before.meta.seasonsPlayed === after.meta.seasonsPlayed;
  return {
    ms,
    capped,
    trips: sameSeason ? after.run.stats.hauls - before.run.stats.hauls : 0,
    partsFound: Object.values(after.meta.codex.parts).reduce((a, b) => a + b, 0) - Object.values(before.meta.codex.parts).reduce((a, b) => a + b, 0),
    races: newRaces.length,
    wins: newRaces.filter((r) => r.position === 1 && !r.dnf).length,
    cash: after.run.cash - before.run.cash,
    rep: after.run.rep - before.run.rep,
    learned: after.run.learned.filter((id) => !before.run.learned.includes(id)),
    driveway: after.run.driveway.length,
  };
}

export const useGame = create<Store>((set, get) => ({
  game: null,
  error: null,
  replay: null,
  finished: null,
  away: null,
  lastTick: 0,
  saveBlocked: false,

  dispatch: (action) => {
    const { game } = get();
    if (!game) return false;
    const before = game.run.races[game.run.races.length - 1]?.id;
    const result = apply(game, action);
    if (result.error) {
      set({ error: result.error });
      return false;
    }
    set({ game: result.state, error: action.type === "advance" ? get().error : null });
    const latest = result.state.run.races[result.state.run.races.length - 1];
    // A race you entered by hand is announced; Habit races just land in the results list.
    if (latest && latest.id !== before && action.type === "advance" && !action.away && !isHabitRace(game, latest)) set({ finished: latest });
    return true;
  },

  load: () => {
    let game: GameState | null = null;
    let savedAt = Date.now();
    let raw: string | null = null;
    let storageUnavailable = false;
    try {
      raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const file = decodeSave(raw);
        if (file) {
          game = file.game;
          savedAt = file.savedAt;
        }
      }
    } catch {
      game = null;
      storageUnavailable = true;
    }
    if (!game) {
      // Never overwrite an unreadable save without keeping a copy.
      const kept = !storageUnavailable && backupRaw(raw);
      set({ game: createGame(), lastTick: Date.now(), replay: null, finished: null, away: null, saveBlocked: !kept,
        error: !kept ? "Browser storage is unavailable. Automatic saving is paused to protect your original save. Export a copy in Settings."
          : raw ? "Your save couldn't be read, so a new game started. Export the old save with Export browser backup in Settings." : null });
      get().save();
      return;
    }
    const gap = Math.max(0, Date.now() - savedAt);
    if (gap > AWAY_THRESHOLD_MS) {
      const ms = Math.min(gap, OFFLINE_CAP_MS);
      const result = apply(game, { type: "advance", ms, away: true });
      set({ game: result.state, away: summarize(game, result.state, ms, gap > OFFLINE_CAP_MS), lastTick: Date.now(), saveBlocked: false, error: null, replay: null, finished: null });
    } else {
      set({ game, lastTick: Date.now(), saveBlocked: false, error: null, away: null, replay: null, finished: null });
    }
    get().save();
  },

  tick: () => {
    const { game, lastTick } = get();
    if (!game) return;
    const now = Date.now();
    const dt = now - lastTick;
    set({ lastTick: now });
    if (dt <= 0) return;
    if (dt > AWAY_THRESHOLD_MS) {
      const ms = Math.min(dt, OFFLINE_CAP_MS);
      const result = apply(game, { type: "advance", ms, away: true });
      set({ game: result.state, away: summarize(game, result.state, ms, dt > OFFLINE_CAP_MS) });
      return;
    }
    get().dispatch({ type: "advance", ms: dt });
  },

  save: () => {
    const { game, saveBlocked } = get();
    if (!game || saveBlocked) return;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt: Date.now(), game } satisfies SaveFile));
    } catch {
      set({ error: "Couldn't save to this browser's storage." });
    }
  },

  reset: () => {
    try {
      if (!backupRaw(window.localStorage.getItem(SAVE_KEY))) throw new Error("backup");
      const game = createGame();
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt: Date.now(), game } satisfies SaveFile));
      set({ game, replay: null, finished: null, away: null, error: null, saveBlocked: false, lastTick: Date.now() });
      return true;
    } catch {
      set({ error: "Couldn't keep your previous save safely. Your current game has been kept. Export it before starting over." });
      return false;
    }
  },

  exportSave: () => {
    const { game } = get();
    return game ? toBase64(JSON.stringify({ savedAt: Date.now(), game })) : "";
  },

  exportBackup: () => {
    try {
      const raw = window.localStorage.getItem(BACKUP_KEY) ?? window.localStorage.getItem(RECOVERY_KEY)
        ?? (get().saveBlocked ? window.localStorage.getItem(SAVE_KEY) : null);
      return raw ? toBase64(raw) : "";
    } catch {
      set({ error: "Couldn't read the browser backup. Browser storage may be blocked." });
      return "";
    }
  },

  importSave: (text) => {
    let file: SaveFile | null;
    try {
      file = decodeSave(fromBase64(text.trim()));
    } catch {
      return "That doesn't look like a Rags to Races save.";
    }
    if (!file) return "That doesn't look like a Rags to Races save.";
    try {
      if (!backupRaw(window.localStorage.getItem(SAVE_KEY))) return "Couldn't back up your current save. Your current game has been kept.";
      // Persist before changing the running game, so storage failures cannot replace it in memory.
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt: Date.now(), game: file.game } satisfies SaveFile));
    } catch {
      return "Couldn't save the imported game to this browser. Your current game has been kept.";
    }
    set({ game: file.game, lastTick: Date.now(), replay: null, finished: null, away: null, error: null, saveBlocked: false });
    return null;
  },

  clearError: () => set({ error: null }),
  closeReplay: () => set({ replay: null }),
  clearFinished: () => set({ finished: null }),
  showReplay: (race) => set({ replay: race }),
  closeAway: () => set({ away: null }),
}));

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(text: string): string {
  const binary = atob(text);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isHabitRace(before: GameState, race: RaceResult): boolean {
  const job = before.run.jobs.find((j) => j.spec.kind === "race" && j.spec.vehicleUid === race.vehicleUid);
  return job ? !job.lane.startsWith("hands") : true;
}
