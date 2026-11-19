/** Rebuild the same player's archived mower via both museum routes; use only public actions. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGame, must } from "../src/core";
import { counterBlocker } from "../src/core/actions";
import { getVehicle } from "../src/core/content/vehicles";
import { reservedPartUids, vehicleBusy } from "../src/core/garage";
import { eligibleHistory, exhibitBlocker, heritageFit, type HeritageKind } from "../src/core/heritage";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import type { GameState } from "../src/core/types";
import { decodeGameState } from "../src/game/save";
import { setExperimentalCareers } from "../src/core/features";

// These routes exercise the experimental side careers, which are off by default.
setExperimentalCareers(true);

const DAY = 86_400_000;
class Restorer extends Bot {
  awardAt?: number;
  constructor(
    state: GameState,
    readonly route: HeritageKind,
  ) {
    super(state);
    this.holdAt = "scrap";
  }
  protected override maybeReset() {
    if (this.state.run.heritageProject?.completed) {
      this.awardAt ??= this.state.run.seasonMs;
      super.maybeReset();
    }
  }
  protected override race(present: boolean) {
    const g = this.state;
    const p = g.run.heritageProject!;
    const car = g.run.vehicles.find((v) => v.vehicleId === p.model);
    if (!car || p.completed || vehicleBusy(g, car.uid)) return super.race(present);
    if (g.run.queue.some((q) => q.kind === "race" && q.vehicleUid === car.uid)) return;
    for (const target of p.parts) {
      const slot = getVehicle(car.vehicleId).slots.find((slot) => slot.slot === target.slot)!;
      const ids =
        this.route === "special" && slot.slot === "wheel"
          ? slot.accepts.filter((id) => id !== target.partId)
          : [target.partId];
      const fitted = car.parts[slot.slot];
      if (fitted && ids.includes(fitted.partId) && fitted.condition >= 2) continue;
      const reserved = reservedPartUids(this.state);
      const spare = this.state.run.inventory.find(
        (part) => ids.includes(part.partId) && part.condition >= 2 && !reserved.has(part.uid),
      );
      if (spare) this.act({ type: "install", vehicleUid: car.uid, slot: slot.slot, partUid: spare.uid });
      else {
        const stock = ids.find((id) => !counterBlocker(this.state, id));
        if (stock) {
          this.act({ type: "buyPart", partId: stock });
          const newPart = this.state.run.inventory.at(-1)!;
          this.act({ type: "install", vehicleUid: car.uid, slot: slot.slot, partUid: newPart.uid });
        }
      }
    }
    const ready = this.state.run.vehicles.find((v) => v.uid === car.uid)!;
    if (this.route === "exhibit" && !exhibitBlocker(this.state, p, ready)) {
      this.act({ type: "heritage", move: { type: "donate", vehicleUid: car.uid } });
      return;
    }
    if (!heritageFit(p, ready)) {
      const event = this.route === "exhibit" ? "sprint" : this.state.run.ladder.backyard.at(-1)!;
      if (
        this.act({
          type: "enqueue",
          spec: { kind: "race", venueId: "backyard", event, vehicleUid: car.uid, call: "nurse" },
        })
      )
        return;
    }
    super.race(present);
  }
}

const output = process.argv[3] ?? "test-results/heritage-careers";
const seeds = Number(process.argv[2] ?? 4);
mkdirSync(output, { recursive: true });
const rows = [];
for (let i = 0; i < seeds; i++) {
  const opening = new Bot(createGame("heritage-garage-" + i));
  opening.holdAt = "scrap";
  opening.run(SCHEDULES.mixed, 40 * DAY);
  if (!opening.heldReset) throw Error("Could not earn original reset");
  const next = must(opening.state, opening.heldReset);
  const archiveIndex = next.meta.hallOfFame.findIndex((e) => e.vehicleId === "push_mower" && eligibleHistory(next, e));
  if (archiveIndex < 0) throw Error("No eligible mower");
  for (const route of ["exhibit", "special"] as const) {
    const g = must(next, { type: "heritage", move: { type: "start", archiveIndex, kind: route } });
    const player = new Restorer(g, route);
    player.run(SCHEDULES.mixed, 40 * DAY);
    if (!decodeGameState(player.state)) throw Error("Invalid result");
    const result = {
      seed: i,
      route,
      earnedDays: player.awardAt === undefined ? null : player.awardAt / DAY,
      resetDays: player.heldReset ? player.totalMs / DAY : null,
    };
    if (i === 0 && player.heldReset)
      writeFileSync(
        join(output, route + ".txt"),
        Buffer.from(JSON.stringify({ game: player.state, savedAt: Date.now() })).toString("base64"),
      );
    rows.push(result);
    writeFileSync(join(output, "results.json"), JSON.stringify(rows, null, 2));
    console.log(result);
  }
}
