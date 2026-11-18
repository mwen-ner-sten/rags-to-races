import { findChallengePerk, isSeasonChallenge, SEASON_CHALLENGES } from "./content/modifiers";
import { PLACES } from "./content/places";
import { logSeason } from "./journal";
import { perkUnlocked, refreshPerkUnlocks } from "./perks";
import type { GameState, Vehicle } from "./types";

const HAUL_ORIGINS = new Set(PLACES.map((place) => place.name));

export function haulOriginsOn(vehicle: Vehicle): string[] {
  // The sedan shell comes from the Auction counter, never from an auction haul.
  return [...new Set(Object.values(vehicle.parts).flatMap((part) =>
    part && part.partId !== "beater_shell" && HAUL_ORIGINS.has(part.origin) ? [part.origin] : [],
  ))];
}

/** A challenge can be completed on a repeat Feature win, once per Season. */
export function recordChallengeWin(state: GameState, venueId: string, vehicle: Vehicle): void {
  const id = state.config.dare;
  const progress = state.run.challenge;
  if (!isSeasonChallenge(id) || progress.completedAt !== undefined) return;

  if (id === "homebuilt_relay") {
    if ((state.era?.discipline ?? "dirt") !== "dirt" || vehicle.vehicleId !== "go_kart") return;
    const frameUid = vehicle.parts.frame?.uid;
    const tires = vehicle.parts.wheel?.partId;
    if (!frameUid) return;
    const relay = progress.relay ?? [];
    const matched = relay.some((checkpoint) => checkpoint.vehicleUid === vehicle.uid && checkpoint.frameUid === frameUid);
    if (venueId === "dirt" && tires === "wheel_dirt" && !matched) {
      progress.relay = [...relay, { vehicleUid: vehicle.uid, frameUid }];
      logSeason(state, "challenge:relay:dirt", `${vehicle.name} qualified for Homebuilt Relay. Run the same kart and frame at the Fair on Kart Slicks or Sport Tires.`);
      return;
    }
    if (venueId !== "county_fair" || !matched || (tires !== "wheel_kart" && tires !== "wheel_sport")) return;
  } else if (venueId !== "county_fair" || haulOriginsOn(vehicle).length < 3) {
    return;
  }

  const at = state.run.seasonMs;
  const prev = state.meta.challengeRecords[id];
  const best = !prev || at < prev.bestSeasonMs;
  state.meta.challengeRecords[id] = {
    completions: (prev?.completions ?? 0) + 1,
    bestSeasonMs: best ? at : prev.bestSeasonMs,
    bestVehicleName: best ? vehicle.name : prev.bestVehicleName,
  };
  progress.completedAt = at;
  const perk = findChallengePerk(id);
  const newPerk = perk && !state.meta.perksUnlocked.includes(perk.id) && perkUnlocked(state, perk);
  if (newPerk) refreshPerkUnlocks(state);
  logSeason(state, `challenge:${id}`, `${SEASON_CHALLENGES[id].name} completed with ${vehicle.name}.${best ? " Personal best!" : ""}${newPerk ? ` ${perk.name} is now on the perk shelf.` : ""}`);
}
