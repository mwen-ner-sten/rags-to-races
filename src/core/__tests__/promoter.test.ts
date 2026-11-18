import { describe, expect, it } from "vitest";
import { applyPromoter, advancePromoter, PROMOTER_VISITORS, promoterGate, promoterReport, type PromoterMeet } from "../promoter";
import { getVehicle } from "../content/vehicles";
import { advance } from "../jobs";
import { newGame } from "../state";
import type { GameState, Vehicle } from "../types";
import { promoterSchema } from "@/game/promoterSave";

function guest(vehicleId: string): Vehicle {
  return {
    uid: vehicleId, vehicleId, name: "Garage special", tune: "balanced", builtAtSeasonMs: 0,
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    parts: Object.fromEntries(getVehicle(vehicleId).slots.map(({ slot, accepts }) => [slot, { uid: `${vehicleId}-${slot}`, partId: accepts[0], condition: 4, origin: "Garage" }])),
  };
}

function invite(seed = "circuit-calendar"): GameState {
  const state = newGame(seed);
  state.owner = { titles: 1, charterTitles: { privateer: 1, club: 0, works: 0 }, tour: { id: "tour1", charter: "privateer", discipline: "dirt", rounds: [], status: "champion" }, history: [] };
  state.run.vehicles = [guest("riding_mower"), guest("go_kart"), guest("street_stock")];
  return state;
}

function homecoming(state: GameState): PromoterMeet {
  expect(applyPromoter(state, { type: "publish", charter: "homecoming", stewardship: "paddock", vehicleUid: "riding_mower" })).toBeNull();
  return state.promoter!.meet!;
}

describe("Circuit Office", () => {
  it("requires the Owner title as well as a race-ready guest in the correct class", () => {
    const state = invite();
    state.owner!.titles = 0;
    expect(promoterGate(state)).toBe(false);
    expect(applyPromoter(state, { type: "publish", charter: "homecoming", stewardship: "paddock", vehicleUid: "riding_mower" })).toMatch(/owner championship/i);
    state.owner!.titles = 1;
    expect(applyPromoter(state, { type: "publish", charter: "homecoming", stewardship: "paddock", vehicleUid: "go_kart" })).toMatch(/charter's class/);
    expect(applyPromoter(state, { type: "publish", charter: "midnight", stewardship: "paddock", vehicleUid: "street_stock" })).toMatch(/certify a cup/i);
    homecoming(state);
    expect(applyPromoter(state, { type: "clerk", call: "nurse" })).toMatch(/earn a clerk/i);
  });

  it("seals classified results, consumes only its own wear and settles through the live and offline clock", () => {
    const state = invite();
    state.run.cash = 100;
    const meet = homecoming(state);
    expect(applyPromoter(state, { type: "book", call: "push" })).toBeNull();
    expect(applyPromoter(state, { type: "tune", tune: "power" })).toMatch(/between meetings/i);
    expect(applyPromoter(state, { type: "close" })).toMatch(/wait/i);
    const booking = meet.booking!;
    expect(booking.result.visitors.map(({ id }) => id)).toEqual(Object.keys(PROMOTER_VISITORS));
    const next = structuredClone(state);
    state.run.vehicles.length = 0;
    state.run.practice.backyard = 10;
    state.meta.disciplineMastery.dirt = 900;
    state.rng += 12;
    advance(state, booking.due - 1);
    expect(meet.results).toHaveLength(0);
    advance(state, 1);
    advance(next, booking.due, true);
    expect(meet.results).toEqual([booking.result]);
    expect(state.promoter).toEqual(next.promoter);
    expect(state.run.races).toHaveLength(0);
    expect(state.run.cash).toBe(100);
    expect(state.run.rep).toBe(0);
    for (const { slot, to } of booking.result.wear) expect(meet.guest.parts[slot]?.condition).toBe(to);
  });

  it("changes how the field runs and requires the visiting grid to deliver for certification", () => {
    const paddock = invite();
    const meet = homecoming(paddock);
    const pro = invite();
    expect(applyPromoter(pro, { type: "publish", charter: "homecoming", stewardship: "pro", vehicleUid: "riding_mower" })).toBeNull();
    for (let round = 0; round < 3; round += 1) {
      expect(applyPromoter(paddock, { type: "book", call: "nurse" })).toBeNull();
      advancePromoter(paddock, 60 * 60_000);
      expect(applyPromoter(pro, { type: "book", call: "nurse" })).toBeNull();
      advancePromoter(pro, 60 * 60_000);
    }
    expect(pro.promoter!.meet!.results.map(({ winningGap }) => winningGap)).not.toEqual(meet.results.map(({ winningGap }) => winningGap));
    expect(promoterReport(meet).qualified).toBe(true);
    const breakdowns = structuredClone(meet);
    for (const result of breakdowns.results) for (const entry of result.visitors) entry.dnf = true;
    expect(promoterReport(breakdowns).qualified).toBe(false);
    expect(applyPromoter(paddock, { type: "close" })).toBeNull();
    expect(paddock.promoter?.certified).toEqual(["homecoming"]);
    expect(paddock.promoter?.archive[0]).toMatchObject({ certified: true, season: 1 });
    expect(applyPromoter(paddock, { type: "publish", charter: "midnight", stewardship: "paddock", vehicleUid: "street_stock" })).toBeNull();
    expect(applyPromoter(paddock, { type: "clerk", call: "nurse" })).toBeNull();
    advancePromoter(paddock, 3 * 60 * 60_000);
    expect(paddock.promoter?.meet?.results).toHaveLength(3);
  });

  it("restores booked calendars and rejects broken references or impossible classifications", () => {
    const state = invite();
    const meet = homecoming(state);
    expect(applyPromoter(state, { type: "book", call: "push" })).toBeNull();
    expect(promoterSchema.safeParse(JSON.parse(JSON.stringify(state.promoter))).success).toBe(true);
    const duplicate = structuredClone(state.promoter);
    duplicate!.meet!.booking!.result.visitors[0].id = duplicate!.meet!.booking!.result.visitors[1].id;
    expect(promoterSchema.safeParse(duplicate).success).toBe(false);
    meet.guest.parts.engine!.partId = "wheel_basic";
    expect(promoterSchema.safeParse(state.promoter).success).toBe(false);
  });
});
