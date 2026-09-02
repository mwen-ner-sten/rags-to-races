/**
 * Balance probe: prints circuit-fitted performance for the weakest and
 * strongest legal build on every circuit, plus the resulting win chance.
 * Run with: npx tsx scripts/calibrate-circuits.ts
 */
import { CIRCUIT_DEFINITIONS } from "../src/data/circuits";
import { VEHICLE_DEFINITIONS } from "../src/data/vehicles";
import { getPartById, type PartCondition } from "../src/data/parts";
import { calculateStats, type BuiltVehicle } from "../src/engine/build";
import { getCircuitPerformance, winChanceFromRatio } from "../src/engine/race";

function build(vehicleId: string, condition: PartCondition, pick: "lightest" | "best"): BuiltVehicle["stats"] {
  const def = VEHICLE_DEFINITIONS.find((v) => v.id === vehicleId)!;
  const parts: BuiltVehicle["parts"] = {};
  for (const slot of def.slots) {
    if (!slot.required && pick === "lightest") continue;
    const candidates = slot.acceptableParts.map((id) => getPartById(id)!);
    const chosen = pick === "lightest"
      ? candidates.reduce((a, b) => (b.baseWeight < a.baseWeight ? b : a))
      : candidates.reduce((a, b) => (b.basePower + b.baseHandling + b.baseReliability > a.basePower + a.baseHandling + a.baseReliability ? b : a));
    parts[slot.slot] = { part: { id: `p_${slot.slot}`, definitionId: chosen.id, condition, foundAt: "calib", type: "part" }, addons: [] };
  }
  return calculateStats(def, parts);
}

const byTier = (tier: number) => VEHICLE_DEFINITIONS.find((v) => v.tier === tier)!.id;
console.log("circuit               diff  | floor(decent,minT)  ceil(pristine,maxT) | ratio@floor win  ratio@ceil win");
for (const c of CIRCUIT_DEFINITIONS) {
  const floor = getCircuitPerformance(build(byTier(c.minVehicleTier), "decent", "lightest"), c);
  const ceil = getCircuitPerformance(build(byTier(c.maxVehicleTier), "pristine", "best"), c);
  const rf = floor / c.difficulty, rc = ceil / c.difficulty;
  console.log(
    `${c.id.padEnd(22)}${String(c.difficulty).padStart(4)}  | ${floor.toFixed(1).padStart(8)}             ${ceil.toFixed(1).padStart(8)}          | ${rf.toFixed(2)} ${(winChanceFromRatio(rf) * 100).toFixed(0)}%      ${rc.toFixed(2)} ${(winChanceFromRatio(rc) * 100).toFixed(0)}%`,
  );
}
