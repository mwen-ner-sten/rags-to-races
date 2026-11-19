/** npx tsx scripts/longitudinal-careers.ts [race|service] [count] [output] [first-seed] [service-checkpoints] */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { apply, createGame, must, type Action, type ScrapChoices, type TeamChoices } from "../src/core";
import { careerOpportunities } from "../src/core/careerAdvice";
import { countyPassport, HOME_COUNTIES, homeCounty } from "../src/core/counties";
import { disciplineBlocker } from "../src/core/content/events";
import { isSeasonChallenge } from "../src/core/content/modifiers";
import { currentTourEntry, ownerGate, ownerTourActive, tourGarage } from "../src/core/ownership";
import { crewHandoverOffers, HANDOVER_COST } from "../src/core/crewLegacy";
import { canOpenPlace } from "../src/core/knowhowEngine";
import { LAYERS, nextSeasonPerkSlots, nextSeasonTuneUpPoints, nextTeamPerkSlots, teamAward, teamResetLegacyBudget } from "../src/core/layers";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import { teamCheckpoint } from "../src/core/sim/teamCheckpoint";
import { initialConfig } from "../src/core/state";
import type { DisciplineId, GameState, HomeCounty } from "../src/core/types";
import { decodeSave } from "../src/game/save";
import { setExperimentalCareers } from "../src/core/features";

// These routes exercise the experimental side careers, which are off by default.
setExperimentalCareers(true);

const DAY = 86_400_000;
const origin = process.argv[2] ?? "race";
const count = Number(process.argv[3] ?? 4);
const output = process.argv[4] ?? `test-results/longitudinal-${origin}`;
const firstSeed = Number(process.argv[5] ?? 0);
const serviceDirectory = process.argv[6] ?? "test-results/longitudinal-service-founders";
const cycles = 12;
const disciplineOrder = ["dirt", "drag", "rally"] as const;
const objectives = ["parts_with_a_past", "penny_pincher", "clean_sweep", "hot_lap", "homebuilt_relay", null] as const;
const conditions = [[], ["hand_tools"], [], ["rust_everything"], [], ["short_season"]];
const counties = ["river", "quarry", "home"] as const;
if ((origin !== "race" && origin !== "service") || !Number.isInteger(count) || count < 1 || !Number.isInteger(firstSeed) || firstSeed < 0) {
  throw new Error("Choose race or service and a valid seed range.");
}
mkdirSync(output, { recursive: true });

function checkBalances(game: GameState): void {
  const amounts = [game.run.cash, game.run.rep, game.scrap.lp, game.team.tp, ...Object.values(game.run.materials)];
  assert(amounts.every((amount) => Number.isFinite(amount) && amount >= 0), `Negative or non-finite garage balance in ${game.seed}`);
}

function copyThroughSave(game: GameState): { game: GameState; bytes: number } {
  const json = JSON.stringify({ game, savedAt: 1 });
  // Same JSON envelope and Base64 boundary as browser export/import.
  const imported = decodeSave(Buffer.from(Buffer.from(json).toString("base64"), "base64").toString("utf8"));
  assert(imported, `Save decoder rejected Season ${game.meta.seasonsPlayed + 1} of ${game.seed}`);
  assert.equal(imported.savedAt, 1);
  const fresh = imported.game;
  const parts = [...fresh.run.inventory, ...fresh.run.driveway, ...fresh.run.vehicles.flatMap((vehicle) => Object.values(vehicle.parts).flatMap((part) => part ? [part] : []))];
  assert.equal(new Set(parts.map((part) => part.uid)).size, parts.length, "Duplicate physical part UID");
  const vehicles = fresh.run.vehicles.map((vehicle) => vehicle.uid);
  assert.equal(new Set(vehicles).size, vehicles.length, "Duplicate live vehicle UID");
  checkBalances(fresh);
  return { game: fresh, bytes: Buffer.byteLength(json) };
}

function checkGrowth(before: GameState, after: GameState, layer: "team" | "scrap") {
  assert.equal(after.meta.seasonsPlayed, before.meta.seasonsPlayed + 1);
  assert.equal(after.meta.seasonLog?.at(-1)?.endedBy, layer);
  assert.equal(after.meta.seasonLog?.at(-1)?.season, after.meta.seasonsPlayed);
  assert(after.uid >= before.uid);
  assert(after.scrap.lifetimeLp >= before.scrap.lifetimeLp);
  assert(after.team.lifetimeTp >= before.team.lifetimeTp);
  assert(after.meta.totalTeamResets >= before.meta.totalTeamResets);
  assert((after.owner?.titles ?? 0) >= (before.owner?.titles ?? 0));
  for (const [venue, time] of Object.entries(before.meta.records)) assert(after.meta.records[venue] <= time);
  for (const [perk, ranks] of Object.entries(before.meta.perks)) assert(after.meta.perks[perk] >= ranks);
  assert(after.meta.seasonLog!.every((row, i, all) => !i || row.season === all[i - 1].season + 1), "Nonconsecutive career log");
}

function initialAccount(seed: number): { game: GameState; days: number } {
  if (origin === "service") {
    const saved = decodeSave(readFileSync(join(serviceDirectory, `service-charter-${seed}.json`), "utf8"));
    assert(saved?.game && !saved.game.meta.stateWonEver && saved.game.run.races.length === 0 && !saved.game.era, "Expected genuinely no-race service founder");
    const days = ((saved.game.meta.seasonLog ?? []).reduce((sum, entry) => sum + entry.durationMs, 0) + saved.game.run.seasonMs) / DAY;
    const team = must(saved.game, { type: "reset", layer: "team", choices: {
      ...initialConfig(), discipline: "dirt", organization: "collective", teamName: "Service Union", colors: ["#271", "#eee"],
    } });
    return { game: copyThroughSave(team).game, days };
  }
  const entry = teamCheckpoint(createGame(`long-race-${seed}`));
  const team = must(entry.state, { type: "reset", layer: "team", choices: { ...entry.choices, hardships: [], organization: "independent" } });
  return { game: copyThroughSave(team).game, days: entry.elapsed / DAY };
}

class LongRunPilot extends Bot {
  readonly checkpoints: Record<string, unknown>[] = [];
  mature?: GameState;
  private ownerOpenedAt?: number;
  private regionalStages = 0;
  private lastRegionalBooking?: number;
  constructor(game: GameState, days: number) {
    super(game, "push", "dirt");
    this.totalMs = days * DAY;
  }

  protected override shouldStop(): boolean { return this.checkpoints.length >= cycles; }

  protected override queueOpenRaces(): boolean { return !ownerTourActive(this.state); }

  protected override act(action: Action): boolean {
    const ok = super.act(action);
    if (ok) checkBalances(this.state);
    return ok;
  }

  protected override decide(present: boolean): void {
    if (this.shouldStop()) return;
    const source = HOME_COUNTIES[homeCounty(this.state)].source;
    if (source && !canOpenPlace(this.state, `place:${source}`)) this.act({ type: "openPlace", knowhowId: `place:${source}` });
    if (source && this.state.run.placesOpen.includes(source) && this.lastRegionalBooking !== this.state.meta.seasonsPlayed) {
      if (this.act({ type: "enqueue", spec: { kind: "haul", placeId: source } })) {
        this.lastRegionalBooking = this.state.meta.seasonsPlayed;
        this.regionalStages++;
      }
    }
    super.decide(present);
  }

  protected override maybeReset(): void {
    if (this.shouldStop()) return;
    const game = this.state;
    if (!LAYERS.scrap.gate(game).ok) return;
    const index = this.checkpoints.length;
    const earlyTour = index < 2 && !game.owner;
    const firstRegional = game.run.featureWins.regional !== undefined && game.meta.records.regional === undefined;
    if (earlyTour && !firstRegional && game.run.seasonMs < 15 * DAY) return;
    if (ownerGate(game).ok && !game.owner && this.ownerOpenedAt === undefined) return;
    if (ownerTourActive(game) && this.ownerOpenedAt !== undefined && this.totalMs - this.ownerOpenedAt < 5 * DAY) return;
    const layer = index % 2 === 0 ? "scrap" : "team";
    const goingTeam = layer === "team";
    const era = game.era!;
    const nextDiscipline: DisciplineId = goingTeam ? disciplineOrder[(disciplineOrder.indexOf(era.discipline) + 1) % disciplineOrder.length] : era.discipline;
    assert.equal(disciplineBlocker(game, nextDiscipline), null);
    const attemptedObjective = objectives[index % objectives.length];
    const objective = attemptedObjective && (isSeasonChallenge(attemptedObjective) || !game.meta.daresCompleted.includes(attemptedObjective))
      && (attemptedObjective !== "homebuilt_relay" || nextDiscipline === "dirt") ? attemptedObjective : null;
    const hardships = conditions[index % conditions.length];
    const slots = goingTeam ? nextTeamPerkSlots(game) : nextSeasonPerkSlots(game);
    const budget = goingTeam ? teamResetLegacyBudget(game) : game.scrap.lp + LAYERS.scrap.award(game);
    const setup = { ...this.chooseScrap(slots, goingTeam ? 5 : nextSeasonTuneUpPoints(game), true, budget), dare: objective, hardships };
    const county: HomeCounty | undefined = !goingTeam && countyPassport(game).earned ? counties[Math.floor(index / 2) % counties.length] : undefined;
    const handover = goingTeam && game.team.tp + teamAward(game) >= HANDOVER_COST
      ? crewHandoverOffers(game, nextDiscipline).find((offer) => offer.type === "apprenticeship") : undefined;
    const team: TeamChoices = { ...setup, discipline: nextDiscipline, organization: era.organization === "collective" ? "independent" : "collective", teamName: era.teamName, colors: era.colors, handover };
    const scrap: ScrapChoices = { ...setup, homeCounty: county };
    const before = copyThroughSave(game);
    this.mature = before.game;
    const action = { type: "reset", layer, choices: goingTeam ? team : scrap } as const;
    let result = apply(before.game, action);
    const restriction = result.error;
    if (restriction) result = apply(before.game, { ...action, choices: { ...action.choices, hardships: [], dare: null } });
    assert(!result.error, `${game.seed} reset ${index + 1}: ${result.error}`);
    const after = copyThroughSave(result.state);
    checkGrowth(before.game, after.game, layer);
    this.state = after.game;
    this.checkpoints.push({
      index: index + 1, layer, nextDisc: nextDiscipline, nextCounty: homeCounty(after.game), nextOrganization: after.game.era?.organization,
      objective: after.game.config.dare, hardships: after.game.config.hardships, restriction, handover: after.game.era?.handover?.type,
      won: Object.keys(before.game.run.featureWins), qualified: Object.keys(before.game.run.regularityFeatures ?? {}),
      objectiveCompleted: before.game.run.challenge.completedAt !== undefined || !!before.game.config.dare && before.game.meta.daresCompleted.includes(before.game.config.dare),
      handToolsQueueJobs: before.game.config.hardships.includes("hand_tools")
        ? before.game.era!.crew.reduce((jobs, member) => jobs + member.jobsDone
          - Object.values(member.service?.venues ?? {}).flatMap((venues) => Object.values(venues)).reduce((sum, starts) => sum + starts, 0), 0)
        : undefined,
      day: this.totalMs / DAY, bytesBefore: before.bytes, bytesAfter: after.bytes, cash: before.game.run.cash,
      materials: before.game.run.materials, lp: after.game.scrap.lp, tp: after.game.team.tp, regionalBookings: this.regionalStages,
      regionalTrips: (before.game.meta.codex.places.floodplain ?? 0) + (before.game.meta.codex.places.quarry_breakers ?? 0),
      ownerTitles: after.game.owner?.titles ?? 0,
    });
  }

  protected override race(present: boolean) {
    if (this.shouldStop()) return;
    if (!this.state.owner && ownerGate(this.state).ok && this.state.run.featureWins.state !== undefined) {
      if (this.act({ type: "owner", move: { type: "found", charter: "privateer" } })) this.ownerOpenedAt = this.totalMs;
    }
    if (ownerTourActive(this.state)) {
      if (currentTourEntry(this.state)) return;
      const tour = this.state.owner!.tour;
      for (const car of tourGarage(this.state, tour, "nurse")) {
        if (this.act({ type: "owner", move: { type: "enter", vehicleUid: car.uid, call: "nurse" } })) return;
      }
    }
    super.race(present);
  }
}

function interactiveCost(game: GameState) {
  const decodeMs: number[] = [];
  const interactionMs: number[] = [];
  for (let sample = 0; sample < 21; sample++) {
    const start = performance.now();
    const reloaded = copyThroughSave(game).game;
    const importedAt = performance.now();
    const next = must(reloaded, { type: "advance", ms: 1000 });
    careerOpportunities(next);
    decodeMs.push(importedAt - start);
    interactionMs.push(performance.now() - importedAt);
  }
  return { saveRoundTripMs: decodeMs.sort((a, b) => a - b)[10], tickAndAdviceMs: interactionMs.sort((a, b) => a - b)[10] };
}

const results = [];
for (let seed = firstSeed; seed < firstSeed + count; seed++) {
  try {
    const entry = initialAccount(seed);
    const pilot = new LongRunPilot(entry.game, entry.days);
    const firstBytes = copyThroughSave(entry.game).bytes;
    pilot.run(SCHEDULES.mixed, (entry.days + 230) * DAY);
    const end = copyThroughSave(pilot.state);
    const complete = pilot.checkpoints.length === cycles;
    if (!complete) process.exitCode = 1;
    results.push({ seed, origin, complete, days: pilot.totalMs / DAY, firstBytes, finalBytes: end.bytes,
      checkpoints: pilot.checkpoints, owner: !!end.game.owner, titles: end.game.owner?.titles ?? 0,
      matureCost: pilot.mature && interactiveCost(pilot.mature),
      ...interactiveCost(end.game), last: { discipline: end.game.era?.discipline, county: homeCounty(end.game),
        venues: end.game.run.venuesOpen, wins: end.game.run.featureWins, builds: end.game.run.vehicles.map((car) => car.vehicleId),
        count: end.game.meta.seasonsPlayed, cash: end.game.run.cash } });
    console.log(`${origin} seed ${seed}: ${pilot.checkpoints.length}/${cycles} resets, ${pilot.state.owner?.titles ?? 0} titles, ${end.bytes} bytes`);
  } catch (error) {
    process.exitCode = 1;
    results.push({ seed, origin, error: String(error) });
    console.error(String(error));
  }
  writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2));
}
