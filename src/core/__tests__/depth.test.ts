import { describe, expect, it } from "vitest";
import { apply, counterBlocker, toolStocked } from "../actions";
import { channel } from "../channels";
import { DISCIPLINES, RIVALS, VENUES, getVenue } from "../content/events";
import { DARES, HARDSHIPS, PERKS, hardshipConflict } from "../content/modifiers";
import { PARTS, PART_BY_ID } from "../content/parts";
import { PLACES } from "../content/places";
import { VEHICLES } from "../content/vehicles";
import { counterPrice, stowFinds, vehicleStats } from "../garage";
import { createGame, must } from "../index";
import { STORY } from "../journal";
import { cautionChance, opponents, partScoreAt, purseFactor, rawScore, resolveRace, rollRace, venueLockReason, winChance } from "../race";
import type { Condition, EraState, GameState, JobSpec, PartInstance, Vehicle } from "../types";

type RaceSpec = Extract<JobSpec, { kind: "race" }>;

const BEATER = { body: "beater_shell", engine: "engine_v6", wheel: "wheel_sport", frame: "frame_steel", fuel: "fuel_tank_large", drivetrain: "drive_manual", electronics: "elec_ecu", exhaust: "exhaust_straight" };
const STREET_STOCK = { body: "beater_shell", frame: "frame_cage", engine: "engine_v8", wheel: "wheel_slick", fuel: "fuel_cell", drivetrain: "drive_race", electronics: "elec_ignition", exhaust: "exhaust_headers" };
const KART = { engine: "engine_v4", wheel: "wheel_kart", frame: "frame_kart", fuel: "fuel_tank_small" };

function car(vehicleId: string, parts: Record<string, string>, condition: Condition = 4): Vehicle {
  return {
    uid: "v1", vehicleId, name: "Test", tune: "balanced", builtAtSeasonMs: 0,
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    parts: Object.fromEntries(Object.entries(parts).map(([slot, partId]) => [slot, { uid: `p-${slot}`, partId, condition, origin: "test" }])),
  };
}

function withCar(seed: string, vehicleId: string, parts: Record<string, string>, condition: Condition = 4): { s: GameState; v: Vehicle } {
  const s = createGame(seed);
  const v = car(vehicleId, parts, condition);
  s.run.vehicles.push(v);
  return { s, v };
}

function era(discipline: EraState["discipline"], crew: EraState["crew"] = []): EraState {
  return { discipline, teamName: "T", colors: ["#000", "#fff"], crew, milestones: [], hardshipsCompleted: 0, legends: [], seasonIndex: 0 };
}

function openAll(s: GameState, venueId: string): void {
  if (!s.run.venuesOpen.includes(venueId)) s.run.venuesOpen.push(venueId);
  s.run.ladder[venueId] = ["sprint", "heat", "feature"];
}

/** Races the same event until it is won (resetting wear each time), or gives up. */
function winFeature(s: GameState, v: Vehicle, venueId: string, call: RaceSpec["call"] = "nurse", tries = 80): void {
  openAll(s, venueId);
  s.run.practice[venueId] = 10;
  for (let i = 0; i < tries && s.run.featureWins[venueId] === undefined; i++) {
    resolveRace(s, { kind: "race", vehicleUid: v.uid, venueId, event: "feature", call });
    for (const part of Object.values(v.parts)) if (part) part.condition = 4;
  }
}

describe("content is wired up", () => {
  it("every part a slot accepts and every find exists", () => {
    for (const vehicle of VEHICLES) for (const slot of vehicle.slots) for (const id of slot.accepts) expect(PART_BY_ID[id], `${vehicle.id}.${slot.slot}: ${id}`).toBeDefined();
    for (const place of PLACES) for (const find of place.finds) expect(PART_BY_ID[find.partId], `${place.id}: ${find.partId}`).toBeDefined();
  });

  it("every non-junk part fits a vehicle and can be found somewhere", () => {
    const fits = new Set(VEHICLES.flatMap((v) => v.slots.flatMap((sl) => sl.accepts)));
    const found = new Set(PLACES.flatMap((p) => p.finds.map((f) => f.partId)));
    for (const part of PARTS) {
      if (part.category === "junk") continue;
      expect(fits.has(part.id), `${part.id} fits nothing`).toBe(true);
      if (part.id !== "beater_shell") expect(found.has(part.id), `${part.id} is never found`).toBe(true);
    }
  });

  it("every dare unlocks a real perk, and every dare perk has its dare", () => {
    for (const dare of DARES) expect(PERKS.find((p) => p.id === dare.unlocksPerk)?.unlock).toEqual({ type: "dare", dareId: dare.id });
  });

  it("every rival has a story for the first loss and the first win", () => {
    for (const rival of RIVALS) {
      expect(STORY).toHaveProperty(`lost_${rival.id}`);
      expect(STORY).toHaveProperty(`beat_${rival.id}`);
    }
    for (const vehicle of VEHICLES) if (vehicle.tier > 0) expect(STORY).toHaveProperty(`built_${vehicle.id}`);
  });

  it("hardship conflicts point at real hardships or dares", () => {
    const ids = new Set([...HARDSHIPS.map((h) => h.id), ...DARES.map((d) => d.id)]);
    for (const hardship of HARDSHIPS) for (const conflict of hardship.conflicts) expect(ids.has(conflict.id)).toBe(true);
  });
});

describe("venues reward different builds", () => {
  const worth = (partId: string, venueId: string, slot: string) => partScoreAt({ partId, condition: 3 }, "dirt", venueId, slot);

  it("venue demands average out near neutral", () => {
    for (const venue of VENUES) {
      const mean = (venue.demand.power + venue.demand.handling + venue.demand.reliability) / 3;
      expect(mean).toBeGreaterThan(0.9);
      expect(mean).toBeLessThan(1.1);
      expect(venue.character.length).toBeGreaterThan(10);
    }
  });

  it.each([
    ["engine", "engine_twin", "county_fair", "engine_v4", "dirt"],
    ["engine", "engine_turbo4", "county_fair", "engine_v6", "state"],
    ["engine", "engine_v8", "regional", "engine_six", "state"],
    ["engine", "engine_lawn", "backyard", "engine_tiller", "dirt"],
    ["wheel", "wheel_kart", "county_fair", "wheel_dirt", "dirt"],
    ["wheel", "wheel_basic", "backyard", "wheel_knobby", "dirt"],
    ["wheel", "wheel_sport", "regional", "wheel_at", "state"],
    ["wheel", "wheel_slick", "regional", "wheel_groove", "state"],
    ["frame", "frame_wagon", "backyard", "frame_mower", "dirt"],
    ["frame", "frame_tube", "regional", "frame_steel", "state"],
    ["drivetrain", "drive_manual", "county_fair", "drive_auto", "state"],
  ])("in the %s slot, %s wins at %s and %s wins at %s", (slot, a, venueA, b, venueB) => {
    expect(worth(a, venueA, slot)).toBeGreaterThan(worth(b, venueA, slot));
    expect(worth(b, venueB, slot)).toBeGreaterThan(worth(a, venueB, slot));
  });

  it("a car's score is the sum of its parts at that venue plus its chassis", () => {
    const v = car("go_kart", KART, 3);
    const fair = rawScore(v, "dirt", "county_fair");
    const dirt = rawScore(v, "dirt", "dirt");
    expect(fair).not.toBeCloseTo(dirt, 3);
    const twin = car("go_kart", { ...KART, engine: "engine_twin" }, 3);
    expect(rawScore(twin, "dirt", "county_fair")).toBeGreaterThan(fair);
    expect(rawScore(twin, "dirt", "dirt")).toBeLessThan(dirt);
  });
});

describe("rivals race their own way", () => {
  it("Dale breaks down sometimes, and that hands you the win over him", () => {
    let outs = 0;
    for (let i = 0; i < 60; i++) {
      const { s } = withCar(`dale-${i}`, "push_mower", { engine: "engine_lawn", wheel: "wheel_basic" });
      const roll = rollRace(s, { kind: "race", vehicleUid: "v1", venueId: "backyard", event: "feature", call: "nurse" });
      if (roll?.rivalOut) {
        outs += 1;
        if (!roll.dnf) expect(roll.rivalBeaten).toBe(true);
        expect(roll.beats.some((b) => b.kind === "rival" && /Dale/.test(b.text))).toBe(true);
      }
    }
    expect(outs).toBeGreaterThan(3);
    expect(outs).toBeLessThan(30);
  });

  it("Marisol never breaks down", () => {
    for (let i = 0; i < 40; i++) {
      const { s } = withCar(`marisol-${i}`, "go_kart", KART);
      openAll(s, "dirt");
      expect(rollRace(s, { kind: "race", vehicleUid: "v1", venueId: "dirt", event: "feature", call: "nurse" })?.rivalOut).toBe(false);
    }
  });

  it("Big Ron is harder to beat on a Nurse call than the call alone explains", () => {
    const { s } = withCar("ron", "beater_car", BEATER);
    const push = opponents(s, "county_fair", "feature", "push").find((o) => o.rival)!;
    const nurse = opponents(s, "county_fair", "feature", "nurse").find((o) => o.rival)!;
    expect(nurse.score).toBeGreaterThan(push.score);
    expect(opponents(s, "dirt", "feature", "nurse")[0].score).toBe(opponents(s, "dirt", "feature", "push")[0].score);
  });

  it("the Kesslers bring a second fast car", () => {
    const { s } = withCar("kessler", "beater_car", BEATER);
    const field = opponents(s, "regional", "feature");
    const plain = opponents(s, "regional", "heat");
    expect(field[1].score / getVenue("regional").events.feature.field).toBeGreaterThan(plain[1].score / getVenue("regional").events.heat.field);
  });

  it("tells the first loss and first win against a rival once each", () => {
    const { s, v } = withCar("story", "push_mower", { engine: "engine_small", wheel: "wheel_busted" }, 1);
    openAll(s, "backyard");
    for (let i = 0; i < 6; i++) resolveRace(s, { kind: "race", vehicleUid: v.uid, venueId: "backyard", event: "feature", call: "nurse" });
    expect(s.meta.journal.filter((j) => j.id === "lost_dale")).toHaveLength(1);
    expect(s.meta.rivals.dale.losses).toBeGreaterThan(0);
  });
});

describe("the purse", () => {
  it("shrinks when you keep winning the same event, and recovers with time", () => {
    const { s, v } = withCar("purse", "riding_mower", { engine: "engine_v4", wheel: "wheel_kart", frame: "frame_kart" });
    const spec: RaceSpec = { kind: "race", vehicleUid: v.uid, venueId: "backyard", event: "sprint", call: "nurse" };
    expect(purseFactor(s, "backyard", "sprint")).toBe(1);
    const prizes: number[] = [];
    for (let i = 0; i < 14; i++) {
      const result = resolveRace(s, spec);
      if (result?.position === 1) prizes.push(result.prize);
      for (const part of Object.values(v.parts)) if (part) part.condition = 4;
    }
    expect(prizes[0]).toBe(getVenue("backyard").events.sprint.prize);
    expect(prizes[prizes.length - 1]).toBeLessThan(prizes[0]);
    const low = purseFactor(s, "backyard", "sprint");
    expect(low).toBeLessThan(1);
    expect(low).toBeGreaterThanOrEqual(0.3);
    expect(purseFactor(s, "backyard", "heat")).toBe(1);
    s.run.seasonMs += 24 * 3_600_000;
    expect(purseFactor(s, "backyard", "sprint")).toBe(1);
  });
});

describe("the push leg", () => {
  it("the State Invitational only invites drivers who won the Regional in an earlier Season", () => {
    const first = withCar("invite-1", "street_stock", STREET_STOCK);
    winFeature(first.s, first.v, "regional");
    expect(first.s.run.featureWins.regional).toBeDefined();
    expect(first.s.run.venuesOpen).not.toContain("state");
    expect(venueLockReason(first.s, "state")).toMatch(/next Season/);

    const second = withCar("invite-2", "street_stock", STREET_STOCK);
    second.s.meta.records.regional = 5 * 24 * 3_600_000;
    expect(venueLockReason(second.s, "state")).toMatch(/Win the Regional Invitational Feature/);
    winFeature(second.s, second.v, "regional");
    expect(second.s.run.venuesOpen).toContain("state");
    expect(venueLockReason(second.s, "state")).toBeNull();
  });

  it("a Street Stock is what wins at State; a Beater can't", () => {
    const beater = withCar("state-b", "beater_car", BEATER);
    const stock = withCar("state-s", "street_stock", STREET_STOCK);
    for (const g of [beater.s, stock.s]) g.run.practice.state = 10;
    expect(winChance(beater.s, beater.v, "state", "feature", "push")).toBeLessThan(0.05);
    expect(winChance(stock.s, stock.v, "state", "feature", "push")).toBeGreaterThan(0.6);
  });

  it("Street Stock plans come after a County Fair win in a Beater, and the car needs its own shell and a cage", () => {
    const { s } = withCar("ss", "beater_car", BEATER);
    expect(s.run.available).not.toContain("blueprint:street_stock");
    s.run.featureWins.county_fair = 1;
    const next = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    expect(next.run.available).toContain("blueprint:street_stock");
    const def = VEHICLES.find((v) => v.id === "street_stock")!;
    expect(def.slots.find((sl) => sl.slot === "frame")?.accepts).toEqual(["frame_cage"]);
    expect(def.slots.find((sl) => sl.slot === "body")?.minCondition).toBe(3);
  });

  it("bigger shop tools are only stocked once you build bigger machines", () => {
    const s = createGame("tools");
    s.run.cash = 5000;
    s.run.materials.metal = 50;
    expect(toolStocked(s, "engine_stand")).toBe(false);
    expect(apply(s, { type: "buyTool", toolId: "engine_stand" }).error).toMatch(/doesn't stock/);
    s.run.vehicles.push(car("go_kart", KART));
    expect(toolStocked(s, "engine_stand")).toBe(true);
    const before = channel(s, "rebuild_speed");
    const bought = must(s, { type: "buyTool", toolId: "engine_stand" });
    expect(channel(bought, "rebuild_speed")).toBeCloseTo(before + 0.3, 6);
    expect(channel(must(bought, { type: "buyTool", toolId: "torque_wrench" }), "build_speed")).toBeCloseTo(1.3, 6);
  });
});

describe("new dares and perks", () => {
  it("Kart to the Fair completes in a Go-Kart and puts Short Cut on the shelf", () => {
    const { s, v } = withCar("kart-fair", "go_kart", { ...KART, engine: "engine_twin", wheel: "wheel_sport", fuel: "fuel_tank_large", drivetrain: "drive_chain", exhaust: "exhaust_glasspack" });
    s.config.dare = "kart_to_fair";
    winFeature(s, v, "county_fair", "push", 200);
    expect(s.meta.daresCompleted).toContain("kart_to_fair");
    expect(s.meta.perksUnlocked).toContain("short_cut");
  });

  it("Penny Pincher fails once you buy at the Parts Counter", () => {
    const clean = withCar("penny-1", "beater_car", BEATER);
    clean.s.config.dare = "penny_pincher";
    winFeature(clean.s, clean.v, "county_fair");
    expect(clean.s.meta.daresCompleted).toContain("penny_pincher");

    const bought = withCar("penny-2", "beater_car", BEATER);
    bought.s.config.dare = "penny_pincher";
    bought.s.run.revealed.push("tools");
    bought.s.run.cash = 500;
    bought.s.meta.codex.parts.wheel_sport = 1;
    expect(counterBlocker(bought.s, "wheel_sport")).toBeNull();
    const after = must(bought.s, { type: "buyPart", partId: "wheel_sport" });
    expect(after.run.stats.counterBuys).toBe(1);
    winFeature(after, after.run.vehicles[0], "county_fair");
    expect(after.meta.daresCompleted).not.toContain("penny_pincher");
  });

  it("Clean Sweep needs a Season with no DNF", () => {
    const { s, v } = withCar("sweep", "beater_car", BEATER);
    s.config.dare = "clean_sweep";
    s.run.stats.dnfs = 1;
    winFeature(s, v, "county_fair");
    expect(s.meta.daresCompleted).not.toContain("clean_sweep");
  });

  it("Coupon Book cuts the counter price, Borrowed Trailer opens the Junkyard early, Hot Shoe cuts wear", () => {
    const s = createGame("perks");
    expect(counterPrice(s, "engine_v4")).toBe(PART_BY_ID.engine_v4.value * 3);
    s.meta.perks = { coupon_book: 1, borrowed_trailer: 1, hot_shoe: 1 };
    s.config.perks = ["coupon_book", "borrowed_trailer", "hot_shoe"];
    expect(counterPrice(s, "engine_v4")).toBe(PART_BY_ID.engine_v4.value * 2);
    expect(channel(s, "wear")).toBeCloseTo(0.8, 6);
    s.run.rep = 100;
    expect(apply(s, { type: "openPlace", knowhowId: "place:junkyard" }).error).toBeNull();
    s.config.hardships = ["rookie_plates"];
    expect(counterPrice(s, "engine_v4")).toBe(PART_BY_ID.engine_v4.value * 3);
  });

  it("Local Hero doubles the Rep of a Feature win", () => {
    const plain = withCar("hero", "beater_car", BEATER);
    const hero = withCar("hero", "beater_car", BEATER);
    hero.s.meta.perks = { local_hero: 1 };
    hero.s.config.perks = ["local_hero"];
    winFeature(plain.s, plain.v, "county_fair");
    winFeature(hero.s, hero.v, "county_fair");
    const repOf = (g: GameState) => g.run.races.find((r) => r.event === "feature" && r.position === 1 && !r.dnf)!.rep;
    expect(repOf(hero.s)).toBe(repOf(plain.s) * 2);
  });
});

describe("the activity feed", () => {
  it("says what a trip brought home", () => {
    let s = createGame("feed");
    s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
    s = must(s, { type: "advance", ms: 16_000 });
    const item = s.run.feed.find((f) => f.kind === "haul");
    expect(item?.text).toMatch(/Curbside trip brought home Small Engine \(Rusted\)/);
    expect(item?.key).toBeUndefined();
    expect(s.run.feed.some((f) => f.kind === "story")).toBe(true);
  });

  it("folds a run of driveway overflows into one line", () => {
    const s = createGame("feed-overflow");
    const junk = (n: number): PartInstance[] => Array.from({ length: n }, (_, i) => ({ uid: `j${s.uid++}-${i}`, partId: "junk_misc", condition: 2 as const, origin: "test" }));
    stowFinds(s, junk(12 + 6 + 3));
    stowFinds(s, junk(4));
    stowFinds(s, junk(2));
    const lines = s.run.feed.filter((f) => f.kind === "driveway");
    expect(lines).toHaveLength(1);
    expect(lines[0].count).toBe(3);
    expect(lines[0].text).toMatch(/overflowed 3 times: 9 stripped for materials/);
    expect(s.run.notices).toEqual([]);
  });

  it("keeps the feed short", () => {
    let s = createGame("feed-cap");
    for (let i = 0; i < 60; i++) {
      s = must(s, { type: "enqueue", spec: { kind: "haul", placeId: "curb" } });
      s = must(s, { type: "advance", ms: 16_000 });
      s = must(s, { type: "sell", partUids: s.run.inventory.concat(s.run.driveway).map((p) => p.uid) });
    }
    expect(s.run.feed.length).toBeLessThanOrEqual(40);
  });
});

describe("Dirt Oval in the Team era", () => {
  const driver = { id: "deshawn", assignment: { type: "driver" as const }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 0 };

  it("has no cautions before a team exists, and none in a Sprint", () => {
    const era1 = withCar("yellow-0", "beater_car", BEATER).s;
    expect(cautionChance(era1, "feature")).toBe(0);
    era1.era = era("dirt");
    expect(cautionChance(era1, "sprint")).toBe(0);
    expect(cautionChance(era1, "feature")).toBeGreaterThan(0.3);
    era1.era = era("drag");
    expect(cautionChance(era1, "feature")).toBe(0);
  });

  it("the pit call only matters when the yellow comes out: it saves the tyres", () => {
    let yellows = 0;
    let wheelWearPit = 0;
    let wheelWearStay = 0;
    for (let i = 0; i < 300; i++) {
      for (const call2 of ["pit", "stay"] as const) {
        const { s } = withCar(`yellow-${i}`, "beater_car", BEATER);
        s.era = era("dirt", [structuredClone(driver)]);
        openAll(s, "county_fair");
        const roll = rollRace(s, { kind: "race", vehicleUid: "v1", venueId: "county_fair", event: "feature", call: "push", call2 })!;
        if (!roll.caution) continue;
        if (call2 === "pit") {
          yellows += 1;
          wheelWearPit += roll.wearSteps.wheel && !roll.dnf ? 1 : 0;
          if (!roll.dnf) expect(roll.beats.some((b) => b.kind === "caution" && /fresh tyres/.test(b.text))).toBe(true);
        } else {
          wheelWearStay += roll.wearSteps.wheel && !roll.dnf ? 1 : 0;
        }
      }
    }
    expect(yellows).toBeGreaterThan(120);
    expect(yellows).toBeLessThan(240);
    expect(wheelWearPit).toBe(0);
    expect(wheelWearStay).toBeGreaterThan(20);
  });
});

describe("Drag is a bracket", () => {
  function dragCar(seed: string): { s: GameState; v: Vehicle } {
    const made = withCar(seed, "beater_car", BEATER);
    made.s.era = era("drag");
    openAll(made.s, "county_fair");
    return made;
  }

  it("runs one, two and three rounds, and places by the round you went out in", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 80; i++) {
      const { s } = dragCar(`bracket-${i}`);
      for (const [event, rounds] of [["sprint", 1], ["heat", 2], ["feature", 3]] as const) {
        const roll = rollRace(s, { kind: "race", vehicleUid: "v1", venueId: "county_fair", event, call: "push" })!;
        expect(roll.rounds).toBe(rounds);
        expect(roll.fieldSize).toBe(2 ** rounds);
        expect(roll.laps).toBe(1);
        expect([1, 2, 3, 5]).toContain(roll.position);
        expect(roll.beats.filter((b) => b.kind === "round").length).toBeGreaterThanOrEqual(1);
        expect(roll.beats.every((b) => b.position <= 2 && b.at <= roll.durationMs)).toBe(true);
        if (event === "feature") seen.add(roll.position);
      }
    }
    expect(seen.has(1)).toBe(true);
  });

  it("going out early in a Feature is not a loss to a rival you never raced", () => {
    const { s, v } = withCar("drag-early", "go_kart", KART, 1);
    s.era = era("drag");
    openAll(s, "county_fair");
    for (let i = 0; i < 8; i++) {
      const result = resolveRace(s, { kind: "race", vehicleUid: v.uid, venueId: "county_fair", event: "feature", call: "nurse" })!;
      expect(result.position).toBe(5);
      expect(result.rival).toBeUndefined();
      for (const part of Object.values(v.parts)) if (part) part.condition = 1;
    }
    expect(s.meta.rivals.big_ron).toBeUndefined();
    expect(s.meta.journal.some((j) => j.id === "lost_big_ron")).toBe(false);
  });

  it("the odds shown for a hard launch match what the rounds actually do", () => {
    const driver = { id: "deshawn", assignment: { type: "driver" as const }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 0 };
    const spec: RaceSpec = { kind: "race", vehicleUid: "v1", venueId: "state", event: "heat", call: "push", call2: "launch_hard" };
    let wins = 0;
    let preview = 0;
    const runs = 1500;
    for (let i = 0; i < runs; i++) {
      const { s, v } = withCar(`odds-${i}`, "street_stock", STREET_STOCK);
      s.era = era("drag", [structuredClone(driver)]);
      openAll(s, "state");
      if (i === 0) preview = winChance(s, v, "state", "heat", "push", "launch_hard");
      const roll = rollRace(s, spec)!;
      if (roll.position === 1 && !roll.dnf) wins += 1;
    }
    expect(Math.abs(wins / runs - preview)).toBeLessThan(0.06);
  });

  it("a lost one-pass Sprint pays nothing and doesn't open the Heat", () => {
    const { s, v } = withCar("drag-loss", "go_kart", KART, 1);
    s.era = era("drag");
    s.run.venuesOpen.push("county_fair");
    s.run.ladder.county_fair = ["sprint"];
    for (let i = 0; i < 5; i++) {
      const result = resolveRace(s, { kind: "race", vehicleUid: v.uid, venueId: "county_fair", event: "sprint", call: "nurse" })!;
      expect(result.position).toBe(2);
      expect(result.prize).toBe(0);
      expect(result.rep).toBe(0);
      for (const part of Object.values(v.parts)) if (part) part.condition = 1;
    }
    expect(s.run.ladder.county_fair).toEqual(["sprint"]);
  });

  it("ignores cornering: grip, power and weight decide it", () => {
    const base = car("beater_car", BEATER, 3);
    const grippy = car("beater_car", { ...BEATER, wheel: "wheel_at" }, 3);
    expect(vehicleStats(base).traction).toBeGreaterThan(vehicleStats(grippy).traction);
    expect(rawScore(base, "drag", "regional")).toBe(rawScore(base, "drag", "backyard"));
    expect(DISCIPLINES.drag.weights.handling).toBe(0);
    expect(rawScore(base, "drag")).toBeGreaterThan(rawScore(grippy, "drag"));
  });

  it("a hard launch is a gamble; a soft one is safe", () => {
    const driver = { id: "deshawn", assignment: { type: "driver" as const }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 0 };
    let spins = 0;
    let rounds = 0;
    for (let i = 0; i < 120; i++) {
      const { s } = dragCar(`launch-${i}`);
      s.era!.crew = [structuredClone(driver)];
      const roll = rollRace(s, { kind: "race", vehicleUid: "v1", venueId: "county_fair", event: "feature", call: "nurse", call2: "launch_hard" })!;
      for (const beat of roll.beats.filter((b) => b.kind === "round")) {
        rounds += 1;
        if (/smoke off the line/.test(beat.text)) spins += 1;
      }
    }
    expect(spins / rounds).toBeGreaterThan(0.12);
    expect(spins / rounds).toBeLessThan(0.34);
  });
});

describe("hardships", () => {
  it("Short Season can't be combined with the Quick Season dare", () => {
    expect(hardshipConflict(["short_season"], "quick_season")).toMatch(/48-hour clock/);
    expect(hardshipConflict(["short_season"], null)).toBeNull();
    expect(hardshipConflict(["solo", "hand_tools"], "packrat")).toBeNull();
  });

  it("Solo's reward is one more crew member, once", () => {
    const s = createGame("solo");
    s.era = era("dirt");
    const before = channel(s, "crew_cap");
    s.meta.hardshipMastery.solo = 2;
    expect(channel(s, "crew_cap")).toBe(before + 1);
    expect(channel(s, "automation")).toBe(1);
  });

  it("carrying a hardship to a State win counts it twice", () => {
    const { s, v } = withCar("deep", "street_stock", STREET_STOCK);
    s.era = era("dirt");
    s.config.hardships = ["rust_everything"];
    s.meta.records.regional = 1;
    winFeature(s, v, "county_fair");
    expect(s.meta.hardshipMastery.rust_everything).toBe(1);
    winFeature(s, v, "regional");
    winFeature(s, v, "state", "push", 200);
    expect(s.run.featureWins.state).toBeDefined();
    expect(s.meta.hardshipMastery.rust_everything).toBe(2);
    expect(s.era?.hardshipsCompleted).toBe(2);
  });
});
