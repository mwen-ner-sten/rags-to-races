import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, must } from "@/core";
import type { FeedItem, GameState } from "@/core/types";
import { toastsFor, useGame } from "../store";

const KEY = "rags-to-races:v2";

class BrowserStorage {
  data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
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

function started(): GameState {
  return must(createGame("feed"), { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
}

describe("feed toasts", () => {
  it("toasts a trip the player started by hand when it comes home", () => {
    useGame.setState({ game: started() });
    useGame.getState().dispatch({ type: "advance", ms: 10 * 60_000 });
    const { toasts } = useGame.getState();
    expect(toasts.length).toBeGreaterThan(0);
    expect(toasts.map((t) => t.kind)).toContain("haul");
  });

  it("does not toast a merged Habit repeat or a driveway item", () => {
    const item = (over: Partial<FeedItem>): FeedItem => ({ id: "f1", at: 0, kind: "haul", text: "a", key: "haul:curb:hands", count: 2, ...over });
    expect(toastsFor([item({})], [item({ text: "b", count: 3 })])).toEqual([]);
    expect(toastsFor([], [item({ kind: "driveway", key: "driveway" })])).toEqual([]);
    expect(toastsFor([], [item({ kind: "habit", key: undefined })])).toHaveLength(1);
  });

  it("caps the stack at three, dropping the oldest", () => {
    const game = createGame("cap");
    useGame.setState({ game });
    for (const text of ["line 1", "line 2", "line 3", "line 4"]) {
      const next = structuredClone(useGame.getState().game!);
      next.run.feed.push({ id: `x-${text}`, at: 0, kind: "story", text });
      const fresh = toastsFor(useGame.getState().game!.run.feed, next.run.feed);
      useGame.setState({ game: next, toasts: [...useGame.getState().toasts, ...fresh].slice(-3) });
    }
    expect(useGame.getState().toasts).toHaveLength(3);
  });
});

describe("away catch-up", () => {
  it("lists feed items in the summary and raises no toasts", () => {
    const game = started();
    storage.setItem(KEY, JSON.stringify({ game, savedAt: Date.now() - 3 * 3_600_000 }));
    useGame.getState().load();
    const { away, toasts } = useGame.getState();
    expect(toasts).toEqual([]);
    expect(away).not.toBeNull();
    expect(away!.items.length).toBeGreaterThan(0);
    expect(away!.items.length).toBeLessThanOrEqual(8);
  });
});
