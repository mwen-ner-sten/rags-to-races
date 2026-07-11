import { createInitialState, type GameState, useGameStore } from "../src/state/store";
import { createGameplayFixture } from "../src/testing/gameplayFixtures";
import { MAX_OFFLINE_MS, runSeededOffline } from "../src/testing/devAcceleration";

function stateFor(name: Parameters<typeof createGameplayFixture>[0]): GameState {
  return { ...createInitialState(), ...createGameplayFixture(name).payload.state } as GameState;
}

const durations = [
  { label: "15 minutes", ms: 15 * 60_000 },
  { label: "1 hour", ms: 60 * 60_000 },
  { label: "8 hours", ms: MAX_OFFLINE_MS },
  { label: "24 hours requested", ms: MAX_OFFLINE_MS * 3 },
].map(({ label, ms }) => {
  const seedLabel = label === "24 hours requested" ? "8 hours" : label;
  const result = runSeededOffline(stateFor("workshop_ready"), ms, `full-campaign-time:${seedLabel}`);
  return {
    label,
    requestedMinutes: result.requestedDurationMs! / 60_000,
    cappedMinutes: result.cappedDurationMs! / 60_000,
    ticks: result.ticksProcessed,
    scavenges: result.scavengesCompleted,
    races: result.racesCompleted,
    partsFound: result.partsScavenged,
    partsKept: result.partsFound.length,
    partsAutoSold: result.partsAutoSold,
    overflowScrap: result.scrapsFromAutoSoldParts,
    scrap: result.scrapsEarned,
    rep: result.repEarned,
    wear: result.vehicleWearTotal,
    repairs: result.vehicleRepairTotal,
    gearDropsKept: result.lootGearDrops.length,
    gearDropsAutoSalvaged: result.stationEquipmentAutoSalvaged,
    modDrops: result.modDropsFound,
    reforgeShards: result.reforgeShardsFound + result.modDrops.length,
  };
});

useGameStore.setState({ ...createInitialState(), ...createGameplayFixture("auto_scavenge_boundary").payload.state });
const boundaryBefore = { clicks: useGameStore.getState().manualScavengeClicks, autoScavenge: useGameStore.getState().autoScavengeUnlocked };
useGameStore.getState().manualScavenge();
const boundaryAfter = { clicks: useGameStore.getState().manualScavengeClicks, autoScavenge: useGameStore.getState().autoScavengeUnlocked };

useGameStore.setState({ ...createInitialState(), ...createGameplayFixture("first_scrap_reset_ready").payload.state });
const autoRaceBefore = useGameStore.getState().autoRaceUnlocked;
useGameStore.getState().prestige();
const autoRaceAfter = useGameStore.getState().autoRaceUnlocked;

console.log(JSON.stringify({ durations, boundaryBefore, boundaryAfter, autoRaceBefore, autoRaceAfter }, null, 2));
