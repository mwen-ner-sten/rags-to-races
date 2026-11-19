import { describe, expect, it } from "vitest";
import { racer, teamRacer } from "../../../tests/fixtures/rewrite";
import { awayCareer } from "@/game/awayCareer";
import { decodeGameState } from "@/game/save";
import { careerOpportunities } from "../careerAdvice";
import { createGame, must } from "../index";

describe("Career opportunities", () => {
  it("waits for Legacy or a real reset gate and restores both first-founding routes from an old save", () => {
    expect(careerOpportunities(createGame("new-career"))).toEqual([]);
    const older = racer("legacy-builder");
    older.run.revealed = ["haul"];
    older.run.featureWins.county_fair = 0;
    older.meta.stateWonEver = true;
    Reflect.deleteProperty(older.meta, "challengeRecords");
    const loaded = decodeGameState(older)!;
    const [first] = careerOpportunities(loaded);
    expect(first.title).toBe("Your first team");
    expect(first.actions.map((action) => action.destination)).toEqual([
      { tab: "team", discipline: "dirt" }, { tab: "legacy", objective: "hand_me_down" }, { tab: "legacy", objective: "parts_with_a_past" },
    ]);
    expect(first.detail).toContain("any later Team Reset");
    loaded.meta.challengeRecords.hand_me_down = { completions: 1, bestSeasonMs: 4000, bestVehicleName: "Borrowed Mule" };
    expect(careerOpportunities(loaded)[0]).toMatchObject({
      evidence: expect.stringContaining("Borrowed Mule"),
      actions: [{ label: "Plan a Stage Rally team", destination: { tab: "team", discipline: "rally" } }],
    });
  });

  it("guides a new Team to earn its own State licence and links recorded handover work to the draft", () => {
    const game = teamRacer();
    game.meta.stateWonEver = true;
    game.run.venuesOpen.push("regional");
    game.run.ladder.regional = ["sprint"];
    const [touring] = careerOpportunities(game);
    expect(touring.title).toBe("Earn the touring licence");
    expect(touring.actions[0].destination).toEqual({ tab: "race", venueId: "regional" });
    game.era!.crew[0].jobsDone = 22;
    game.era!.crew[0].service = { venues: { dirt: { regional: 3 } } };
    game.run.featureWins.county_fair = 0;
    const [, handover] = careerOpportunities(game);
    expect(handover.evidence).toMatch(/DeShawn.*Regional Invitational/);
    expect(handover.actions[0].destination).toEqual({ tab: "team", discipline: "dirt", focus: "handover" });
  });

  it("uses the actual reversed calendar in the desk and away report after a queued race", () => {
    const team = teamRacer("advice-reverse");
    team.run.vehicles = racer("advice-stock", "street_stock").run.vehicles;
    team.era!.milestones.push("state");
    for (const venue of ["county_fair", "regional", "state"]) {
      team.run.venuesOpen.push(venue);
      team.run.ladder[venue] = ["sprint", "heat", "feature"];
    }
    let game = must(team, { type: "owner", move: { type: "found", charter: "privateer" } });
    game.owner!.tour.rounds = Array.from({ length: 5 }, (_, round) => ({
      raceId: `past-${round}`, carName: "Original winner", vehicleUid: "past-car", position: 1, dnf: false,
    }));
    game.owner!.tour.status = "champion";
    game.owner!.titles = game.owner!.charterTitles.privateer = 1;
    game = must(game, { type: "owner", move: { type: "start", charter: "privateer", itinerary: "reverse" } });
    game = must(game, { type: "owner", move: { type: "enter", vehicleUid: "fixture-vehicle", call: "nurse" } });
    const before = decodeGameState(game)!;
    expect(careerOpportunities(before)[0].detail).toMatch(/State Invitational feature is on track/);
    const after = must(before, { type: "advance", ms: 60 * 60_000, away: true });
    expect(awayCareer(before, after).reports[0]).toMatchObject({
      detail: expect.stringContaining("State Invitational"),
      next: "Next up is the feature at Regional Invitational.",
    });
    expect(careerOpportunities(after)[0]).toMatchObject({
      detail: expect.stringContaining("Regional Invitational feature"),
      actions: [{ label: "Open championship round controls", destination: { tab: "owner", section: "round" } }],
    });
  });
});
