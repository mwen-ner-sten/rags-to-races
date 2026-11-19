import { describe, expect, it } from "vitest";
import { racer, teamRacer } from "../../../tests/fixtures/rewrite";
import { createGame } from "../index";
import { MAX_GOALS, nextGoals, seasonTrack } from "../goals";
import { scrapAward } from "../layers";
import type { GameState } from "../types";

const ids = (s: GameState) => nextGoals(s).map((g) => g.id);

describe("nextGoals", () => {
  it("starts a fresh save on the first vehicle and the first place", () => {
    const goals = nextGoals(createGame("goals-fresh"));
    expect(goals[0].id).toBe("vehicle:push_mower");
    expect(goals[0]).toMatchObject({ current: 0, target: 2, tab: "garage" });
    expect(goals.map((g) => g.id)).toContain("place:yards");
    for (const g of goals) expect(g.current).toBeLessThanOrEqual(g.target);
  });

  it("counts parts held toward the first vehicle", () => {
    const s = createGame("goals-parts");
    s.run.inventory.push({ uid: "e", partId: "engine_small", condition: 2, origin: "t" });
    expect(nextGoals(s)[0].current).toBe(1);
  });

  it("after the first vehicle: the venue ladder, and the Rep toward the Dirt Track", () => {
    const s = racer("goals-ladder");
    s.run.rep = 8;
    expect(nextGoals(s)[0]).toMatchObject({ id: "ladder:backyard", current: 0, target: 3, tab: "race" });
    s.run.ladder.backyard = ["sprint", "heat"];
    expect(nextGoals(s)[0].current).toBe(1);
    s.run.ladder.backyard = ["sprint", "heat", "feature"];
    expect(nextGoals(s)[0].current).toBe(2);
    s.run.rep = 5;
    s.run.vehicles.push({ ...s.run.vehicles[0], uid: "rm", vehicleId: "riding_mower" });
    s.run.learned.push("place:yards", "place:floodplain");
    const dirt = nextGoals(s).find((g) => g.id === "place:dirt");
    expect(dirt).toMatchObject({ current: 5, target: 20, unit: "Rep" });
  });

  it("points at the Fair Feature gate before it's won, and prices the reset after", () => {
    const s = racer("goals-gate");
    s.run.featureWins.backyard = 1000;
    s.run.venuesOpen.push("dirt");
    s.run.ladder.dirt = ["sprint"];
    expect(ids(s)).toContain("ladder:dirt");
    expect(nextGoals(s).find((g) => g.id === "gate:scrap")).toMatchObject({ current: 1, target: 3 });

    s.run.featureWins.dirt = 2000;
    s.run.venuesOpen.push("county_fair");
    s.run.ladder.county_fair = ["sprint"];
    expect(ids(s)).not.toContain("gate:scrap");
    expect(nextGoals(s)[0].detail).toContain("Scrap Reset");

    s.run.featureWins.county_fair = 3000;
    s.run.venuesOpen.push("regional");
    s.run.ladder.regional = ["sprint"];
    const reset = nextGoals(s).find((g) => g.id === "reset:scrap")!;
    expect(reset.current).toBe(scrapAward(s));
    expect(reset.target).toBeGreaterThan(reset.current);
    expect(reset.tab).toBe("legacy");
  });

  it("tracks the State invitation and offers founding once State is won", () => {
    const s = racer("goals-state");
    s.run.venuesOpen.push("dirt", "county_fair", "regional");
    s.run.featureWins = { backyard: 1, dirt: 2, county_fair: 3, regional: 4 };
    expect(nextGoals(s).find((g) => g.id === "invite:state")).toMatchObject({ current: 1, target: 2 });
    s.meta.stateWonEver = true;
    expect(ids(s)).toContain("reset:team");
  });

  it("in the Team era: discipline venue names, Team Points, no habits", () => {
    const s = teamRacer("goals-team");
    s.era!.discipline = "drag";
    const goals = nextGoals(s);
    expect(goals[0].label).toBe("Win the Driveway Drags Feature");
    expect(goals.some((g) => g.id.startsWith("habit:"))).toBe(false);
    s.run.featureWins.county_fair = 5;
    s.run.venuesOpen.push("county_fair");
    const team = nextGoals(s).find((g) => g.id === "reset:team")!;
    expect(team.unit).toBe("TP");
    expect(seasonTrack(s)[0].name).toBe("Driveway Drags");
  });

  it("surfaces the Habit closest to forming and never exceeds the cap", () => {
    const s = racer("goals-habit");
    s.run.reps = { "haul:curb": 10, clean: 12 };
    s.run.featureWins.backyard = 1;
    s.run.venuesOpen = ["backyard"];
    s.run.vehicles = [];
    const habit = nextGoals(s).find((g) => g.id.startsWith("habit:"));
    expect(habit).toMatchObject({ id: "habit:clean", current: 12, target: 20 });
    expect(nextGoals(s).length).toBeLessThanOrEqual(MAX_GOALS);
  });
});

describe("seasonTrack", () => {
  it("lists the five venues with open and won flags", () => {
    const s = createGame("track");
    s.run.featureWins.backyard = 10;
    const pips = seasonTrack(s);
    expect(pips.map((p) => p.name)).toEqual(["Backyard Derby", "Dirt Track", "County Fair", "Regional Invitational", "State Invitational"]);
    expect(pips[0]).toMatchObject({ open: true, won: true });
    expect(pips[1]).toMatchObject({ open: false, won: false });
  });
});
