/**
 * Earn team and sponsor checkpoints through the same actions as the browser.
 * npx tsx scripts/crew-careers.ts [seeds] [mixed|daily] [output-dir] [first-seed] [entry-plan|local-sponsors]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGame, must, type TeamChoices } from "../src/core";
import { apply, counterBlocker } from "../src/core/actions";
import { CREW_BY_ID, type TeamOrganization } from "../src/core/content/team";
import { getVehicle } from "../src/core/content/vehicles";
import { crewCanApprentice, crewHandoverOffers, APPRENTICE_JOBS, HANDOVER_COST, type WorkshopRoutine } from "../src/core/crewLegacy";
import { crewCap, nextSeasonPerkSlots, nextSeasonTuneUpPoints, nextTeamPerkSlots, scrapAward, teamAward, teamResetLegacyBudget } from "../src/core/layers";
import { currentTourEntry, nominatedRookie, ownerGate, ownerTourActive, rookieSponsorCars, sponsorProgress, sponsorshipBlocker, tourCalendar, tourCash, tourGarage, tourScore, type OwnerTour } from "../src/core/ownership";
import { jobBlocker } from "../src/core/jobs";
import { reservedPartUids } from "../src/core/garage";
import { partScoreAt, winChance } from "../src/core/race";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import { teamCheckpoint } from "../src/core/sim/teamCheckpoint";
import type { GameState, JobSpec, RaceCall } from "../src/core/types";
import { decodeGameState } from "../src/game/save";

const DAY = 86_400_000;
const seeds = Number(process.argv[2] ?? 8);
const scheduleId = process.argv[3] ?? "mixed";
const schedule = SCHEDULES[scheduleId];
const output = process.argv[4] ?? `test-results/crew-careers-${scheduleId}`;
const firstSeed = Number(process.argv[5] ?? 0);
const planSponsoredEntries = process.argv[6] === "entry-plan";
const localSponsorship = process.argv[6] === "local-sponsors";
const strategies = {
  workshop: { organization: "collective", handover: "apprenticeship", sponsor: "reliable" },
  racing: { organization: "independent", handover: "track_notes", sponsor: "front_row" },
} as const;
type Strategy = keyof typeof strategies;

if (!schedule || !Number.isInteger(seeds) || seeds < 1 || !Number.isInteger(firstSeed) || firstSeed < 0) {
  throw new Error("Choose a supported schedule and valid seed range.");
}
mkdirSync(output, { recursive: true });

class CareerPilot extends Bot {
  readonly milestones: Record<string, number> = {};
  readonly notes: string[] = [];
  readonly entryProblems: Record<string, number> = {};
  handoverCost: number | undefined;
  sponsorTour: OwnerTour | undefined;
  cancelledContract?: { feeOnWithdrawal: number; scrapStatus: string; teamStatus: string; sponsorPayout: number };
  sponsoredManualEntries = 0;
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
      if (game.run.jobs.some((job) => job.looping && job.spec.kind === handover.routine && job.lane.startsWith("crew:"))) this.markStage("habitWorking");
    }
    if (handover?.type === "track_notes" && game.run.ladder[handover.venueId]?.includes("heat")) {
      this.markStage("handoverImpact");
      const first = game.run.races.find((race) => race.venueId === handover.venueId);
      if (!first) this.markStage("sprintWaived");
      if (first?.event === "heat") this.markStage("heatRacedFirst");
    }
    if (ownerGate(game).ok) this.markStage("touringLicence");
    if (game.owner?.titles) this.markStage("firstTitle");
    const tour = game.owner?.tour;
    if (tour && tour.status !== "active" && !this.previousTours.has(tour.id)) {
      this.previousTours.add(tour.id);
      const score = tourScore(tour);
      this.notes.push(`Tour ${tour.charter} ${tour.status} at ${score.points} pt, ${score.cars} cars.`);
      if (tour.sponsor) {
        this.sponsorTour = tour;
        this.markStage("sponsorSettled");
        if (sponsorProgress(tour)?.payout) this.markStage("sponsorPaid");
      }
    }
    if (!this.shouldStop()) super.decide(present);
  }

  protected override manageCrew(): void {
    const game = this.state;
    const handover = game.era?.handover;
    const training = handover?.type === "apprenticeship" && handover.completed < APPRENTICE_JOBS ? handover : undefined;
    const prepared = (id: string) => !!training && crewCanApprentice(game, id, training.routine);
    const order = this.strategy === "workshop" ? ["wrench", "driver", "spotter", "hauler"] : ["driver", "spotter", "hauler", "wrench"];
    while (this.state.era!.crew.length < crewCap(this.state)) {
      const candidates = [...this.state.run.candidates].sort((a, b) =>
        Number(prepared(b)) - Number(prepared(a)) || order.indexOf(CREW_BY_ID[a].role) - order.indexOf(CREW_BY_ID[b].role),
      );
      if (!candidates.length || !this.act({ type: "hire", crewId: candidates[0] })) break;
    }
    const apprentice = this.state.era!.crew.find((member) => prepared(member.id));
    for (const member of this.state.era!.crew) {
      const role = CREW_BY_ID[member.id].role;
      if (member.id === apprentice?.id && member.morale >= 25) {
        if (member.assignment.type !== "queue") this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "queue" } });
      } else if (role === "driver" || role === "spotter") {
        if (member.assignment.type !== role) this.act({ type: "assignCrew", crewId: member.id, assignment: { type: role } });
      } else if (member.assignment.type === "queue" && member.morale < 25) {
        this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "rest" } });
      } else if (member.assignment.type === "rest" && member.morale >= 90) {
        this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "queue" } });
      }
    }
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

  private commissionRookie(): void {
    const game = this.state;
    if ([...game.run.queue, ...game.run.jobs.map((job) => job.spec)].some((job) => job.kind === "assemble" && job.vehicleId === "go_kart")) return;
    const reserved = reservedPartUids(game);
    const partUids: Record<string, string> = {};
    for (const slot of getVehicle("go_kart").slots) {
      const score = (part: { partId: string; condition: 2 | 3 | 4 }) => partScoreAt(part, "dirt", "county_fair", slot.slot);
      const current = this.state;
      const stocked = slot.accepts.filter((partId) => !counterBlocker(current, partId))
        .map((partId) => ({ partId, condition: 3 as const })).sort((a, b) => score(b) - score(a))[0];
      const loose = current.run.inventory.filter((part) => slot.accepts.includes(part.partId) && part.condition >= 2 && !reserved.has(part.uid))
        .sort((a, b) => partScoreAt(b, "dirt", "county_fair", slot.slot) - partScoreAt(a, "dirt", "county_fair", slot.slot))[0];
      if (stocked && (!loose || score(stocked) > partScoreAt(loose, "dirt", "county_fair", slot.slot) + 1)) {
        if (this.act({ type: "buyPart", partId: stocked.partId })) {
          const bought = this.state.run.inventory.findLast((part) => part.partId === stocked.partId && !reserved.has(part.uid));
          if (bought) { partUids[slot.slot] = bought.uid; reserved.add(bought.uid); continue; }
        }
      }
      if (loose) { partUids[slot.slot] = loose.uid; reserved.add(loose.uid); }
      else if (slot.required) return;
    }
    if (this.act({ type: "enqueue", spec: { kind: "assemble", vehicleId: "go_kart", partUids, name: "Development Kart" } })) {
      this.markStage("rookieCommissioned");
    }
  }

  /** A separate counterfactual from an actual signed tour. It does not alter the main branch. */
  private checkWithdrawal(vehicleUid: string, call: RaceCall): void {
    if (this.cancelledContract || this.state.owner?.tour.rounds.length !== 0 || this.state.run.featureWins.county_fair === undefined) return;
    let alternate = this.state;
    for (const member of alternate.era!.crew) {
      if (member.assignment.type !== "queue") continue;
      alternate = apply(alternate, { type: "assignCrew", crewId: member.id, assignment: { type: "rest" } }).state;
    }
    if (!alternate.run.jobs.some((job) => job.lane === "hands")) {
      const placeId = alternate.run.placesOpen.includes("long_haul") ? "long_haul" : "curb";
      alternate = apply(alternate, { type: "enqueue", spec: { kind: "haul", placeId } }).state;
    }
    const booked = apply(alternate, { type: "owner", move: { type: "enter", vehicleUid, call } });
    if (booked.error || currentTourEntry(booked.state) !== "queued") return;
    const cash = booked.state.run.cash;
    const withdrawn = must(booked.state, { type: "owner", move: { type: "withdraw" } });
    const resetChoices = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };
    const scrap = must(withdrawn, { type: "reset", layer: "scrap", choices: resetChoices });
    const team = must(withdrawn, { type: "reset", layer: "team", choices: {
      ...resetChoices, discipline: "dirt", teamName: withdrawn.era!.teamName, colors: withdrawn.era!.colors,
    } });
    this.cancelledContract = {
      feeOnWithdrawal: cash - withdrawn.run.cash,
      scrapStatus: scrap.owner!.tour.status, teamStatus: team.owner!.tour.status,
      sponsorPayout: (sponsorProgress(scrap.owner!.tour)?.payout ?? 0) + (sponsorProgress(team.owner!.tour)?.payout ?? 0),
    };
  }

  protected override race(present: boolean): void {
    const game = this.state;
    const notes = game.era?.handover;
    if (notes?.type === "track_notes" && this.milestones.heatRacedFirst === undefined
      && game.run.ladder[notes.venueId]?.includes("heat") && !game.run.races.some((race) => race.venueId === notes.venueId)) {
      const booked = [...game.run.queue, ...game.run.jobs.map((job) => job.spec)].some((job) => job.kind === "race" && job.venueId === notes.venueId);
      if (booked) return;
      for (const vehicle of [...game.run.vehicles].reverse()) {
        const spec = { kind: "race", vehicleUid: vehicle.uid, venueId: notes.venueId, event: "heat", call: "nurse" } as const;
        if (!jobBlocker(game, spec, true) && this.act({ type: "enqueue", spec })) return;
      }
    }
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
      const sponsor = game.owner.titles
        ? localSponsorship ? this.strategy === "workshop" ? "rookie_kart" : "owner_driver" : strategies[this.strategy].sponsor
        : undefined;
      const rookie = sponsor === "rookie_kart" ? rookieSponsorCars(game)[0] : undefined;
      if (sponsor === "rookie_kart" && !rookie) {
        this.commissionRookie();
        return;
      }
      if (!sponsor || !sponsorshipBlocker(game, sponsor, "privateer", undefined, rookie?.uid)) {
        if (this.act({ type: "owner", move: { type: "start", charter: "privateer", sponsor, sponsorVehicleUid: rookie?.uid } }) && sponsor) this.markStage("sponsorSigned");
      } else {
        super.race(present);
        return;
      }
    }
    const tour = this.state.owner?.tour;
    if (!tour) return;
    if (planSponsoredEntries && tour.sponsor) {
      if (tour.entryPlan?.enabled) return;
      const stock = this.state.run.vehicles.find((car) => car.vehicleId === "street_stock");
      const fair = tourGarage(this.state, tour, "nurse")[0];
      const lead = stock ?? fair;
      if (lead && this.act({ type: "owner", move: { type: "plan_entries", settings: {
        leadUid: lead.uid, reserveUid: fair?.uid !== lead.uid ? fair?.uid : undefined, call: "nurse", cashFloor: 1000,
      } } })) this.markStage("entryPlanSaved");
      return;
    }
    if (currentTourEntry(this.state)) return;
    const stop = tourCalendar(tour)[tour.rounds.length];
    if (!stop) return;
    // A win sponsor only pushes when the extra gamble makes an appreciable difference.
    const nominee = nominatedRookie(tour);
    for (const car of tourGarage(this.state, tour, "nurse").filter((candidate) => !nominee || candidate.uid === nominee)) {
      const pushWorthwhile = tour.sponsor === "front_row" && winChance(this.state, car, stop.venueId, stop.event, "push")
        > winChance(this.state, car, stop.venueId, stop.event, "nurse") + 0.1;
      const call: RaceCall = nominee || pushWorthwhile ? "push" : "nurse";
      if (localSponsorship && tour.sponsor) this.checkWithdrawal(car.uid, call);
      if (this.act({ type: "owner", move: { type: "enter", vehicleUid: car.uid, call } })) {
        if (tour.sponsor) this.sponsoredManualEntries++;
        return;
      }
    }
    const key = `${stop.venueId}:${stop.event}`;
    this.entryProblems[key] = (this.entryProblems[key] ?? 0) + 1;
  }
}

const rows = [];
for (let i = firstSeed; i < firstSeed + seeds; i++) {
  const seed = `crew-career-${i}`;
  try {
    const entry = teamCheckpoint(createGame(seed), schedule, 240 * DAY);
    writeFileSync(join(output, `${seed}-founding.json`), JSON.stringify(entry));
    for (const strategy of Object.keys(strategies) as Strategy[]) {
      const organization: TeamOrganization = strategies[strategy].organization;
      const start = must(entry.state, { type: "reset", layer: "team", choices: { ...entry.choices, organization, hardships: [] } });
      const pilot = new CareerPilot(start, entry.elapsed, strategy);
      pilot.run(schedule, entry.elapsed + (scheduleId === "daily" ? 190 : 95) * DAY);
      const state = pilot.state;
      if (!decodeGameState(state)) throw new Error(`The ${strategy} run produced a save that cannot reload.`);
      const impact = strategy === "workshop" ? pilot.milestones.habitWorking : pilot.milestones.heatRacedFirst;
      const plannedRounds = pilot.sponsorTour?.rounds.filter((finish) => finish?.planned).length ?? 0;
      const passed = state.team.resets >= 2 && impact !== undefined && pilot.milestones.sponsorSettled !== undefined
        && (!planSponsoredEntries || plannedRounds === pilot.sponsorTour?.rounds.length)
        && (!localSponsorship || (pilot.cancelledContract?.scrapStatus === "retired" && pilot.cancelledContract.teamStatus === "retired"
          && pilot.cancelledContract.feeOnWithdrawal === 0 && pilot.cancelledContract.sponsorPayout === 0));
      if (!passed) process.exitCode = 1;
      const cash = pilot.sponsorTour && tourCash(pilot.sponsorTour);
      rows.push({
        seed, strategy, schedule: scheduleId, acceptance: passed, ...pilot.milestones,
        elapsed: pilot.totalMs / DAY, teamResets: state.team.resets, handover: state.era?.handover,
        handoverCost: pilot.handoverCost, crew: state.era?.crew.map(({ id, jobsDone, service }) => ({ id, jobsDone, service })),
        lastTour: state.owner?.tour, sponsor: pilot.sponsorTour && sponsorProgress(pilot.sponsorTour), cash,
        sponsoredManualEntries: pilot.sponsoredManualEntries, plannedRounds,
        cancelledContract: pilot.cancelledContract,
        notes: pilot.notes, entryProblems: pilot.entryProblems, currentState: {
          builds: state.run.vehicles.map((vehicle) => vehicle.vehicleId), venues: state.run.venuesOpen, wins: state.run.featureWins,
          season: state.meta.seasonsPlayed + 1, cash: state.run.cash, lastRaces: state.run.races.slice(-5).map(({ venueId, event, position }) => ({ venueId, event, position })),
        },
      });
      console.log(`${seed} ${scheduleId} ${strategy} · ${pilot.totalMs / DAY} days · ${Object.keys(pilot.milestones).join(", ")}`);
    }
  } catch (error) {
    process.exitCode = 1;
    rows.push({ seed, schedule: scheduleId, error: String(error) });
    console.error(String(error));
  }
  writeFileSync(join(output, "results.json"), JSON.stringify(rows, null, 2));
}
