/**
 * Balance probe: how long does a mostly-idle first campaign take?
 *
 * The garage ticks on its own; the "player" only checks in every
 * CHECK_IN_MINUTES of game time to sell junk, build the best vehicle the
 * inventory allows, repair, and point auto-race at the best eligible circuit.
 * Run with: npx tsx scripts/simulate-idle-campaign.ts [checkInMinutes]
 */
import { CONDITIONS, getPartById } from "../src/data/parts";
import { CIRCUIT_DEFINITIONS } from "../src/data/circuits";
import { getLocationById, LOCATION_DEFINITIONS } from "../src/data/locations";
import { getVehicleById, VEHICLE_DEFINITIONS } from "../src/data/vehicles";
import { canScrapReset } from "../src/config/progression";
import { computeTick, computeTickSpeedMs } from "../src/engine/tick";
import { createInitialState, getVehicleBuildCost, getVehicleRepairCost, useGameStore } from "../src/state/store";
import { SeededRandomSource, withRandomSource } from "../src/utils/random";

const CHECK_IN_MINUTES = Number(process.argv[2] ?? 30);

function settleTick(): void {
  const state = useGameStore.getState();
  const result = computeTick(state);
  const outcome = result.raceOutcome;
  const streak = outcome ? (outcome.result === "win" ? state.winStreak + 1 : 0) : state.winStreak;
  state.applyTickResult(result.partsFound, result.scrapsEarned, result.repEarned, result.vehicleWearAmount || undefined, result.vehicleRepairAmount || undefined, result.newRaceTickProgress, result.lootGearDrops, result.modDrops, {
    partsScavenged: result.partsScavenged, partsAutoSold: result.partsAutoSold, scavengesCompleted: result.scavengesCompleted,
    racesCompleted: outcome ? 1 : 0, winsCompleted: outcome?.result === "win" ? 1 : 0, finalWinStreak: streak, bestWinStreak: Math.max(state.bestWinStreak, streak),
    recentRaceOutcomes: outcome ? [outcome] : [], winningCircuitIds: outcome?.result === "win" ? [outcome.circuitId] : [], defeatedRivalIds: [], circuitWinStreaks: {},
    raceSalvageFound: result.raceSalvageFound, forgeTokensFound: result.forgeTokensFound, entryFeesPaid: result.entryFeesPaid,
    challengesEvaluated: false, completedChallengeIds: [], challengeForgeTokens: 0, challengeMaterials: {}, ticksProcessed: 1,
    repDecayed: result.repDecayed,
  });
}

/** Rep is spent: open the next enterable circuit, then blueprint, then junkyard, one per check-in. */
function spendRep(): void {
  const s = useGameStore.getState();
  const garageTiers = s.garage.map((v) => getVehicleById(v.definitionId)!.tier);
  for (const circuit of [...CIRCUIT_DEFINITIONS].sort((a, b) => a.unlockRepCost - b.unlockRepCost)) {
    if (s.unlockedCircuitIds.includes(circuit.id) || circuit.requiredFeature) continue;
    const enterable = garageTiers.some((tier) => tier >= circuit.minVehicleTier && tier <= circuit.maxVehicleTier);
    if (enterable && s.canAffordRep(circuit.unlockRepCost)) { s.unlockCircuit(circuit.id); return; }
    break;
  }
  for (const vehicle of [...VEHICLE_DEFINITIONS].sort((a, b) => a.tier - b.tier)) {
    if (s.unlockedVehicleIds.includes(vehicle.id) || vehicle.unlockRequirement.type !== "reputation") continue;
    if (s.canAffordRep(vehicle.unlockRequirement.amount)) { s.unlockVehicle(vehicle.id); return; }
    break;
  }
  for (const location of [...LOCATION_DEFINITIONS].sort((a, b) => a.unlockCost - b.unlockCost)) {
    if (s.unlockedLocationIds.includes(location.id)) continue;
    if (s.canAffordRep(location.unlockCost)) s.unlockLocation(location.id);
    return;
  }
}

function tryBuild(vehicleId: string): boolean {
  const state = useGameStore.getState();
  const definition = getVehicleById(vehicleId)!;
  const used = new Set<string>();
  const selected: Record<string, (typeof state.inventory)[number]> = {};
  for (const slot of definition.slots) {
    if (!slot.required) continue;
    const part = state.inventory
      .filter((p) => !used.has(p.id) && slot.acceptableParts.includes(p.definitionId))
      .sort((a, b) => CONDITIONS.indexOf(b.condition) - CONDITIONS.indexOf(a.condition))[0];
    if (!part) return false;
    used.add(part.id);
    selected[slot.slot] = part;
  }
  if (useGameStore.getState().scrapBucks < getVehicleBuildCost(useGameStore.getState(), definition)) return false;
  useGameStore.getState().setPendingVehicle(vehicleId);
  for (const [slot, part] of Object.entries(selected)) useGameStore.getState().setPendingPart(slot, part);
  const before = useGameStore.getState().garage.length;
  useGameStore.getState().buildSelectedVehicle();
  return useGameStore.getState().garage.length === before + 1;
}

function sellSurplus(): void {
  // Keep the best part in every category; sell misc and the rest of the low-grade pile.
  const bestByCategory = new Map<string, string>();
  for (const part of useGameStore.getState().inventory) {
    const category = getPartById(part.definitionId)?.category ?? "misc";
    const current = bestByCategory.get(category);
    const currentPart = current ? useGameStore.getState().inventory.find((p) => p.id === current) : undefined;
    if (!currentPart || CONDITIONS.indexOf(part.condition) > CONDITIONS.indexOf(currentPart.condition)) bestByCategory.set(category, part.id);
  }
  const keep = new Set(bestByCategory.values());
  for (const part of useGameStore.getState().inventory) {
    if (keep.has(part.id)) continue;
    const category = getPartById(part.definitionId)?.category ?? "misc";
    if (category === "misc" || CONDITIONS.indexOf(part.condition) <= CONDITIONS.indexOf("worn")) useGameStore.getState().sellPart(part.id);
  }
}

let debugCheckIns = 0;
function checkIn(): void {
  const before = { scrap: useGameStore.getState().scrapBucks, parts: useGameStore.getState().inventory.length };
  spendRep();
  // Fund the build first, then build.
  sellSurplus();
  // Build the best vehicle we don't already own, highest tier first.
  const built = new Set(useGameStore.getState().garage.map((v) => v.definitionId));
  let builtNow: string | null = null;
  for (const vehicle of [...VEHICLE_DEFINITIONS].sort((a, b) => b.tier - a.tier)) {
    if (built.has(vehicle.id) || !useGameStore.getState().unlockedVehicleIds.includes(vehicle.id)) continue;
    if (tryBuild(vehicle.id)) { builtNow = vehicle.id; break; }
  }
  if (process.env.DEBUG_IDLE && debugCheckIns++ < 4) {
    const s = useGameStore.getState();
    console.log(`check-in: before scrap=${before.scrap} parts=${before.parts} | after sell scrap=${s.scrapBucks} parts=${s.inventory.length} built=${builtNow} unlocked=${s.unlockedVehicleIds.join(",")}`);
  }
  // Point automation at the best circuit any garage vehicle can enter.
  const s = useGameStore.getState();
  const best = CIRCUIT_DEFINITIONS
    .filter((c) => s.unlockedCircuitIds.includes(c.id))
    .flatMap((circuit) => s.garage.flatMap((vehicle) => {
      const def = getVehicleById(vehicle.definitionId)!;
      return def.tier >= circuit.minVehicleTier && def.tier <= circuit.maxVehicleTier ? [{ circuit, vehicle, def }] : [];
    }))
    .sort((a, b) => b.circuit.tier - a.circuit.tier || b.def.tier - a.def.tier)[0];
  if (best) {
    s.setActiveVehicle(best.vehicle.id);
    s.setSelectedCircuit(best.circuit.id);
    if ((best.vehicle.condition ?? 100) < 50 && s.scrapBucks >= getVehicleRepairCost(s, best.vehicle)) s.repairVehicle(best.vehicle.id);
  }
  // Scavenge where the best parts are.
  const bestLocation = useGameStore.getState().unlockedLocationIds.map((id) => getLocationById(id)!).sort((a, b) => b.tier - a.tier)[0];
  useGameStore.getState().setSelectedLocation(bestLocation.id);
}

useGameStore.setState({ ...createInitialState(), tutorialStep: -1, tutorialDismissed: true });
let gameMs = 0;
let ticks = 0;
let checkIns = 0;
const milestones: string[] = [];
withRandomSource(new SeededRandomSource("idle-campaign"), () => {
  let sinceCheckIn = Number.POSITIVE_INFINITY;
  while (ticks < 20_000) {
    const state = useGameStore.getState();
    if (canScrapReset({ vehiclesBuilt: state.garage.length, reputation: state.lifetimeRep, lifetimeScrapBucks: state.lifetimeScrapBucks })) break;
    if (sinceCheckIn >= CHECK_IN_MINUTES * 60_000) {
      const before = useGameStore.getState().garage.length;
      checkIn();
      checkIns++;
      const after = useGameStore.getState();
      if (after.garage.length > before) milestones.push(`${(gameMs / 3_600_000).toFixed(2)}h built ${after.garage.at(-1)!.definitionId}`);
      sinceCheckIn = 0;
    }
    const tickMs = computeTickSpeedMs(useGameStore.getState());
    settleTick();
    gameMs += tickMs;
    sinceCheckIn += tickMs;
    ticks++;
  }
});
const final = useGameStore.getState();
console.log(JSON.stringify({
  checkInMinutes: CHECK_IN_MINUTES,
  gameHours: Number((gameMs / 3_600_000).toFixed(2)),
  ticks,
  checkIns,
  reachedReset: canScrapReset({ vehiclesBuilt: final.garage.length, reputation: final.lifetimeRep, lifetimeScrapBucks: final.lifetimeScrapBucks }),
  vehicles: final.garage.map((v) => v.definitionId),
  rep: Math.round(final.repPoints),
  lifetimeRep: Math.round(final.lifetimeRep),
  circuits: final.unlockedCircuitIds,
  locations: final.unlockedLocationIds,
  lifetimeScrap: final.lifetimeScrapBucks,
  races: final.lifetimeRaces,
  wins: final.lifetimeWinsAllTime,
  milestones,
}, null, 2));
