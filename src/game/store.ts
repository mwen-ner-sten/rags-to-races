"use client";

import { create } from "zustand";
import { apply, createGame, type Action } from "@/core";
import { upgradeSave } from "@/core/state";
import type { GameState, RaceResult } from "@/core/types";

const SAVE_KEY = "rags-to-races:v2";
const BACKUP_KEY = "rags-to-races:v2:backup";
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
  dispatch: (action: Action) => boolean;
  load: () => void;
  tick: () => void;
  save: () => void;
  reset: () => void;
  importSave: (text: string) => string | null;
  exportSave: () => string;
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

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Structural check of a loaded save: enough to render without crashing. */
export function isGameState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  const g = value as Partial<GameState>;
  if (g.version !== 1 || typeof g.seed !== "string" || typeof g.rng !== "number" || typeof g.uid !== "number") return false;
  const { meta, run, scrap, team, config } = g;
  if (!isObject(meta) || !isObject(run) || !isObject(scrap) || !isObject(team) || !isObject(config)) return false;
  if (!isObject(meta.codex) || !Array.isArray(meta.journal) || !Array.isArray(meta.hallOfFame) || !isObject(meta.perks)) return false;
  if (!Array.isArray(run.inventory) || !Array.isArray(run.vehicles) || !Array.isArray(run.jobs) || !Array.isArray(run.queue) || !Array.isArray(run.races)) return false;
  if (typeof run.cash !== "number" || typeof run.seasonMs !== "number" || !isObject(run.materials) || !Array.isArray(run.revealed)) return false;
  if (!Array.isArray(config.perks) || !isObject(config.tuneUp) || !Array.isArray(config.hardships)) return false;
  return typeof scrap.lp === "number" && typeof team.tp === "number";
}

function backupRaw(raw: string | null): void {
  if (!raw) return;
  try {
    window.localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // Storage full or blocked: nothing more we can do here.
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

  dispatch: (action) => {
    const { game } = get();
    if (!game) return false;
    const before = game.run.races[game.run.races.length - 1]?.id;
    const result = apply(game, action);
    if (result.error) {
      set({ error: result.error });
      return false;
    }
    set({ game: result.state, error: null });
    const latest = result.state.run.races[result.state.run.races.length - 1];
    // A race you entered by hand is announced; Habit races just land in the results list.
    if (latest && latest.id !== before && action.type === "advance" && !action.away && !isHabitRace(game, latest)) set({ finished: latest });
    return true;
  },

  load: () => {
    let game: GameState | null = null;
    let savedAt = Date.now();
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const file = JSON.parse(raw) as SaveFile;
        if (isGameState(file.game)) {
          game = upgradeSave(file.game);
          savedAt = typeof file.savedAt === "number" ? file.savedAt : Date.now();
        }
      }
    } catch {
      game = null;
    }
    if (!game) {
      // Never overwrite an unreadable save without keeping a copy.
      if (raw) backupRaw(raw);
      set({ game: createGame(), lastTick: Date.now(), error: raw ? "Your save couldn't be read, so a new game started. The old save is kept as a backup in this browser." : null });
      get().save();
      return;
    }
    const gap = Math.max(0, Date.now() - savedAt);
    if (gap > AWAY_THRESHOLD_MS) {
      const ms = Math.min(gap, OFFLINE_CAP_MS);
      const result = apply(game, { type: "advance", ms, away: true });
      set({ game: result.state, away: summarize(game, result.state, ms, gap > OFFLINE_CAP_MS), lastTick: Date.now() });
    } else {
      set({ game, lastTick: Date.now() });
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
    const { game } = get();
    if (!game) return;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt: Date.now(), game } satisfies SaveFile));
    } catch {
      set({ error: "Couldn't save to this browser's storage." });
    }
  },

  reset: () => {
    backupRaw(window.localStorage.getItem(SAVE_KEY));
    set({ game: createGame(), replay: null, finished: null, away: null, lastTick: Date.now() });
    get().save();
  },

  exportSave: () => {
    const { game } = get();
    return game ? toBase64(JSON.stringify({ savedAt: Date.now(), game })) : "";
  },

  importSave: (text) => {
    try {
      const file = JSON.parse(fromBase64(text.trim())) as SaveFile;
      if (!isGameState(file.game)) return "That doesn't look like a Rags to Races save.";
      backupRaw(window.localStorage.getItem(SAVE_KEY));
      set({ game: file.game, lastTick: Date.now(), replay: null, finished: null, away: null });
      get().save();
      return null;
    } catch {
      return "That doesn't look like a Rags to Races save.";
    }
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
