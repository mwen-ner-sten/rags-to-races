/** Build and chase retained regularity cards over two real Scrap Resets.
 * npx tsx scripts/rally-careers.ts [seeds] [output-directory]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGame, must } from "../src/core";
import { getVenue } from "../src/core/content/events";
import { jobBlocker } from "../src/core/jobs";
import { SCRAP_LAYER } from "../src/core/layers";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import { teamCheckpoint } from "../src/core/sim/teamCheckpoint";
import { cardFor } from "../src/core/timecards";
import type { GameState, JobSpec } from "../src/core/types";
import { decodeGameState } from "../src/game/save";

const DAY = 86_400_000;
const seeds = Number(process.argv[2] ?? 6);
const directory = process.argv[3] ?? "test-results/rally-careers";
if (!Number.isInteger(seeds) || seeds < 1) throw new Error("Select one or more seeds.");
mkdirSync(directory, { recursive: true });

class RoadbookDriver extends Bot {
  protected override maybeReset() {
    if (this.state.run.regularityFeatures?.county_fair === undefined) return;
    this.heldReset = { type: "reset", layer: "scrap", choices: this.state.config };
  }

  protected override race(present: boolean) {
    const game = this.state;
    const priority = ["county_fair", "dirt", "backyard"].find((id) => game.run.venuesOpen.includes(id));
    if (!priority || !game.run.vehicles.length) return super.race(present);
    const event = game.run.ladder[priority]?.at(-1) ?? "sprint";
    const hasDriver = !!game.era?.crew.some((member) => member.assignment.type === "driver");
    // A sealed class time makes the next official attempt eligible for consistency scoring.
    // Wait for that entry's own cooldown instead of burning the available car on a lower event.
    const cars = game.run.vehicles.filter((car) => !game.run.queue.some((job) => job.kind === "race" && job.vehicleUid === car.uid));
    for (const car of cars) {
      const reference = cardFor(game, priority, event, car.vehicleId);
      const recent = game.run.races.filter((r) => r.venueId === priority && r.event === event && r.vehicleUid === car.uid).slice(-3);
      const resurvey = recent.length === 3 && recent.every((r) => r.rallyClock?.regularity && !r.rallyClock.regularity.passed);
      const spec: Extract<JobSpec, { kind: "race" }> = { kind: "race", venueId: priority, event, vehicleUid: car.uid,
        call: "nurse", ...(hasDriver && { call2: "recce" }), ...(reference && !resurvey && { regularity: true, ...(reference.lastRun && { useLastPace: true }) }) };
      if (reference && game.run.cash < getVenue(priority).events[event].entry * 2) continue;
      if (jobBlocker(game, spec, true)) continue;
      if (this.act({ type: "enqueue", spec })) return;
    }
    super.race(present);
  }
}

const rows = [];
for (let n = 0; n < seeds; n++) {
  const seed = `roadbook-${n}`;
  const first = teamCheckpoint(createGame(seed));
  const independent = must(first.state, { type: "reset", layer: "team", choices: first.choices });
  const second = teamCheckpoint(independent);
  let state: GameState = must(second.state, { type: "reset", layer: "team", choices: { ...second.choices, discipline: "rally" } });
  for (let attempt = 1; attempt <= 2; attempt++) {
    const driver = new RoadbookDriver(state, "push", "rally");
    driver.run(SCHEDULES.mixed, 60 * DAY);
    state = driver.state;
    const legal = decodeGameState(state);
    if (!legal) throw new Error(`Invalid finish on ${seed}, visit ${attempt}`);
    const fair = state.run.regularityFeatures?.county_fair;
    const classification = state.run.races.find((r) => r.venueId === "county_fair" && r.event === "feature" && r.rallyClock?.regularity?.passed);
    rows.push({ seed, attempt, days: driver.totalMs / DAY, regularityDays: fair === undefined ? null : fair / DAY,
      bestCount: state.meta.rallyCards?.length ?? 0, outrightFairWin: state.run.featureWins.county_fair !== undefined,
      positionAtCertificate: classification?.position ?? null, availableLP: SCRAP_LAYER.award(state), cash: state.run.cash });
    if (!driver.heldReset) break;
    if (n === 0) writeFileSync(join(directory, `certified-season-${attempt}.txt`), Buffer.from(JSON.stringify({ game: state, savedAt: Date.now() })).toString("base64"));
    state = must(state, driver.heldReset);
  }
  writeFileSync(join(directory, "results.json"), JSON.stringify(rows, null, 2));
  console.log(seed, rows.at(-1));
}
