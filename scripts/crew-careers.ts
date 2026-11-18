/**
 * Earn team and sponsor checkpoints through the same actions as the browser.
 * npx tsx scripts/crew-careers.ts [seeds] [mixed|daily] [output-dir] [first-seed]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGame, must, type TeamChoices } from "../src/core";
import { CREW_BY_ID, type TeamOrganization } from "../src/core/content/team";
import { crewHandoverOffers, APPRENTICE_JOBS, HANDOVER_COST, type WorkshopRoutine } from "../src/core/crewLegacy";
import { LAYERS, crewCap, nextSeasonPerkSlots, nextSeasonTuneUpPoints, nextTeamPerkSlots, scrapAward, teamAward, teamResetLegacyBudget } from "../src/core/layers";
import { currentTourEntry, ownerGate, ownerTourActive, sponsorProgress, sponsorshipBlocker, tourCalendar, tourCash, tourGarage, tourScore, type OwnerTour } from "../src/core/ownership";
import { jobBlocker } from "../src/core/jobs";
import { Bot, SCHEDULES, type Schedule } from "../src/core/sim/bot";
import type { GameState, JobSpec, RaceCall } from "../src/core/types";
import { decodeGameState } from "../src/game/save";

const DAY = 86_400_000;
const seeds = Number(process.argv[2] ?? 8);
const scheduleId = process.argv[3] ?? "mixed";
const schedule = SCHEDULES[scheduleId];
const output = process.argv[4] ?? `test-results/crew-careers-${scheduleId}`;
const firstSeed = Number(process.argv[5] ?? 0);
const strategies = {
  workshop: { organization: "collective", handover: "apprenticeship", sponsor: "reliable" },
  racing: { organization: "independent", handover: "track_notes", sponsor: "front_row" },
} as const;
type Strategy = keyof typeof strategies;

if (!schedule || !Number.isInteger(seeds) || seeds < 1 || !Number.isInteger(firstSeed) || firstSeed < 0) {
  throw new Error("Choose a supported schedule and valid seed range.");
}
mkdirSync(output, { recursive: true });

function foundingCheckpoint(seed: string, visitSchedule: Schedule): { state: GameState; choices: TeamChoices; elapsed: number } {
  const bot = new Bot(createGame(seed), "push");
  bot.holdAt = "team";
  bot.run(visitSchedule, 140 * DAY);
  const reset = bot.heldReset;
  if (!reset || !("discipline" in reset.choices)) throw new Error(`No earned Team founding in 140 days for ${seed}.`);
  return { state: bot.state, choices: reset.choices, elapsed: bot.totalMs };
}

class CareerPilot extends Bot {
  readonly milestones: Record<string, number> = {};
  readonly notes: string[] = [];
  readonly entryProblems: Record<string, number> = {};
  handoverCost: number | undefined;
  sponsorTour: OwnerTour | undefined;
  private previousTours = new Set<string>();

  constructor(state: GameState, elapsed: number, private strategy: Strategy) {
    super(state, "push", "dirt");
    this.totalMs = elapsed;
    this.markStage("founding");
  }

  private markStage(stage: string): void {
    this.milestones[stage] ??= this.totalMs / DAY;
  }

  protected override shouldStop(): boolean {
    return !!this.sponsorTour || super.shouldStop();
  }

  protected override queueOpenRaces(): boolean {
    return !ownerTourActive(this.state);
  }

  protected override decide(present: boolean): void {
    const game = this.state;
    const handover = game.era?.handover;
    if (handover?.type === "apprenticeship" && handover.completed >= APPRENTICE_JOBS) {
      this.markStage("handoverImpact");
      if (game.run.habitsKnown.includes(handover.routine)) this.markStage("habitAvailable");
    }
    if (handover?.type === "track_notes" && game.run.ladder[handover.venueId]?.includes("heat")) {
      this.markStage("handoverImpact");
      if (!game.run.races.some((race) => race.venueId === handover.venueId && race.event === "sprint")) this.markStage("sprintWaived");
    }
    if (ownerGate(game).ok) this.markStage("touringLicence");
    if (game.owner?.titles) this.markStage("firstTitle");
    const tour = game.owner?.tour;
    if (tour && tour.status !== "active" && !this.previousTours.has(tour.id)) {
      this.previousTours.add(tour.id);
      const score = tourScore(tour);
      this.notes.push(`Tour ${tour.charter} ${tour.status} at ${score.points} pt, ${score.cars} cars.`);
      if (tour.sponsor) this.sponsorTour = tour;
    }
    if (!this.shouldStop()) super.decide(present);
  }

  protected override manageCrew(): void {
    const game = this.state;
    const order = this.strategy === "workshop" ? ["wrench", "driver", "spotter", "hauler"] : ["driver", "spotter", "hauler", "wrench"];
    while (this.state.era!.crew.length < crewCap(this.state)) {
      const candidates = [...this.state.run.candidates].sort((a, b) => order.indexOf(CREW_BY_ID[a].role) - order.indexOf(CREW_BY_ID[b].role));
      if (!candidates.length || !this.act({ type: "hire", crewId: candidates[0] })) break;
    }
    for (const member of this.state.era!.crew) {
      const role = CREW_BY_ID[member.id].role;
      if (role === "driver" || role === "spotter") {
        if (member.assignment.type !== role) this.act({ type: "assignCrew", crewId: member.id, assignment: { type: role } });
      } else if (member.assignment.type === "queue" && member.morale < 25) {
        this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "rest" } });
      } else if (member.assignment.type === "rest" && member.morale >= 90) {
        this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "queue" } });
      }
    }
    const handover = game.era?.handover;
    if (handover?.type === "apprenticeship" && handover.completed >= APPRENTICE_JOBS && this.state.run.habitsKnown.includes(handover.routine)) {
      const mechanic = this.state.era!.crew.find((member) => CREW_BY_ID[member.id].role === "wrench" && !CREW_BY_ID[member.id].refuses.includes(handover.routine));
      if (mechanic && mechanic.assignment.type === "queue" && this.act({ type: "assignCrew", crewId: mechanic.id, assignment: { type: "habit", template: handover.routine } })) {
        this.markStage("habitAssigned");
      }
    }
  }

  protected override benchWork(): void {
    const game = this.state;
    const handover = game.era?.handover;
    const training = handover?.type === "apprenticeship" && handover.completed < APPRENTICE_JOBS;
    const routine: WorkshopRoutine = training ? handover.routine : "clean";
    if (training || (this.strategy === "workshop" && !handover)) {
      for (const part of [...game.run.inventory, ...game.run.driveway]) {
        const spec = { kind: routine, partUid: part.uid } satisfies JobSpec;
        if (!jobBlocker(this.state, spec) && this.act({ type: "enqueue", spec })) break;
      }
    }
    super.benchWork();
  }

  protected override buyMeta(): void {
    if (this.state.era?.handover) super.buyMeta();
  }

  protected override maybeReset(): void {
    const game = this.state;
    const era = game.era!;
    if (game.owner || (ownerGate(game).ok && this.milestones.handoverImpact !== undefined)) return;
    if (game.run.featureWins.county_fair === undefined) return;
    if (!era.handover) {
      const offers = crewHandoverOffers(game, era.discipline);
      const relevant = offers.filter((offer) => offer.type === strategies[this.strategy].handover);
      const choice = relevant.find((offer) => offer.type === "apprenticeship" && offer.routine === "clean")
        ?? relevant.find((offer) => offer.type === "track_notes" && offer.venueId === "dirt")
        ?? relevant[0];
      if (!choice || game.team.tp + teamAward(game) < HANDOVER_COST) return;
      this.markStage("offerEarned");
      const base = this.chooseScrap(nextTeamPerkSlots(game), 5, true, teamResetLegacyBudget(game));
      const before = game.team.tp + teamAward(game);
      const teamChoices: TeamChoices = { ...base, hardships: [], discipline: "dirt", organization: era.organization, teamName: era.teamName, colors: era.colors, handover: choice };
      if (!this.act({ type: "reset", layer: "team", choices: teamChoices })) throw new Error(`Earned handover refused for ${game.seed}.`);
      this.handoverCost = before - this.state.team.tp;
      this.markStage("handoverSelected");
      this.notes.push(`${choice.mentorId} left ${choice.type === "apprenticeship" ? choice.routine : choice.venueId} ${choice.type}.`);
      return;
    }
    const noInvite = game.run.featureWins.regional !== undefined && game.meta.records.regional === undefined;
    if (noInvite || (game.run.seasonMs > 42 * DAY && !ownerGate(game).ok)) {
      const base = this.chooseScrap(nextSeasonPerkSlots(game), nextSeasonTuneUpPoints(game), true, game.scrap.lp + scrapAward(game));
      if (!this.act({ type: "reset", layer: "scrap", choices: { ...base, hardships: [] } })) throw new Error(`Earned Scrap Reset refused for ${game.seed}.`);
    }
  }

  protected override race(present: boolean): void {
    const game = this.state;
    if (!ownerGate(game).ok || this.milestones.handoverImpact === undefined) {
      super.race(present);
      return;
    }
    if (!game.owner) {
      if (!game.run.venuesOpen.includes("state") || !game.run.ladder.state.includes("feature")) {
        super.race(present);
        return;
      }
      if (this.act({ type: "owner", move: { type: "found", charter: "privateer" } })) this.markStage("firstTour");
    } else if (game.owner.tour.status !== "active") {
      const sponsor = game.owner.titles ? strategies[this.strategy].sponsor : undefined;
      if (!sponsor || !sponsorshipBlocker(game, sponsor)) {
        if (this.act({ type: "owner", move: { type: "start", charter: "privateer", sponsor } }) && sponsor) this.markStage("sponsorSigned");
      } else {
        super.race(present);
        return;
      }
    }
    const tour = this.state.owner?.tour;
    if (!tour || currentTourEntry(this.state)) return;
    const stop = tourCalendar(tour)[tour.rounds.length];
    if (!stop) return;
    // Reliability-backed entries finish with a conservative pace; the winner contract
    // will still select the best legal car available for the current venue.
    const call: RaceCall = "nurse";
    for (const car of tourGarage(this.state, tour, call)) {
      if (this.act({ type: "owner", move: { type: "enter", vehicleUid: car.uid, call } })) return;
    }
    const key = `${stop.venueId}:${stop.event}`;
    this.entryProblems[key] = (this.entryProblems[key] ?? 0) + 1;
  }
}

const rows = [];
for (let i = firstSeed; i < firstSeed + seeds; i++) {
  const seed = `crew-career-${i}`;
  try {
    const entry = foundingCheckpoint(seed, schedule);
    writeFileSync(join(output, `${seed}-founding.json`), JSON.stringify(entry));
    for (const strategy of Object.keys(strategies) as Strategy[]) {
      const organization: TeamOrganization = strategies[strategy].organization;
      const start = must(entry.state, { type: "reset", layer: "team", choices: { ...entry.choices, organization, hardships: [] } });
      const pilot = new CareerPilot(start, entry.elapsed, strategy);
      pilot.run(schedule, entry.elapsed + (scheduleId === "daily" ? 190 : 95) * DAY);
      const state = pilot.state;
      if (!decodeGameState(state)) throw new Error(`The ${strategy} run produced a save that cannot reload.`);
      const cash = pilot.sponsorTour && tourCash(pilot.sponsorTour);
      rows.push({
        seed, strategy, schedule: scheduleId, ...pilot.milestones,
        elapsed: pilot.totalMs / DAY, teamResets: state.team.resets, handover: state.era?.handover,
        handoverCost: pilot.handoverCost, crew: state.era?.crew.map(({ id, jobsDone, service }) => ({ id, jobsDone, service })),
        lastTour: state.owner?.tour, sponsor: pilot.sponsorTour && sponsorProgress(pilot.sponsorTour), cash,
        notes: pilot.notes, entryProblems: pilot.entryProblems, currentState: {
          builds: state.run.vehicles.map((vehicle) => vehicle.vehicleId), venues: state.run.venuesOpen, wins: state.run.featureWins,
          season: state.meta.seasonsPlayed + 1, cash: state.run.cash, lastRaces: state.run.races.slice(-5).map(({ venueId, event, position }) => ({ venueId, event, position })),
        },
      });
      console.log(`${seed} ${scheduleId} ${strategy} · ${pilot.totalMs / DAY} days · ${Object.keys(pilot.milestones).join(", ")}`);
    }
  } catch (error) {
    rows.push({ seed, schedule: scheduleId, error: String(error) });
    console.error(String(error));
  }
  writeFileSync(join(output, "results.json"), JSON.stringify(rows, null, 2));
}
