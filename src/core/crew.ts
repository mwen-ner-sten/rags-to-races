import { CREW_BY_ID } from "./content/team";
import { resolveFlags } from "./rules";
import type { CrewMember, GameState } from "./types";

export function crewEfficiency(member: CrewMember): number {
  return 0.6 + 0.4 * member.morale / 100;
}

/** People whose assigned race roles contribute when the green flag drops. */
export function racingCrewIds(state: GameState): string[] {
  if (!state.era || resolveFlags(state).crewDisabled) return [];
  return state.era.crew.filter((member) => {
    const def = CREW_BY_ID[member.id];
    return (member.assignment.type === "driver" && def?.driverPerf) || (member.assignment.type === "spotter" && def?.dnfMult);
  }).map((member) => member.id);
}

export function crewBusyRacing(state: GameState, id: string): boolean {
  return state.run.jobs.some((job) => job.spec.kind === "race" &&
    (job.lane === `crew:${id}` || (job.race?.crewIds ?? racingCrewIds(state)).includes(id)));
}

export function creditCrew(state: GameState, ids: string[]): void {
  for (const id of new Set(ids)) {
    const member = state.era?.crew.find((crew) => crew.id === id);
    if (member && !CREW_BY_ID[id]?.noExperience) member.jobsDone += 1;
  }
}
