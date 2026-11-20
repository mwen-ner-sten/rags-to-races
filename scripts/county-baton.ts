/** Compare two reset plans from the same earned county garage. */
import { createGame, must } from "../src/core";
import { challengeVehicleFit } from "../src/core/challenges";
import { COUNTY_PARTS, HOME_COUNTIES, countyPassport } from "../src/core/counties";
import { getPart } from "../src/core/content/parts";
import { getVehicle } from "../src/core/content/vehicles";
import { reservedPartUids, vehicleBusy } from "../src/core/garage";
import { jobBlocker } from "../src/core/jobs";
import { hauledSource } from "../src/core/provenance";
import { winChance } from "../src/core/race";
import { FREIGHT_COST, salvageCarryCandidates } from "../src/core/salvageCarry";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import type { GameState, NeighborCounty, PartInstance, Vehicle } from "../src/core/types";
import { decodeGameState } from "../src/game/save";
import { setExperimentalCareers } from "../src/core/features";

// These routes exercise the experimental side careers, which are off by default.
setExperimentalCareers(true);

const DAY = 86_400_000;
const day = (time: number) => Number((time / DAY).toFixed(2));
const nativePart = { river: "wheel_river", quarry: "engine_quarry" } as const;
const localFind = { curb: "fuel_gas_can", yards: "exhaust_rusted", junkyard: "drive_chain" } as const;

class FreightPilot extends Bot {
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

  protected override decide(present: boolean): void {
    const protectedKind = new Set(this.pieces().filter((part) => part.protected).map((part) => part.partId));
    for (const part of this.state.run.inventory.slice().sort((a, b) => b.condition - a.condition)) {
      const source = hauledSource(part);
      const proof = Object.hasOwn(COUNTY_PARTS, part.partId) || (this.isPast() && ((source === "curb" && part.partId === localFind.curb)
        || (source === "yards" && part.partId.startsWith("exhaust_")) || (source === "junkyard" && part.partId === localFind.junkyard)));
      if (!proof || protectedKind.has(part.partId)) continue;
      protectedKind.add(part.partId);
      this.act({ type: "protectPart", partUid: part.uid, keep: true });
    }
    super.decide(present);
  }

  protected override haulSpec(longOk: boolean) {
    const state = this.state;
    const county = state.config.homeCounty;
    if (county && county !== "home" && !this.pieces().some((part) => part.partId === nativePart[county])) {
      const spec = { kind: "haul", placeId: HOME_COUNTIES[county].source, focus: state.run.learned.includes("tech:scouting") ? getPart(nativePart[county]).category : undefined } as const;
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
        && ((!car.parts[slot.slot] && slot.required) || (this.isPast() && car.vehicleId === "go_kart" && part.protected)));
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
    if (!this.isPast() || this.state.run.challenge.completedAt !== undefined) return super.race(present);
    const venueId = "county_fair";
    const ids = ["beater_car", "go_kart"];
    for (const car of this.state.run.vehicles.filter((car) => ids.includes(car.vehicleId))) {
      this.fitVehicle(car);
      const ready = this.state.run.vehicles.find((entry) => entry.uid === car.uid)!;
      if (!challengeVehicleFit(this.state, venueId, ready)?.ready) continue;
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
    if (this.isPast() && this.state.run.challenge.completedAt === undefined) return;
    super.maybeReset();
  }
}

function play(state: GameState) {
  const pilot = new FreightPilot(state);
  pilot.run(SCHEDULES.mixed, 28 * DAY);
  if (!pilot.heldReset || !decodeGameState(pilot.state)) throw Error(JSON.stringify({
    message: "No valid reset point", seed: state.seed, county: state.config.homeCounty, objective: state.config.dare,
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

const first = play(createGame("pace-0"));
const past = play(reset(first, { dare: "parts_with_a_past" }));
if (!countyPassport(past.state).earned || !past.state.meta.challengeRecords.parts_with_a_past) throw Error("Missing earned prerequisite");
for (const from of ["river", "quarry"] satisfies NeighborCounty[]) {
  const destination: NeighborCounty = from === "river" ? "quarry" : "river";
  const local = play(reset(past, { homeCounty: from }));
  const candidate = salvageCarryCandidates(local.state).find(({ part }) => part.partId === nativePart[from]);
  if (!candidate) throw Error("No native part available");
  const choices = { homeCounty: destination, retainedPartUid: candidate.part.uid, perks: [], buy: [] };
  const crate = reset(local, choices);
  const freight = reset(local, { ...choices, countyFreight: true });
  if (!decodeGameState(crate) || !decodeGameState(freight) || !crate.config.salvageSlot || freight.config.salvageSlot
    || crate.scrap.lp - freight.scrap.lp !== FREIGHT_COST || freight.run.inventory[0]?.uid !== candidate.part.uid) throw Error("Invalid shipment");
  console.log({ from, destination, localDays: local.days, part: candidate.part.partId, crateLP: crate.scrap.lp, freightLP: freight.scrap.lp });
}
