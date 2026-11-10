import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, must } from "@/core";
import type { GameState } from "@/core/types";
import { racer, saveText, swapMeetGame, teamRacer } from "../../../tests/fixtures/rewrite";
import { decodeGameState } from "../save";
import { isGameState, useGame } from "../store";

const KEY = "rags-to-races:v2";
const BACKUP = `${KEY}:backup`;
const RECOVERY = `${KEY}:unreadable`;

class BrowserStorage {
  data = new Map<string, string>();
  failWritesTo: string | null = null;
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void {
    if (key === this.failWritesTo) throw new Error("Storage full");
    this.data.set(key, value);
  }
}

let storage: BrowserStorage;
beforeEach(() => {
  storage = new BrowserStorage();
  vi.stubGlobal("window", { localStorage: storage });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T18:00:00Z"));
  useGame.setState(useGame.getInitialState(), true);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function writeGame(game: GameState, savedAt = Date.now()): void {
  storage.setItem(KEY, JSON.stringify({ game, savedAt }));
}

describe("save validation", () => {
  it("accepts a real game, including after a JSON round trip", () => {
    expect(isGameState(createGame("ok"))).toBe(true);
    expect(isGameState(JSON.parse(JSON.stringify(createGame("ok"))))).toBe(true);
  });

  it("accepts valid garage, team, and running-race states", () => {
    const racing = must(teamRacer(), { type: "enqueue", spec: { kind: "race", vehicleUid: "fixture-vehicle", venueId: "backyard", event: "sprint", call: "nurse" } });
    for (const game of [racer(), teamRacer(), swapMeetGame(), racing]) expect(isGameState(JSON.parse(JSON.stringify(game)))).toBe(true);
  });

  it("rejects saves that would crash the UI", () => {
    const broken = JSON.parse(JSON.stringify(createGame("bad")));
    broken.run = {};
    expect(isGameState(broken)).toBe(false);
    expect(isGameState({ version: 2 })).toBe(false);
    expect(isGameState(null)).toBe(false);
  });

  const corruptions: [string, (game: GameState) => unknown][] = [
    ["missing venue data", (game) => ({ ...game, run: { ...game.run, venuesOpen: undefined } })],
    ["an incomplete team", (game) => ({ ...game, era: {} })],
    ["an unknown vehicle", (game) => ({ ...game, run: { ...game.run, vehicles: [{ ...game.run.vehicles[0], vehicleId: "missing" }] } })],
    ["a non-finite currency", (game) => ({ ...game, run: { ...game.run, cash: Infinity } })],
    ["an invalid part condition", (game) => ({ ...game, run: { ...game.run, inventory: [{ uid: "bad", partId: "engine_small", condition: 8, origin: "test" }] } })],
    ["a dangling job target", (game) => ({ ...game, run: { ...game.run, queue: [{ kind: "clean", partUid: "missing" }] } })],
    ["an unknown Habit venue", (game) => ({ ...game, run: { ...game.run, habitSlots: ["race:fixture-vehicle:missing:sprint:nurse"] } })],
    ["duplicated part ownership", (game) => ({ ...game, run: { ...game.run, inventory: [game.run.vehicles[0].parts.engine!] } })],
    ["an incompatible queued assembly", (game) => ({ ...game, run: { ...game.run, inventory: [{ uid: "loose-wheel", partId: "wheel_busted", condition: 2, origin: "test" }], queue: [{ kind: "assemble", vehicleId: "push_mower", name: "", partUids: { engine: "loose-wheel", wheel: "loose-wheel" } }] } })],
  ];
  it.each(corruptions)("rejects %s before accepting an import", (_label, corrupt) => {
    const broken = corrupt(racer());
    expect(isGameState(broken)).toBe(false);
    expect(decodeGameState(broken)).toBeNull();
  });
});

describe("save and recovery behavior", () => {
  it.each(["load", "import"] as const)("migrates older rewrite saves and earned unlocks through %s", (path) => {
    const game = racer("older-save");
    game.meta.records.regional = 100;
    game.meta.stateWonEver = true;
    const older = { ...game, meta: { ...game.meta, tipsSeen: undefined }, run: { ...game.run, driveway: undefined } };
    if (path === "load") {
      storage.setItem(KEY, JSON.stringify({ game: older, savedAt: Date.now() }));
      useGame.getState().load();
    } else {
      expect(useGame.getState().importSave(saveText(older))).toBeNull();
    }
    const restored = useGame.getState().game!;
    expect(restored.run.driveway).toEqual([]);
    expect(restored.meta.tipsSeen).toEqual(game.run.revealed);
    expect(restored.meta.perksUnlocked).toEqual(expect.arrayContaining(["second_bench", "scavengers_map"]));
    expect(isGameState(restored)).toBe(true);
    expect(JSON.parse(storage.getItem(KEY)!).game).toEqual(restored);
  });

  it("preserves Unicode and real state across export, import, and reload", () => {
    const game = teamRacer();
    game.run.vehicles[0].name = "Écurie 🏁";
    writeGame(game);
    useGame.getState().load();
    const exported = useGame.getState().exportSave();
    expect(useGame.getState().reset()).toBe(true);
    expect(useGame.getState().importSave(exported)).toBeNull();
    useGame.getState().load();
    expect(useGame.getState().game).toEqual(game);
  });

  it("keeps the running game, primary save, and previous backup on a malformed import", () => {
    writeGame(racer());
    storage.setItem(BACKUP, "previous backup");
    useGame.getState().load();
    const current = useGame.getState().game;
    const raw = storage.getItem(KEY);
    expect(useGame.getState().importSave(saveText({ version: 1, run: {} }))).toMatch(/doesn't look/);
    expect(useGame.getState().game).toBe(current);
    expect(storage.getItem(KEY)).toBe(raw);
    expect(storage.getItem(BACKUP)).toBe("previous backup");
  });

  it.each([KEY, BACKUP])("keeps the current game when a write to %s fails during import", (failedKey) => {
    writeGame(racer());
    useGame.getState().load();
    const current = useGame.getState().game;
    const raw = storage.getItem(KEY);
    storage.failWritesTo = failedKey;
    expect(useGame.getState().importSave(saveText(swapMeetGame()))).toMatch(/current game has been kept/);
    expect(useGame.getState().game).toBe(current);
    expect(storage.getItem(KEY)).toBe(raw);
  });

  it("retains an unreadable original and pauses autosaving when the backup cannot be written", () => {
    const raw = "{ unreadable but irreplaceable";
    storage.setItem(KEY, raw);
    storage.failWritesTo = RECOVERY;
    useGame.getState().load();
    expect(useGame.getState().saveBlocked).toBe(true);
    useGame.getState().save();
    vi.advanceTimersByTime(10_000);
    useGame.getState().tick();
    useGame.getState().save();
    expect(storage.getItem(KEY)).toBe(raw);
    expect(Buffer.from(useGame.getState().exportBackup(), "base64").toString("utf8")).toBe(raw);
    expect(useGame.getState().reset()).toBe(false);
    expect(storage.getItem(KEY)).toBe(raw);
  });

  it("makes an unreadable backup exportable while allowing a fresh game to save", () => {
    storage.setItem(KEY, "unreadable original");
    useGame.getState().load();
    expect(useGame.getState().saveBlocked).toBe(false);
    expect(storage.getItem(RECOVERY)).toBe("unreadable original");
    expect(Buffer.from(useGame.getState().exportBackup(), "base64").toString("utf8")).toBe("unreadable original");
    expect(isGameState(JSON.parse(storage.getItem(KEY)!).game)).toBe(true);
  });

  it("preserves a readable backup when the primary is corrupt", () => {
    const previous = JSON.stringify({ game: racer("last-good-backup"), savedAt: Date.now() });
    storage.setItem(BACKUP, previous);
    storage.setItem(KEY, "broken primary");
    useGame.getState().load();
    expect(storage.getItem(BACKUP)).toBe(previous);
    expect(storage.getItem(RECOVERY)).toBe("broken primary");
    expect(Buffer.from(useGame.getState().exportBackup(), "base64").toString("utf8")).toBe(previous);
  });

  it("keeps a valid previous game as an exportable backup after an import", () => {
    writeGame(racer());
    useGame.getState().load();
    const previous = useGame.getState().game;
    expect(useGame.getState().importSave(saveText(swapMeetGame()))).toBeNull();
    const backup = JSON.parse(Buffer.from(useGame.getState().exportBackup(), "base64").toString("utf8"));
    expect(backup.game).toEqual(previous);
  });

  it("caps a 72-hour return at 48 hours and cannot settle the same absence again on reload", () => {
    const game = must(createGame("away"), { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    writeGame(game, Date.now() - 72 * 3_600_000);
    useGame.getState().load();
    expect(useGame.getState().away).toMatchObject({ capped: true, ms: 48 * 3_600_000, trips: 1 });
    expect(useGame.getState().game!.run.seasonMs).toBe(48 * 3_600_000);
    const settled = useGame.getState().game;
    useGame.getState().load();
    expect(useGame.getState().away).toBeNull();
    expect(useGame.getState().game).toEqual(settled);
  });
});
