import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";

const STORAGE_KEY = "r2r-community-v1";
const GAME_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";

export type Archetype = "global" | "grip" | "drift" | "budget";

export interface EventWindow {
  eventId: string;
  seed: number;
  gameVersion: string;
  modifiers: string[];
}

export interface CommunityRun {
  id: string;
  playerName: string;
  submittedAt: number;
  eventId: string;
  seed: number;
  gameVersion: string;
  archetype: Exclude<Archetype, "global">;
  score: number;
  finishText: string;
  circuitId: string;
  vehicleId: string;
  buildSummary: string;
  outcome: RaceOutcome["result"];
  challengeId?: string;
}

interface ReplaySnapshot {
  runId: string;
  title: string;
  summary: string;
  capturedAt: number;
}

interface CommunityStore {
  runs: CommunityRun[];
  snapshots: ReplaySnapshot[];
}

export interface BuildStringPayload {
  vehicleDefinitionId: string;
  engineDefinitionId: string;
  wheelDefinitionId: string;
  frameDefinitionId: string;
  fuelDefinitionId: string;
}

export interface CommunityChallenge {
  id: string;
  name: string;
  description: string;
  rule: (run: CommunityRun) => boolean;
}

const DAILY_MODIFIERS = [
  "Rain on race line",
  "Cheaper entry fees",
  "Harsh tire wear",
  "Headwind on straights",
  "Crowd boost on final lap",
  "Low-grip corners",
];

const WEEKLY_MODIFIERS = [
  "Economy pressure: lower payouts for losses",
  "Durability tax: post-race wear increased",
  "Qualifying chaos: position variance up",
  "Sponsor spotlight: wins pay extra",
  "Fuel concern: reliability matters more",
  "Open setup: balanced builds favored",
];

export const COMMUNITY_CHALLENGES: CommunityChallenge[] = [
  {
    id: "budget-brawler",
    name: "Budget Brawler",
    description: "Submit a run with score under 950.",
    rule: (run) => run.score < 950,
  },
  {
    id: "precision-driver",
    name: "Precision Driver",
    description: "Finish P1 or P2 with a grip build.",
    rule: (run) => run.archetype === "grip" && (run.finishText.startsWith("P1/") || run.finishText.startsWith("P2/")),
  },
  {
    id: "sideways-hero",
    name: "Sideways Hero",
    description: "Submit a drift-category run.",
    rule: (run) => run.archetype === "drift",
  },
];

function getISOWeek(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-${String(weekNo).padStart(2, "0")}`;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function pickModifiers(pool: string[], seed: number, count: number): string[] {
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 13) % pool.length;
    picked.push(pool[idx]);
  }
  return Array.from(new Set(picked));
}

export function getCurrentEventWindow(period: "daily" | "weekly", now = new Date()): EventWindow {
  if (period === "daily") {
    const ymd = now.toISOString().slice(0, 10);
    const eventId = `daily-${ymd}`;
    const seed = hashString(eventId);
    return {
      eventId,
      seed,
      gameVersion: GAME_VERSION,
      modifiers: pickModifiers(DAILY_MODIFIERS, seed, 2),
    };
  }
  const week = getISOWeek(now);
  const eventId = `weekly-${week}`;
  const seed = hashString(eventId);
  return {
    eventId,
    seed,
    gameVersion: GAME_VERSION,
    modifiers: pickModifiers(WEEKLY_MODIFIERS, seed, 3),
  };
}

export function classifyArchetype(vehicle: BuiltVehicle): Exclude<Archetype, "global"> {
  const { handling, reliability, performance } = vehicle.stats;
  if (performance <= 140 && reliability >= 110) return "budget";
  if (handling >= Math.max(reliability, performance)) return "drift";
  return "grip";
}

function readStore(): CommunityStore {
  if (typeof window === "undefined") return { runs: [], snapshots: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { runs: [], snapshots: [] };
    const parsed = JSON.parse(raw) as CommunityStore;
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    };
  } catch {
    return { runs: [], snapshots: [] };
  }
}

function writeStore(store: CommunityStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function submitRun(run: Omit<CommunityRun, "id" | "submittedAt">): CommunityRun {
  const store = readStore();
  const finalRun: CommunityRun = {
    ...run,
    id: `${run.eventId}-${Math.random().toString(36).slice(2, 9)}`,
    submittedAt: Date.now(),
  };
  const runs = [finalRun, ...store.runs].slice(0, 250);

  const snapshots = [...store.snapshots];
  const placement = runs
    .filter((r) => r.eventId === run.eventId)
    .sort((a, b) => b.score - a.score)
    .findIndex((r) => r.id === finalRun.id);

  if (placement > -1 && placement < 3) {
    snapshots.unshift({
      runId: finalRun.id,
      title: `Top ${placement + 1}: ${finalRun.playerName}`,
      summary: `${finalRun.finishText} · ${finalRun.buildSummary} · ${finalRun.score} pts`,
      capturedAt: Date.now(),
    });
  }

  writeStore({ runs, snapshots: snapshots.slice(0, 30) });
  return finalRun;
}

export function getRuns(): CommunityRun[] {
  return readStore().runs;
}

export function getReplaySnapshots(): ReplaySnapshot[] {
  return readStore().snapshots;
}

export function getSeasonWindow(now = new Date()): { seasonId: string; endsAtLabel: string } {
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const seasonId = `${now.getUTCFullYear()}-S${quarter}`;
  const nextQuarterStart = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1, 0, 0, 0));
  return {
    seasonId,
    endsAtLabel: nextQuarterStart.toISOString().slice(0, 10),
  };
}

export function exportBuildString(build: BuildStringPayload): string {
  return [
    "B1",
    build.vehicleDefinitionId,
    build.engineDefinitionId,
    build.wheelDefinitionId,
    build.frameDefinitionId,
    build.fuelDefinitionId,
  ].join(":");
}

export function importBuildString(value: string): { ok: true; data: BuildStringPayload } | { ok: false; error: string } {
  const trimmed = value.trim();
  const parts = trimmed.split(":");
  if (parts[0] !== "B1") return { ok: false, error: "Unsupported build string version. Expected B1." };
  if (parts.length !== 6) return { ok: false, error: "Invalid build string format. Expected 6 sections." };
  const data: BuildStringPayload = {
    vehicleDefinitionId: parts[1],
    engineDefinitionId: parts[2],
    wheelDefinitionId: parts[3],
    frameDefinitionId: parts[4],
    fuelDefinitionId: parts[5],
  };
  if (Object.values(data).some((v) => !v)) return { ok: false, error: "Build string has empty fields." };
  return { ok: true, data };
}
