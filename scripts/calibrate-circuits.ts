/**
 * Balance probe: prints circuit-fitted performance for the weakest and
 * strongest legal build on every venue event (Sprint / Heat / Feature), plus
 * the resulting win chance. Run with: npx tsx scripts/calibrate-circuits.ts
 */
import { CIRCUIT_DEFINITIONS, EVENT_LADDER } from "../src/data/circuits";
import { VEHICLE_DEFINITIONS } from "../src/data/vehicles";
import { getPartById, type PartCondition } from "../src/data/parts";
import { isVariantPartId } from "../src/data/partVariants";
import { calculateStats, type BuiltVehicle } from "../src/engine/build";
import { resolveEventCircuit } from "../src/engine/eventLadder";
import { getCircuitPerformance, winChanceFromRatio } from "../src/engine/race";

function build(vehicleId: string, condition: PartCondition, pick: "lightest" | "best"): BuiltVehicle["stats"] {
  const def = VEHICLE_DEFINITIONS.find((v) => v.id === vehicleId)!;
  const parts: BuiltVehicle["parts"] = {};
  for (const slot of def.slots) {
    if (!slot.required && pick === "lightest") continue;
    // Base parts only: the Light / Sturdy siblings are the tradeoff around these numbers.
    const candidates = slot.acceptableParts.filter((id) => !isVariantPartId(id)).map((id) => getPartById(id)!);
    const chosen = pick === "lightest"
      ? candidates.reduce((a, b) => (b.baseWeight < a.baseWeight ? b : a))
      : candidates.reduce((a, b) => (b.basePower + b.baseHandling + b.baseReliability > a.basePower + a.baseHandling + a.baseReliability ? b : a));
    parts[slot.slot] = { part: { id: `p_${slot.slot}`, definitionId: chosen.id, condition, foundAt: "calib", type: "part" }, addons: [] };
  }
  return calculateStats(def, parts);
}

const byTier = (tier: number) => VEHICLE_DEFINITIONS.find((v) => v.tier === tier)!.id;
const pct = (ratio: number) => `${(winChanceFromRatio(ratio) * 100).toFixed(0).padStart(3)}%`;
console.log("venue                  event    diff  fee  prize | floor(decent,minT) win | ceil(pristine,maxT) win");
for (const venue of CIRCUIT_DEFINITIONS) {
  const floorStats = build(byTier(venue.minVehicleTier), "decent", "lightest");
  const ceilStats = build(byTier(venue.maxVehicleTier), "pristine", "best");
  for (const event of EVENT_LADDER) {
    const c = resolveEventCircuit(venue, event.id);
    const floor = getCircuitPerformance(floorStats, c);
    const ceil = getCircuitPerformance(ceilStats, c);
    const rf = floor / c.difficulty, rc = ceil / c.difficulty;
    console.log(
      `${venue.id.padEnd(22)} ${event.name.padEnd(8)}${String(c.difficulty).padStart(5)}${String(c.entryFee).padStart(5)}${String(c.rewardBase).padStart(7)} | ${floor.toFixed(1).padStart(8)} ${rf.toFixed(2)} ${pct(rf)} | ${ceil.toFixed(1).padStart(8)} ${rc.toFixed(2)} ${pct(rc)}`,
    );
  }
}
