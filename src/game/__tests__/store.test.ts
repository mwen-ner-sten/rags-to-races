import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, must } from "@/core";
import type { GameState } from "@/core/types";
import { pendingCircuitFinal, pendingOwnerFinal, racer, saveText, swapMeetGame, teamRacer } from "../../../tests/fixtures/rewrite";
import { HOUR, pendingBaton, pendingDepotAndRepair, pendingHeritage, pendingWorksFinal } from "../../../tests/fixtures/workshopAway";
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

function returnAfter(game: GameState, elapsed: number) {
  expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
  writeGame(game, Date.now() - elapsed);
  useGame.getState().load();
  return useGame.getState();
}

describe("workshop and branch catch-up", () => {
  it("prioritizes newly arrived stock and an actionable invoice, preserving both through reload until collected", () => {
    const pending = pendingDepotAndRepair();
    const arrival = pending.motorPool!.job!;
    const first = returnAfter(pending, arrival.remaining - 1);
    expect(first.away?.careerReports.map(({ id }) => id)).toEqual(["service-delivery"]);
    expect(first.game?.motorPool?.job?.remaining).toBe(1);
    expect(first.game?.run.cash).toBe(pending.run.cash);

    const returned = returnAfter(pending, 2 * HOUR);
    expect(returned.away?.careerReports).toMatchObject([
      { id: "motor-pickup", destination: { tab: "garage", section: "motor-pickup" }, detail: expect.stringContaining("Ramp depot") },
      { id: "service-delivery", destination: { tab: "garage", section: "service-delivery" }, next: expect.stringContaining("24 Scrap Bucks") },
    ]);
    expect(returned.game?.run.cash).toBe(pending.run.cash);
    expect(returned.game?.motorPool?.claim?.part.uid).toBe(arrival.part.uid);
    expect(returned.game?.run.inventory.map(({ uid }) => uid)).not.toContain(arrival.part.uid);

    useGame.getState().load();
    expect(useGame.getState().away).toBeNull();
    vi.advanceTimersByTime(HOUR);
    useGame.getState().load();
    expect(useGame.getState().away?.careerReports).toEqual([]);
    expect(useGame.getState().dispatch({ type: "motorPool", move: { type: "claim" } })).toBe(true);
    expect(useGame.getState().dispatch({ type: "service", move: { type: "deliver" } })).toBe(true);
    expect(useGame.getState().game?.run.inventory.filter(({ uid }) => uid === arrival.part.uid)).toHaveLength(1);
    expect(useGame.getState().game?.run.cash).toBe(pending.run.cash + 24);
    expect(useGame.getState().dispatch({ type: "motorPool", move: { type: "claim" } })).toBe(false);
    expect(useGame.getState().dispatch({ type: "service", move: { type: "deliver" } })).toBe(false);
  });

  it("settles one Works proof, grants the drawing once and hides the duplicate homologation feed item", () => {
    const pending = pendingWorksFinal();
    const returned = returnAfter(pending, 2 * HOUR);
    expect(returned.away?.careerReports).toMatchObject([{
      id: "works-proof", title: "Works article homologated", destination: { tab: "manufacturer", section: "deal" },
    }]);
    expect(returned.game?.manufacturer?.drawings).toEqual(["redwheel"]);
    expect(returned.game?.manufacturer?.active?.attempts).toHaveLength(2);
    expect(returned.game?.run.feed.some(({ key }) => key?.startsWith("works:honors"))).toBe(true);
    expect(returned.away?.items.some(({ key }) => key?.startsWith("works:honors"))).toBe(false);
    useGame.getState().load();
    expect(useGame.getState().away).toBeNull();
    expect(useGame.getState().game?.run.cash).toBe(returned.game?.run.cash);
  });

  it("persists hidden-tab workshop catch-up before an immediate reload", () => {
    const pending = pendingDepotAndRepair();
    expect(returnAfter(pending, 0).away).toBeNull();
    vi.advanceTimersByTime(2 * HOUR);
    useGame.getState().tick();
    const returned = useGame.getState();
    expect(returned.away?.careerReports.map(({ id }) => id)).toEqual(["motor-pickup", "service-delivery"]);
    useGame.getState().load();
    expect(useGame.getState().away).toBeNull();
    expect(useGame.getState().game?.motorPool?.claim).toEqual(returned.game?.motorPool?.claim);
    expect(useGame.getState().game?.run.serviceBook?.ticket?.worked).toBe(true);
  });

  it.each(["exhibit", "special"] as const)("reports the offline %s milestone and selects the Heritage Register", (kind) => {
    const returned = returnAfter(pendingHeritage(kind), 2 * HOUR);
    expect(returned.away?.careerReports).toMatchObject([{
      id: `heritage-${kind}`, detail: expect.stringContaining("Meadow II"), destination: {
        tab: "workshop", section: "Heritage", ...(kind === "exhibit" && { vehicleUid: "museum-mower" }),
      },
    }]);
    expect(returned.away?.items.some(({ key }) => key?.startsWith("heritage:"))).toBe(false);
    expect(returned.game?.meta.heritageRegister?.length ?? 0).toBe(kind === "exhibit" ? 0 : 1);
    useGame.getState().load();
    expect(useGame.getState().away).toBeNull();
  });

  it.each(["qualify", "deliver"] as const)("reports the County Baton %s leg from a settled Feature and retains its progress", (leg) => {
    const pending = pendingBaton(leg);
    const returned = returnAfter(pending, 2 * HOUR);
    expect(returned.away?.careerReports).toMatchObject([{
      id: leg === "qualify" ? "baton-qualified" : "baton-delivered", destination: { tab: "legacy", section: "baton" },
    }]);
    expect(returned.away?.items.some(({ key }) => key?.startsWith("county-baton-"))).toBe(false);
    expect(returned.game?.meta.countyFreight?.quarry ?? 0).toBe(leg === "deliver" ? 1 : 0);
    vi.advanceTimersByTime(HOUR);
    useGame.getState().load();
    expect(useGame.getState().away?.careerReports).toEqual([]);
    expect(useGame.getState().game?.run.countyBaton).toEqual(returned.game?.run.countyBaton);
  });
});

it("plays an earned five-round entry plan while away and reports the settlement once", () => {
  let game = must(pendingOwnerFinal(), { type: "advance", ms: 60 * 60_000 });
  expect(game.owner!.titles).toBe(1);
  game.run.venuesOpen = [...new Set([...game.run.venuesOpen, "county_fair"])];
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  for (const part of Object.values(game.run.vehicles[0].parts)) part!.condition = 4;
  game = must(game, { type: "owner", move: { type: "start", charter: "club", sponsor: "front_row" } });
  game = must(game, { type: "owner", move: { type: "plan_entries", settings: { leadUid: "fixture-vehicle", call: "nurse", cashFloor: 500 } } });
  writeGame(game, Date.now() - 48 * 60 * 60_000);
  useGame.getState().load();
  const post = useGame.getState();
  expect(post.game?.owner?.tour.rounds).toHaveLength(5);
  expect(post.game?.owner?.tour.rounds.every((round) => round?.planned)).toBe(true);
  expect(post.game?.owner?.titles).toBe(2);
  expect(post.game?.owner?.tour.entryPlan?.enabled).toBe(false);
  expect(post.away?.careerReports).toHaveLength(1);
  expect(post.away?.careerReports[0]).toMatchObject({
    title: "Won the Homegrown Cup",
    detail: expect.stringMatching(/5 rounds settled.*Front Row Fuel paid 1,550 Scrap Bucks/),
  });
  useGame.getState().load();
  expect(useGame.getState().game?.owner?.titles).toBe(2);
  expect(useGame.getState().away).toBeNull();
});

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

  it.each(["import", "start over"] as const)("backs up the latest unsaved action on %s", (replacement) => {
    writeGame(racer());
    const store = useGame.getState();
    store.load();
    expect(store.dispatch({ type: "setGuide", on: false })).toBe(true);
    expect(JSON.parse(storage.getItem(KEY)!).game.meta.guideOff).toBeFalsy();
    if (replacement === "import") expect(store.importSave(saveText(swapMeetGame()))).toBeNull();
    else expect(store.reset()).toBe(true);
    expect(JSON.parse(storage.getItem(BACKUP)!).game.meta.guideOff).toBe(true);
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

  it("keeps the last championship round private until the job settles, then reports the title and unlock once", () => {
    const game = pendingOwnerFinal();
    const remaining = game.run.jobs.find((job) => job.spec.kind === "race")!.remaining;
    writeGame(game, Date.now() - remaining + 1_000);
    useGame.getState().load();
    expect(useGame.getState().away?.careerReports).toEqual([]);
    expect(useGame.getState().game?.owner?.tour.status).toBe("active");
    vi.advanceTimersByTime(60 * 60_000);
    useGame.getState().tick();
    const summary = useGame.getState().away;
    expect(summary?.careerReports).toMatchObject([{ tab: "owner", title: "Won the Homegrown Cup", circuitOpened: true }]);
    expect(summary?.items.filter((item) => item.key?.startsWith("championship"))).toEqual([]);
    expect(useGame.getState().game?.run.feed.some((item) => item.key?.startsWith("championship-result"))).toBe(true);
  });

  it("reports only new Circuit results and names the missed field condition", () => {
    const game = pendingCircuitFinal();
    writeGame(game, Date.now() - 60 * 60_000);
    useGame.getState().load();
    expect(useGame.getState().away?.careerReports).toMatchObject([{
      tab: "promoter", title: "Homecoming Cup", detail: expect.stringContaining("1 meeting ran"), next: expect.stringContaining("Certification missed on close finishes"),
    }]);
    vi.advanceTimersByTime(60 * 60_000);
    useGame.getState().tick();
    expect(useGame.getState().away?.careerReports).toEqual([]);
  });
});
