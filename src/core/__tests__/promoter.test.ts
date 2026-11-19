import { describe, expect, it } from "vitest";
import { applyPromoter, advancePromoter, PROMOTER_VISITORS, adaptiveClerkEarned, promoterBallast, promoterClerkPace, promoterGate, promoterGrid, promoterMastery, promoterReport, promoterSchedule, promoterStandings, promoterTargets, promoterVisitorWear, promoterWorkshopEarned, type PromoterEntrant, type PromoterMeet, type PromoterRoundResult, type PromoterVisitor } from "../promoter";
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
  state.owner = { titles: 1, charterTitles: { privateer: 1, club: 0, works: 0, county_to_state: 0 }, tour: { id: "tour1", charter: "privateer", discipline: "dirt", rounds: [], status: "champion" }, history: [] };
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

  it("can certify Close Grid using a lower-powered build and targeted service", () => {
    const state = invite("circuit-balance-1");
    const mower = state.run.vehicles[0];
    mower.tune = "reliable";
    delete mower.parts.exhaust;
    for (const [slot, partId] of Object.entries({ engine: "engine_small", wheel: "wheel_busted", frame: "frame_scrap" })) {
      mower.parts[slot] = { ...mower.parts[slot]!, condition: 1, partId };
    }
    expect(applyPromoter(state, { type: "publish", charter: "homecoming", stewardship: "pro", vehicleUid: mower.uid })).toBeNull();
    const meet = state.promoter!.meet!;
    for (let round = 0; round < 3; round += 1) {
      for (const [slot, part] of Object.entries(meet.guest.parts)) {
        if (part?.condition === 0) expect(applyPromoter(state, { type: "service", slot })).toBeNull();
      }
      const needsHelp = (Object.keys(PROMOTER_VISITORS) as PromoterVisitor[]).find((id) => promoterVisitorWear(meet, id) > 0);
      if (needsHelp) expect(applyPromoter(state, { type: "aid", visitor: needsHelp })).toBeNull();
      expect(applyPromoter(state, { type: "book", call: "nurse" })).toBeNull();
      advancePromoter(state, 60 * 60_000);
    }
    expect(promoterReport(meet)).toMatchObject({ qualified: true, closeFinishes: 2 });
    expect(meet.results[1].visitors.some((entry) => entry.position === 1)).toBe(true);
  });
});

function finishedRound(order: PromoterEntrant[], failed: PromoterEntrant[] = []): PromoterRoundResult {
  const rank = order.filter((id) => !failed.includes(id));
  const position = (id: PromoterEntrant) => failed.includes(id) ? 6 : rank.indexOf(id) + 1;
  return {
    call: "nurse", position: position("guest"), fieldSize: 6, dnf: failed.includes("guest"), weakestSlot: null, wear: [], winningGap: 0.04,
    visitors: (Object.keys(PROMOTER_VISITORS) as PromoterVisitor[]).map((id) => ({ id, position: position(id), dnf: failed.includes(id) })),
  };
}

const guestWin = () => finishedRound(["guest", "dale", "marisol", "big_ron", "jo", "silva"]);
const daleWin = () => finishedRound(["dale", "guest", "marisol", "big_ron", "jo", "silva"]);
const next = { venueId: "dirt", event: "sprint" } as const;
const HOUR = 3_600_000;

function certifiedOffice(state: GameState, charters: ["homecoming"] | ["homecoming", "ironworks"] = ["homecoming"]) {
  state.promoter = { clock: 0, season: 1, certified: charters, archive: [], meet: null };
}

describe("Circuit Office iterations 26–37", () => {
  it("26 ranks the whole grid and breaks a points tie by best results", () => {
    const meet = homecoming(invite());
    meet.results.push(guestWin(), finishedRound(["big_ron", "marisol", "dale", "jo", "silva", "guest"], ["guest"]));
    const standings = promoterStandings(meet);
    expect(standings).toHaveLength(6);
    expect(standings.find(({ id }) => id === "guest")).toMatchObject({ points: 8, starts: 2, finishes: [1] });
    expect(standings.find(({ id }) => id === "dale")).toMatchObject({ points: 8, starts: 2, finishes: [2, 3] });
    expect(standings.findIndex(({ id }) => id === "guest")).toBeLessThan(standings.findIndex(({ id }) => id === "dale"));
  });

  it("27 archives a visitor championship and boosts its pace in the next calendar", () => {
    const state = invite();
    const meet = homecoming(state);
    const scoreBefore = promoterGrid(state, meet, next).find(({ id }) => id === "dale")!.score;
    meet.results.push(daleWin(), daleWin(), daleWin());
    expect(applyPromoter(state, { type: "close" })).toBeNull();
    expect(state.promoter?.archive[0]).toMatchObject({ winner: "dale" });
    expect(state.promoter?.visitorForm).toEqual({ dale: 1 });
    expect(promoterGrid(state, homecoming(state), next).find(({ id }) => id === "dale")!.score).toBeCloseTo(scoreBefore * 1.025);
    expect(promoterSchema.safeParse(state.promoter).success).toBe(true);
  });

  it("28 carries a visitor breakdown forward into real pace and failure risk", () => {
    const state = invite();
    const meet = homecoming(state);
    const fresh = promoterGrid(state, meet, next)[0];
    meet.results.push(finishedRound(["guest", "dale", "marisol", "big_ron", "jo", "silva"], ["dale"]));
    const damaged = promoterGrid(state, meet, next)[0];
    expect(promoterVisitorWear(meet, "dale")).toBe(1);
    expect(damaged.score).toBeCloseTo(fresh.score * 0.97);
    expect(damaged.out).toBeCloseTo(fresh.out + 0.06);
  });

  it("29 spends a scarce pass to repair a named visitor and seals the intervention with the meeting", () => {
    const state = invite();
    const meet = homecoming(state);
    const fresh = promoterGrid(state, meet, next)[0];
    meet.results.push(finishedRound(["guest", "dale", "marisol", "big_ron", "jo", "silva"], ["dale"]));
    expect(applyPromoter(state, { type: "aid", visitor: "marisol" })).toMatch(/breakdown/i);
    expect(applyPromoter(state, { type: "aid", visitor: "dale" })).toBeNull();
    expect(meet.passes).toBe(2);
    expect(promoterGrid(state, meet, next)[0]).toEqual(fresh);
    expect(applyPromoter(state, { type: "book", call: "nurse" })).toBeNull();
    expect(meet.booking?.result.aidedVisitor).toBe("dale");
    expect(promoterSchema.safeParse(state.promoter).success).toBe(true);
    advancePromoter(state, HOUR);
    expect(meet.pendingAid).toBeUndefined();
    expect(meet.results[1].aidedVisitor).toBe("dale");
  });

  it("30 unlocks Success Handicap, applies ballast to the leader and requires different winners", () => {
    const state = invite();
    const publish = { type: "publish", charter: "homecoming", stewardship: "handicap", vehicleUid: "riding_mower" } as const;
    expect(applyPromoter(state, publish)).toMatch(/certify/i);
    certifiedOffice(state);
    expect(applyPromoter(state, publish)).toBeNull();
    const meet = state.promoter!.meet!;
    const neutral = promoterGrid(state, meet, next)[0].score;
    meet.results.push(guestWin());
    expect(promoterBallast(meet)).toBe("guest");
    expect(promoterGrid(state, meet, next)[0].score).toBeCloseTo(neutral / 0.83);
    meet.results.push(guestWin(), guestWin());
    expect(promoterReport(meet).qualified).toBe(false);
    meet.results[2] = daleWin();
    expect(promoterReport(meet)).toMatchObject({ qualified: true, winners: 2 });
    meet.results = [daleWin()];
    expect(promoterBallast(meet)).toBe("dale");
    expect(promoterGrid(state, meet, next)[0].score).toBeCloseTo(neutral * 0.83);
  });

  it("31 earns the reverse calendar for this charter and runs its toughest stop first", () => {
    const state = invite();
    const publish = { type: "publish", charter: "homecoming", stewardship: "paddock", vehicleUid: "riding_mower", route: "reverse" } as const;
    expect(applyPromoter(state, publish)).toMatch(/certify this charter/i);
    certifiedOffice(state);
    expect(applyPromoter(state, publish)).toBeNull();
    const meet = state.promoter!.meet!;
    expect(promoterSchedule(meet.charter, meet.route)[0]).toEqual({ venueId: "backyard", event: "feature" });
    expect(applyPromoter(state, { type: "book", call: "nurse" })).toBeNull();
    expect(meet.booking!.due).toBeGreaterThan(14 * 60_000);
    expect(promoterSchema.safeParse(state.promoter).success).toBe(true);
  });

  it("32 certifies two charters to book a fourth real meeting under higher targets", () => {
    const state = invite();
    certifiedOffice(state);
    const publish = { type: "publish", charter: "homecoming", stewardship: "paddock", vehicleUid: "riding_mower", route: "extended" } as const;
    expect(applyPromoter(state, publish)).toMatch(/two different/i);
    state.promoter!.certified.push("ironworks");
    expect(applyPromoter(state, publish)).toBeNull();
    const meet = state.promoter!.meet!;
    expect(promoterTargets(meet.charter, meet.stewardship, meet.route)).toMatchObject({ points: 12, fieldFinishes: 18, passes: 4, finishes: 3 });
    expect(applyPromoter(state, { type: "clerk", call: "nurse" })).toBeNull();
    advancePromoter(state, 3 * HOUR);
    expect(meet.results).toHaveLength(4);
    expect(promoterReport(meet)).toMatchObject({ complete: true, qualified: true });
    expect(promoterSchema.safeParse(state.promoter).success).toBe(true);
  });

  it("33 awards the workshop contract only for a certified, roadworthy guest with an unused pass", () => {
    const state = invite();
    const publish = { type: "publish", charter: "homecoming", stewardship: "paddock", vehicleUid: "riding_mower", workshopBid: true } as const;
    expect(applyPromoter(state, publish)).toMatch(/certify a calendar/i);
    certifiedOffice(state);
    expect(applyPromoter(state, publish)).toBeNull();
    const meet = state.promoter!.meet!;
    meet.results.push(guestWin(), guestWin(), guestWin());
    meet.passes = 0;
    expect(promoterWorkshopEarned(meet)).toBe(false);
    meet.passes = 1;
    meet.guest.parts.engine!.condition = 0;
    expect(promoterWorkshopEarned(meet)).toBe(false);
    meet.guest.parts.engine!.condition = 1;
    expect(applyPromoter(state, { type: "close" })).toBeNull();
    expect(state.promoter?.workshopLicensed).toBe(true);
    expect(state.promoter?.archive[0]).toMatchObject({ workshopBid: true, workshopEarned: true });
  });

  it("34 records policy mastery permanently and ignores repeat certifications of the same pairing", () => {
    const state = invite();
    for (const stewardship of ["paddock", "paddock", "pro"] as const) {
      expect(applyPromoter(state, { type: "publish", charter: "homecoming", stewardship, vehicleUid: "riding_mower" })).toBeNull();
      state.promoter!.meet!.results.push(guestWin(), guestWin(), guestWin());
      expect(applyPromoter(state, { type: "close" })).toBeNull();
      if (stewardship === "paddock") expect(adaptiveClerkEarned(state)).toBe(false);
    }
    state.promoter!.archive = [];
    expect(promoterMastery(state)).toEqual({ paddock: ["homecoming"], pro: ["homecoming"] });
    expect(adaptiveClerkEarned(state)).toBe(true);
    expect(promoterSchema.safeParse(state.promoter).success).toBe(true);
  });

  it("35 keeps adaptive pace locked until mastery, nurses Close Grid and pushes when the odds justify it", () => {
    const state = invite();
    certifiedOffice(state);
    expect(applyPromoter(state, { type: "publish", charter: "homecoming", stewardship: "pro", vehicleUid: "riding_mower" })).toBeNull();
    const meet = state.promoter!.meet!;
    expect(applyPromoter(state, { type: "clerk", call: "adaptive" })).toMatch(/two policies/i);
    state.promoter!.policyMastery = { paddock: ["homecoming"], pro: ["homecoming"] };
    expect(applyPromoter(state, { type: "clerk", call: "adaptive" })).toBeNull();
    expect(promoterClerkPace(state, meet)).toBe("nurse");
    expect(meet.booking?.result.call).toBe("nurse");
    const stock = invite();
    certifiedOffice(stock);
    stock.promoter!.policyMastery = { paddock: ["homecoming"], pro: ["homecoming"] };
    const vehicle = stock.run.vehicles.find(({ uid }) => uid === "street_stock")!;
    vehicle.tune = "reliable";
    for (const { slot, required } of getVehicle(vehicle.vehicleId).slots) {
      if (required) vehicle.parts[slot]!.condition = 2;
      else delete vehicle.parts[slot];
    }
    expect(applyPromoter(stock, { type: "publish", charter: "midnight", stewardship: "paddock", vehicleUid: vehicle.uid })).toBeNull();
    expect(applyPromoter(stock, { type: "clerk", call: "adaptive" })).toBeNull();
    expect(stock.promoter?.meet?.booking?.result.call).toBe("push");
  });

  it("36 uses only affordable, authorized safety repairs and leaves the clerk parked otherwise", () => {
    const state = invite();
    certifiedOffice(state);
    const meet = homecoming(state);
    meet.passes = 1;
    meet.guest.parts.engine!.condition = 0;
    meet.guest.parts.wheel!.condition = 0;
    expect(applyPromoter(state, { type: "clerk-service", enabled: true })).toMatch(/workshop bid/i);
    state.promoter!.workshopLicensed = true;
    expect(applyPromoter(state, { type: "clerk-service", enabled: true })).toBeNull();
    expect(applyPromoter(state, { type: "clerk", call: "nurse" })).toBeNull();
    expect(meet.booking).toBeNull();
    expect(meet.passes).toBe(1);
    meet.passes = 2;
    expect(applyPromoter(state, { type: "clerk-service", enabled: true })).toBeNull();
    expect(meet).toMatchObject({ passes: 0, clerkServices: ["engine", "wheel"], booking: { result: { call: "nurse" } } });
    expect(promoterSchema.safeParse(state.promoter).success).toBe(true);
  });

  it("37 can carry the certified guest’s exact wear into the next calendar for an extra pass", () => {
    const state = invite();
    const meet = homecoming(state);
    meet.results.push(guestWin(), guestWin(), guestWin());
    meet.guest.parts.engine!.condition = 1;
    expect(applyPromoter(state, { type: "close" })).toBeNull();
    const parked = state.promoter!.reserveGuest;
    expect(parked?.parts.engine?.condition).toBe(1);
    state.run.vehicles = [];
    expect(applyPromoter(state, { type: "publish", charter: "homecoming", stewardship: "paddock", vehicleUid: parked!.uid, returning: true })).toBeNull();
    expect(state.promoter?.meet).toMatchObject({ returning: true, passes: 4, guest: { parts: { engine: { condition: 1 } } } });
    expect(state.promoter?.reserveGuest).toBeUndefined();
    expect(promoterSchema.safeParse(state.promoter).success).toBe(true);
  });
});
