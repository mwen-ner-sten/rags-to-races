import { describe, expect, it } from "vitest";
import { racer } from "../../../tests/fixtures/rewrite";
import { clubCandidate } from "../../../tests/fixtures/club";
import { decodeGameState } from "@/game/save";
import { apply, must } from "../actions";
import { CLUB_CHARTERS, clubCourseGate, clubEntryPrice, clubGate, clubRoundToken, clubScore, ticketedGrant, type ClubAdmission, type ClubCharter } from "../club";
import { CLUB_COURSES, clubLoanOrigin, type ClubCourseId } from "../clubTrack";
import { dnfChance, effectiveScore, rollRace, winChance } from "../race";
import type { ScrapChoices } from "../layers";
import type { GameState, JobSpec, RaceCall, Vehicle } from "../types";

const HOUR = 3_600_000;
const cleanChoices: ScrapChoices = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };

function found(game: GameState, club?: ClubCharter, changes: Partial<ScrapChoices> = {}): GameState {
  return must(game, { type: "reset", layer: "scrap", choices: { ...cleanChoices, ...changes, club } });
}

function fit(game: GameState, vehicleId: string): Vehicle {
  const existing = game.run.vehicles.find((car) => car.vehicleId === vehicleId);
  if (existing) return existing;
  const car = racer(vehicleId, vehicleId).run.vehicles[0];
  car.uid = vehicleId;
  for (const part of Object.values(car.parts)) if (part) part.uid = `${vehicleId}-${part.uid}`;
  game.run.vehicles.push(car);
  return car;
}

function prepareStop(game: GameState): Vehicle {
  const { charter, rounds } = game.club!.active!;
  const stop = CLUB_CHARTERS[charter].stops[rounds.length];
  if (!game.run.venuesOpen.includes(stop.venueId)) game.run.venuesOpen.push(stop.venueId);
  game.run.ladder[stop.venueId] = ["sprint", "heat", "feature"];
  return fit(game, stop.vehicleId);
}

function enter(game: GameState, vehicleUid: string, admission: ClubAdmission, call: RaceCall = "nurse"): GameState {
  return must(game, { type: "club", move: { type: "enter", vehicleUid, admission, call } });
}

function finishCoop(game: GameState, call: RaceCall = "nurse"): GameState {
  game.run.cash = 150;
  for (let i = 0; i < CLUB_CHARTERS.yard_co_op.stops.length; i += 1) {
    const car = prepareStop(game);
    for (const part of Object.values(car.parts)) if (part) part.condition = 4;
    game = enter(game, car.uid, i < 2 ? "public" : "ticketed", call);
    game = must(game, { type: "advance", ms: HOUR, away: true });
  }
  game.run.featureWins.county_fair = game.run.seasonMs;
  return game;
}

describe("Grassroots Club", () => {
  it("waits for two different Circuit certificates and never forces a Club reset", () => {
    const start = clubCandidate();
    start.promoter!.certified.pop();
    expect(clubGate(start)).toMatch(/two different/);
    const blocked = apply(start, { type: "reset", layer: "scrap", choices: { ...cleanChoices, club: "yard_co_op" } });
    expect(blocked.error).toMatch(/certify two/i);
    expect(blocked.state).toBe(start);
    start.promoter!.certified.push("ironworks");
    const ordinary = found(start);
    expect(ordinary.club).toBeUndefined();
    expect(ordinary.run.inventory).toEqual([]);
    expect(ordinary.owner).toEqual(start.owner);
    expect(ordinary.promoter).toEqual(start.promoter);
  });

  it("combines the co-op starter kit with a retained donor part and assembles the opening mower in the normal work queue", () => {
    const start = clubCandidate();
    start.meta.challengeRecords.parts_with_a_past = { completions: 1, bestSeasonMs: 100, bestVehicleName: "Parts car" };
    start.run.inventory.push({ uid: "carried-engine", partId: "engine_small", condition: 3, origin: "Curbside" });
    let game = found(start, "yard_co_op", { retainedPartUid: "carried-engine" });
    expect(game.config).toMatchObject({ club: "yard_co_op", salvageSlot: true });
    expect(game.run.inventory).toMatchObject([
      { uid: "carried-engine", inherited: true, condition: 3 }, { partId: "engine_lawn", condition: 2 }, { partId: "wheel_basic", condition: 2 },
    ]);
    expect(game.era!.crew).toHaveLength(start.era!.crew.length);
    expect(game.promoter).toEqual(start.promoter);
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
    const wheel = game.run.inventory.find(({ partId }) => partId === "wheel_basic")!;
    game = must(game, { type: "enqueue", spec: { kind: "assemble", vehicleId: "push_mower", partUids: { engine: "carried-engine", wheel: wheel.uid }, name: "Club Special" } });
    game = must(game, { type: "advance", ms: HOUR });
    const mower = game.run.vehicles[0];
    expect(mower.parts.engine?.uid).toBe("carried-engine");
    game = enter(game, mower.uid, "public");
    game = must(game, { type: "advance", ms: HOUR, away: true });
    expect(game.club?.active?.rounds[0]).toMatchObject({ vehicle: "Club Special", admission: "public", dnf: false });
    expect(game.run.rep).toBe(game.run.races.at(-1)!.rep + 2);
  });

  it("plays the Backyard Co-op card, pays it once and archives it before switching to the Guild opening", () => {
    let game = found(clubCandidate(), "yard_co_op");
    const charter = CLUB_CHARTERS.yard_co_op;
    game.run.cash = 150;
    for (let i = 0; i < charter.stops.length; i += 1) {
      const car = prepareStop(game);
      const admission: ClubAdmission = i < 2 ? "public" : "ticketed";
      const bank = game.run.cash;
      const rep = game.run.rep;
      game = enter(game, car.uid, admission);
      expect(game.run.cash).toBe(bank - clubEntryPrice(charter.stops[i], admission));
      game = must(game, { type: "advance", ms: HOUR, away: true });
      const day = game.run.races.at(-1)!;
      const completed = game.club!.active!.rounds[i];
      expect(completed).toMatchObject({ raceId: day.id, position: day.position, dnf: false });
      const ticketExtra = (admission === "ticketed" && day.position <= 3) ? ticketedGrant(charter.stops[i]) : 0;
      expect(game.run.cash).toBe(bank - clubEntryPrice(charter.stops[i], admission) + day.prize + ticketExtra + (i === 3 ? charter.grant : 0));
      expect(game.run.rep).toBe(rep + day.rep + (admission === "public" ? 2 : 0) + (i === 3 ? charter.rep : 0));
    }
    expect(clubScore(game.club!.active!)).toMatchObject({ certified: true, publicFinishes: 2 });
    const bank = game.run.cash;
    expect(apply(game, { type: "club", move: { type: "enter", vehicleUid: "riding_mower", admission: "public", call: "push" } }).error).toMatch(/finished/i);
    game = must(game, { type: "advance", ms: HOUR });
    expect(game.run.cash).toBe(bank);
    game.run.featureWins.county_fair = game.run.seasonMs;
    game = found(game, "fairground_guild");
    expect(game.club?.history[0]).toMatchObject({ status: "certified", charter: "yard_co_op" });
    expect(game.club?.active).toMatchObject({ charter: "fairground_guild", rounds: [] });
    expect(game.run.cash).toBe(120);
    expect(game.run.materials).toEqual({ metal: 3, rubber: 2, wiring: 0 });
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
  });

  it("charges at the start, allows queued withdrawal and restores sealed official rounds safely from saves", () => {
    const open = found(clubCandidate(), "fairground_guild");
    const car = prepareStop(open);
    const paid = enter(open, car.uid, "public");
    const job = paid.run.jobs.find(({ spec }) => spec.kind === "race")!;
    expect(job.paid?.cash).toBe(clubEntryPrice(CLUB_CHARTERS.fairground_guild.stops[0], "public"));
    expect(job.race && paid.club?.active?.rounds).toEqual([]);
    expect(apply(paid, { type: "club", move: { type: "enter", vehicleUid: car.uid, admission: "public", call: "nurse" } }).error).toMatch(/already has/i);
    const counterfeit = apply(open, { type: "enqueue", spec: job.spec });
    expect(counterfeit.error).toMatch(/Club calendar/);
    const packed = JSON.parse(JSON.stringify(paid));
    expect(decodeGameState(packed)).not.toBeNull();
    packed.run.jobs.find(({ spec }: typeof job) => spec.kind === "race").spec.clubRound.token = "club:999:0";
    expect(decodeGameState(packed)).toBeNull();
    expect(apply(paid, { type: "cancelJob", jobId: job.id }).error).toMatch(/already on the track/i);
    const waiting = structuredClone(open);
    waiting.run.lastEntered["dirt:heat"] = waiting.run.seasonMs;
    const queued = enter(waiting, car.uid, "public");
    expect(queued.run.queue).toHaveLength(1);
    expect(queued.run.cash).toBe(open.run.cash);
    const canceled = must(queued, { type: "cancelQueued", index: 0 });
    expect(canceled.run.cash).toBe(open.run.cash);
    expect(canceled.club?.active?.rounds).toEqual([]);
    const restored = decodeGameState(JSON.parse(JSON.stringify(paid)))!;
    const away = must(restored, { type: "advance", ms: HOUR, away: true });
    const live = must(paid, { type: "advance", ms: HOUR });
    expect(away.club).toEqual(live.club);
    expect(away.run.races).toEqual(live.run.races);
    expect(away.run.cash).toBe(live.run.cash);
    expect(away.run.rep).toBe(live.run.rep);
  });

  it("the Guild can certify with karts, but a fully ticketed season misses its public commitment", () => {
    for (const openGate of [true, false]) {
      let game = found(clubCandidate("guild-calendar"), "fairground_guild");
      const charter = CLUB_CHARTERS.fairground_guild;
      for (let i = 0; i < charter.stops.length; i += 1) {
        const car = prepareStop(game);
        const admission = openGate && i === 0 ? "public" : "ticketed";
        game = enter(game, car.uid, admission);
        game = must(game, { type: "advance", ms: HOUR, away: true });
      }
      expect(clubScore(game.club!.active!)).toMatchObject({ complete: true, certified: openGate });
      game.run.featureWins.county_fair = game.run.seasonMs;
      game = found(game);
      expect(game.club).toMatchObject({ active: null, history: [{ status: openGate ? "certified" : "finished", charter: "fairground_guild" }] });
      expect(game.config.club).toBeUndefined();
    }
  });
});

describe("Track Founding", () => {
  it("certifies opposite layouts on the same grassroots card and loans one named part alongside a donor", () => {
    let game = found(clubCandidate("track-winners"), "yard_co_op");
    expect(clubCourseGate(game)).toMatch(/certify/i);
    expect(apply(game, { type: "reset", layer: "scrap", choices: { ...cleanChoices, club: "yard_co_op", clubCourse: "tight_infield" } }).error).toMatch(/county fair/i);
    game = finishCoop(game);
    expect(clubCourseGate(game)).toBeNull();
    expect(apply(game, { type: "reset", layer: "scrap", choices: { ...cleanChoices, club: "yard_co_op", clubLoan: "tight_infield" } }).error).toMatch(/certify that track/i);
    game = finishCoop(found(game, "yard_co_op", { clubCourse: "tight_infield" }));
    expect(clubScore(game.club!.active!)).toMatchObject({ trackCertified: true });
    expect(game.club?.trackLicenses).toEqual(["tight_infield"]);

    game.meta.challengeRecords.parts_with_a_past = { completions: 1, bestSeasonMs: 100, bestVehicleName: "Donor" };
    game.run.inventory.push({ uid: "carry-along", partId: "engine_small", condition: 3, origin: "Curbside" });
    game.era!.organization = "collective";
    game = found(game, "yard_co_op", { clubCourse: "fast_straight", clubLoan: "tight_infield", retainedPartUid: "carry-along" });
    const loan = game.run.inventory.find(({ origin }) => origin === clubLoanOrigin("tight_infield"))!;
    expect(loan).toMatchObject({ partId: "wheel_knobby", condition: 3 });
    expect(game.run.inventory.filter(({ origin }) => origin.endsWith("Workshop Loan"))).toHaveLength(1);
    expect(game.run.inventory.some(({ uid, inherited }) => uid === "carry-along" && inherited)).toBe(true);
    expect(game.era?.organization).toBe("collective");
    expect(game.club?.history[0]).toMatchObject({ charter: "yard_co_op", course: "tight_infield", status: "certified" });
    expect(decodeGameState(JSON.parse(JSON.stringify(game)))).not.toBeNull();
    const duplicate = structuredClone(game);
    duplicate.run.inventory.push({ ...loan, uid: "forged-extra-loan" });
    expect(decodeGameState(JSON.parse(JSON.stringify(duplicate)))).toBeNull();
    game.run.inventory = game.run.inventory.filter(({ uid }) => uid !== loan.uid);
    game = finishCoop(game, "push");
    expect(game.run.inventory.some(({ uid }) => uid === loan.uid)).toBe(false);
    expect(clubScore(game.club!.active!)).toMatchObject({ trackCertified: true });
    expect(game.club?.trackLicenses).toEqual(["tight_infield", "fast_straight"]);

    game.era!.organization = "independent";
    game = found(game, "yard_co_op", { clubCourse: "tight_infield", clubLoan: "fast_straight" });
    expect(game.era?.organization).toBe("independent");
    expect(game.run.inventory.filter(({ origin }) => origin.endsWith("Workshop Loan"))).toMatchObject([{ partId: "engine_tiller" }]);
    expect(game.run.inventory.some(({ uid }) => uid === loan.uid)).toBe(false);
    game = finishCoop(game);
    expect(clubScore(game.club!.active!).trackCertified).toBe(true);
    expect(game.club?.trackLicenses).toHaveLength(2);
  });

  it.each(["dirt", "drag", "rally"] as const)("uses the course in odds, risks, actual %s scores and race debriefs", (discipline) => {
    const original = found(clubCandidate(`layout-${discipline}`), "fairground_guild");
    original.era!.discipline = discipline;
    const car = prepareStop(original);
    const season = original.club!.active!;
    const stop = CLUB_CHARTERS[season.charter].stops[0];
    const spec: Extract<JobSpec, { kind: "race" }> = { kind: "race", vehicleUid: car.uid, venueId: stop.venueId, event: stop.event, call: "push", clubRound: { token: clubRoundToken(season), admission: "ticketed" } };
    const forCourse = (course: ClubCourseId) => {
      const game = structuredClone(original);
      game.config.clubCourse = course;
      game.club!.active!.course = course;
      game.club!.hasCertifiedClub = true;
      return game;
    };
    const tight = forCourse("tight_infield");
    const straight = forCourse("fast_straight");
    const pace = (course: ClubCourseId) => effectiveScore(original, car, stop.venueId, "push", undefined, stop.event, course);
    const odds = (course: ClubCourseId) => winChance(original, car, stop.venueId, stop.event, "push", undefined, undefined, course);
    expect(pace("tight_infield")).not.toBeCloseTo(pace("fast_straight"), 2);
    expect(odds("tight_infield")).not.toBeCloseTo(odds("fast_straight"), 4);
    expect(dnfChance(original, car, stop.venueId, stop.event, "push", undefined, "fast_straight")).toBeGreaterThan(dnfChance(original, car, stop.venueId, stop.event, "push", undefined, "tight_infield"));
    const ordinary = { ...spec, clubRound: undefined };
    expect(rollRace(structuredClone(tight), ordinary)).toEqual(rollRace(structuredClone(straight), ordinary));
    const first = rollRace(structuredClone(tight), spec)!;
    const second = rollRace(structuredClone(straight), spec)!;
    expect(first.course).toBe("tight_infield");
    expect(second.course).toBe("fast_straight");
    expect(second.margin).not.toBe(first.margin);
    if (discipline === "rally") {
      expect(first.beats.map(({ text }) => text).join(" ")).toContain("switchbacks");
      expect(second.beats.map(({ text }) => text).join(" ")).toContain("fast lane");
    }
    const booked = enter(straight, car.uid, "ticketed", "push");
    expect(booked.run.jobs.find(({ spec }) => spec.kind === "race")?.paid?.cash).toBe(clubEntryPrice(stop, "ticketed") + CLUB_COURSES.fast_straight.surcharge);
    const loaded = decodeGameState(JSON.parse(JSON.stringify(booked)));
    expect(loaded).not.toBeNull();
    const complete = must(loaded!, { type: "advance", ms: HOUR });
    expect(complete.run.races.at(-1)).toMatchObject({ course: "fast_straight", position: second.position, margin: second.margin });
    expect(complete.club?.active?.rounds[0]?.call).toBe("push");
  });
});
