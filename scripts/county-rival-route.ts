/** Play into the county passport, move, build a local car and earn both contacts with ordinary actions. */
import { createGame, must } from "../src/core";
import { countyPassport } from "../src/core/counties";
import { countyBuildReady, countyMatchBlocker, localRival } from "../src/core/countyRivals";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import { decodeGameState } from "../src/game/save";

const DAY = 86_400_000;
const SEED = "manufacturer-natural-0";

class CountyRun extends Bot {
  protected override shouldStop(): boolean {
    const rival = localRival(this.state);
    return (rival !== undefined && !!this.state.countyRivals?.[rival]?.earned) || super.shouldStop();
  }

  protected override decide(present: boolean): void {
    const rival = localRival(this.state);
    const local = rival && this.state.run.vehicles.find((car) => countyBuildReady(this.state, car, rival) && !countyMatchBlocker(this.state, car.uid, "push"));
    if (local && this.act({ type: "countyMatch", move: { type: "enter", vehicleUid: local.uid, call: "push" } })) return;
    super.decide(present);
  }
}

const opening = new Bot(createGame(SEED), "sprint");
opening.holdAt = "scrap";
opening.run(SCHEDULES.mixed, 150 * DAY);
if (!opening.heldReset || !countyPassport(opening.state).earned) throw new Error("The blank save did not earn a real County passport.");
console.log(JSON.stringify({ seed: SEED, passport: countyPassport(opening.state), firstResetDay: opening.totalMs / DAY }));

for (const homeCounty of ["river", "quarry"] as const) {
  const start = must(opening.state, { type: "reset", layer: "scrap", choices: { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [], homeCounty } });
  const run = new CountyRun(start, "sprint");
  run.holdAt = "scrap";
  run.run(SCHEDULES.mixed, 15 * DAY);
  const rival = localRival(run.state)!;
  const contact = run.state.countyRivals?.[rival];
  if (!contact?.earned || !decodeGameState(JSON.parse(JSON.stringify(run.state)))) throw new Error(`The ${homeCounty} contact was not earned in a valid save.`);
  const result = run.state.run.races.find(({ id }) => id === contact.earned?.raceId);
  const car = run.state.run.vehicles.find(({ uid }) => uid === result?.vehicleUid);
  console.log(JSON.stringify({ homeCounty, rival, elapsedDays: run.totalMs / DAY, result: contact.earned, attempts: contact.attempts,
    parts: Object.values(car?.parts ?? {}).map((part) => ({ id: part?.partId, condition: part?.condition, county: part?.provenance?.county })) }));
}
