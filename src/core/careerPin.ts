import type { CareerDestination } from "./careerAdvice";
import { venueName } from "./content/events";
import { getVehicle } from "./content/vehicles";
import { eligibleHistory } from "./heritage";
import { worksReport, WORKS_FAMILIES } from "./manufacturer";
import { motorPoolVisible } from "./motorPool";
import { depotCharter, CUSTOMERS, shopFoundingReady, shopMoveReady, stockedServiceClient } from "./serviceShop";
import type { GameState } from "./types";
import { experimentalCareers } from "./features";

export const PIN_IDS = ["first-fair", "paid-work", "heritage", "manufacturer", "regularity"] as const;
export type CareerPin = (typeof PIN_IDS)[number];
export const PIN_NAMES: Record<CareerPin, string> = {
  "first-fair": "Race the County Fair",
  "paid-work": "Build a customer workshop",
  heritage: "Restore an archived racer",
  manufacturer: "Earn a works drawing",
  regularity: "Reset on a regularity licence",
};
interface Step {
  detail: string;
  label: string;
  destination: CareerDestination;
}
/** Pins that only exist while the experimental careers are switched on. */
const EXPERIMENTAL_PINS: readonly CareerPin[] = ["paid-work", "heritage", "manufacturer"];

/** The saved pin, unless it belongs to a hidden experimental career. */
export function selectedPin(game: GameState): CareerPin | undefined {
  const pin = game.meta.careerPin;
  return pin && !experimentalCareers() && EXPERIMENTAL_PINS.includes(pin) ? undefined : pin;
}
export function possiblePins(game: GameState): CareerPin[] {
  const result: CareerPin[] = [];
  const experimental = experimentalCareers();
  if (game.run.vehicles.length || game.meta.seasonsPlayed) result.push("first-fair");
  if (experimental && (game.run.revealed.includes("bench") || game.meta.seasonsPlayed)) result.push("paid-work");
  if (experimental && (game.meta.hallOfFame.some((entry) => eligibleHistory(game, entry)) || game.meta.heritageRegister?.length))
    result.push("heritage");
  if (experimental && (game.manufacturer || game.run.vehicles.some((v) => getVehicle(v.vehicleId).tier >= 2)))
    result.push("manufacturer");
  if (game.era?.discipline === "rally" || game.meta.rallyCards?.length) result.push("regularity");
  return result;
}
function raceStep(game: GameState, target: string, detail: string): Step {
  if (!game.run.vehicles.length)
    return game.run.revealed.includes("build")
      ? {
          detail: "Assemble a racer to start the Season.",
          label: "Open blueprints",
          destination: { tab: "garage", section: "build" },
        }
      : {
          detail: "Haul a working engine and wheels to build the first racer.",
          label: "Open trips",
          destination: { tab: "trips" },
        };
  const ladder = ["backyard", "dirt", "county_fair", "regional", "state"];
  const next =
    ladder
      .slice(0, ladder.indexOf(target) + 1)
      .reverse()
      .find((id) => game.run.venuesOpen.includes(id)) ?? "backyard";
  const name = venueName(next, game.era?.discipline ?? "dirt");
  return {
    detail:
      next === target
        ? detail
        : "Your highest open course on this route is " + name + ". Its race card shows your available events.",
    label: "Open " + name,
    destination: { tab: "race", venueId: next },
  };
}
export function careerPinStep(game: GameState, pin: CareerPin): Step {
  const hall: CareerDestination = { tab: "notebook", section: "Hall of Fame" };
  if (pin === "paid-work") {
    if (!game.era && (shopFoundingReady(game) || depotCharter(game)))
      return {
        detail: "Your workshop charter is ready. Found your Workshop Collective.",
        label: "Draft the team",
        destination: { tab: "team", discipline: "dirt", focus: "organization" },
      };
    if (!game.era && motorPoolVisible(game) && (game.motorPool?.custody || game.motorPool?.lastLodgedSeason !== game.meta.seasonsPlayed + 1))
      return {
        detail: "Collect the ramp and pump deliveries in one Season to earn your Workshop Collective charter.",
        label: "Open the depot",
        destination: { tab: "garage", section: "motor-pool" },
      };
    if (!game.run.revealed.includes("bench") && !game.config.shopLegacy && !game.run.serviceBook)
      return {
        detail: "Haul a worn or scrap component to open your workshop.",
        label: "Open trips",
        destination: { tab: "trips" },
      };
    const done = game.run.serviceBook?.invoices ?? [];
    const ticket = game.run.serviceBook?.ticket;
    const client = ticket?.client ?? stockedServiceClient(game);
    const message = shopMoveReady(game)
      ? "All three customer jobs are done and a hauler is ready. Choose what to take to your next shop."
      : done.length === 3
        ? "Your customer jobs are done. Build a Riding Mower or larger hauler to move the shop."
        : `${client
            ? (ticket ? "Fix up and hand over the part for " : "Take the job for ") + CUSTOMERS[client].name + "."
            : "Check what each customer wants and haul a worn part that matches one."} ${done.length} of 3 customer jobs are done.`;
    return { detail: message, label: "Open customer jobs", destination: { tab: "garage", section: "service" } };
  }
  if (pin === "heritage") {
    const p = game.run.heritageProject;
    // Working a project (or claiming earned awards) happens at the Workshop's Heritage desk;
    // only choosing a retired car to start one sends the player to the Notebook record.
    if (p || game.meta.heritageRegister?.length)
      return {
        detail: p
          ? p.completed
            ? p.completed + " entered the register. Your earned workshop privileges are filed in the Workshop, under Heritage."
            : "Inspect the " + getVehicle(p.model).name + " against " + p.originalName + "’s original parts."
          : "Your earned workshop privileges are filed in the Workshop, under Heritage.",
        label: "Open Heritage in the Workshop",
        destination: { tab: "workshop", section: "Heritage" },
      };
    return {
      detail: "Choose a previous Season’s race-finished car and register a museum recreation or a period special.",
      label: "Open Hall of Fame",
      destination: hall,
    };
  }
  if (pin === "manufacturer") {
    const m = game.manufacturer;
    if (m?.invites.length) {
      const deal = m.active;
      const detail = deal
        ? WORKS_FAMILIES[deal.family].name + " · " + worksReport(deal).step + " of 2 trials passed."
        : m.drawings.length
          ? "Your homologated drawings are on file. Choose one on a Scrap Reset."
          : "An invitation is waiting. Bring a Go-Kart with three parts from the same family.";
      return { detail, label: "Open suppliers", destination: { tab: "garage", section: "works" } };
    }
    return raceStep(
      game,
      "county_fair",
      "Podium the Feature with a Go-Kart or Beater carrying two parts from the same manufacturer.",
    );
  }
  if (pin === "regularity") {
    if (game.era?.discipline !== "rally")
      return {
        detail: "Your class clocks carry across disciplines. Stage Rally becomes available at a later team founding.",
        label: "Read the timecards",
        destination: { tab: "notebook", section: "Timecards" },
      };
    if (game.run.regularityFeatures?.county_fair !== undefined)
      return {
        detail: "The County Forest certificate is stamped. Your current Season can take a Scrap Reset.",
        label: "Open Scrap Reset",
        destination: { tab: "legacy" },
      };
    return raceStep(
      game,
      "county_fair",
      "Set a class time in the County Forest Feature, then match every split within 8% on a regularity entry.",
    );
  }
  if (game.run.featureWins.county_fair !== undefined)
    return {
      detail: "You won the County Feature. Review your reset choices or keep racing deeper into the Season.",
      label: "Open Scrap Reset",
      destination: { tab: "legacy" },
    };
  return raceStep(game, "county_fair", "Win the County Feature to earn a Scrap Reset.");
}
