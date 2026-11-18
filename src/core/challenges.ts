import { findChallengePerk, isSeasonChallenge, SEASON_CHALLENGES } from "./content/modifiers";
import { PLACES } from "./content/places";
import { getVenue, venueName } from "./content/events";
import { getVehicle } from "./content/vehicles";
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

/** Reports only challenge setup, separately from normal event entry requirements. */
export function challengeVehicleFit(state: GameState, venueId: string, vehicle: Vehicle): { ready: boolean; text: string } | null {
  const id = state.config.dare;
  if (!isSeasonChallenge(id) || (venueId !== "dirt" && venueId !== "county_fair")) return null;
  const isFair = venueId === "county_fair";
  const discipline = state.era?.discipline ?? "dirt";
  if (id === "homebuilt_relay") {
    if (discipline !== "dirt") return null;
    if (vehicle.vehicleId !== "go_kart") return { ready: false, text: "Use a Go-Kart" };
    const frameUid = vehicle.parts.frame?.uid;
    if (!frameUid) return { ready: false, text: "Fit a kart frame" };
    const tires = vehicle.parts.wheel?.partId;
    if (!isFair) return { ready: tires === "wheel_dirt", text: tires === "wheel_dirt" ? "Ready for the Dirt Track checkpoint" : "Fit Dirt Tires" };
    const matched = state.run.challenge.relay?.some((proof) => proof.vehicleUid === vehicle.uid && proof.frameUid === frameUid);
    if (!matched) return { ready: false, text: "Win the Dirt Track checkpoint with this kart and frame first" };
    const ready = tires === "wheel_kart" || tires === "wheel_sport";
    return { ready, text: ready ? "Ready for the Fair checkpoint" : "Fit Kart Slicks or Sport Tires for the Fair" };
  }
  if (id === "hand_me_down") {
    const engine = vehicle.parts.engine;
    if (vehicle.vehicleId !== (isFair ? "go_kart" : "riding_mower")) return { ready: false, text: isFair ? "Use a Go-Kart" : "Use a Riding Mower" };
    if (isFair) {
      const ready = !!engine && (state.run.challenge.handMeDownEngines?.includes(engine.uid) ?? false);
      return { ready, text: ready ? "Winning mower engine fitted" : `Fit the engine that won at ${venueName("dirt", discipline)}` };
    }
    const fitsKart = !!engine && getVehicle("go_kart").slots.find((slot) => slot.slot === "engine")!.accepts.includes(engine.partId);
    return { ready: fitsKart, text: fitsKart ? "Engine fits both vehicles" : "Fit an engine that can go into a Go-Kart next" };
  }
  if (!isFair) return null;
  const [minTier, maxTier] = getVenue("county_fair").tiers;
  const tier = getVehicle(vehicle.vehicleId).tier;
  if (tier < minTier || tier > maxTier) return null;
  const origins = haulOriginsOn(vehicle);
  return { ready: origins.length >= 3, text: `${origins.length} haul ${origins.length === 1 ? "location" : "locations"}${origins.length ? ` · ${origins.join(", ")}` : ""}` };
}

/** A challenge can be completed on a repeat Feature win, once per Season. */
export function recordChallengeWin(state: GameState, venueId: string, vehicle: Vehicle): void {
  const id = state.config.dare;
  const progress = state.run.challenge;
  if (!isSeasonChallenge(id) || progress.completedAt !== undefined) return;
  if (!challengeVehicleFit(state, venueId, vehicle)?.ready) return;

  if (id === "homebuilt_relay" && venueId === "dirt") {
    const frameUid = vehicle.parts.frame!.uid;
    const relay = progress.relay ?? [];
    const matched = relay.some((checkpoint) => checkpoint.vehicleUid === vehicle.uid && checkpoint.frameUid === frameUid);
    if (!matched) {
      progress.relay = [...relay, { vehicleUid: vehicle.uid, frameUid }];
      logSeason(state, "challenge:relay:dirt", `${vehicle.name} qualified for Homebuilt Relay. Run the same kart and frame at the Fair on Kart Slicks or Sport Tires.`);
    }
    return;
  }
  if (id === "hand_me_down" && venueId === "dirt") {
    const uid = vehicle.parts.engine!.uid;
    const engines = progress.handMeDownEngines ?? [];
    if (!engines.includes(uid)) {
      progress.handMeDownEngines = [...engines, uid];
      logSeason(state, "challenge:hand_me_down:dirt", `${vehicle.name} qualified. Move its winning engine to a Go-Kart for the Fair.`);
    }
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
