/** Earn both Parts With a Past clears and deliver the real baton through normal player actions. */
import { readFileSync, writeFileSync } from "node:fs";
import { createGame, must } from "../src/core";
import { challengeVehicleFit } from "../src/core/challenges";
import { BATON_PART, batonPartOn, otherCounty } from "../src/core/countyBaton";
import { HOME_COUNTIES, countyPassport } from "../src/core/counties";
import { getPart } from "../src/core/content/parts";
import { getVehicle } from "../src/core/content/vehicles";
import { reservedPartUids, vehicleBusy } from "../src/core/garage";
import { eligibleHistory } from "../src/core/heritage";
import { jobBlocker } from "../src/core/jobs";
import { WORKS_FAMILIES, worksSignBlocker } from "../src/core/manufacturer";
import { hauledSource } from "../src/core/provenance";
import { winChance } from "../src/core/race";
import { salvageCarryCandidates } from "../src/core/salvageCarry";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import type { GameState, NeighborCounty, PartInstance, Vehicle } from "../src/core/types";
import { decodeGameState } from "../src/game/save";

const DAY = 86_400_000;
const day = (time: number) => Number((time / DAY).toFixed(2));
const localFind = { curb: "fuel_gas_can", yards: "exhaust_rusted", junkyard: "drive_chain" } as const;

class BatonPilot extends Bot {
  constructor(state: GameState) {
    super(state);
    this.holdAt = "scrap";
  }

  private isPast(): boolean {
    return this.state.config.dare === "parts_with_a_past";
  }

  private pieces() {
    return [...this.state.run.inventory, ...this.state.run.driveway, ...this.state.run.vehicles.flatMap((car) => Object.values(car.parts).filter((part) => part !== undefined))];
  }

  private isBaton(part: PartInstance): boolean {
    const baton = this.state.run.countyBaton;
    if (!baton) return false;
    return baton.leg === "deliver" ? baton.qualified.uid === part.uid
      : part.partId === BATON_PART[baton.from] && part.provenance?.county === baton.from;
  }

  protected override decide(present: boolean): void {
    const progress = this.state.run.countyBaton;
    if (progress?.leg === "qualify" && progress.qualified) {
      for (const car of this.state.run.vehicles) {
        if (vehicleBusy(this.state, car.uid)) continue;
        const slot = Object.keys(car.parts).find((slot) => car.parts[slot]?.uid === progress.qualified!.uid);
        if (slot) this.act({ type: "uninstall", vehicleUid: car.uid, slot });
      }
      const proof = this.pieces().find((part) => part.uid === progress.qualified!.uid);
      if (proof && !proof.protected && !this.state.run.vehicles.some((car) => Object.values(car.parts).some((part) => part?.uid === proof.uid))) {
        this.act({ type: "protectPart", partUid: proof.uid, keep: true });
      }
    }
    const protectedKind = new Set(this.pieces().filter((part) => part.protected).map((part) => part.partId));
    for (const part of this.state.run.inventory.slice().sort((a, b) => b.condition - a.condition)) {
      const source = hauledSource(part);
      const proof = this.isBaton(part) || (this.isPast() && ((source === "curb" && part.partId === localFind.curb)
        || (source === "yards" && part.partId.startsWith("exhaust_")) || (source === "junkyard" && part.partId === localFind.junkyard)));
      if (!proof || protectedKind.has(part.partId)) continue;
      protectedKind.add(part.partId);
      this.act({ type: "protectPart", partUid: part.uid, keep: true });
    }
    super.decide(present);
  }

  protected override haulSpec(longOk: boolean) {
    const state = this.state;
    const baton = state.run.countyBaton;
    if (baton?.leg === "qualify" && !baton.qualified && !this.pieces().some((part) => this.isBaton(part))) {
      const spec = { kind: "haul", placeId: HOME_COUNTIES[baton.from].source, focus: state.run.learned.includes("tech:scouting") ? getPart(BATON_PART[baton.from]).category : undefined } as const;
      if (!jobBlocker(state, spec)) return spec;
    }
    if (this.isPast() && state.run.challenge.completedAt === undefined) {
      for (const [placeId, partId] of Object.entries(localFind)) {
        const spec = { kind: "haul", placeId, focus: state.run.learned.includes("tech:scouting") ? getPart(partId).category : undefined } as const;
        if (!this.pieces().some((part) => hauledSource(part) === placeId && (part.partId === partId || (placeId === "yards" && part.partId === "exhaust_glasspack"))) && !jobBlocker(state, spec)) return spec;
      }
    }
    return super.haulSpec(longOk);
  }

  protected override partForVehicle(part: PartInstance, vehicleId: string): boolean {
    const progress = this.state.run.countyBaton;
    if (progress?.leg === "qualify" && progress.qualified?.uid === part.uid) return false;
    if (this.isBaton(part)) return vehicleId === (this.state.run.countyBaton?.leg === "deliver" ? "beater_car" : "go_kart");
    if (this.isPast() && part.protected) return vehicleId === "go_kart";
    return super.partForVehicle(part, vehicleId);
  }

  private fitVehicle(car: Vehicle): void {
    if (vehicleBusy(this.state, car.uid)) return;
    const reserved = reservedPartUids(this.state);
    for (const slot of getVehicle(car.vehicleId).slots) {
      if (slot.slot === "frame" && car.vehicleId === "go_kart" && !car.parts.frame
        && !this.state.run.inventory.some((part) => part.partId === "frame_kart" && part.condition >= 2)) {
        const mower = this.state.run.vehicles.find((car) => car.vehicleId === "riding_mower" && car.parts.frame?.partId === "frame_kart" && !vehicleBusy(this.state, car.uid));
        if (mower) this.act({ type: "uninstall", vehicleUid: mower.uid, slot: "frame" });
      }
      let target = this.state.run.inventory.find((part) => !reserved.has(part.uid) && part.condition >= 2 && slot.accepts.includes(part.partId)
        && (this.isBaton(part) || (!car.parts[slot.slot] && slot.required) || (this.isPast() && car.vehicleId === "go_kart" && part.protected)));
      if (!target && this.isPast() && car.vehicleId === "beater_car") {
        const ready = this.state.run.vehicles.find((entry) => entry.uid === car.uid)!;
        const sources = Object.values(ready.parts).flatMap((part) => part && hauledSource(part) ? [hauledSource(part)] : []);
        const fitted = ready.parts[slot.slot];
        const oldSource = fitted && hauledSource(fitted);
        if (new Set(sources).size < 3 && (!oldSource || sources.filter((source) => source === oldSource).length > 1)) {
          target = this.state.run.inventory.find((part) => !part.inherited && !part.protected && !reserved.has(part.uid)
            && part.condition >= (slot.minCondition ?? 3) && slot.accepts.includes(part.partId) && hauledSource(part) && !sources.includes(hauledSource(part)));
        }
      }
      if (target) this.act({ type: "install", vehicleUid: car.uid, slot: slot.slot, partUid: target.uid });
    }
  }

  protected override race(present: boolean): void {
    const baton = this.state.run.countyBaton;
    if (!baton && (!this.isPast() || this.state.run.challenge.completedAt !== undefined)) return super.race(present);
    if (baton?.leg === "qualify" && baton.qualified) return super.race(present);
    if (baton?.leg === "deliver" && baton.completedAt !== undefined) return super.race(present);
    const venueId = baton?.leg === "qualify" ? "dirt" : "county_fair";
    const ids = baton?.leg === "qualify" ? ["go_kart"] : baton?.leg === "deliver" ? ["beater_car"] : ["beater_car", "go_kart"];
    for (const car of this.state.run.vehicles.filter((car) => ids.includes(car.vehicleId))) {
      this.fitVehicle(car);
      const ready = this.state.run.vehicles.find((entry) => entry.uid === car.uid)!;
      if (!(baton ? batonPartOn(this.state, venueId, ready) : challengeVehicleFit(this.state, venueId, ready)?.ready)) continue;
      const call = winChance(this.state, ready, venueId, "feature", "nurse") > 0.6 ? "nurse" : "push";
      const spec = { kind: "race", vehicleUid: car.uid, venueId, event: "feature", call } as const;
      if (!jobBlocker(this.state, spec, true)) {
        if (this.state.run.queue.some((entry) => entry.kind === "race" && entry.vehicleUid === car.uid && entry.venueId === venueId && entry.event === "feature")) return;
        if (this.act({ type: "enqueue", spec })) return;
      }
    }
    super.race(present);
  }

  protected override maybeReset(): void {
    const baton = this.state.run.countyBaton;
    if (this.isPast() && this.state.run.challenge.completedAt === undefined) return;
    if (baton?.leg === "qualify" && !salvageCarryCandidates(this.state).some(({ part }) => part.uid === baton.qualified?.uid)) return;
    if (baton?.leg === "deliver" && baton.completedAt === undefined) return;
    super.maybeReset();
  }
}

function play(state: GameState) {
  const pilot = new BatonPilot(state);
  pilot.run(SCHEDULES.mixed, 28 * DAY);
  if (!pilot.heldReset || !decodeGameState(pilot.state)) throw Error(JSON.stringify({
    message: "No valid reset point", seed: state.seed, county: state.config.homeCounty, objective: state.config.dare,
    baton: pilot.state.run.countyBaton, completed: pilot.state.run.challenge.completedAt, places: pilot.state.meta.codex.places,
    proofInStorage: [...pilot.state.run.inventory, ...pilot.state.run.driveway].filter((part) => part.inherited || part.protected),
    cars: pilot.state.run.vehicles.map((car) => ({
      car: car.vehicleId, history: car.history, parts: Object.values(car.parts).map((part) => [part?.partId, part?.provenance?.placeId, part?.condition])
    })),
  }));
  return { state: pilot.state, reset: pilot.heldReset.choices, days: day(pilot.totalMs) };
}

function reset(previous: ReturnType<typeof play>, choices: Partial<ReturnType<typeof play>["reset"]>) {
  return must(previous.state, { type: "reset", layer: "scrap", choices: { ...previous.reset, dare: null, ...choices } });
}

function bookVeteranCommitments(start: GameState): GameState {
  let game = must(start, { type: "owner", move: { type: "start", charter: "privateer", sponsor: "reliable" } });
  const archiveIndex = game.meta.hallOfFame.findIndex((entry) => eligibleHistory(game, entry));
  game = must(game, { type: "heritage", move: { type: "start", archiveIndex, kind: "exhibit" } });
  const kart = game.run.vehicles.find((car) => car.vehicleId === "go_kart")!;
  for (const family of game.manufacturer?.invites ?? []) {
    for (const slot of getVehicle("go_kart").slots) {
      const familyParts: readonly string[] = WORKS_FAMILIES[family].parts;
      const fitted = game.run.vehicles.find((car) => car.uid === kart.uid)?.parts[slot.slot];
      if (fitted && familyParts.includes(fitted.partId)) continue;
      const reserved = reservedPartUids(game);
      const part = game.run.inventory.find((part) => !reserved.has(part.uid) && part.condition > 0 && slot.accepts.includes(part.partId) && familyParts.includes(part.partId));
      if (part) game = must(game, { type: "install", vehicleUid: kart.uid, slot: slot.slot, partUid: part.uid });
    }
    const article = game.run.vehicles.find((car) => car.uid === kart.uid);
    if (!worksSignBlocker(game, family, article)) return must(game, { type: "works", move: { type: "sign", family, vehicleUid: kart.uid } });
  }
  throw Error("Earn a works invite and find three compatible parts on this veteran route");
}

const seeds = Number(process.argv[2] ?? 6);
const restart = process.argv.includes("--restart");
const veteranIndex = process.argv.indexOf("--veteran");
const veteran = veteranIndex < 0 ? undefined : decodeGameState(JSON.parse(Buffer.from(readFileSync(process.argv[veteranIndex + 1], "utf8"), "base64").toString("utf8")).game);
if (veteranIndex >= 0 && !veteran?.owner?.titles) throw Error("Use a valid champion checkpoint for the veteran run");
for (let i = 0; i < seeds; i++) {
  const seed = `pace-${i}`;
  const from: NeighborCounty = i % 2 ? "quarry" : "river";
  const destination = otherCounty(from);
  const first = play(veteran ?? createGame(seed));
  const past = play(reset(first, { dare: "parts_with_a_past" }));
  const secondPast = play(reset(past, { dare: "parts_with_a_past" }));
  if (!countyPassport(secondPast.state).earned || secondPast.state.meta.challengeRecords.parts_with_a_past?.completions !== 2) throw Error("County Baton prerequisites not earned");
  const firstAttempt = play(reset(secondPast, { countyBaton: "start", homeCounty: from }));
  let qualification = firstAttempt;
  let abandonedDays: number | undefined;
  if (restart) {
    const abandoned = reset(firstAttempt, { homeCounty: from });
    if (abandoned.run.countyBaton || abandoned.meta.challengeRecords.parts_with_a_past?.completions !== 2 || !decodeGameState(abandoned)) throw Error("Abandoning the attempt removed earned progress");
    const ordinary = play(abandoned);
    abandonedDays = ordinary.days;
    qualification = play(reset(ordinary, { countyBaton: "start", homeCounty: from }));
  }
  const proof = qualification.state.run.countyBaton;
  if (proof?.leg !== "qualify" || !proof.qualified) throw Error("Missing baton proof");
  qualification.state = must(qualification.state, { type: "guardBaton", partUid: proof.qualified.uid, keep: true });
  if (veteran) {
    qualification.state = bookVeteranCommitments(qualification.state);
    const output = process.argv[veteranIndex + 2];
    if (output) writeFileSync(output, Buffer.from(JSON.stringify({ savedAt: Date.now(), game: qualification.state })).toString("base64"));
  }
  const transfer = reset(qualification, { countyBaton: "carry", homeCounty: destination, retainedPartUid: proof.qualified.uid, perks: qualification.reset.perks.slice(0, -1) });
  if (!decodeGameState(transfer)?.run.inventory.some((part) => part.uid === proof.qualified!.uid && part.batonGuard && part.inherited)) throw Error("Transferred safeguard was lost");
  if (veteran && (transfer.owner?.tour.status !== "retired" || transfer.owner.titles !== veteran.owner?.titles
    || transfer.manufacturer?.history[0]?.status !== "retired" || transfer.run.heritageProject)) throw Error("Veteran commitment settlement disagrees with the planner");
  const delivery = play(transfer);
  const completed = delivery.state.run.countyBaton;
  if (completed?.leg !== "deliver" || completed.completedAt === undefined || delivery.state.meta.countyFreight?.[destination] !== 1) throw Error("Unfinished delivery");
  console.log(JSON.stringify({ seed, from, destination, firstFairDays: first.days, partsDays: [past.days, secondPast.days],
    abandonedDays, qualificationDays: day(proof.qualified.at), transferDays: qualification.days, deliveryDays: day(completed.completedAt), uid: completed.qualified.uid }));
}
