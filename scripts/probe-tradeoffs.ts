import { CIRCUIT_DEFINITIONS } from "../src/data/circuits";
import { VEHICLE_DEFINITIONS } from "../src/data/vehicles";
import { calculateStats, type BuiltVehicle } from "../src/engine/build";
import { getCircuitPerformance, winChanceFromRatio } from "../src/engine/race";
const sr = VEHICLE_DEFINITIONS.find(v => v.id === "street_racer")!;
function mk(sel: Record<string,string>): BuiltVehicle["stats"] {
  const parts: BuiltVehicle["parts"] = {};
  for (const [slot, id] of Object.entries(sel)) parts[slot] = { part: { id: slot, definitionId: id, condition: "pristine", foundAt: "x", type: "part" }, addons: [] };
  return calculateStats(sr, parts);
}
const builds = {
  "V8 + steel + sport (heavy power)": mk({ engine:"engine_v8", wheel:"wheel_sport", frame:"frame_steel", fuel:"fuel_tank_large", drivetrain:"drive_manual" }),
  "V6 + carbon + slick (light grip)": mk({ engine:"engine_v6", wheel:"wheel_racing", frame:"frame_carbon", fuel:"fuel_tank_large", drivetrain:"drive_chain" }),
  "V8 + carbon + slick (all best)":   mk({ engine:"engine_v8", wheel:"wheel_racing", frame:"frame_carbon", fuel:"fuel_tank_large", drivetrain:"drive_manual" }),
};
for (const [name, s] of Object.entries(builds)) {
  const reg = CIRCUIT_DEFINITIONS.find(c=>c.id==="regional_circuit")!, nat = CIRCUIT_DEFINITIONS.find(c=>c.id==="national_circuit")!;
  const r1 = getCircuitPerformance(s, reg)/reg.difficulty, r2 = getCircuitPerformance(s, nat)/nat.difficulty;
  console.log(name.padEnd(36), `spd ${s.speed.toFixed(0).padStart(4)} hnd ${s.handling.toFixed(0).padStart(4)} rel ${s.reliability.toFixed(0).padStart(4)} w ${s.weight}`.padEnd(40), `Regional ${(winChanceFromRatio(r1)*100).toFixed(0)}%  National ${(winChanceFromRatio(r2)*100).toFixed(0)}%`);
}
