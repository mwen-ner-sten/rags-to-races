import { haulOriginsOn } from "./challenges";
import { DISCIPLINES, disciplineBlocker, venueName } from "./content/events";
import { SEASON_CHALLENGES } from "./content/modifiers";
import { TEAM_ORGANIZATIONS } from "./content/team";
import { teamOrganization } from "./crew";
import { crewHandoverOffers, handoverName } from "./crewLegacy";
import { depotCharter, workshopCharterOnly } from "./serviceShop";
import { LAYERS } from "./layers";
import {
  CHARTERS, currentTourEntry, needsNewScoringCar, ownerCharterBlocker, ownerGate, queuedTourProblem, tourCalendar, tourScore,
} from "./ownership";
import { promoterGate } from "./promoter";
import { venueLockReason } from "./race";
import type { DisciplineId, GameState, SeasonChallengeId } from "./types";

export type CareerDestination =
  | { tab: "legacy"; objective?: SeasonChallengeId; section?: "baton" }
  | { tab: "garage"; section: "service" | "build" | "service-delivery" | "motor-pickup" | "motor-pool" | "parts" }
  | { tab: "trips" }
  | { tab: "manufacturer"; section?: "deal" }
  | { tab: "notebook"; section: "Hall of Fame"; heritage?: true; vehicleUid?: string }
  | { tab: "notebook"; section: "Timecards" }
  | { tab: "team"; discipline: DisciplineId; focus?: "handover" | "organization" }
  | { tab: "team"; section: "crew" }
  | { tab: "race"; venueId: string }
  | { tab: "owner"; section: "round" | "charters" | "calendar" }
  | { tab: "promoter" };

interface CareerAction {
  label: string;
  destination: CareerDestination;
}

export interface CareerOpportunity {
  id: string;
  title: string;
  detail: string;
  evidence?: string;
  actions: CareerAction[];
}

const RALLY_CHALLENGES = ["hand_me_down", "parts_with_a_past"] as const;

function bestOpenVenue(state: GameState, desired: string): string {
  const route = ["backyard", "dirt", "county_fair", "regional", "state"];
  return route.slice(0, route.indexOf(desired) + 1).reverse().find((venue) => state.run.venuesOpen.includes(venue)) ?? "backyard";
}

function raceAction(state: GameState, desired: string): CareerAction[] {
  if (!state.run.vehicles.length) return [];
  const venueId = bestOpenVenue(state, desired);
  return [{ label: `Open ${venueName(venueId, state.era?.discipline ?? "dirt")} race card`, destination: { tab: "race", venueId } }];
}

function builderOpportunities(state: GameState): CareerOpportunity[] {
  if (workshopCharterOnly(state)) return [{
    id: "service-charter", title: "Your Workshop Collective charter",
    detail: "The customers from your old shops have backed your first team. Choose the team name, colors and discipline in Lou’s back bay.",
    evidence: depotCharter(state) ? "Your ramp and pump-station receipts were signed this Season." : "Two business references, three current paid invoices and a working hauler.",
    actions: [{ label: "Found a Workshop Collective", destination: { tab: "team", discipline: "dirt", focus: "organization" } }],
  }];
  const foundingReady = state.meta.stateWonEver;
  const scrapReady = LAYERS.scrap.gate(state).ok;
  if (!state.run.revealed.includes("legacy") && !foundingReady && !scrapReady) return [];
  const rally = RALLY_CHALLENGES.find((id) => state.meta.challengeRecords[id]);
  const evidence = rally && state.meta.challengeRecords[rally]
    ? `${SEASON_CHALLENGES[rally].name} cleared with ${state.meta.challengeRecords[rally]!.bestVehicleName}.`
    : undefined;
  const active = RALLY_CHALLENGES.find((id) => id === state.config.dare);
  const actions: CareerAction[] = [];
  if (foundingReady) {
    actions.push({ label: rally ? "Plan a Stage Rally team" : "Plan a Dirt Oval or Drag team", destination: { tab: "team", discipline: rally ? "rally" : "dirt" } });
  } else {
    const tryingRally = !rally && active && state.run.challenge.completedAt === undefined;
    const next = tryingRally
      ? active === "hand_me_down" && !state.run.challenge.handMeDownEngines?.length ? "dirt" : "county_fair"
      : "state";
    actions.push(...raceAction(state, next));
  }
  if (!rally && scrapReady) {
    actions.push(
      { label: "Plan a donor-engine Season", destination: { tab: "legacy", objective: "hand_me_down" } },
      { label: "Plan a parts-sourcing Season", destination: { tab: "legacy", objective: "parts_with_a_past" } },
    );
  }
  const vehicle = state.run.vehicles.reduce<{ name: string; origins: number } | undefined>((best, current) => {
    const origins = haulOriginsOn(current).length;
    return !best || origins > best.origins ? { name: current.name, origins } : best;
  }, undefined);
  let currentEvidence = evidence;
  if (!evidence && active === "parts_with_a_past" && vehicle) currentEvidence = `${vehicle.name} carries parts from ${vehicle.origins}/3 haul locations.`;
  if (!evidence && active === "hand_me_down") {
    currentEvidence = state.run.challenge.handMeDownEngines?.length
      ? "Your Riding Mower has its Dirt Feature win. Move that exact engine into a Go-Kart and win the Fair Feature."
      : "Win the Dirt Feature with a Riding Mower, then move its engine into a Go-Kart and win the Fair Feature.";
  }
  return [{
    id: "first-team", title: foundingReady ? "Your first team" : "Routes to a first team",
    detail: rally
      ? (foundingReady ? "The State win lets you found now. Your challenge record also qualifies you for Stage Rally." : "Your challenge record gives you the option to found a Stage Rally team once you win the State Invitational Feature.")
      : `${foundingReady ? "The State win lets you found a Dirt Oval or Drag team now." : "Win the State Invitational Feature to found a racing team."} To start in Stage Rally, clear Hand-Me-Down Horsepower by transferring a winning mower engine to a kart or Parts With a Past with three haul origins. You can also choose Rally on any later Team Reset.`,
    evidence: currentEvidence, actions,
  }];
}

function teamAlternative(state: GameState): CareerOpportunity {
  const era = state.era!;
  const canReset = LAYERS.team.gate(state).ok;
  const incoming = crewHandoverOffers(state, era.discipline);
  const name = TEAM_ORGANIZATIONS[teamOrganization(state)].name;
  if (incoming.length) {
    return {
      id: "handover", title: "An experienced crew can leave a handover",
      detail: canReset
        ? "The Fair win lets you plan a Team Reset. Keep a mentor with Old Hands if you own it, or pay for a workshop apprenticeship or same-discipline track notes if available."
        : `Win the ${venueName("county_fair", era.discipline)} Feature this Season to choose a handover at Team Reset.`,
      evidence: incoming.slice(0, 3).map((offer) => handoverName(offer, era.discipline)).join(" · "),
      actions: canReset
        ? [{ label: "Plan a crew handover", destination: { tab: "team", discipline: era.discipline, focus: "handover" } }, { label: "Review crew experience", destination: { tab: "team", section: "crew" } }]
        : [{ label: "Review crew experience", destination: { tab: "team", section: "crew" } }, ...raceAction(state, "county_fair")],
    };
  }
  return {
    id: "team-routes", title: canReset ? "Rebuild your team around a different kind of work" : "Your team can change direction next reset",
    detail: `${name} races ${DISCIPLINES[era.discipline].name}. A Team Reset can switch between parallel trips and more workshop capacity, with a separate choice of race discipline.`,
    evidence: canReset ? `You won this Season’s ${venueName("county_fair", era.discipline)} Feature.`
      : `Win this Season’s ${venueName("county_fair", era.discipline)} Feature to open a Team Reset.`,
    actions: canReset ? [
      { label: "Plan a different team organization", destination: { tab: "team", discipline: era.discipline, focus: "organization" } },
      ...(era.discipline !== "rally" && !disciplineBlocker(state, "rally") ? [
        { label: "Plan a Stage Rally switch", destination: { tab: "team", discipline: "rally" } } as const,
      ] : []),
    ] : [{ label: "Review crew and organization", destination: { tab: "team", section: "crew" } }],
  };
}

function ownerOpportunity(state: GameState): CareerOpportunity {
  const tour = state.owner?.tour;
  if (!tour) {
    if (ownerGate(state).ok) return {
      id: "touring", title: "Your team earned a touring licence",
      detail: "Choose the Independent Tour for a proven car, Homegrown Cup for a kart, or the Works Trophy for two scoring cars.",
      evidence: "A Team-era State Feature win is on record.",
      actions: [{ label: "Compare touring charters", destination: { tab: "owner", section: "charters" } }],
    };
    return {
      id: "touring", title: "Earn the touring licence",
      detail: `Win the ${venueName("state", state.era?.discipline ?? "dirt")} Feature with your founded team.`,
      evidence: venueLockReason(state, "state") ?? "The State venue is open. Check which event you can enter.",
      actions: raceAction(state, "state"),
    };
  }
  const charter = CHARTERS[tour.charter];
  const round = tourCalendar(tour)[tour.rounds.length];
  if (tour.status === "active" && round) {
    const pending = currentTourEntry(state);
    const last = tour.rounds.findLast((finish) => finish !== null);
    const event = `${venueName(round.venueId, tour.discipline)} ${round.event}`;
    return {
      id: "active-tour", title: `${charter.name} · next stop`,
      detail: queuedTourProblem(state, tour) ?? (pending ? `${event} is ${pending === "queued" ? "signed up" : "on track"}.`
        : needsNewScoringCar(tour) ? `${event} needs a car that hasn’t scored in this tour yet.` : `Choose a car and pace for the ${event}.`),
      evidence: last && `Last entry: ${last.carName} ${last.dnf ? "did not finish" : `placed ${last.position}`}. ${tourScore(tour).points} points count so far.`,
      actions: [{ label: "Open championship round controls", destination: { tab: "owner", section: "round" } }],
    };
  }
  const titles = state.owner!.charterTitles;
  const mixed = ownerCharterBlocker(state, "county_to_state");
  const evidence = tour.status === "champion" ? `Won the ${charter.name} with ${tourScore(tour).points} points.`
    : `${charter.name} ended with ${tourScore(tour).points} points.`;
  const actions: CareerAction[] = [{ label: "Compare the next charters", destination: { tab: "owner", section: "charters" } }];
  if (promoterGate(state)) actions.push({ label: "Visit the Circuit Office", destination: { tab: "promoter" } });
  return {
    id: "next-charter", title: mixed ? "Earn the mixed-class cup" : "The County-to-State Cup is open",
    detail: mixed
      ? titles.club ? "Your Homegrown title is banked. Win the Independent Tour with a proven car or the Works Trophy with two scoring cars."
        : "Win the kart-only Homegrown Cup. You also need an Independent Tour or Works title."
      : "Use a Go-Kart at the first two stops and a Street Stock at the last three. A sweep in Street Stock still needs a scoring kart.",
    evidence, actions,
  };
}

export function careerOpportunities(state: GameState): CareerOpportunity[] {
  return state.era ? [ownerOpportunity(state), teamAlternative(state)] : builderOpportunities(state);
}
