/** Uses an actual, certified Rally career made by scripts/rally-careers.ts. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { must, type Action } from "../src/core";
import { blueprintPlan } from "../src/core/buildPlanning";
import { getPart } from "../src/core/content/parts";
import { getVehicle } from "../src/core/content/vehicles";
import { cardFor } from "../src/core/timecards";
import type { GameState, JobSpec } from "../src/core/types";
import { decodeGameState } from "../src/game/save";

const input = process.argv[2] ?? "test-results/rally-last-pace/certified-season-1.txt";
const output = process.argv[3] ?? "test-results/roadbook-special";
const source = JSON.parse(Buffer.from(readFileSync(input, "utf8"), "base64").toString("utf8")).game;
let game: GameState = decodeGameState(source)!;
if (!game) throw Error("Load a certified Rally garage.");
mkdirSync(output, { recursive: true });
const doAction = (a: Action) => {
  game = must(game, a);
};
const hour = 3_600_000;
for (let slot = 0; slot < game.run.habitSlots.length; slot++) doAction({ type: "setHabit", slot, template: null });
for (const member of game.era!.crew)
  if (member.assignment.type === "habit")
    doAction({ type: "assignCrew", crewId: member.id, assignment: { type: "queue" } });
while (game.run.queue.length) doAction({ type: "cancelQueued", index: game.run.queue.length - 1 });
while (game.run.jobs.length) doAction({ type: "cancelJob", jobId: game.run.jobs[0].id });
function finish(spec: JobSpec) {
  doAction({ type: "enqueue", spec });
  for (let attempt = 0; attempt < 48 && (game.run.jobs.length || game.run.queue.length); attempt++)
    doAction({ type: "advance", ms: hour });
  if (game.run.queue.length || game.run.jobs.length) throw Error("Still waiting: " + JSON.stringify(spec));
}
function service(partUid: string, target: number) {
  const part = () => game.run.inventory.find((p) => p.uid === partUid)!;
  while (part().condition < target) finish({ kind: part().condition < 2 ? "clean" : "repair", partUid });
}
function freshen(carUid: string) {
  const car = game.run.vehicles.find((v) => v.uid === carUid)!;
  for (const [slot, p] of Object.entries(car.parts))
    if (p && p.condition < 2) {
      doAction({ type: "uninstall", vehicleUid: carUid, slot });
      service(p.uid, 2);
      doAction({ type: "install", vehicleUid: carUid, slot, partUid: p.uid });
    }
}
const mower = game.run.vehicles.find((v) => v.vehicleId === "push_mower")!;
let attempts = 0;
while (!game.meta.rallyLicences?.backyard && attempts++ < 60) {
  freshen(mower.uid);
  const ref = cardFor(game, "backyard", "feature", mower.vehicleId);
  const chase = ref && attempts % 4 !== 1;
  finish({
    kind: "race",
    vehicleUid: mower.uid,
    venueId: "backyard",
    event: "feature",
    call: "nurse",
    ...(chase && { regularity: true, ...(ref.lastRun && { useLastPace: true }) }),
  });
}
if (!game.meta.rallyLicences?.backyard) throw Error("Could not earn a second certificate");
const plans = "blueprint:roadbook_special";
if (!game.run.learned.includes(plans)) finish({ kind: "study", knowhowId: plans });
const def = getVehicle("roadbook_special");
const chosen = blueprintPlan(game, def, {}).chosen;
const keep = new Set(Object.values(chosen));
const extras = game.run.inventory.filter((p) => !keep.has(p.uid));
for (const p of extras.filter((p) => getPart(p.partId).category === "engine").slice(0, 5))
  finish({ kind: "strip", partUid: p.uid });
const stock = () => game.run.inventory;
const loose = stock().filter((p) => !keep.has(p.uid) && !p.protected);
if (loose.length) doAction({ type: "sell", partUids: loose.map((p) => p.uid) });
function earn(amount: number) {
  for (let cycle = 0; game.run.cash < amount && cycle < 400; cycle++) {
    finish({ kind: "haul", placeId: "junkyard" });
    const sell = stock().filter((p) => !keep.has(p.uid) && !p.protected);
    if (sell.length) doAction({ type: "sell", partUids: sell.map((p) => p.uid) });
  }
}
earn(1000);
doAction({ type: "buyShell" });
const shell = stock().find((p) => p.partId === "beater_shell")!;
service(shell.uid, 3);
for (const slot of def.slots.filter((s) => s.required)) {
  if (stock().some((p) => slot.accepts.includes(p.partId) && p.condition >= (slot.minCondition ?? 1))) continue;
  const seen = slot.accepts.find((id) => game.meta.codex.parts[id]);
  if (!seen) throw Error("Need a sourced " + slot.slot);
  doAction({ type: "buyPart", partId: seen });
}
const build = blueprintPlan(game, def, {});
finish({ kind: "assemble", vehicleId: def.id, partUids: build.chosen, name: "Night Mail" });
const car = game.run.vehicles.find((v) => v.vehicleId === def.id)!;
const booking = { kind: "race", vehicleUid: car.uid, venueId: "county_fair", event: "feature", call: "nurse" } as const;
for (let n = 0; n < 16 && !cardFor(game, booking.venueId, booking.event, def.id); n++) {
  freshen(car.uid);
  finish(booking);
}
let stamped = false;
let runs = 0;
for (; runs < 32 && !stamped; runs++) {
  freshen(car.uid);
  const again = cardFor(game, booking.venueId, booking.event, def.id)!;
  finish({ ...booking, regularity: true, holdMarks: true, ...(again.lastRun && { useLastPace: true }) });
  stamped = !!game.run.races.at(-1)?.rallyClock?.regularity?.passed;
  if (!stamped && runs % 3 === 2) {
    freshen(car.uid);
    finish(booking);
  }
}
if (!stamped || !decodeGameState(game)) throw Error("Tripmeter run failed");
writeFileSync(
  join(output, "roadbook-special.txt"),
  Buffer.from(JSON.stringify({ game, savedAt: Date.now() })).toString("base64"),
);
const last = game.run.races.at(-1)!;
console.log({
  car: car.name,
  hours: Math.round((game.run.seasonMs - source.run.seasonMs) / hour),
  attemptsToSecondCertificate: attempts,
  tripmeterEntries: runs,
  position: last.position,
  classification: last.rallyClock?.regularity,
  parts: Object.keys(car.parts),
});
