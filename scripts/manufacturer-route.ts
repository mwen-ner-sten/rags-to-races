/** Naturally acquire, race and re-use both works drawings. Run with npx tsx scripts/manufacturer-route.ts. */
import { createGame, must } from "../src/core";
import { WORKS_FAMILIES, WORKS_FAMILY_IDS, worksRecastBlocker, worksReport, worksSignBlocker, type WorksFamily } from "../src/core/manufacturer";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import type { GameState, PartInstance } from "../src/core/types";
import { decodeGameState } from "../src/game/save";
import { setExperimentalCareers } from "../src/core/features";

// These routes exercise the experimental side careers, which are off by default.
setExperimentalCareers(true);

const SEED = "manufacturer-natural-0";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

class DrawingRun extends Bot {
  source?: PartInstance;

  protected override shouldStop(): boolean {
    return !!this.source || super.shouldStop();
  }

  protected override decide(present: boolean): void {
    const stock = this.state.run.inventory.find(({ uid }) => !worksRecastBlocker(this.state, uid));
    if (stock && this.act({ type: "works", move: { type: "recast", partUid: stock.uid } })) {
      this.source = structuredClone(stock);
      return;
    }
    super.decide(present);
  }
}

function roundTrip(game: GameState): GameState {
  const parsed = decodeGameState(JSON.parse(JSON.stringify(game)));
  if (!parsed) throw new Error("The natural works save did not reload.");
  return parsed;
}

function commission(game: GameState, family: WorksFamily): GameState {
  let current = must(game, { type: "advance", ms: 2 * HOUR });
  const article = current.run.vehicles.find((car) => !worksSignBlocker(current, family, car));
  if (!article) throw new Error(`No earned ${family} article in the garage.`);
  current = must(current, { type: "renameVehicle", vehicleUid: article.uid, name: family === "redwheel" ? "Copper Comet" : "Quarry Mule" });
  current = must(current, { type: "works", move: { type: "sign", family, vehicleUid: article.uid } });
  const progress = () => worksReport(current.manufacturer!.active!);
  while (!progress().homologated && !progress().failed) {
    current = roundTrip(must(current, { type: "works", move: { type: "enter" } }));
    current = roundTrip(must(current, { type: "advance", ms: 12 * HOUR, away: true }));
  }
  if (!progress().homologated) throw new Error(`The natural ${family} article did not homologate.`);
  return current;
}

const bot = new Bot(createGame(SEED), "sprint");
bot.holdAt = "scrap";
bot.run(SCHEDULES.mixed, 150 * DAY);
if (!bot.heldReset || bot.state.manufacturer?.invites.length !== WORKS_FAMILY_IDS.length) throw new Error("The fresh garage did not earn both invitations.");
console.log(JSON.stringify({ seed: SEED, invitations: bot.state.manufacturer.invites, day: bot.totalMs / DAY, owner: !!bot.state.owner, promoter: !!bot.state.promoter }));

for (const family of WORKS_FAMILY_IDS) {
  const inspected = commission(roundTrip(bot.state), family);
  const deal = inspected.manufacturer!.active!;
  const opening = must(inspected, { type: "reset", layer: "scrap", choices: { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, hardships: [], dare: null, worksPlan: family } });
  const next = new DrawingRun(roundTrip(opening), "sprint");
  next.holdAt = "scrap";
  next.run(SCHEDULES.mixed, 40 * DAY);
  if (!next.source) throw new Error(`The next ${family} Season did not use its drawing.`);
  const resulting = roundTrip(next.state).run.inventory.find(({ uid }) => uid === next.source!.uid);
  if (resulting?.partId !== WORKS_FAMILIES[family].drawing.output) throw new Error(`The natural ${family} conversion did not preserve its physical uid.`);
  console.log(JSON.stringify({ family, article: deal.article, rounds: deal.attempts, openingUseDay: next.totalMs / DAY,
    input: { part: next.source.partId, condition: next.source.condition, origin: next.source.origin }, output: { part: resulting.partId, condition: resulting.condition }, validSave: true }));
}
