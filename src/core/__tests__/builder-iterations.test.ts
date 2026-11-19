import { describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { apply, createGame, must } from "../index";
import { blueprintPlan, haulSourcesForSlot, partSwapGain } from "../buildPlanning";
import { challengeVehicleFit } from "../challenges";
import { getVehicle } from "../content/vehicles";
import { garageSpace, stowFinds, swapOutCandidate } from "../garage";
import { haulOdds } from "../haul";
import { planBuilderLoadout, scrapAward, teamResetLegacyBudget } from "../layers";
import { getPart } from "../content/parts";
import { baseDuration, jobBlocker } from "../jobs";
import { rawScore, settleRace } from "../race";
import type { Condition, GameState, JobSpec, PartInstance, RaceRoll, Vehicle } from "../types";

const WIN: RaceRoll = {
  position: 1, fieldSize: 6, dnf: false, margin: 2, rivalBeaten: true,
  weakestSlot: null, wearSteps: {}, laps: 1, durationMs: 60_000, beats: [],
};
const TUNE = { haul: 0, wrench: 0, build: 0, race: 0 };

function part(uid: string, partId = "engine_small", condition: Condition = 1, origin = "Curbside"): PartInstance {
  return { uid, partId, condition, origin };
}

function car(vehicleId: string, parts: Vehicle["parts"]): Vehicle {
  return { uid: vehicleId, vehicleId, name: vehicleId, parts, tune: "power", history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, builtAtSeasonMs: 0 };
}

function win(state: GameState, vehicle: Vehicle, venueId: string) {
  settleRace(state, { kind: "race", event: "feature", venueId, vehicleUid: vehicle.uid, call: "push" }, WIN);
}

function complete(state: GameState, spec: JobSpec): GameState {
  return must(must(state, { type: "enqueue", spec }), { type: "advance", ms: Math.ceil(baseDuration(state, spec)) });
}

describe("builder iterations", () => {
  it("1 · normalizes the same haul weights scouting uses and raises the selected category", () => {
    const loose = haulOdds("junkyard");
    const focused = haulOdds("junkyard", "engine");
    expect(focused.reduce((sum, entry) => sum + entry.chance, 0)).toBeCloseTo(1);
    expect(focused.find((entry) => entry.item === "engine_v4")!.chance).toBeGreaterThan(loose.find((entry) => entry.item === "engine_v4")!.chance);
    expect(focused.find((entry) => entry.item === "frame_kart")!.chance).toBeLessThan(loose.find((entry) => entry.item === "frame_kart")!.chance);
  });

  it("2 · suggests only reachable yards that actually carry a compatible chassis", () => {
    const state = createGame("sources");
    const frame = getVehicle("go_kart").slots.find((slot) => slot.slot === "frame")!;
    expect(haulSourcesForSlot(state, frame)).toEqual([]);
    state.run.placesOpen.push("yards", "junkyard", "auction");
    const sources = haulSourcesForSlot(state, frame);
    expect(sources.map((source) => source.place.id)).toEqual(["junkyard", "yards"]);
    expect(sources[0].chance).toBeCloseTo(haulOdds("junkyard").find((entry) => entry.item === "frame_kart")!.chance);
  });

  it("3 · saves protected parts and keeps them through all automatic sorting policies", () => {
    let state = createGame("keep");
    state.run.learned.push("tech:sorting");
    state.run.inventory = Array.from({ length: garageSpace(state) }, (_, i) => part(`bay-${i}`, "engine_v4", 4));
    state.run.driveway.push(part("keep-this", "junk_misc", 0));
    state = must(state, { type: "protectPart", partUid: "keep-this", keep: true });
    state = must(state, { type: "protectPart", partUid: "bay-0", keep: true });
    expect(swapOutCandidate(state)?.uid).not.toBe("bay-0");
    expect(decodeGameState(state)?.run.driveway[0].protected).toBe(true);
    for (const rule of ["sell", "strip", "strip_sell", "leave"] as const) {
      const branch = must(state, { type: "setDrivewayRule", rule });
      stowFinds(branch, Array.from({ length: 8 }, (_, i) => part(`new-${i}`, "junk_misc", 4)));
      expect(branch.run.driveway).toHaveLength(6);
      expect(branch.run.driveway.some((piece) => piece.uid === "keep-this")).toBe(true);
    }
  });

  it("4 · matches the tuned track score after an actual part swap", () => {
    let state = createGame("fit-score");
    const mower = car("riding_mower", { engine: part("old", "engine_lawn", 3) });
    const engine = part("new", "engine_v4", 3);
    state.run.vehicles.push(mower);
    state.run.inventory.push(engine);
    const expected = partSwapGain(mower, "engine", engine, "dirt", "dirt");
    state = must(state, { type: "install", vehicleUid: mower.uid, slot: "engine", partUid: engine.uid });
    expect(expected).toBeCloseTo(rawScore(state.run.vehicles[0], "dirt", "dirt") - rawScore(mower, "dirt", "dirt"));
    expect(expected).not.toBeCloseTo(partSwapGain({ ...mower, tune: "balanced" }, "engine", engine, "dirt", "dirt"));
  });

  it("5 · queues a whole cleaning batch or leaves all pieces untouched", () => {
    let state = createGame("batch-clean");
    state.run.inventory.push(part("rust-one"), part("rust-two"), part("good-gear", "wheel_basic", 3));
    const invalid = apply(state, { type: "batchClean", partUids: ["rust-one", "good-gear"] });
    expect(invalid.error).toContain("need cleaning");
    expect(invalid.state.run.jobs).toEqual([]);
    state = must(state, { type: "batchClean", partUids: ["rust-one", "rust-two"] });
    expect(state.run.jobs).toHaveLength(1);
    expect(state.run.queue).toEqual([{ kind: "clean", partUid: "rust-two" }]);
    state = must(state, { type: "advance", ms: 600_000 });
    expect(state.run.inventory.map((piece) => piece.condition)).toEqual([2, 2, 3]);
  });

  it("6 · stages service atomically and refuses to pull anything from a signed-up car", () => {
    let state = createGame("installed-service");
    const mower = car("push_mower", { engine: part("running-engine"), wheel: part("wheel", "wheel_basic", 3) });
    state.run.vehicles.push(mower);
    const signUp: JobSpec = { kind: "race", vehicleUid: mower.uid, venueId: "backyard", event: "sprint", call: "push" };
    const signed = must(state, { type: "enqueue", spec: signUp });
    expect(apply(signed, { type: "serviceInstalled", vehicleUid: mower.uid, slot: "engine" }).error).toContain("signed-up race");
    state = must(state, { type: "serviceInstalled", vehicleUid: mower.uid, slot: "engine" });
    expect(state.run.vehicles[0].parts.engine).toBeUndefined();
    expect(state.run.jobs[0].spec).toEqual({ kind: "clean", partUid: "running-engine" });
    expect(apply(state, { type: "sell", partUids: ["running-engine"] }).error).toContain("worked on");
  });

  it("7 · detects bench work and deficits and replaces a stale selection with a valid part", () => {
    const state = createGame("blueprint");
    const kart = getVehicle("go_kart");
    state.run.materials.rubber = 1;
    state.run.inventory.push(part("ready-engine", "engine_v4", 3), part("damaged-frame", "frame_kart", 0));
    const plan = blueprintPlan(state, kart, { engine: "sold-engine" });
    expect(plan.ready).toBe(1);
    expect(plan.required).toBe(4);
    expect(plan.chosen).toEqual({ engine: "ready-engine" });
    expect(plan.missing).toEqual([{ material: "metal", deficit: 6 }, { material: "rubber", deficit: 1 }]);
    expect(plan.slots.find(({ slot }) => slot.slot === "frame")?.fixable[0].uid).toBe("damaged-frame");
  });

  it("8 · moves the urgent queued bench job without interrupting the active bench", () => {
    let state = createGame("priority");
    for (const uid of ["active", "later", "urgent"]) state.run.inventory.push(part(uid));
    for (const uid of ["active", "later", "urgent"]) state = must(state, { type: "enqueue", spec: { kind: "clean", partUid: uid } });
    state = must(state, { type: "prioritizeQueued", index: 1 });
    expect(state.run.jobs[0].spec).toMatchObject({ partUid: "active" });
    expect(state.run.queue[0]).toMatchObject({ partUid: "urgent" });
    state = must(state, { type: "advance", ms: 60_000 });
    expect(state.run.jobs[0].spec).toMatchObject({ partUid: "urgent" });
    expect(apply(state, { type: "prioritizeQueued", index: 0.5 }).state).toBe(state);
  });

  it("9 · drafts genuinely different openings with valid slots, bank and tune-up allocations", () => {
    const state = createGame("loadout");
    expect(planBuilderLoadout(state, "kart", 2, 5, 100, [])).toMatch(/isn't on the shelf/);
    expect(planBuilderLoadout(state, "workshop", 1, 5, 100, [])).toBe("Needs 2 perk slots");
    const salvage = planBuilderLoadout(state, "salvage", 2, 5, 24, []);
    const workshop = planBuilderLoadout(state, "workshop", 2, 5, 24, ["night_owl"]);
    expect(salvage).toMatchObject({ buy: ["borrowed_trailer", "tow_hitch"], tuneUp: { haul: 4, build: 1 }, lpCost: 20 });
    expect(workshop).toMatchObject({ buy: ["night_owl", "shade_tree"], tuneUp: { wrench: 4, build: 1 }, lpCost: 12 });
  });

  it("10 · gives the same Relay setup answer used when a Feature settles", () => {
    const state = createGame("challenge-setup");
    state.config.dare = "homebuilt_relay";
    const kart = car("go_kart", { frame: part("frame", "frame_kart"), wheel: part("wheel", "wheel_kart") });
    state.run.vehicles.push(kart);
    expect(challengeVehicleFit(state, "dirt", kart)).toMatchObject({ ready: false, text: "Fit Dirt Tires" });
    win(state, kart, "dirt");
    expect(state.run.challenge.relay).toBeUndefined();
    kart.parts.wheel!.partId = "wheel_dirt";
    expect(challengeVehicleFit(state, "dirt", kart)?.ready).toBe(true);
    win(state, kart, "dirt");
    expect(challengeVehicleFit(state, "county_fair", kart)).toMatchObject({ ready: false, text: "Fit Kart Slicks or Sport Tires for the Fair" });
  });

  it("11 · requires physically transferring the same mower engine to a Fair-winning kart", () => {
    const state = createGame("hand-me-down");
    state.config.dare = "hand_me_down";
    const winningEngine = part("winner", "engine_v4", 3);
    const mower = car("riding_mower", { engine: winningEngine });
    const kart = car("go_kart", { engine: part("lookalike", "engine_v4", 4) });
    state.run.vehicles.push(mower, kart);
    win(state, mower, "dirt");
    expect(decodeGameState(state)?.run.challenge.handMeDownEngines).toEqual(["winner"]);
    win(state, kart, "county_fair");
    expect(state.meta.challengeRecords.hand_me_down).toBeUndefined();
    let transferred = must(state, { type: "uninstall", vehicleUid: mower.uid, slot: "engine" });
    transferred = must(transferred, { type: "install", vehicleUid: kart.uid, slot: "engine", partUid: winningEngine.uid });
    win(transferred, transferred.run.vehicles[1], "county_fair");
    expect(transferred.meta.challengeRecords.hand_me_down?.completions).toBe(1);
  });

  it("12 · earns early auctions through repeated provenance wins and funds a real zero-Rep bid", () => {
    let state = createGame("early-bid");
    state.run.featureWins.county_fair = 0;
    const choices = { perks: [], tuneUp: TUNE, dare: "parts_with_a_past", hardships: [] };
    for (let season = 0; season < 3; season += 1) {
      state = must(state, { type: "reset", layer: "scrap", choices });
      const kart = car("go_kart", {
        engine: part("engine", "engine_v4", 3, "Marisol's Junkyard"),
        fuel: part("fuel", "fuel_gas_can", 3),
        wheel: part("wheel", "wheel_kart", 3, "Neighbourhood Yards"),
      });
      state.run.vehicles.push(kart);
      win(state, kart, "county_fair");
    }
    const perk = { ...choices, perks: ["auction_bidder"], buy: ["auction_bidder"], dare: null };
    let bidder = decodeGameState(must(state, { type: "reset", layer: "scrap", choices: perk }))!;
    expect(bidder.run.venuesOpen).toEqual(["backyard"]);
    bidder = must(bidder, { type: "openPlace", knowhowId: "place:auction" });
    const trip: JobSpec = { kind: "haul", placeId: "auction" };
    expect(jobBlocker(bidder, trip)).toBe("Needs 40 Scrap Bucks");
    for (let trips = 0; bidder.run.cash < 40 && trips < 100; trips += 1) {
      bidder = complete(bidder, { kind: "haul", placeId: "curb" });
      bidder = must(bidder, { type: "sell", partUids: bidder.run.inventory.map((piece) => piece.uid) });
    }
    expect(bidder.run.cash).toBeGreaterThanOrEqual(40);
    const cash = bidder.run.cash;
    bidder = complete(bidder, trip);
    expect(bidder.run.cash).toBe(cash - 40);
    expect(bidder.run.rep).toBe(0);
    expect(bidder.run.inventory.some((piece) => piece.origin === "Salvage Auction" && getPart(piece.partId).tier >= 2)).toBe(true);

    state.meta.stateWonEver = true;
    const team = must(state, { type: "reset", layer: "team", choices: { ...perk, hardships: ["one_yard"], discipline: "dirt", teamName: "Bidder", colors: ["#111", "#fff"] } });
    const onlyAuction = must(team, { type: "openPlace", knowhowId: "place:auction" });
    expect(apply(onlyAuction, { type: "openPlace", knowhowId: "place:yards" }).error).toContain("One Yard");
  });

  it("13 · spends earned LP once, tracks lifetime LP once, and clears leftovers on Team Reset", () => {
    let state = createGame("team-financing");
    state.scrap.lp = 2;
    state.scrap.lifetimeLp = 9;
    state.meta.stateWonEver = true;
    state.run.featureWins.county_fair = 1;
    const earned = scrapAward(state);
    expect(teamResetLegacyBudget(state)).toBe(2 + earned);
    const choices = { buy: ["night_owl"], perks: ["night_owl"], tuneUp: TUNE, dare: null, hardships: [], discipline: "dirt", teamName: "Funded", colors: ["#111", "#fff"] } as const;
    state = must(state, { type: "reset", layer: "team", choices: { ...choices, buy: [...choices.buy], perks: [...choices.perks], hardships: [], colors: [...choices.colors] } });
    expect(state.scrap.lp).toBe(0);
    expect(state.scrap.lifetimeLp).toBe(9 + earned);
    expect(state.meta.perks.night_owl).toBe(1);
    expect(teamResetLegacyBudget(state)).toBe(0);
  });
});
