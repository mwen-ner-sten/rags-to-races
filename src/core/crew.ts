import { CREW_BY_ID, type TeamOrganization } from "./content/team";
import { recordCrewService } from "./crewLegacy";
import { resolveFlags } from "./rules";
import type { CrewMember, GameState, JobSpec } from "./types";

export function teamOrganization(state: GameState): TeamOrganization {
  return state.era?.organization ?? "independent";
}

export function crewTravelBlocker(state: GameState, job: string): string | null {
  if (teamOrganization(state) !== "collective") return null;
  const kind = job.split(":", 1)[0];
  return kind === "haul" || kind === "race"
    ? "Workshop Collective crew leave trips and race entries to you. Drivers and spotters can still work on your race."
    : null;
}

export function crewEfficiency(member: CrewMember): number {
  return 0.6 + 0.4 * member.morale / 100;
}

/** The assigned roles, including crew already on track. Used for older in-flight saves. */
export function assignedRacingCrewIds(state: GameState): string[] {
  if (!state.era || resolveFlags(state).crewDisabled) return [];
  return state.era.crew.filter((member) => {
    const def = CREW_BY_ID[member.id];
    return (member.assignment.type === "driver" && def?.driverPerf) || (member.assignment.type === "spotter" && def?.dnfMult);
  }).map((member) => member.id);
}

/** People who can contribute when the next green flag drops. */
export function racingCrewIds(state: GameState): string[] {
  return assignedRacingCrewIds(state).filter((id) => !crewBusyRacing(state, id));
}

export function crewBusyRacing(state: GameState, id: string): boolean {
  return state.run.jobs.some((job) => job.spec.kind === "race" &&
    (job.lane === `crew:${id}` || (job.race?.crewIds ?? assignedRacingCrewIds(state)).includes(id)));
}

export function creditCrew(state: GameState, ids: string[], spec?: JobSpec): void {
  for (const id of new Set(ids)) {
    const member = state.era?.crew.find((crew) => crew.id === id);
    if (member && !CREW_BY_ID[id]?.noExperience) {
      member.jobsDone += 1;
      if (spec) recordCrewService(state, member, spec);
    }
  }
}
