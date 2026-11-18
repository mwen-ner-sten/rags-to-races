import { VENUES, venueName } from "./content/events";
import { CREW_BY_ID, crewLevel } from "./content/team";
import { habitName } from "./habits";
import { logSeason } from "./journal";
import { resolveFlags } from "./rules";
import type { CrewMember, DisciplineId, GameState, JobSpec } from "./types";

export const WORKSHOP_ROUTINES = ["clean", "repair", "strip"] as const;
export type WorkshopRoutine = typeof WORKSHOP_ROUTINES[number];
export const APPRENTICE_JOBS = 6;
export const HANDOVER_COST = 8;
export const HANDOVER_TRACK_STARTS = 3;

export interface CrewService {
  workshop?: Partial<Record<WorkshopRoutine, number>>;
  venues?: Partial<Record<DisciplineId, Record<string, number>>>;
}

export type CrewHandoverChoice =
  | { type: "apprenticeship"; mentorId: string; routine: WorkshopRoutine }
  | { type: "track_notes"; mentorId: string; venueId: string };

export type CrewHandover =
  | (Extract<CrewHandoverChoice, { type: "apprenticeship" }> & { completed: number; apprenticeId?: string })
  | (Extract<CrewHandoverChoice, { type: "track_notes" }> & { discipline: DisciplineId });

export function crewHandoverOffers(state: GameState, discipline: DisciplineId): CrewHandoverChoice[] {
  const era = state.era;
  if (!era) return [];
  const offers: CrewHandoverChoice[] = [];
  for (const member of era.crew) {
    if (crewLevel(member.jobsDone) < 2 || CREW_BY_ID[member.id]?.noExperience) continue;
    for (const routine of WORKSHOP_ROUTINES) {
      if ((member.service?.workshop?.[routine] ?? 0) >= APPRENTICE_JOBS) {
        offers.push({ type: "apprenticeship", mentorId: member.id, routine });
      }
    }
    if (discipline !== era.discipline) continue;
    for (const venue of VENUES) {
      if (venue.id !== "backyard" && (member.service?.venues?.[discipline]?.[venue.id] ?? 0) >= HANDOVER_TRACK_STARTS) {
        offers.push({ type: "track_notes", mentorId: member.id, venueId: venue.id });
      }
    }
  }
  return offers;
}

export function handoverId(choice: CrewHandoverChoice): string {
  return choice.type === "apprenticeship" ? `workshop:${choice.mentorId}:${choice.routine}` : `track:${choice.mentorId}:${choice.venueId}`;
}

export function handoverName(choice: CrewHandoverChoice, discipline: DisciplineId): string {
  const mentor = CREW_BY_ID[choice.mentorId]?.name ?? "Former crew member";
  return choice.type === "apprenticeship"
    ? `${mentor} · ${habitName(choice.routine)} apprenticeship`
    : `${mentor} · ${venueName(choice.venueId, discipline)} track notes`;
}

export function acceptHandover(choice: CrewHandoverChoice, discipline: DisciplineId): CrewHandover {
  return choice.type === "apprenticeship" ? { ...choice, completed: 0 } : { ...choice, discipline };
}

export function crewCanApprentice(state: GameState, crewId: string, job: JobSpec["kind"]): boolean {
  const handover = state.era?.handover;
  const crew = CREW_BY_ID[crewId];
  return handover?.type === "apprenticeship" && handover.completed < APPRENTICE_JOBS && handover.routine === job
    && handover.mentorId !== crewId && (!handover.apprenticeId || handover.apprenticeId === crewId)
    && !!crew && !crew.noExperience && !crew.refuses.includes(job);
}

/** Only actual jobs completed by this crew member count as service. */
export function recordCrewService(state: GameState, member: CrewMember, spec: JobSpec): void {
  const era = state.era;
  if (!era) return;
  if (spec.kind === "race") {
    if (member.assignment.type !== "driver" && member.assignment.type !== "spotter") return;
    const service = member.service ??= {};
    const venues = service.venues ??= {};
    const tracks = venues[era.discipline] ??= {};
    tracks[spec.venueId] = (tracks[spec.venueId] ?? 0) + 1;
    return;
  }
  if (spec.kind !== "clean" && spec.kind !== "repair" && spec.kind !== "strip") return;
  const service = member.service ??= {};
  const workshop = service.workshop ??= {};
  workshop[spec.kind] = (workshop[spec.kind] ?? 0) + 1;
  const handover = era.handover;
  if (handover?.type !== "apprenticeship" || !crewCanApprentice(state, member.id, spec.kind)) return;
  handover.completed += 1;
  handover.apprenticeId = member.id;
  if (handover.completed === APPRENTICE_JOBS) {
    logSeason(state, "crew-apprenticeship", `${CREW_BY_ID[member.id].name} finished the apprenticeship. The team can assign the ${habitName(handover.routine)} Habit in future Seasons.`);
    applyCrewHandover(state);
  }
}

export function releaseApprentice(state: GameState, crewId: string): void {
  const handover = state.era?.handover;
  if (handover?.type !== "apprenticeship" || handover.apprenticeId !== crewId || handover.completed >= APPRENTICE_JOBS) return;
  delete handover.apprenticeId;
  handover.completed = 0;
}

export function applyCrewHandover(state: GameState): void {
  const handover = state.era?.handover;
  if (handover?.type === "apprenticeship") {
    if (handover.completed >= APPRENTICE_JOBS && !resolveFlags(state).habitsDisabled && !state.run.habitsKnown.includes(handover.routine)) {
      state.run.habitsKnown.push(handover.routine);
    }
    return;
  }
  if (handover?.type !== "track_notes" || !state.run.venuesOpen.includes(handover.venueId)) return;
  const ladder = state.run.ladder[handover.venueId];
  if (!ladder || ladder.includes("heat")) return;
  ladder.push("heat");
  logSeason(state, "crew-track-notes", `The crew's track notes qualified the team for the ${venueName(handover.venueId, handover.discipline)} Heat.`);
}
